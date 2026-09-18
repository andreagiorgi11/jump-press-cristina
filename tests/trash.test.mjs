import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MemoryStore} from './helpers.mjs';
import {newEdition} from '../lib/schema.js';
import {saveDraft,getDraft,deleteDraft,recoverDraft,listTrash} from '../lib/editor-service.js';
test('trash preserves data, checks permissions and rejects stale GPT writes after recovery',async()=>{
 const store=new MemoryStore(),ctx={store,role:'publisher',user:{id:'editor'}},id=randomUUID(),body=newEdition('2026-09-18');
 await saveDraft(ctx,id,0,body);
 await assert.rejects(deleteDraft({...ctx,role:'producer'},id,1),e=>e.status===403);
 await assert.rejects(deleteDraft(ctx,id,2),e=>e.status===409);
 await deleteDraft(ctx,id,1);assert.equal((await listTrash(ctx)).length,1);assert.equal(store.files['index.json'].drafts.length,0);
 assert.deepEqual(store.files['drafts/'+id+'.json'].body,{...body,coverage:null,toneSummary:''});
 await assert.rejects(getDraft(ctx,id),e=>e.status===410);
 await assert.rejects(saveDraft(ctx,id,0,body),e=>e.status===410);
 await recoverDraft(ctx,id,2);assert.equal((await listTrash(ctx)).length,0);assert.equal((await getDraft(ctx,id)).version,3);
 await assert.rejects(saveDraft(ctx,id,1,body),e=>e.status===409);
});
test('published drafts cannot be trashed; recovery cannot duplicate a date',async()=>{
 const store=new MemoryStore(),ctx={store,role:'editor',user:{id:'editor'}},id=randomUUID(),body=newEdition('2026-09-18');
 await saveDraft(ctx,id,0,body);await deleteDraft(ctx,id,1);const other=randomUUID();await saveDraft(ctx,other,0,body);
 await assert.rejects(recoverDraft(ctx,id,2),e=>e.status===409);
 const h=await store.begin(),d=await store.read('drafts/'+other+'.json',h);d.publishedVersions=[1];await store.commit({['drafts/'+other+'.json']:d},h);
 await assert.rejects(deleteDraft(ctx,other,1),e=>e.status===409);
});
test('deletion and a concurrent save cannot silently overwrite each other',async()=>{
 const store=new MemoryStore(),ctx={store,role:'editor',user:{id:'editor'}},id=randomUUID(),body=newEdition('2026-09-18');await saveDraft(ctx,id,0,body);
 const results=await Promise.allSettled([deleteDraft(ctx,id,1),saveDraft(ctx,id,1,{...body,intro:'Aggiornamento GPT'})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
});
