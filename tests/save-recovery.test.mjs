import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileSave,saveWithRecovery,editorRequest} from '../lib/save-recovery.js';
import {MemoryStore} from './helpers.mjs';
import {saveDraft,getDraft} from '../lib/editor-service.js';
import {newEdition} from '../lib/schema.js';
import {randomUUID} from 'node:crypto';

test('lost save response is reconciled against the real service without a second write',async()=>{
 const ctx={store:new MemoryStore(),role:'editor',user:{id:'isolated'}},draft=await saveDraft(ctx,randomUUID(),0,newEdition('2026-09-26'));
 const body={...draft.body,intro:'Correzione verificata'};let writes=0;
 const fetcher=async(url,options)=>{
  if(options.method==='POST'){writes++;const x=JSON.parse(options.body);await saveDraft(ctx,x.id,x.version,x.body);throw new TypeError('Lost response');}
  return Response.json(await getDraft(ctx,draft.id));
 };
 const result=await saveWithRecovery(draft,body,{fetcher});
 assert.equal(result.saved,true);assert.equal(result.draft.version,2);assert.equal(writes,1);
});
test('recovery retains independent changes and requires explicit saving',()=>{
 const base={intro:'A',title:'B'},local={...base,intro:'Mine'},remote={...base,title:'Other'};
 assert.deepEqual(reconcileSave(base,local,remote),{body:{intro:'Mine',title:'Other'},conflicts:[],saved:false});
});
test('same-field conflicts and article array edits are never silently overwritten',()=>{
 const base={intro:'A',articles:[{id:'a',title:'A'}]},local={intro:'Mine',articles:[]},remote={intro:'Other',articles:[{id:'a',title:'Other'}]};
 const result=reconcileSave(base,local,remote);assert.deepEqual(result.conflicts,['intro','articles']);assert.equal(result.saved,false);assert.deepEqual(result.body,local);
});
test('validation and authorization failures never trigger recovery requests',async()=>{
 for(const status of [400,401,403,422]){let calls=0;await assert.rejects(saveWithRecovery({id:'a',version:1,body:{}},{},{fetcher:async()=>{calls++;return Response.json({error:'Denied'},{status});}}),e=>e.status===status);assert.equal(calls,1);}
});
test('unavailable reconciliation does not claim success or repeat the write',async()=>{
 let calls=0;await assert.rejects(saveWithRecovery({id:'a',version:1,body:{}},{intro:'Mine'},{fetcher:async()=>{calls++;throw Error('offline');}}),/Non è possibile verificare/);assert.equal(calls,2);
});
test('requests have a bounded timeout',async()=>{
 await assert.rejects(editorRequest('a',{timeout:10,fetcher:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))))}),/aborted/);
});
test('article recovery recognizes saved text despite refreshed server-owned checks',()=>{
 const article={id:'a',title:'Before',pdfCheck:{status:'pending'}};
 const base={articles:[article]},local={articles:[{...article,title:'After'}]},remote={articles:[{...article,title:'After',pdfCheck:{status:'complete'}}]};
 assert.equal(reconcileSave(base,local,remote).saved,true);
});
test('article recovery merges separate fields but keeps same-field conflicts',()=>{
 const article={id:'a',title:'Before',summary:'Original'};
 const base={articles:[article]},local={articles:[{...article,title:'Mine'}]},remote={articles:[{...article,summary:'Other'}]};
 const result=reconcileSave(base,local,remote);assert.deepEqual(result.conflicts,[]);assert.deepEqual(result.body.articles[0],{id:'a',title:'Mine',summary:'Other'});assert.equal(result.saved,false);
 remote.articles[0].title='Concurrent';assert.deepEqual(reconcileSave(base,local,remote).conflicts,['articles.a.title']);
});
