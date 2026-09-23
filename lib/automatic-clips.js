import {randomUUID,createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {automationStore} from './automation-runs.js';
import {blobs} from './blob-store.js';
import {problem} from './github-store.js';
import {incident} from './errors.js';

export const normalizeSource=text=>String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/-\s*\n\s*/g,'').replace(/[^a-z0-9]/g,'');
// Title-only OCR equivalence: case-insensitive I/i and l/L share a form.
const normalizeTitle=text=>normalizeSource(text).replace(/i/g,'l');
// One OCR letter edit in a contiguous title; digits must remain exact.
function oneLetterApart(a,b){
 let i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;
 if(i===a.length&&i===b.length)return true;
 const letter=c=>!!c&&/[a-z]/.test(c);
 if(a.length===b.length)return letter(a[i])&&letter(b[i])&&a.slice(i+1)===b.slice(i+1);
 if(a.length===b.length+1)return letter(a[i])&&a.slice(i+1)===b.slice(i);
 if(b.length===a.length+1)return letter(b[i])&&a.slice(i)===b.slice(i+1);
 return false;
}
export function titleMatches(title,text){
 const a=normalizeTitle(title),b=normalizeTitle(text);
 if(a.length<12){
  // Short titles need a separate heading, not a mention inside a paragraph.
  const words=String(title).match(/[\p{L}\p{N}]+/gu)||[];
  if(a.length<8||words.length<2)return false;
  const lines=String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  for(let i=0;i<lines.length;i++){
   for(let count=1;count<=Math.min(words.length,3)&&i+count<=lines.length;count++){
    const heading=lines.slice(i,i+count).join(' ');
    if(normalizeTitle(heading)===a)return true;
    // A dateline can share the final heading line in extracted newspaper text.
    const dateline=heading.match(/^(.+?)\s+[A-ZÀ-ÖØ-Þ]{3,}(?:\s|$)/u);
    if(dateline&&normalizeTitle(dateline[1])===a)return true;
   }
  }
  return false;
 }
 if(b.includes(a))return true;
 for(let start=0;start<=b.length-a.length+1;start++){
  for(const length of [a.length-1,a.length,a.length+1]){
   if(start+length<=b.length&&oneLetterApart(a,b.slice(start,start+length)))return true;
  }
 }
 // Minor extraction errors are tolerated only in a compact, ordered passage.
 const words=String(title).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]+/g)||[];
 const tokens=words.filter(w=>w.length>=4).map(normalizeTitle);if(tokens.length<4)return false;
 for(let start=0;start<b.length;start+=40){let cursor=0,hits=0;const window=b.slice(start,start+Math.max(a.length*2,160));for(const token of tokens){const found=window.indexOf(token,cursor);if(found>=0){hits++;cursor=found+token.length;}}if(hits/tokens.length>=.85)return true;}
 return false;
}
export const articleFingerprint=a=>createHash('sha256').update(JSON.stringify([a.title,a.summary,a.outlet,a.author,a.pages])).digest('hex');
export function verifyArticle(a,pages){
 const first=pages.find(p=>p.page===a.pages[0]);
 const pdf=first&&titleMatches(a.title,first.text)?{status:'matched',note:'Titolo riconosciuto sulla prima pagina indicata.'}:{status:'attention',note:'Titolo non riconosciuto con sicurezza sulla prima pagina indicata.'};
 const check=a.factCheck,issues=[],evidence=[];
 if(!check?.evidence?.length)issues.push('Riscontro fonte incompleto: mancano gli estratti.');
 for(const [index,e] of (check?.evidence||[]).entries()){
  const label='Estratto '+(index+1),quote=normalizeSource(e.quote);
  const result={index:index+1,originalPage:e.page,matchedPages:[],status:'unmatched',note:''};
  if(!a.pages.includes(e.page))result.note=label+': pagina '+e.page+' non assegnata all’articolo.';
  else if(quote.length<15)result.note=label+': troppo breve per un riscontro affidabile.';
  else {
   result.matchedPages=[...new Set(pages.filter(p=>a.pages.includes(p.page)&&typeof p.text==='string'&&normalizeSource(p.text).includes(quote)).map(p=>p.page))];
   if(result.matchedPages.length){
    result.status=result.matchedPages.includes(e.page)?'matched':'relocated';
    if(result.matchedPages.length===1)result.resolvedPage=result.matchedPages[0];
    result.note=result.status==='matched'?label+': riscontrato nella pagina indicata.':label+': riferimento riscontrato nelle pagine '+result.matchedPages.join(', ')+' (GPT indicava '+e.page+').';
   }else{
    const unavailable=a.pages.filter(n=>!pages.some(p=>p.page===n&&typeof p.text==='string'&&p.text.trim()));
    result.note=unavailable.length?label+': testo non disponibile nelle pagine '+unavailable.join(', ')+'.':label+': non riscontrato letteralmente nelle pagine dell’articolo; verificare citazione e testo estratto dal PDF.';
   }
  }
  if(result.status==='unmatched')issues.push(result.note);
  evidence.push(result);
 }
 const sourceStatus=issues.length?'incomplete':'matched';
 const editorialStatus=check?.status==='verified'?'declared_verified':check?.status==='attention'?'attention':'undocumented';
 const editorialNote=editorialStatus==='attention'?(check.note||'GPT segnala un dubbio editoriale senza ulteriori dettagli.'):editorialStatus==='undocumented'?'Verifica editoriale non documentata.':'Confronto fonte–sintesi dichiarato completo da GPT; non è una certificazione automatica del significato.';
 const synthesis={status:sourceStatus==='matched'&&editorialStatus==='declared_verified'?'verified':'attention',note:[...issues,...(editorialStatus==='declared_verified'?[]:[editorialNote])].join(' ').slice(0,1000)||'Estratti riscontrati nella fonte. '+editorialNote,sourceStatus,editorialStatus,editorialNote,evidence};
 return {pdf,synthesis,fingerprint:articleFingerprint(a)};
}

