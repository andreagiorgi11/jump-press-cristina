import {synthesisLabels} from './check-labels.js';
import {validateSummaryReady} from './summary-workflow.js';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {store,readIndex,problem} from './github-store.js';
import {sourceUrl} from './source-download.js';
import {editionSchema} from './schema.js';
export const LEASE_MS=10*60*1000;
const MAX_ATTEMPTS=3;
export const activityRenewalEnabled=ctx=>ctx.activityRenewal===true||process.env.JUMP_ACTIVITY_RENEWAL==='1';
const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(x=>!Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x);
export const runSchema=z.object({date:dateSchema,runId:z.string().uuid(),generation:z.number().int().positive()}).strict();
export const phaseSchema=z.enum(['import','reading','drafting','clips','review']);
export const checkpointSchema=z.object({importId:z.string().uuid().optional(),nextPage:z.number().int().positive().max(1001).optional(),reviewedClipPages:z.array(z.object({clipId:z.string().uuid(),page:z.number().int().positive().max(100)}).strict()).max(2000).optional()}).strict();
const rowSchema=z.object({date:dateSchema,sourceKey:z.string().regex(/^[a-f0-9]{64}$/),runId:z.string().uuid(),generation:z.number().int().positive(),owner:z.string(),draftId:z.string().uuid(),status:z.enum(['running','failed','completed']),leaseUntil:z.number().finite(),phase:phaseSchema,checkpoint:checkpointSchema,startedAt:z.number().finite(),updatedAt:z.number().finite(),phaseStartedAt:z.number().finite(),timings:z.record(z.string(),z.number().nonnegative()),reviewWarnings:z.array(z.string()).optional(),retryable:z.boolean(),draftVersion:z.number().int().positive().optional()}).strict();
const file=date=>'automation/runs/'+date+'.json';
const repo=ctx=>ctx.store||store;
const now=ctx=>ctx.now?ctx.now():Date.now();
function access(ctx){if(!['producer','editor','publisher'].includes(ctx?.role)||!ctx.user?.id)throw problem(403,'Accesso connettore richiesto.');}
async function at(r,head,date){const row=await r.read(file(date),head);if(row===null)return null;const result=rowSchema.safeParse(row);if(!result.success)throw problem(503,'Stato automatismo non valido: nessun nuovo avvio.');return result.data;}
function summary(row){return {reviewWarnings:row.reviewWarnings||[],status:row.status,date:row.date,draftId:row.draftId,generation:row.generation,leaseUntil:row.leaseUntil,phase:row.phase,checkpoint:row.checkpoint,timings:row.timings,startedAt:row.startedAt,updatedAt:row.updatedAt,draftVersion:row.draftVersion,retryable:row.retryable,attemptsRemaining:MAX_ATTEMPTS-row.generation};}
function owned(ctx,row,run){if(!row||row.status!=='running'||row.runId!==run.runId||row.generation!==run.generation||row.owner!==ctx.user.id||row.leaseUntil<=now(ctx))throw problem(409,'Esecuzione non più attiva: fermati, non salvare né pubblicare. Rileggi lo stato.');}
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
  // Before the import succeeds there is no draft to protect: a failed or abandoned import frees the day for the next scheduled check.
  const importStalled=prior?.phase==='import'&&(prior.status==='failed'||prior.leaseUntil<=time);
  if(prior&&(prior.generation>=MAX_ATTEMPTS||(!importStalled&&(!resume||!prior.retryable))))return {...summary(prior),acquired:false,reason:'recovery_requires_review',canResume:prior.retryable&&prior.generation<MAX_ATTEMPTS};
  const drafts=index.drafts.filter(d=>d.body.date===date),published=index.published.filter(d=>d.edition_date===date),trashed=(index.trash||[]).filter(d=>d.body.date===date);
  if(published.length||trashed.length||drafts.some(d=>d.id!==prior?.draftId))return {date,acquired:false,reason:'existing_edition_requires_review',status:'existing'};
  const row={date,sourceKey,runId:requestId,generation:(prior?.generation||0)+1,owner:ctx.user.id,draftId:prior?.draftId||randomUUID(),status:'running',leaseUntil:time+LEASE_MS,phase:prior?.phase||'import',checkpoint:prior?.checkpoint||{},startedAt:prior?.startedAt??time,updatedAt:time,phaseStartedAt:time,timings:prior?.timings||{},retryable:true};
  try{await r.commit({[file(date)]:row},head,'Prenotazione automatismo Jump Press');return {...summary(row),acquired:true,recovered:!!prior,run:{date,runId:requestId,generation:row.generation}};}
  catch(error){if(error.status!==409||attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,50*2**attempt));}
 }
}
export async function updateRun(ctx,{run,phase,checkpoint={},status='running',retryable=false,draftVersion}){
 access(ctx);run=runSchema.parse(run);phaseSchema.parse(phase);checkpoint=checkpointSchema.parse(checkpoint);z.enum(['running','failed','completed']).parse(status);
 const r=repo(ctx),head=await r.begin(),row=await at(r,head,run.date);owned(ctx,row,run);
 if(row.checkpoint.importId&&checkpoint.importId&&row.checkpoint.importId!==checkpoint.importId){
  const old=await r.read('imports/'+row.checkpoint.importId+'.json',head),draft=await r.read('drafts/'+row.draftId+'.json',head);
  if(!old||old.status==='ready'||draft||(old.status==='processing'&&now(ctx)-Date.parse(old.startedAt)<LEASE_MS))throw problem(409,'Non cambiare una fonte pronta o già usata dalla bozza.');
  row.checkpoint={};
 }
 if(checkpoint.nextPage&&row.checkpoint.nextPage&&checkpoint.nextPage<row.checkpoint.nextPage)throw problem(409,'Il cursore di lettura non può arretrare. Rileggi lo stato corrente.');
 if(checkpoint.importId){const source=await r.read('imports/'+checkpoint.importId+'.json',head);if(!source||source.date!==run.date)throw problem(409,'Fonte non associabile a questa data.');
  if(source.name&&createHash('sha256').update(run.date+'|'+source.name).digest('hex')!==row.sourceKey)throw problem(409,'Fonte diversa dalla mail prenotata.');}
 if(status==='completed'){
  const draft=await r.read('drafts/'+row.draftId+'.json',head);
  if(!draft||draft.deletedAt||draft.version!==draftVersion)throw problem(409,'Rileggi la versione corrente della bozza prima di completare.');
  const body=editionSchema.parse(draft.body);
  if(body.sourceImportId){
   row.reviewWarnings=[];
   if(body.sourceImportId!==row.checkpoint.importId)throw problem(409,'Fonte diversa dal lavoro prenotato.');
   try{await validateSummaryReady(body);}catch{row.reviewWarnings.push('Summary da verificare.');}
   const imported=await r.read('imports/'+body.sourceImportId+'.json',head);
   if(!imported||row.checkpoint.nextPage!==imported.pageCount+1)row.reviewWarnings.push('Lettura integrale da verificare.');
   if(!draft.automaticClips||draft.automaticClips.status!=='complete')row.reviewWarnings.push('PDF da verificare.');
   row.reviewWarnings.push(...new Set(body.articles.flatMap(a=>synthesisLabels(a.synthesisCheck)).map(label=>label+'.')));
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
// A successful source read is activity, not proof of editorial review.
export async function recordReadActivity(ctx,run,importId){
 if(!activityRenewalEnabled(ctx))return;
 access(ctx);run=runSchema.parse(run);const r=repo(ctx),head=await r.begin(),row=await at(r,head,run.date);owned(ctx,row,run);
 if(!importId||row.checkpoint.importId!==importId)throw problem(409,'Lettura non associata alla fonte del lavoro corrente.');
 // Coalesce frequent reads: no background timer and no write on every page.
 if(row.leaseUntil-now(ctx)>LEASE_MS-120000)return;
 const time=now(ctx);row.updatedAt=time;row.leaseUntil=time+LEASE_MS;
 await r.commit({[file(run.date)]:row},head,'Attivita lettura fonte: rinnovo automatico');
}
// Fence content commits at their original Git snapshot. An intervening takeover makes
// the non-fast-forward commit fail, even if the old worker checked before takeover.
export function automationStore(ctx){
 const r=repo(ctx);
 return {begin:()=>r.begin(),read:(path,head)=>r.read(path,head),commit:async(files,head,message)=>{
  const dates=new Set();
  const collect=async value=>{if(!value)return;if(value.body?.date)dates.add(value.body.date);if(value.date)dates.add(value.date);if(value.edition_date)dates.add(value.edition_date);if(value.draft_id){const d=files['drafts/'+value.draft_id+'.json']||await r.read('drafts/'+value.draft_id+'.json',head);if(d?.body?.date)dates.add(d.body.date);}};
  for(const [path,value] of Object.entries(files)){if(/^(drafts|imports|assets|published)\//.test(path)&&!path.startsWith('imports/keys/')){await collect(value);if(path.startsWith('drafts/'))await collect(await r.read(path,head));}}
  if(ctx.automation){const run=runSchema.parse(ctx.automation),row=await at(r,head,run.date);owned(ctx,row,run);for(const date of dates)if(date!==run.date)throw problem(409,'L’esecuzione può modificare soltanto la propria data.');for(const [path,value] of Object.entries(files))if(path.startsWith('drafts/')&&value.id!==row.draftId)throw problem(409,'Usa la bozza assegnata a questa esecuzione.');}
  for(const date of dates){const row=await at(r,head,date);if(row?.status==='running'&&(!ctx.automation||ctx.automation.date!==date))throw problem(409,'Rassegna riservata all’automatismo: attendi il completamento o recupera l’esecuzione interrotta.');}
  if(ctx.automation&&activityRenewalEnabled(ctx)){
   const run=runSchema.parse(ctx.automation),row=await at(r,head,run.date);owned(ctx,row,run);
   // Same atomic commit as the content: no extra write can fail after a successful save.
   if(Object.keys(files).some(p=>/^(drafts|imports|assets)\//.test(p))){const time=now(ctx);files={...files,[file(run.date)]:{...row,updatedAt:time,leaseUntil:time+LEASE_MS}};}
  }
  return r.commit(files,head,message);
 }};
}
