import {visibleSynthesisLabels} from './check-labels.js';
import {validateSummaryReady} from './summary-workflow.js';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {store,readIndex,problem} from './github-store.js';
import {sourceUrl} from './source-download.js';
import {editionSchema} from './schema.js';
export const LEASE_MS=10*60*1000;
const MAX_ATTEMPTS=3;
// Activity renews the lease between calls (every work tool, every source read, every content commit).
const RENEW_AFTER_MS=2*60*1000;
const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(x=>!Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x);
export const runSchema=z.object({date:dateSchema,runId:z.string().uuid(),generation:z.number().int().positive()}).strict();
export const phaseSchema=z.enum(['import','reading','drafting','clips','review']);
// nextPage stays in the input schema for older clients but is ignored: the server derives it from the pages it actually served.
export const checkpointSchema=z.object({importId:z.string().uuid().optional(),nextPage:z.number().int().positive().max(1001).optional(),reviewedClipPages:z.array(z.object({clipId:z.string().uuid(),page:z.number().int().positive().max(100)}).strict()).max(2000).optional()}).strict();
const page=z.number().int().positive().max(1000);
const rowCheckpointSchema=checkpointSchema.extend({readRanges:z.array(z.tuple([page,page])).max(1000).optional()}).strict();
const rowSchema=z.object({date:dateSchema,sourceKey:z.string().regex(/^[a-f0-9]{64}$/),runId:z.string().uuid(),generation:z.number().int().positive(),owner:z.string(),draftId:z.string().uuid(),status:z.enum(['running','failed','completed']),leaseUntil:z.number().finite(),phase:phaseSchema,checkpoint:rowCheckpointSchema,startedAt:z.number().finite(),updatedAt:z.number().finite(),phaseStartedAt:z.number().finite(),timings:z.record(z.string(),z.number().nonnegative()),reviewWarnings:z.array(z.string()).optional(),retryable:z.boolean(),draftVersion:z.number().int().positive().optional()}).strict();
// Only a lost or closed run stops the worker; every other error is correctable in place.
const stop=message=>Object.assign(problem(409,message),{stop:true});
export function mergeRanges(ranges=[],pages=[]){
 const all=[...ranges,...pages.map(p=>[p,p])].sort((a,b)=>a[0]-b[0]),out=[];
 for(const [a,b] of all){const last=out.at(-1);if(last&&a<=last[1]+1)last[1]=Math.max(last[1],b);else out.push([a,b]);}
 return out;
}
const firstUnread=ranges=>ranges[0]?.[0]===1?ranges[0][1]+1:1;
const file=date=>'automation/runs/'+date+'.json';
const repo=ctx=>ctx.store||store;
const now=ctx=>ctx.now?ctx.now():Date.now();
function access(ctx){if(!['producer','editor','publisher'].includes(ctx?.role)||!ctx.user?.id)throw problem(403,'Accesso connettore richiesto.');}
async function at(r,head,date){const row=await r.read(file(date),head);if(row===null)return null;const result=rowSchema.safeParse(row);if(!result.success)throw problem(503,'Stato automatismo non valido: nessun nuovo avvio.');return result.data;}
function summary(row){return {reviewWarnings:row.reviewWarnings||[],status:row.status,date:row.date,draftId:row.draftId,generation:row.generation,leaseUntil:row.leaseUntil,phase:row.phase,checkpoint:row.checkpoint,timings:row.timings,startedAt:row.startedAt,updatedAt:row.updatedAt,draftVersion:row.draftVersion,retryable:row.retryable,attemptsRemaining:MAX_ATTEMPTS-row.generation};}
// An expired lease is not a loss: until another check takes over (new runId/generation) the same worker may continue.
function owned(ctx,row,run){
 if(!row||row.runId!==run.runId||row.generation!==run.generation||row.owner!==ctx.user.id)throw stop('Lavoro ripreso da un’altra esecuzione: fermati, non salvare né pubblicare.');
 if(row.status!=='running')throw stop('Lavoro già chiuso ('+row.status+'): fermati, non salvare né pubblicare.');
}
export async function readRun(ctx,date){access(ctx);dateSchema.parse(date);const r=repo(ctx),row=await at(r,await r.begin(),date);return row?summary(row):{status:'not_started',date};}
export async function claimRun(ctx,{date,url,requestId,resume=false}){
 access(ctx);dateSchema.parse(date);z.string().uuid().parse(requestId);
 const source=sourceUrl(url,date),sourceKey=createHash('sha256').update(date+'|'+source.name).digest('hex'),r=repo(ctx);
 // Only reservation conflicts are retried, after rereading the authoritative state.
 for(let attempt=0;attempt<3;attempt++){
  const head=await r.begin(),prior=await at(r,head,date),index=await readIndex(r,head),time=now(ctx);
  if(prior?.status==='completed')return {...summary(prior),acquired:false,reason:'completed'};
  if(prior&&prior.sourceKey!==sourceKey)return {...summary(prior),acquired:false,reason:'different_source_requires_review'};
  if(prior?.status==='running'&&prior.leaseUntil>time){
   if(prior.runId===requestId&&prior.owner===ctx.user.id)return {...summary(prior),acquired:true,run:{date,runId:prior.runId,generation:prior.generation}};
   return {...summary(prior),acquired:false,reason:'in_progress'};
  }
  // A stalled or interrupted run resumes by itself at the next scheduled check, from the server-owned checkpoint
  // (resume is accepted for older clients but no longer required). Only a non-retryable failure or the attempt limit needs a person.
  const importStalled=prior?.phase==='import'&&(prior.status==='failed'||prior.leaseUntil<=time);
  if(prior&&(prior.generation>=MAX_ATTEMPTS||(!importStalled&&!prior.retryable)))return {...summary(prior),acquired:false,reason:'recovery_requires_review',canResume:false};
  const drafts=index.drafts.filter(d=>d.body.date===date),published=index.published.filter(d=>d.edition_date===date),trashed=(index.trash||[]).filter(d=>d.body.date===date);
  if(published.length||trashed.length||drafts.some(d=>d.id!==prior?.draftId))return {date,acquired:false,reason:'existing_edition_requires_review',status:'existing'};
  const row={date,sourceKey,runId:requestId,generation:(prior?.generation||0)+1,owner:ctx.user.id,draftId:prior?.draftId||randomUUID(),status:'running',leaseUntil:time+LEASE_MS,phase:prior?.phase||'import',checkpoint:prior?.checkpoint||{},startedAt:prior?.startedAt??time,updatedAt:time,phaseStartedAt:time,timings:prior?.timings||{},retryable:true};
  try{await r.commit({[file(date)]:row},head,'Prenotazione automatismo Jump Press');return {...summary(row),acquired:true,recovered:!!prior,run:{date,runId:requestId,generation:row.generation}};}
  catch(error){if(error.status!==409||attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,50*2**attempt));}
 }
}
// A concurrent commit (e.g. a login attempt record) is not a conflict on this run: reread everything and retry.
// Ownership, draft version and checks are evaluated again on each attempt.
export async function updateRun(ctx,args){
 for(let attempt=0;;attempt++){
  try{return await updateRunOnce(ctx,args);}
  catch(error){if(!error.storeConflict||attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,100*2**attempt));}
 }
}
async function updateRunOnce(ctx,{run,phase,checkpoint={},status='running',retryable=false,draftVersion}){
 access(ctx);run=runSchema.parse(run);phaseSchema.parse(phase);checkpoint=checkpointSchema.parse(checkpoint);z.enum(['running','failed','completed']).parse(status);
 // The reading cursor is server-owned: a declared nextPage is ignored, never trusted and never an error.
 const {nextPage:_declared,...declared}=checkpoint;checkpoint=declared;
 const r=repo(ctx),head=await r.begin(),row=await at(r,head,run.date);owned(ctx,row,run);
 if(row.checkpoint.importId&&checkpoint.importId&&row.checkpoint.importId!==checkpoint.importId){
  const old=await r.read('imports/'+row.checkpoint.importId+'.json',head),draft=await r.read('drafts/'+row.draftId+'.json',head);
  if(!old||old.status==='ready'||draft||(old.status==='processing'&&now(ctx)-Date.parse(old.startedAt)<LEASE_MS))throw problem(422,'Il lavoro usa già la fonte '+row.checkpoint.importId+': continua con quella.');
  row.checkpoint={};
 }
 if(checkpoint.importId){const source=await r.read('imports/'+checkpoint.importId+'.json',head);if(!source||source.date!==run.date)throw problem(422,'Fonte non associabile a questa data: usa l’importId restituito da import_source_url.');
  if(source.name&&createHash('sha256').update(run.date+'|'+source.name).digest('hex')!==row.sourceKey)throw problem(422,'Fonte diversa dalla mail prenotata: usa l’importId restituito da import_source_url.');}
 if(status==='completed'){
  const draft=await r.read('drafts/'+row.draftId+'.json',head);
  if(!draft||draft.deletedAt)throw problem(422,'Bozza assegnata non trovata: salvala prima di completare.');
  if(draft.version!==draftVersion)throw problem(422,'La versione corrente della bozza è '+draft.version+': rileggila e completa con draftVersion='+draft.version+'.');
  const body=editionSchema.parse(draft.body);
  if(body.sourceImportId){
   row.reviewWarnings=[];
   if(body.sourceImportId!==row.checkpoint.importId)throw problem(422,'La bozza cita una fonte diversa dal lavoro prenotato: correggi sourceImportId.');
   try{await validateSummaryReady(body);if(body.executiveSummaryStale)row.reviewWarnings.push('Summary da ricontrollare.');}catch{row.reviewWarnings.push('Summary da verificare.');}
   const imported=await r.read('imports/'+body.sourceImportId+'.json',head);
   if(!imported||row.checkpoint.nextPage!==imported.pageCount+1)row.reviewWarnings.push('Lettura integrale da verificare.');
   if(!draft.automaticClips||draft.automaticClips.status!=='complete')row.reviewWarnings.push('PDF da verificare.');
   row.reviewWarnings.push(...new Set(body.articles.flatMap(a=>visibleSynthesisLabels(a.synthesisCheck)).map(label=>label+'.')));
   if(!body.articles.length)row.reviewWarnings.push('Selezione articoli incompleta.');
   row.draftVersion=draftVersion;
  }else{
  await validateSummaryReady(body);
  const progress={...row.checkpoint,...checkpoint},source=progress.importId?await r.read('imports/'+progress.importId+'.json',head):null;
  if(!source||source.date!==run.date||source.status!=='ready'||progress.nextPage!==source.pageCount+1)throw problem(422,'Lettura integrale della fonte non completata.');
  const reviewed=new Set((progress.reviewedClipPages||[]).map(x=>x.clipId+':'+x.page));
  if(body.articles.some(a=>a.pages.some((_,i)=>!reviewed.has(a.clipId+':'+(i+1)))))throw problem(422,'Verifica visiva dei ritagli incompleta.');
  if(body.date!==run.date||!body.intro||!body.articles.length||!body.coverage||body.coverage.examinedItems===null||body.coverage.frontPages===null||body.articles.some(a=>!a.clipId||!a.sourceId||!a.pages.length))throw problem(422,'Bozza incompleta: completare contenuti, copertine e ritagli prima della revisione.');
  for(const p of body.coverage.frontPages.filter(p=>p.juventus)){const clip=draft.assets?.find(x=>x.id===p.clipId&&x.kind==='clip');if(!p.sourceId||!clip||clip.source_id!==p.sourceId||JSON.stringify(clip.pages)!==JSON.stringify([p.page])||!reviewed.has(p.clipId+':1'))throw problem(422,'Prima pagina non associata o non verificata.');}
  for(const a of body.articles){const clip=draft.assets?.find(x=>x.id===a.clipId&&x.kind==='clip'),source=draft.assets?.find(x=>x.id===a.sourceId&&['source','source_reference'].includes(x.kind));if(!clip||!source||clip.source_id!==source.id||!clip.storage_path||JSON.stringify(clip.pages)!==JSON.stringify(a.pages))throw problem(422,'Ritagli non associati correttamente: non completare.');}
  if(phase!=='review')throw problem(422,'Completa la revisione prima di chiudere.');
  row.draftVersion=draftVersion;
  }
 }
 const time=now(ctx);row.timings[row.phase]=(row.timings[row.phase]||0)+Math.max(0,time-row.phaseStartedAt);row.phaseStartedAt=time;
 const reviewed=new Map([...(row.checkpoint.reviewedClipPages||[]),...(checkpoint.reviewedClipPages||[])].map(x=>[x.clipId+':'+x.page,x]));if(reviewed.size>2000)throw problem(413,'Troppi checkpoint di revisione.');
 row.phase=phase;row.checkpoint={...row.checkpoint,...checkpoint,...(reviewed.size?{reviewedClipPages:[...reviewed.values()]}:{})};row.updatedAt=time;row.status=status;row.retryable=status==='running'||(status==='failed'&&retryable);row.leaseUntil=status==='running'?time+LEASE_MS:time;
 await r.commit({[file(run.date)]:row},head,'Avanzamento automatismo Jump Press');return summary(row);
}
export async function assertRun(ctx,run){access(ctx);run=runSchema.parse(run);const r=repo(ctx),head=await r.begin(),row=await at(r,head,run.date);owned(ctx,row,run);return row;}
// Work activity renews the lease; text pages served by the server advance the reading cursor.
// Serving a page is what the server can certify: it is not proof of editorial review.
// Without run, text reads of the source assigned to the caller's running job are still attributed.
export async function recordActivity(ctx,{run,importId,pages=[]}={}){
 for(let attempt=0;;attempt++){
  try{return await recordActivityOnce(ctx,{run,importId,pages});}
  catch(error){if(!error.storeConflict||attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,100*2**attempt));}
 }
}
async function recordActivityOnce(ctx,{run,importId,pages}){
 access(ctx);const r=repo(ctx),head=await r.begin();let row;
 if(run){run=runSchema.parse(run);row=await at(r,head,run.date);owned(ctx,row,run);}
 else{
  if(!importId||!pages.length)return;
  const source=await r.read('imports/'+importId+'.json',head);if(!source?.date)return;
  row=await at(r,head,source.date);if(!row||row.status!=='running'||row.owner!==ctx.user.id)return;
 }
 let changed=false;
 if(importId&&!row.checkpoint.importId){
  // Adopt the import of the booked mail even if the worker never declared it.
  const source=await r.read('imports/'+importId+'.json',head);
  if(source?.date===row.date&&(!source.name||createHash('sha256').update(row.date+'|'+source.name).digest('hex')===row.sourceKey)){row.checkpoint={...row.checkpoint,importId};changed=true;}
 }
 if(pages.length&&importId&&row.checkpoint.importId===importId){
  const ranges=mergeRanges(row.checkpoint.readRanges,pages);
  if(JSON.stringify(ranges)!==JSON.stringify(row.checkpoint.readRanges||[])){row.checkpoint={...row.checkpoint,readRanges:ranges,nextPage:firstUnread(ranges)};changed=true;}
 }
 const time=now(ctx);
 // Coalesce: no write for a call that neither advances reading nor finds the lease older than two minutes.
 if(!changed&&row.leaseUntil-time>LEASE_MS-RENEW_AFTER_MS)return;
 row.updatedAt=time;row.leaseUntil=time+LEASE_MS;
 await r.commit({[file(row.date)]:row},head,changed?'Avanzamento lettura fonte (server)':'Attivita automatismo: rinnovo automatico');
}
// Fence content commits at their original Git snapshot. An intervening takeover makes
// the non-fast-forward commit fail, even if the old worker checked before takeover.
export function automationStore(ctx){
 const r=repo(ctx);
 return {begin:()=>r.begin(),read:(path,head)=>r.read(path,head),commit:async(files,head,message)=>{
  const dates=new Set();
  const collect=async value=>{if(!value)return;if(value.body?.date)dates.add(value.body.date);if(value.date)dates.add(value.date);if(value.edition_date)dates.add(value.edition_date);if(value.draft_id){const d=files['drafts/'+value.draft_id+'.json']||await r.read('drafts/'+value.draft_id+'.json',head);if(d?.body?.date)dates.add(d.body.date);}};
  for(const [path,value] of Object.entries(files)){if(/^(drafts|imports|assets|published)\//.test(path)&&!path.startsWith('imports/keys/')){await collect(value);if(path.startsWith('drafts/'))await collect(await r.read(path,head));}}
  if(ctx.automation){const run=runSchema.parse(ctx.automation),row=await at(r,head,run.date);owned(ctx,row,run);for(const date of dates)if(date!==run.date)throw problem(422,'L’esecuzione può modificare soltanto la propria data.');for(const [path,value] of Object.entries(files))if(path.startsWith('drafts/')&&value.id!==row.draftId)throw problem(422,'Usa la bozza assegnata a questa esecuzione (draftId restituito da claim_automation_run).');}
  for(const date of dates){const row=await at(r,head,date);if(row?.status==='running'&&(!ctx.automation||ctx.automation.date!==date))throw problem(409,'Rassegna riservata all’automatismo: attendi il completamento o recupera l’esecuzione interrotta.');}
  if(ctx.automation){
   const run=runSchema.parse(ctx.automation),row=await at(r,head,run.date);owned(ctx,row,run);
   // Same atomic commit as the content: no extra write can fail after a successful save.
   if(Object.keys(files).some(p=>/^(drafts|imports|assets)\//.test(p))){const time=now(ctx);files={...files,[file(run.date)]:{...row,updatedAt:time,leaseUntil:time+LEASE_MS}};}
  }
  return r.commit(files,head,message);
 }};
}