// One source read and one PDF parse for the entire edition. No per-clip Git calls.
// The draft is saved before entering this function; failures leave visible warnings.
export async function prepareAutomaticClips(ctx,draft){
 const r=automationStore(ctx),storage=ctx.blobs||blobs,started=Date.now(),head=await r.begin();
 const current=await r.read('drafts/'+draft.id+'.json',head);
 if(!current||current.deletedAt||current.version!==draft.version)throw problem(409,'Bozza modificata durante la preparazione PDF: rileggila.');
 const body=structuredClone(current.body),assets=[...(current.assets||[])],files={};
 const importId=body.sourceImportId;
 let sourceRow,text,input,source;
 try{
  sourceRow=await r.read('imports/'+importId+'.json',head);
  if(!sourceRow||sourceRow.date!==body.date||sourceRow.status!=='ready'||sourceRow.originalDeletedAt)throw Error('source unavailable');
  text=await storage.readText(sourceRow.textPath);
  input=await PDFDocument.load(await storage.readOriginal(sourceRow.originalPath));
  if(input.getPageCount()!==sourceRow.pageCount||!Array.isArray(text.pages))throw Error('inconsistent source');
  source=assets.find(a=>a.kind==='source_reference'&&a.importId===importId);
  if(!source){source={id:randomUUID(),draft_id:draft.id,kind:'source_reference',importId,name:sourceRow.name,date:sourceRow.date,sha256:sourceRow.sha256,pageCount:sourceRow.pageCount,sourceOutlets:sourceRow.sourceOutlets??null};assets.push(source);files['assets/'+source.id+'.json']=source;}
 }catch{
  await incident('automatic_clip_source_unavailable');
  for(const a of body.articles){a.pdfCheck={status:'attention',note:'Fonte PDF non disponibile o non leggibile. Conservato il ritaglio precedente, se presente; riprova la preparazione PDF.'};a.synthesisCheck={...verifyArticle(a,[]).synthesis,status:'attention',sourceStatus:'incomplete',note:'Fonte non disponibile per verificare gli estratti.'};}
 }
 async function clipFor(pages){
  if(Date.now()-started>150000)throw Error('processing budget exceeded');
  if(!input||!source||!pages.length||pages.length>100||new Set(pages).size!==pages.length||pages.some(p=>p<1||p>input.getPageCount()))throw Error('invalid pages');
  let clip=assets.find(a=>a.kind==='clip'&&a.importId===importId&&JSON.stringify(a.pages)===JSON.stringify(pages));
  if(clip){await storage.exists(clip.storage_path);return clip;}
  const output=await PDFDocument.create();for(const page of await output.copyPages(input,pages.map(p=>p-1)))output.addPage(page);
  const bytes=await output.save();if(bytes.length>50*1024*1024)throw Error('clip too large');
  const id=randomUUID();clip={id,draft_id:draft.id,kind:'clip',importId,name:'Ritaglio pagine '+pages.join(', ')+'.pdf',source_id:source.id,pages,upload_mode:'direct',storage_path:'jump/'+draft.id+'/'+id+'.pdf'};
  await storage.write(clip.storage_path,bytes);assets.push(clip);files['assets/'+id+'.json']=clip;return clip;
 }
 if(input&&source){
  for(const a of body.articles){
   const checks=verifyArticle(a,text.pages);a.pdfCheck=checks.pdf;a.synthesisCheck=checks.synthesis;
   try{const clip=await clipFor(a.pages);a.clipId=clip.id;a.sourceId=source.id;}catch{a.clipId=null;a.sourceId=null;a.pdfCheck={status:'attention',note:'Ritaglio non disponibile: controllare le pagine indicate o riprovare la preparazione PDF.'};}
  }
  for(const p of body.coverage?.frontPages||[]){if(!p.juventus)continue;try{const clip=await clipFor([p.page]);p.clipId=clip.id;p.sourceId=source.id;}catch{p.clipId=null;p.sourceId=null;}}
 }
 const latestHead=await r.begin(),latest=await r.read('drafts/'+draft.id+'.json',latestHead);
 if(!latest||latest.deletedAt||latest.version!==draft.version||JSON.stringify(latest.body)!==JSON.stringify(current.body)||JSON.stringify(latest.assets)!==JSON.stringify(current.assets))throw problem(409,'Bozza modificata durante la preparazione PDF. Contenuti conservati: rileggi prima di riprovare.');
 const index=await r.read('index.json',latestHead),updated_at=new Date().toISOString();
 const next={...current,body,assets,version:current.version+1,updated_at,automaticClips:{status:body.articles.some(a=>a.pdfCheck.status==='attention')||(body.coverage?.frontPages||[]).some(p=>p.juventus&&!p.clipId)?'attention':'complete',durationMs:Date.now()-started,checkedAt:updated_at},revisions:[{version:current.version+1,created_at:updated_at},...(current.revisions||[])].slice(0,50)};
 index.drafts=index.drafts.map(d=>d.id===next.id?{...d,version:next.version,updated_at}:d);
 files['drafts/'+next.id+'.json']=next;files['index.json']=index;files['revisions/'+next.id+'/'+next.version+'.json']={body,actor:ctx.user.id,created_at:updated_at};
 await r.commit(files,latestHead,'Ritagli automatici e avvisi di verifica non bloccanti');return next;
}
