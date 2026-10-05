import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {activityTrace,activityStep,activityEvent,activityBackground,bindActivity,activityResult} from '../lib/activity-trace.js';
import {readActivityReport,saveActivityBatch} from '../lib/activity-store.js';
import {summarizeActivity,unionIntervals} from '../lib/activity-report.js';
import {createEditorialMcp} from '../lib/mcp-server.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {MemoryStore} from './helpers.mjs';

const options=batches=>({log:()=>{},persist:async b=>batches.push(structuredClone(b))});
async function session(ctx,fn){const server=createEditorialMcp(ctx),client=new Client({name:'trace-test',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();try{await server.connect(a);await client.connect(b);return await fn(client);}finally{await client.close();await server.close();}}

test('metadata only, unchanged return/error, persistence failure and logger failure cannot fail work',async()=>{
 const batches=[],secret='NEVER-LOG-TEXT-OR-TOKEN';
 const value=await activityTrace(options(batches),async()=>{activityEvent('example',{body:secret,url:secret,token:secret,articleId:secret,articles:2});return 42;});
 assert.equal(value,42);assert(!JSON.stringify(batches).includes(secret));
 const error=Object.assign(Error(secret),{status:503});
 await assert.rejects(activityTrace(options(batches),()=>activityStep('source.read',()=>{throw error;})),e=>e===error);
 assert(!JSON.stringify(batches).includes(secret));assert.equal(batches[1].events.find(e=>e.event==='span.end').outcome,'error');
 assert.equal(await activityTrace({persist:async()=>{throw error;},log:()=>{throw error;}},async()=>7),7);
});
test('background context survives deferred scheduling and separates overlapping activity',async()=>{
 const batches=[],runId=randomUUID();let task;
 await activityTrace(options(batches),async()=>{bindActivity({runId,date:'2026-09-29'});task=activityBackground('source.import',async()=>{activityEvent('download.done',{bytes:12});});});
 await task();assert.equal(batches.length,2);assert.equal(batches[1].identity.runId,runId);assert.equal(batches[1].identity.parentTraceId,batches[0].id);assert.notEqual(batches[0].id,batches[1].id);
});
test('concurrent traces do not leak identity; deferred archive does not block response',async()=>{
 const batches=[],deferred=[],ids=[randomUUID(),randomUUID()];
 await Promise.all(ids.map((runId,i)=>activityTrace({...options(batches),defer:fn=>deferred.push(fn)},async()=>{bindActivity({runId});await new Promise(r=>setTimeout(r,i?1:5));activityEvent('marker',{runId});})));
 assert.equal(batches.length,0);await Promise.all(deferred.map(f=>f()));
 for(const b of batches)assert.equal(b.events.find(e=>e.event==='marker').runId,b.identity.runId);
});
test('real MCP result unchanged; full text/page/image counters and error separated',async()=>{
 const batches=[],store=new MemoryStore(),importId=randomUUID();
 await store.commit({['imports/'+importId+'.json']:{id:importId,date:'2026-09-29',status:'ready',pageCount:2,textPath:'test'}},await store.begin());
 const ctx={role:'publisher',user:{id:'test'},store,activity:options(batches),blobs:{readText:async()=>({pages:[{page:1,text:'Testo segreto à'},{page:2,text:'Seconda pagina'}]})}};
 await session(ctx,async client=>{
  for(let i=0;i<2;i++){
   const r=await client.callTool({name:'read_source_text_batch',arguments:{importId,startPage:1,maxPages:2}});
   assert.equal(r.isError,undefined);const payload=JSON.parse(r.content[0].text);assert.equal(payload.pages[0].text,'Testo segreto à');
   const recorded=batches.at(-1).events.find(e=>e.event==='tool.result');assert.equal(recorded.responseTextCharacters,r.content[0].text.length);assert.equal(recorded.sourceTextCharacters,29);
  }
  const r=await client.callTool({name:'read_import_status',arguments:{importId:randomUUID()}});assert.equal(r.isError,true);
 });
 assert(!JSON.stringify(batches).includes('Testo segreto'));
 const report=summarizeActivity(batches);assert.equal(report.totals.repeatedTextPages,2);assert.equal(report.totals.uniqueTextPages,2);assert.equal(report.totals.errors,1);
 assert.equal(report.calls.find(c=>c.outcome==='error').metrics,null);
});
test('images count served pages, not requested or remaining pages, without storing image content',async()=>{
 const batches=[],importId=randomUUID(),data=Buffer.from('private image').toString('base64');
 await activityTrace(options(batches),async()=>{
  for(let i=0;i<2;i++)activityResult('read_source_pages',{importId,pages:[1,2]}, {mcpContent:[{type:'text',text:JSON.stringify({remainingPages:[2]})},{type:'text',text:JSON.stringify({page:1})},{type:'image',mimeType:'image/jpeg',data}]});
 });
 const report=summarizeActivity(batches);assert.equal(report.totals.imageCount,2);assert.equal(report.totals.repeatedImages,1);assert.equal(report.totals.uniqueImages,1);assert.equal(report.totals.imageBytes,26);assert(!JSON.stringify(batches).includes(data));
});
test('archive scoped, authenticated, missing/error not zero data',async()=>{
 const batches=[];await activityTrace(options(batches),async()=>bindActivity({date:'2026-09-29',runId:randomUUID()}));
 const files=new Map(),archive={write:async(p,b)=>files.set(p,b),list:async()=>({blobs:[...files.keys()].map(pathname=>({pathname}))}),read:async p=>files.get(p)};
 await saveActivityBatch(batches[0],{archive,namespace:'test'});
 await assert.rejects(readActivityReport({role:'anonymous'},'2026-09-29',null,{archive,namespace:'test'}),e=>e.status===403);
 const report=await readActivityReport({role:'editor'},'2026-09-29',null,{archive,namespace:'test'});assert.equal(report.traces,1);
 assert.equal((await readActivityReport({role:'editor'},'2026-09-29',null,{archive,namespace:'other'})).availability,'no_traces_observed');
 await assert.rejects(readActivityReport({role:'editor'},'2026-09-29',null,{namespace:'test',archive:{list:async()=>{throw Error('unavailable');}}}),/unavailable/);
 await assert.rejects(readActivityReport({role:'editor'},'2026-02-31',null,{archive,namespace:'test'}),e=>e.status===400);
});
test('overlap, gap, dedup and unfinished operations produce honest totals',()=>{
 assert.deepEqual(unionIntervals([[0,10],[2,20],[30,40]]),[[0,20],[30,40]]);
 const batch=(s,e)=>({id:randomUUID(),identity:{},events:[{event:'trace.start',at:new Date(s).toISOString(),sequence:0},{event:'trace.end',at:new Date(e).toISOString(),durationMs:e-s,sequence:1}]});
 const a=batch(0,10),b=batch(2,20),c=batch(30,40),r=summarizeActivity([a,a,b,c]);
 assert.equal(r.traces,3);assert.equal(r.totals.serverObservedMs,30);assert.equal(r.totals.nonObservableMs,10);
 const incomplete={...a,id:randomUUID(),events:[a.events[0],{event:'span.start',spanId:'a',at:new Date(1).toISOString(),sequence:1}]};
 assert(summarizeActivity([incomplete]).warnings.some(w=>w.reason==='unfinished_operations'));
});
