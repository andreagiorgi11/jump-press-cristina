import {createHash} from 'node:crypto';
import {activityArchive} from './blob-store.js';
import {incident} from './errors.js';
import {summarizeActivity} from './activity-report.js';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const dateValid=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function activityNamespace(repo=process.env.JUMP_CONTENT_REPO,branch=process.env.JUMP_CONTENT_BRANCH||'main'){
 if(!repo)throw Object.assign(Error('Archivio attività non configurato.'),{status:503});
 return createHash('sha256').update(repo+'\n'+branch).digest('hex').slice(0,24);
}
export async function saveActivityBatch(batch,{archive=activityArchive,namespace}={}){
 try{
  const date=dateValid(batch.identity.date)?batch.identity.date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date(batch.events[0].at));
  await archive.write('jump/activity/'+(namespace||activityNamespace())+'/'+date+'/'+batch.id+'.json',batch);
 }catch(e){await incident('activity_archive_unavailable');throw e;}
}
export async function readActivityReport(ctx,date,runId,{archive=activityArchive,namespace}={}){
 if(!['producer','editor','publisher'].includes(ctx?.role))throw Object.assign(Error('Accesso editor richiesto.'),{status:403});
 if(!dateValid(date)||(runId&&!UUID.test(runId)))throw Object.assign(Error('Data o esecuzione non valida.'),{status:400});
 const prefix='jump/activity/'+(namespace||activityNamespace())+'/'+date+'/';
 const listing=await archive.list();
 if(!Array.isArray(listing?.blobs))throw Object.assign(Error('Registro attività non leggibile.'),{status:503});
 const files=listing.blobs.filter(x=>typeof x.pathname==='string'&&x.pathname.startsWith(prefix)&&UUID.test(x.pathname.slice(prefix.length,-5))&&x.pathname.endsWith('.json'));
 if(files.length>2000)throw Object.assign(Error('Registro troppo grande: esportazione assistita necessaria.'),{status:413});
 const batches=[];
 for(let i=0;i<files.length;i+=4){
  const group=await Promise.all(files.slice(i,i+4).map(x=>archive.read(x.pathname)));
  for(const b of group){if(b?.schema!==1||!UUID.test(b.id)||!b.identity||!Array.isArray(b.events))throw Object.assign(Error('Registro attività incompleto o danneggiato.'),{status:503});batches.push(b);}
 }
 const selected=runId?batches.filter(b=>b.identity.runId===runId):batches;
 return {date,runId:runId||null,unassignedTraces:batches.filter(b=>!b.identity.runId).length,availability:selected.length?'available':'no_traces_observed',...summarizeActivity(selected)};
}
