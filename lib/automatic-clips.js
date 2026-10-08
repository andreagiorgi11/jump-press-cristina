import {allDraftArticles} from './reserve-articles.js';
import {activityEvent,activityStep} from './activity-trace.js';
import {isDeepStrictEqual} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import {automationStore} from './automation-runs.js';
import {blobs,writeSourceClip} from './blob-store.js';
import {problem} from './github-store.js';
import {incident} from './errors.js';
import {cleanSummary} from './article-author.js';

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
// Cleaned summary: removing a repeated editorial label is not a change of substance.
export const articleFingerprint=a=>createHash('sha256').update(JSON.stringify([a.title,cleanSummary(a),a.outlet,a.author,a.pages])).digest('hex');
// PDF association only: no semantic or literal-quote certification.
export function verifyArticle(a,pages){
 const first=pages.find(p=>p.page===a.pages[0]);
 return {pdf:first&&titleMatches(a.title,first.text)?{status:'matched',note:'Titolo riconosciuto sulla prima pagina indicata.'}:{status:'attention',note:'Titolo non riconosciuto con sicurezza sulla prima pagina indicata.'},fingerprint:articleFingerprint(a)};
}
export const pdfFingerprint=a=>JSON.stringify([a.title,a.outlet,a.pages]);

export async function prepareAutomaticClips(ctx,draft,previous,correctionIds=null){
 const r=automationStore(ctx),storage=ctx.blobs||blobs,started=Date.now(),head=await r.begin();
 const current=await r.read('drafts/'+draft.id+'.json',head);
 if(!current||current.deletedAt||current.version!==draft.version)throw problem(409,'Bozza modificata durante la preparazione PDF: rileggila.');
 const body=structuredClone(current.body),assets=[...(current.assets||[])],files={};
 const importId=body.sourceImportId;
 const prior=previous?.body.sourceImportId===importId&&previous.body.date===body.date?previous:null;
 const priorArticle=a=>allDraftArticles(prior?.body).find(p=>p.id===a.id);
 // Only settled checks are reused; warnings are recomputed on each save instead of being copied forward.
 const reusable=a=>{const p=priorArticle(a);return p&&p.clipId&&p.pdfCheck&&p.pdfCheck.status==='matched'&&pdfFingerprint(p)===pdfFingerprint(a);};
 let sourceRow,text,source,sourceUnavailable=false;
 try{
  sourceRow=await r.read('imports/'+importId+'.json',head);
  if(!sourceRow||sourceRow.date!==body.date||sourceRow.status!=='ready' )throw Error('source unavailable');
  // Transient GitHub/Blob errors: retry before declaring the source unavailable.
  if(allDraftArticles(body).some(a=>(!correctionIds||correctionIds.has(a.id))&&!reusable(a))){
   for(let attempt=0;;attempt++){
    try{text=await storage.readText(sourceRow.textPath);if(!Array.isArray(text.pages))throw Error('inconsistent source');break;}
    catch(error){if(attempt===2||error.message==='inconsistent source')throw error;activityEvent('retry',{resource:'source_text',attempt:attempt+1,waitMs:700*(attempt+1)});console.warn('[Jump Press] source text retry',attempt+1,String(error.message||error).slice(0,200));await activityStep('retry.wait',()=>new Promise(resolve=>setTimeout(resolve,700*(attempt+1))));}
   }
  }
  source=assets.find(a=>a.kind==='source_reference'&&a.importId===importId);
  if(!source){source={id:randomUUID(),draft_id:draft.id,kind:'source_reference',importId,name:sourceRow.name,date:sourceRow.date,sha256:sourceRow.sha256,pageCount:sourceRow.pageCount,sourceOutlets:sourceRow.sourceOutlets??null};assets.push(source);files['assets/'+source.id+'.json']=source;}
 }catch(error){
  console.error('[Jump Press] automatic clip source unavailable:',String(error?.message||error).slice(0,200));
  source=null;sourceUnavailable=true;
  await incident('automatic_clip_source_unavailable');
  for(const a of allDraftArticles(body)){
   if(correctionIds&&!correctionIds.has(a.id))continue;
   const p=priorArticle(a);
   const samePdf=p?.clipId&&p.pdfCheck&&p.pdfCheck.status!=='pending'&&p.title===a.title&&isDeepStrictEqual(p.pages,a.pages);
   a.pdfCheck=samePdf?p.pdfCheck:{status:'pending',note:'Verifica PDF temporaneamente non disponibile: impossibile leggere la fonte. Ritaglio precedente conservato, se presente.'};
  }
 }
 async function clipFor(pages){
  if(Date.now()-started>150000)throw Error('processing budget exceeded');
  if(!source||!pages.length||pages.length>100||new Set(pages).size!==pages.length||pages.some(p=>p<1||p>sourceRow.pageCount))throw Error('invalid pages');
  let clip=assets.find(a=>a.kind==='clip'&&a.importId===importId&&JSON.stringify(a.pages)===JSON.stringify(pages));
  if(clip){
   activityEvent('clip.reused',{clipId:clip.id,importId,pages});
   const known=prior?.assets?.some(a=>a.id===clip.id&&a.storage_path===clip.storage_path)&&(
    allDraftArticles(prior.body).some(a=>a.clipId===clip.id&&isDeepStrictEqual(a.pages,pages))||prior.body.coverage?.frontPages?.some(p=>p.clipId===clip.id&&isDeepStrictEqual([p.page],pages)));
   if(!known)await storage.exists(clip.storage_path);return clip;
  }
  if(sourceRow.originalDeletedAt)throw Error('original unavailable');
  const id=randomUUID();clip={id,draft_id:draft.id,kind:'clip',importId,name:'Ritaglio pagine '+pages.join(', ')+'.pdf',source_id:source.id,pages,upload_mode:'direct',storage_path:'jump/'+draft.id+'/'+id+'.pdf'};
  await activityStep('clip.create',()=>writeSourceClip(storage,sourceRow.originalPath,pages,clip.storage_path),{clipId:id,importId,pages});assets.push(clip);files['assets/'+id+'.json']=clip;return clip;
 }
 if(source){
  for(const a of allDraftArticles(body)){
   if(correctionIds&&!correctionIds.has(a.id))continue;
   if(reusable(a)){const p=priorArticle(a);a.pdfCheck=p.pdfCheck;}else{const checks=await activityStep('article.verify',()=>verifyArticle(a,text.pages),{articleId:a.id,pages:a.pages});a.pdfCheck=checks.pdf;}
   try{const clip=await clipFor(a.pages);a.clipId=clip.id;a.sourceId=source.id;}catch{a.clipId=null;a.sourceId=null;a.pdfCheck={status:'attention',note:'Ritaglio non disponibile: controllare le pagine indicate o riprovare la preparazione PDF.'};}
  }
  for(const p of correctionIds?[]:body.coverage?.frontPages||[]){if(!p.juventus)continue;try{const clip=await clipFor([p.page]);p.clipId=clip.id;p.sourceId=source.id;}catch{p.clipId=null;p.sourceId=null;}}
 }
 const latestHead=await r.begin(),latest=await r.read('drafts/'+draft.id+'.json',latestHead);
 if(!latest||latest.deletedAt||latest.version!==draft.version||JSON.stringify(latest.body)!==JSON.stringify(current.body)||JSON.stringify(latest.assets)!==JSON.stringify(current.assets))throw problem(409,'Bozza modificata durante la preparazione PDF. Contenuti conservati: rileggi prima di riprovare.');
 const index=await r.read('index.json',latestHead),updated_at=new Date().toISOString();
 const next={...current,body,assets,version:current.version+1,updated_at,automaticClips:{sourceUnavailable,status:sourceUnavailable||allDraftArticles(body).some(a=>a.pdfCheck.status!=='matched')||(body.coverage?.frontPages||[]).some(p=>p.juventus&&!p.clipId)?'attention':'complete',durationMs:Date.now()-started,checkedAt:updated_at},revisions:[{version:current.version+1,created_at:updated_at},...(current.revisions||[])].slice(0,50)};
 index.drafts=index.drafts.map(d=>d.id===next.id?{...d,version:next.version,updated_at}:d);
 files['drafts/'+next.id+'.json']=next;files['index.json']=index;files['revisions/'+next.id+'/'+next.version+'.json']={body,actor:ctx.user.id,created_at:updated_at};
 await r.commit(files,latestHead,'Ritagli automatici e avvisi di verifica non bloccanti');return next;
}
