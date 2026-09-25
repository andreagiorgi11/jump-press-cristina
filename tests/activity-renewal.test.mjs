import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {MemoryStore} from './helpers.mjs';import {claimRun,recordActivity,readRun,LEASE_MS,updateRun,mergeRanges} from '../lib/automation-runs.js';import {saveDraft} from '../lib/editor-service.js';import {newEdition} from '../lib/schema.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';import {createEditorialMcp} from '../lib/mcp-server.js';
const date='2026-09-18',url='https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260918_16377886.pdf';
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
async function fixture({pageCount=284,declareImport=true}={}){
 let time=1800000000000;const ctx={role:'publisher',user:{id:'editor'},store:new MemoryStore(),now:()=>time},advance=ms=>time+=ms;
 let fail=false;ctx.blobs={readText:async()=>{if(fail)throw Object.assign(Error('unavailable'),{status:503});return {pages:range(1,pageCount).map(page=>({page,text:'original source '+page}))};}};
 const job=await claimRun(ctx,{date,url,requestId:randomUUID()}),importId=randomUUID();
 await ctx.store.commit({['imports/'+importId+'.json']:{id:importId,date,status:'ready',pageCount,textPath:'test'}},await ctx.store.begin());
 if(declareImport)await updateRun(ctx,{run:job.run,phase:'reading',checkpoint:{importId}});
 return {ctx,job,importId,advance,failReads:v=>{fail=v;}};
}
async function mcp(ctx,fn){const server=createEditorialMcp(ctx),client=new Client({name:'activity-test',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
 try{await server.connect(a);await client.connect(b);return await fn(async(name,args)=>{const r=await client.callTool({name,arguments:args});return {isError:!!r.isError,body:JSON.parse(r.content[0].text)};});}finally{await client.close();await server.close();}}

test('reading ranges merge and the cursor is the first unread page',()=>{
 assert.deepEqual(mergeRanges([],[3,1,2,7]),[[1,3],[7,7]]);
 assert.deepEqual(mergeRanges([[1,40],[81,120]],range(41,80)),[[1,120]]);
});
test('the cursor follows pages actually served; a declared nextPage is ignored, never an error',async()=>{
 const {ctx,job,importId}=await fixture();
 await recordActivity(ctx,{run:job.run,importId,pages:range(1,40)});assert.equal((await readRun(ctx,date)).checkpoint.nextPage,41);
 // 25/09 regression: the worker declared 271 without reading, then tried to step back.
 await updateRun(ctx,{run:job.run,phase:'reading',checkpoint:{nextPage:271}});assert.equal((await readRun(ctx,date)).checkpoint.nextPage,41);
 await updateRun(ctx,{run:job.run,phase:'reading',checkpoint:{nextPage:5}});assert.equal((await readRun(ctx,date)).checkpoint.nextPage,41);
 // A gap keeps the cursor at the first unread page.
 await recordActivity(ctx,{run:job.run,importId,pages:range(81,120)});assert.equal((await readRun(ctx,date)).checkpoint.nextPage,41);
 await recordActivity(ctx,{run:job.run,importId,pages:range(41,80)});assert.equal((await readRun(ctx,date)).checkpoint.nextPage,121);
});
test('activity renews after the threshold without touching phase, timings or checkpoint',async()=>{
 const {ctx,job,importId,advance}=await fixture();const before=await readRun(ctx,date),v=ctx.store.version;
 await recordActivity(ctx,{run:job.run,importId});assert.equal(ctx.store.version,v);
 advance(120001);await recordActivity(ctx,{run:job.run,importId});const after=await readRun(ctx,date);
 assert.equal(after.leaseUntil,before.leaseUntil+120001);assert.deepEqual(after.checkpoint,before.checkpoint);assert.equal(after.phase,before.phase);assert.deepEqual(after.timings,before.timings);
});
test('an expired lease is revived by the same worker until another check takes over',async()=>{
 const {ctx,job,importId,advance}=await fixture();
 advance(LEASE_MS+60000);
 await recordActivity(ctx,{run:job.run,importId,pages:range(1,40)});const row=await readRun(ctx,date);assert.equal(row.checkpoint.nextPage,41);assert(row.leaseUntil>1800000000000+LEASE_MS+60000);
 const r=await updateRun(ctx,{run:job.run,phase:'drafting'});assert.equal(r.phase,'drafting');
});
test('a lost or closed run stops the worker with stop=true',async()=>{
 const {ctx,job,importId,advance}=await fixture();
 await assert.rejects(recordActivity({...ctx,user:{id:'other'}},{run:job.run,importId}),e=>e.status===409&&e.stop);
 await assert.rejects(recordActivity(ctx,{run:{...job.run,generation:2},importId}),e=>e.status===409&&e.stop);
 advance(LEASE_MS+1);const next=await claimRun(ctx,{date,url,requestId:randomUUID()});assert(next.acquired);
 await assert.rejects(recordActivity(ctx,{run:job.run,importId,pages:[1]}),e=>e.status===409&&e.stop);
 await assert.rejects(updateRun(ctx,{run:job.run,phase:'reading'}),e=>e.status===409&&e.stop);
 await updateRun(ctx,{run:next.run,phase:'reading',status:'failed',retryable:false});
 await assert.rejects(recordActivity(ctx,{run:next.run,importId}),e=>e.status===409&&e.stop);
});
test('interrupted run resumes at the next check without resume flag, from the server cursor',async()=>{
 const {ctx,job,importId,advance}=await fixture();
 await recordActivity(ctx,{run:job.run,importId,pages:range(1,120)});
 await updateRun(ctx,{run:job.run,phase:'reading',checkpoint:{nextPage:271}});
 advance(LEASE_MS+1);
 const second=await claimRun(ctx,{date,url,requestId:randomUUID()});
 assert(second.acquired);assert(second.recovered);assert.equal(second.run.generation,2);assert.equal(second.checkpoint.nextPage,121);assert.equal(second.checkpoint.importId,importId);assert.equal(second.draftId,job.draftId);
});
test('reads adopt the booked import and are attributed even without run',async()=>{
 const {ctx,job,importId}=await fixture({declareImport:false});
 await recordActivity(ctx,{run:job.run,importId,pages:range(1,10)});
 let row=await readRun(ctx,date);assert.equal(row.checkpoint.importId,importId);assert.equal(row.checkpoint.nextPage,11);
 await recordActivity(ctx,{importId,pages:range(11,20)});row=await readRun(ctx,date);assert.equal(row.checkpoint.nextPage,21);
 // Another user's reads never move this run.
 await recordActivity({...ctx,user:{id:'other'}},{importId,pages:range(21,30)});assert.equal((await readRun(ctx,date)).checkpoint.nextPage,21);
});
test('saves renew atomically without changing the draft version contract',async()=>{
 const {ctx,job,advance}=await fixture();const before=await readRun(ctx,date);advance(180000);const v=ctx.store.version;
 const draft=await saveDraft({...ctx,automation:job.run},job.draftId,0,newEdition(date));assert.equal(draft.version,1);assert.equal(ctx.store.version,v+1);
 assert.equal((await readRun(ctx,date)).leaseUntil,before.leaseUntil+180000);
 await assert.rejects(saveDraft({...ctx,automation:job.run},job.draftId,0,newEdition(date)),e=>e.status===409);
});
test('concurrent activity is retried, not surfaced, and never loses pages',async()=>{
 const {ctx,job,importId,advance}=await fixture();advance(180000);const v=ctx.store.version;await readRun(ctx,date);assert.equal(ctx.store.version,v);
 const results=await Promise.allSettled([recordActivity(ctx,{run:job.run,importId,pages:range(1,40)}),recordActivity(ctx,{run:job.run,importId,pages:range(41,80)})]);
 assert(results.every(x=>x.status==='fulfilled'));assert.equal((await readRun(ctx,date)).checkpoint.nextPage,81);
});
test('MCP: the 25/09 morning end to end — batch reads move the cursor, declared cursors and slow workers do not block',async()=>{
 const {ctx,job,importId,advance,failReads}=await fixture();
 await mcp(ctx,async call=>{
  let start=1;
  while(start){
   const r=await call('read_source_text_batch',{run:job.run,importId,startPage:start,maxPages:40});assert(!r.isError);start=r.body.nextPage;
   const renew=await call('renew_automation_run',{run:job.run,phase:'reading',checkpoint:{nextPage:start?Math.max(1,start-30):285}});assert(!renew.isError,JSON.stringify(renew.body));
   advance(4*60000);
  }
  assert.equal((await readRun(ctx,date)).checkpoint.nextPage,285);
  // Twelve idle minutes: the same worker keeps going.
  advance(LEASE_MS+2*60000);assert(!(await call('read_draft',{id:randomUUID(),run:job.run})).body.stop);
  const renew=await call('renew_automation_run',{run:job.run,phase:'drafting'});assert(!renew.isError);
  // Failed reads never advance the cursor or renew.
  const before=await readRun(ctx,date);failReads(true);advance(180000);
  assert((await call('read_source_text',{run:job.run,importId,startPage:1,endPage:1})).isError);
  assert.equal((await readRun(ctx,date)).leaseUntil,before.leaseUntil);
  await call('read_automation_run',{date});assert.equal((await readRun(ctx,date)).leaseUntil,before.leaseUntil);
  // A wrong source is correctable (stop=false); a takeover is not.
  const wrong=await call('read_source_text',{run:job.run,importId:randomUUID(),startPage:1,endPage:1});assert(wrong.isError);assert.equal(wrong.body.status,422);assert.equal(wrong.body.stop,false);
  advance(LEASE_MS+1);const next=await claimRun(ctx,{date,url,requestId:randomUUID()});assert(next.acquired);
  const lost=await call('renew_automation_run',{run:job.run,phase:'drafting'});assert(lost.isError);assert.equal(lost.body.status,409);assert.equal(lost.body.stop,true);
 });
});
