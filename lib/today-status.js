import {store,readIndex} from './github-store.js';
import {readRun} from './automation-runs.js';
// Promised to readers every day, weekends included.
export const READY_HOUR=8;
export function romeNow(at=Date.now()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hour12:false}).formatToParts(new Date(at)).map(x=>[x.type,x.value]));
 return {date:p.year+'-'+p.month+'-'+p.day,hour:Number(p.hour)%24};
}
// Reader notice only when the latest published edition is not today's.
export function readerNotice(latestDate,at){
 const {date,hour}=romeNow(at);
 if(latestDate===date)return null;
 return {today:date,latestDate:latestDate||null,state:hour<READY_HOUR?'scheduled':'preparing'};
}
// Editor view: automation run and draft of the day. No document content, only states.
export async function editorStatus(ctx,date,{now=Date.now}={}){
 const r=ctx.store||store,head=await r.begin(),index=await readIndex(r,head),run=await readRun(ctx,date);
 const draft=index.drafts.find(d=>d.body.date===date),published=index.published.some(p=>p.edition_date===date);
 return {date,published,draft:draft?{id:draft.id,version:draft.version,updatedAt:draft.updated_at}:null,
  run:{status:run.status,phase:run.phase||null,nextPage:run.checkpoint?.nextPage||null,updatedAt:run.updatedAt||null,stalled:run.status==='running'&&run.leaseUntil<=now(),attemptsRemaining:run.attemptsRemaining??null,warnings:(run.reviewWarnings||[]).length}};
}
export async function todayStatus(ctx){
 const r=ctx?.store||store,head=await r.begin(),index=await readIndex(r,head);
 const latestDate=index.published.map(p=>p.edition_date).sort().at(-1)||null;
 return {latestDate,notice:readerNotice(latestDate)};
}
