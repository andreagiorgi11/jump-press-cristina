import {createHash} from 'node:crypto';
import {z} from 'zod';
import {PDFDocument} from 'pdf-lib';
import {store,readIndex,problem} from './github-store.js';
import {blobs} from './blob-store.js';
import {extractSourceText} from './source-pdf.js';
import {importStatus} from './source-service.js';
import {incident} from './errors.js';

const uuid=z.string().uuid();
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(x=>Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x);
export const manualSourceInput=z.object({id:uuid,date,files:z.array(z.object({name:z.string().trim().min(1).max(200).refine(n=>/\.pdf$/i.test(n)&&!/[\r\n]/.test(n)),size:z.number().int().positive().max(50*1024*1024)})).min(1).max(1000)}).strict();
const record=id=>'imports/'+uuid.parse(id)+'.json';
const active=d=>'manual-sources/'+date.parse(d)+'.json';
const repo=ctx=>ctx.store||store;
const storage=ctx=>ctx.blobs||blobs;
function editor(ctx){if(!['editor','publisher'].includes(ctx.role)||ctx.automation)throw problem(403,'Caricamento manuale riservato alla redazione in sessione interattiva.');}
async function available(ctx,d,head){
 const r=repo(ctx),index=await readIndex(r,head),run=await r.read('automation/runs/'+d+'.json',head);
 if(run?.status==='running')throw problem(409,'La giornata è ancora in lavorazione. Attendi la chiusura prima di caricare una fonte manuale.');
 if(index.drafts.some(x=>x.body.date===d)||index.published.some(x=>x.edition_date===d)||(index.trash||[]).some(x=>x.body.date===d))throw problem(409,'Esiste già una rassegna per questa data: nessuna fonte sostituita.');
}
export async function getManualSource(ctx,id){
 if(!['producer','editor','publisher'].includes(ctx.role))throw problem(403,'Accesso editor richiesto.');
 const row=await repo(ctx).read(record(id),await repo(ctx).begin());
 if(!row||row.sourceKind!=='manual')throw problem(404,'Fonte manuale non trovata.');
 return row;
}
const publicState=row=>({...importStatus(row),sections:row.sections.map(({name,size,startPage,endPage})=>({name,size,startPage,endPage})),notification:row.notification?{status:row.notification.status,acceptedAt:row.notification.acceptedAt}:null});
export async function manualState(ctx,id){return publicState(await getManualSource(ctx,id));}
async function links(ctx,row){return {...publicState(row),uploads:await Promise.all(row.sections.map(async s=>({name:s.name,path:s.path,uploadUrl:await storage(ctx).uploadLink(s.path)})))};}
export async function prepareManualSource(ctx,args){
 editor(ctx);const x=manualSourceInput.parse(args);if(x.files.reduce((n,f)=>n+f.size,0)>200*1024*1024)throw problem(413,'Le sezioni superano complessivamente 200 MB.');
 const r=repo(ctx),head=await r.begin();await available(ctx,x.date,head);
 const pointer=await r.read(active(x.date),head),prior=await r.read(record(x.id),head);
 if(pointer&&pointer.importId!==x.id)throw problem(409,'Una fonte manuale è già stata predisposta per questa data: riprendi quella.');
 if(prior){if(prior.sourceKind!=='manual'||prior.date!==x.date||JSON.stringify(prior.sections.map(({name,size})=>({name,size})))!==JSON.stringify(x.files))throw problem(409,'Identificativo già usato per una fonte diversa.');return links(ctx,prior);}
 const row={id:x.id,date:x.date,sourceKind:'manual',name:'Manuale_'+x.date+'_'+x.id+'.pdf',status:'uploading',startedAt:new Date().toISOString(),originalPath:'jump/imports/'+x.id+'/original.pdf',textPath:'jump/imports/'+x.id+'/text.json',sections:x.files.map((f,i)=>({...f,path:'jump/imports/'+x.id+'/section-'+(i+1)+'.pdf'}))};
 await r.commit({[record(x.id)]:row,[active(x.date)]:{importId:x.id}},head,'Predisposizione fonte manuale privata');return links(ctx,row);
}
// Immutable uploads are merged in the selected order. No source URL is accepted here.
async function merge(ctx,row){
 const out=await PDFDocument.create();let bytes=0,offset=0;const sections=[];
 for(const s of row.sections){
  const buffer=await storage(ctx).read(s.path);if(!buffer||buffer.length!==s.size)throw problem(422,'Caricamento incompleto: '+s.name);
  bytes+=buffer.length;if(bytes>200*1024*1024)throw problem(413,'Fonte oltre 200 MB.');
  let doc;try{doc=await PDFDocument.load(buffer);}catch{throw problem(422,'PDF non leggibile o protetto: '+s.name);}
  const count=doc.getPageCount();if(!count||offset+count>1000)throw problem(413,'La fonte deve contenere da 1 a 1000 pagine.');
  for(const p of await out.copyPages(doc,doc.getPageIndices()))out.addPage(p);
  sections.push({...s,startPage:offset+1,endPage:offset+count});offset+=count;
 }
 const buffer=Buffer.from(await out.save());if(buffer.length>200*1024*1024)throw problem(413,'Fonte unita oltre 200 MB.');return {buffer,sections};
}
export async function finalizeManualSource(ctx,id){
 editor(ctx);const r=repo(ctx),head=await r.begin(),row=await r.read(record(id),head);if(!row||row.sourceKind!=='manual')throw problem(404,'Fonte manuale non trovata.');
 if(row.status==='ready')return publicState(row);
 await available(ctx,row.date,head);
 if(row.status==='processing'&&Date.now()-Date.parse(row.processingAt)<10*60*1000)throw problem(409,'Preparazione ancora in corso. Ricontrolla lo stato.');
 row.status='processing';row.processingAt=new Date().toISOString();delete row.error;
 await r.commit({[record(id)]:row},head,'Preparazione sezioni manuali');
 const work=async()=>{try{
  let buffer;try{buffer=await storage(ctx).readOriginal(row.originalPath);}catch(e){if(e.status!==404)throw e;}
  if(!buffer){const merged=await merge(ctx,row);buffer=merged.buffer;row.sections=merged.sections;await storage(ctx).writeOriginal(row.originalPath,buffer);}else{
   // Recover page boundaries from immutable input after an interrupted commit.
   row.sections=(await merge(ctx,row)).sections;
  }
  let text;try{text=await storage(ctx).readText(row.textPath);}catch(e){if(e.status!==404)throw e;}
  if(!text){text=await (ctx.extractSourceText||extractSourceText)(buffer);if(!text.totalCharacters)throw problem(422,'I PDF non contengono testo estraibile. Serve una fonte con testo o OCR.');await storage(ctx).writeText(row.textPath,text);}
  Object.assign(row,{status:'ready',completedAt:new Date().toISOString(),bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex'),pageCount:text.pageCount,totalCharacters:text.totalCharacters,pagesWithLittleText:text.pagesWithLittleText,sourceOutlets:text.sourceOutlets??null});
  const h=await r.begin();await available(ctx,row.date,h);await r.commit({[record(id)]:row},h,'Fonte manuale pronta per MCP');return publicState(row);
 }catch(e){row.status='failed';row.error=e.status&&e.status<500?e.message:'Preparazione interrotta. I PDF caricati sono conservati: riprova dalla stessa fonte.';await r.commit({[record(id)]:row},await r.begin(),'Preparazione manuale interrotta');throw e;}};
 if(ctx.defer){ctx.defer(async()=>{try{await work();}catch{await incident('manual_source_failed');}});return publicState(row);}return work();
}
export async function currentManualSource(ctx,d){const p=await repo(ctx).read(active(d),await repo(ctx).begin());return p?manualState(ctx,p.importId):null;}
