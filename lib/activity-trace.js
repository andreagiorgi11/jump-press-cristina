import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';

// Only metadata crosses this boundary. Never pass bodies, URLs, headers or errors.
const scope=new AsyncLocalStorage();
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const ids=new Set(['runId','importId','draftId','clipId','articleId','parentTraceId']);
const numbers=new Set(['generation','version','articles','reserves','attempt','status','durationMs','inputCharacters','responseTextCharacters','responseTextBytes','sourceTextCharacters','imageCount','imageBytes','fileCount','bytes','waitMs']);
const labels=new Set(['tool','phase','operation','resource','method','outcome','reason','kind']);
function safe(data={}){
 const out={};
 for(const [k,v] of Object.entries(data)){
  if(ids.has(k)&&uuid(v))out[k]=v;
  else if(numbers.has(k)&&Number.isFinite(v)&&v>=0)out[k]=v;
  else if(labels.has(k)&&typeof v==='string'&&/^[a-zA-Z0-9_.:-]{1,80}$/.test(v))out[k]=v;
  else if(k==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(v))out[k]=v;
  else if(['pages','remainingPages'].includes(k)&&Array.isArray(v))out[k]=v.filter(p=>Number.isInteger(p)&&p>0&&p<=1000).slice(0,1000);
  else if(k==='textPages'&&Array.isArray(v))out[k]=v.filter(p=>Number.isInteger(p.page)&&p.page>0&&p.page<=1000&&Number.isFinite(p.characters)&&p.characters>=0).slice(0,1000).map(p=>({page:p.page,characters:p.characters}));
  else if(k==='clipPages'&&Array.isArray(v))out[k]=v.filter(p=>uuid(p.clipId)&&Number.isInteger(p.page)&&p.page>0&&p.page<=1000).slice(0,1000).map(p=>({clipId:p.clipId,page:p.page}));
 }
 return out;
}
export function activityEvent(name,data={}){
 try{
  const frame=scope.getStore();if(!frame)return;
  const t=frame.trace;
  if(t.events.length>=2000){t.dropped++;return;}
  const event={schema:1,traceId:t.id,sequence:t.sequence++,at:new Date().toISOString(),event:name,...(frame.spanId?{spanId:frame.spanId}:{}),...safe(data)};
  t.events.push(event);try{t.log('[Jump Press Activity] '+JSON.stringify(event));}catch{t.logFailures++;}
 }catch{/* Measurement must never change the editorial operation. */}
}
export function bindActivity(data){try{const t=scope.getStore()?.trace;if(t)Object.assign(t.identity,safe(data));}catch{}}
export function activityPersistence(persist){const t=scope.getStore()?.trace;if(t)t.persist=persist;}
export function hasActivityEvent(name){return scope.getStore()?.trace.events.some(e=>e.event===name)||false;}
export async function activityStep(operation,fn,data={}){
 const frame=scope.getStore();if(!frame)return fn();
 const spanId=randomUUID(),started=performance.now();
 return scope.run({...frame,spanId},async()=>{
  activityEvent('span.start',{operation,...data});
  try{const result=await fn();activityEvent('span.end',{operation,outcome:'ok',durationMs:performance.now()-started,...data});return result;}
  catch(e){activityEvent('span.end',{operation,outcome:'error',status:e?.status||503,durationMs:performance.now()-started,...data});throw e;}
 });
}
export async function activityTrace(options,fn){
 if(options?.enabled===false||process.env.JUMP_ACTIVITY_DISABLED==='1')return fn();
 const t={id:randomUUID(),identity:safe(options?.identity),events:[],sequence:0,dropped:0,logFailures:0,log:options?.log||console.info,persist:options?.persist};
 const started=performance.now();
 return scope.run({trace:t},async()=>{
  activityEvent('trace.start',{kind:options?.kind||'request',...t.identity});
  let outcome='ok';
  try{return await fn();}catch(e){outcome='error';activityEvent('trace.error',{status:e?.status||503});throw e;}
  finally{
   activityEvent('trace.end',{kind:options?.kind||'request',outcome,durationMs:performance.now()-started,...t.identity});
   if(t.persist){
    const batch={schema:1,id:t.id,identity:t.identity,events:t.events,dropped:t.dropped,logFailures:t.logFailures};
    const save=async()=>{try{await t.persist(batch);}catch{try{t.log('[Jump Press Activity] '+JSON.stringify({schema:1,traceId:t.id,event:'persistence.failed',at:new Date().toISOString()}));}catch{}}};
    // Next after() performs the archive write after the response, off the work path.
    try{if(options.defer)options.defer(save);else await save();}catch{try{t.log('[Jump Press Activity] '+JSON.stringify({schema:1,traceId:t.id,event:'persistence.unscheduled',at:new Date().toISOString()}));}catch{}}
   }
  }
 });
}
// Capture the parent now: Next may execute after() outside the caller's ALS scope.
export function activityBackground(operation,fn){
 const t=scope.getStore()?.trace;
 if(!t)return fn;
 const identity={...t.identity,parentTraceId:t.id};
 return ()=>activityTrace({kind:'background',identity,persist:t.persist,log:t.log},()=>activityStep(operation,fn));
}
function requestMeta(name,args){
 const meta={tool:name,...args.run,importId:args.importId,draftId:args.draftId||(['save_draft','read_draft','update_articles'].includes(name)?args.id:undefined),phase:args.phase};
 if(name==='read_source_text'&&Number.isInteger(args.startPage)&&Number.isInteger(args.endPage))meta.pages=Array.from({length:Math.min(1000,Math.max(0,args.endPage-args.startPage+1))},(_,i)=>args.startPage+i);
 else if(name==='read_source_text_batch')meta.pages=Array.from({length:args.maxPages||40},(_,i)=>args.startPage+i);
 else if(name==='read_source_page')meta.pages=[args.page];
 else if(name==='read_source_pages')meta.pages=args.pages;
 else if(name==='read_clip_page')meta.clipPages=[{clipId:args.clipId,page:args.page}];
 else if(name==='read_clip_pages')meta.clipPages=args.items;
 return meta;
}
export function activityResult(name,args,result){
 try{
  bindActivity({...result?.run,importId:result?.importId,draftId:result?.draftId,phase:args.phase});
  const content=result?.mcpContent||[{type:'text',text:JSON.stringify(result)}];
  const text=content.filter(x=>x.type==='text').map(x=>x.text||'');
  const images=content.filter(x=>x.type==='image');
  const data={tool:name,outcome:'ok',responseTextCharacters:text.reduce((n,s)=>n+s.length,0),responseTextBytes:text.reduce((n,s)=>n+Buffer.byteLength(s),0),imageCount:images.length,imageBytes:images.reduce((n,i)=>n+Buffer.byteLength(i.data||'','base64'),0),version:result?.version};
  if(['read_source_text','read_source_text_batch'].includes(name)){
   data.textPages=(result?.pages||[]).map(p=>({page:p.page,characters:typeof p.text==='string'?p.text.length:0}));data.sourceTextCharacters=data.textPages.reduce((n,p)=>n+p.characters,0);data.pages=data.textPages.map(p=>p.page);data.importId=args.importId;
  }
  if(images.length){
   const markers=text.flatMap(s=>{try{const p=JSON.parse(s);return Number.isInteger(p.page)?[p]:[];}catch{return [];}});
   if(name.startsWith('read_source_')){data.pages=markers.map(x=>x.page);data.importId=args.importId;}
   else data.clipPages=markers.map(x=>({clipId:x.clipId,page:x.page}));
  }
  const body=result?.body||args.body;
  if(name==='save_draft'||name==='update_articles'){data.articles=body?.articles?.length??result?.articles?.length;data.reserves=body?.reserveArticles?.length;data.draftId=result?.id||args.id;}
  activityEvent('tool.result',data);
 }catch{activityEvent('measurement.failed',{tool:name});}
}
export function traceTool(name,args,db,fn){
 const work=()=>{
  const meta=requestMeta(name,args);bindActivity(meta);
  try{activityEvent('tool.request',{...meta,inputCharacters:JSON.stringify(args).length});}catch{activityEvent('measurement.failed',{tool:name});}
  return activityStep('mcp.tool',fn,{tool:name});
 };
 return scope.getStore()?work():db?.activity?activityTrace(db.activity,work):fn();
}
