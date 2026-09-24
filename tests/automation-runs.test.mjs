import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MemoryStore} from './helpers.mjs';
import {claimRun,readRun,updateRun,automationStore,LEASE_MS} from '../lib/automation-runs.js';
import {saveDraft} from '../lib/editor-service.js';
import {newEdition} from '../lib/schema.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createEditorialMcp} from '../lib/mcp-server.js';
const date='2026-09-18',url='https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260918_16377886.pdf';
function fixture(){let time=1_800_000_000_000;return {role:'publisher',user:{id:'editor'},store:new MemoryStore(),now:()=>time,advance:ms=>{time+=ms;}};}
const claim=(ctx,extra={})=>claimRun(ctx,{date,url,requestId:randomUUID(),...extra});
test('simultaneous checks have one winner; lost response reuses reservation',async()=>{
 const ctx=fixture(),requestId=randomUUID();const results=await Promise.all([claim(ctx,{requestId}),claim(ctx),claim(ctx)]);
 assert.equal(results.filter(x=>x.acquired).length,1);const winner=results.find(x=>x.acquired);assert.equal(winner.run.runId,requestId);
 assert.deepEqual((await claim(ctx,{requestId})).run,winner.run);assert.equal(ctx.store.files['index.json'].drafts.length,0);
 assert.equal((await claim(ctx)).reason,'in_progress');
});
test('takeover preserves checkpoint and draft; fences stale and unclaimed writes',async()=>{
 const ctx=fixture(),first=await claim(ctx),old={...ctx,automation:first.run};
 const d=await saveDraft(old,first.draftId,0,newEdition(date));
 await updateRun(ctx,{run:first.run,phase:'reading',checkpoint:{nextPage:41}});
 await assert.rejects(saveDraft(ctx,d.id,1,{...d.body,intro:'manual edit'}),e=>e.status===409);
 ctx.advance(LEASE_MS+1);assert.equal((await claim(ctx)).reason,'recovery_requires_review');
 const second=await claim(ctx,{resume:true});assert(second.acquired);assert.equal(second.draftId,d.id);assert.equal(second.checkpoint.nextPage,41);assert.equal(second.run.generation,2);
 await assert.rejects(saveDraft(old,d.id,1,{...d.body,intro:'stale'}),e=>e.status===409);
 await assert.rejects(updateRun(ctx,{run:first.run,phase:'reading'}),e=>e.status===409);
 const next=await saveDraft({...ctx,automation:second.run},d.id,1,{...d.body,intro:'resumed'});assert.equal(next.version,2);
 await assert.rejects(saveDraft({...ctx,automation:second.run},randomUUID(),0,newEdition('2026-09-19')),e=>e.status===409);
});
test('Git snapshot fences an old commit prepared before takeover',async()=>{
 const ctx=fixture(),first=await claim(ctx),guarded=automationStore({...ctx,automation:first.run});const head=await guarded.begin();
 ctx.advance(LEASE_MS+1);await claim(ctx,{resume:true});
 await assert.rejects(guarded.commit({['drafts/'+first.draftId+'.json']:{id:first.draftId,body:newEdition(date)}},head,'stale'),e=>e.status===409);
 assert(!ctx.store.files['drafts/'+first.draftId+'.json']);
});
test('unavailable or corrupt state never permits a new job, and existing dates never duplicate',async()=>{
 const ctx=fixture();ctx.store.files['automation/runs/'+date+'.json']={bad:true};ctx.store.snapshots[0]=structuredClone(ctx.store.files);
 await assert.rejects(claim(ctx),e=>e.status===503);
 await assert.rejects(readRun({...ctx,store:{begin:async()=>{throw Error('offline');}}},date),/offline/);
 const clean=fixture();await saveDraft(clean,randomUUID(),0,newEdition(date));assert.equal((await claim(clean)).reason,'existing_edition_requires_review');
 await assert.rejects(saveDraft(clean,randomUUID(),0,newEdition(date)),e=>e.status===409);assert.equal(clean.store.files['index.json'].drafts.length,1);
});
test('recovery is bounded and respects non-transient failures and foreign owners',async()=>{
 const ctx=fixture();let current=await claim(ctx);
 await assert.rejects(updateRun({...ctx,user:{id:'other'}},{run:current.run,phase:'reading'}),e=>e.status===409);
 for(let n=1;n<=3;n++){await updateRun(ctx,{run:current.run,phase:'import',status:'failed',retryable:true});current=await claim(ctx,{resume:true});if(n<3)assert(current.acquired);else assert(!current.acquired);}
 const other=fixture(),job=await claim(other);await updateRun(other,{run:job.run,phase:'reading',status:'failed',retryable:false});assert(!(await claim(other,{resume:true})).acquired);
});
test('finish rejects incomplete work; completed draft is not rerun or published',async()=>{
 const ctx=fixture(),job=await claim(ctx),worker={...ctx,automation:job.run};let d=await saveDraft(worker,job.draftId,0,newEdition(date));
 await assert.rejects(updateRun(ctx,{run:job.run,phase:'review',status:'completed',draftVersion:1}),e=>e.status===422);
 const sourceId=randomUUID(),clipId=randomUUID();const body={...d.body,intro:'Verified summary',coverage:{examinedItems:1,sourceNote:'Verified source',frontPages:[],frontPageSummary:''},articles:[{id:randomUUID(),category:'Test',title:'Article',outlet:'Test',summary:'Summary',rating:3,sourceId,clipId,pages:[1]}]};
 d=await saveDraft(worker,d.id,1,body);await ctx.store.commit({['drafts/'+d.id+'.json']:{...d,assets:[{id:sourceId,kind:'source'},{id:clipId,kind:'clip',source_id:sourceId,storage_path:'test.pdf',pages:[1]}]}},await ctx.store.begin());
 const importId=randomUUID();await ctx.store.commit({['imports/'+importId+'.json']:{date,status:'ready',pageCount:1}},await ctx.store.begin());
 await updateRun(ctx,{run:job.run,phase:'review',checkpoint:{importId,nextPage:2}});
 await assert.rejects(updateRun(ctx,{run:job.run,phase:'review',status:'completed',draftVersion:2}),e=>e.status===422);
 await updateRun(ctx,{run:job.run,phase:'review',checkpoint:{reviewedClipPages:[{clipId,page:1}]}});
 ctx.advance(2000);const result=await updateRun(ctx,{run:job.run,phase:'review',status:'completed',draftVersion:2});assert.equal(result.status,'completed');assert.equal(result.timings.review,2000);assert.equal((await claim(ctx)).reason,'completed');assert.equal(ctx.store.files['index.json'].published.length,0);
 await assert.rejects(saveDraft(worker,d.id,2,{...body,intro:'late'}),e=>e.status===409);
});
test('MCP carries the run context into saves and disallows automatic publication',async()=>{
 const ctx=fixture(),server=createEditorialMcp(ctx),client=new Client({name:'automation-test',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
 try{await server.connect(a);await client.connect(b);const call=async(name,args)=>(await client.callTool({name,arguments:args}));
 const res=await call('claim_automation_run',{date,url,requestId:randomUUID()});assert(!res.isError);const job=JSON.parse(res.content[0].text);
 const denied=await call('save_draft',{id:job.draftId,version:0,body:newEdition(date)});assert(denied.isError);
 const saved=await call('save_draft',{id:job.draftId,version:0,body:newEdition(date),run:job.run});assert(!saved.isError);
 const publish=await call('publish_edition',{id:job.draftId,version:1,confirmation:'PUBBLICA',run:job.run});assert(publish.isError);assert.equal(JSON.parse(publish.content[0].text).status,403);
 }finally{await client.close();await server.close();}
});
test('a failed or abandoned import frees the day for the next scheduled check',async()=>{
 const ctx=fixture(),first=await claim(ctx);
 await updateRun(ctx,{run:first.run,phase:'import',status:'failed',retryable:false});
 const second=await claim(ctx);assert(second.acquired);assert.equal(second.run.generation,2);assert.equal(second.draftId,first.draftId);
 assert.equal((await claim(ctx)).reason,'in_progress');
 ctx.advance(LEASE_MS+1);const third=await claim(ctx);assert(third.acquired);assert.equal(third.run.generation,3);
 await assert.rejects(updateRun(ctx,{run:second.run,phase:'reading'}),e=>e.status===409);
 await updateRun(ctx,{run:third.run,phase:'import',status:'failed',retryable:false});
 const blocked=await claim(ctx);assert(!blocked.acquired);assert.equal(blocked.reason,'recovery_requires_review');
});
test('after the import, a failed run still requires explicit recovery',async()=>{
 const ctx=fixture(),first=await claim(ctx);
 await updateRun(ctx,{run:first.run,phase:'reading',checkpoint:{nextPage:5}});
 await updateRun(ctx,{run:first.run,phase:'reading',status:'failed',retryable:false});
 assert.equal((await claim(ctx)).reason,'recovery_requires_review');
});
