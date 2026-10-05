import test from 'node:test';
import assert from 'node:assert/strict';
import {originalSourceLink} from '../lib/original-source.js';
import {MemoryStore} from './helpers.mjs';
const draftId='a8118058-98c9-4b2a-9dc8-e54ea716238d',importId='e42137e4-0a43-4719-80f0-06e36e015e31';
async function fixture(source={},draft={}){
 const store=new MemoryStore(),calls=[];
 await store.commit({['drafts/'+draftId+'.json']:{id:draftId,body:{sourceImportId:importId},...draft},['imports/'+importId+'.json']:{id:importId,status:'ready',originalPath:'jump/imports/'+importId+'/original.pdf',...source}},await store.begin());
 return {store,role:'editor',blobs:{link:async(...args)=>{calls.push(args);return 'https://files.example/signed';}},calls};
}
test('only editor and publisher can obtain an expiring link to the associated original',async()=>{
 const ctx=await fixture();
 for(const role of [undefined,'anonymous','producer'])await assert.rejects(originalSourceLink({...ctx,role},draftId),e=>e.status===403);
 assert.equal(ctx.calls.length,0);
 for(const role of ['editor','publisher'])assert.equal(await originalSourceLink({...ctx,role},draftId),'https://files.example/signed');
 assert.deepEqual(ctx.calls,[['jump/imports/'+importId+'/original.pdf',300],['jump/imports/'+importId+'/original.pdf',300]]);
});
test('deleted, unready, missing and trashed originals never produce a link',async()=>{
 for(const [source,draft,status] of [[{originalDeletedAt:'2026-09-28'}, {},410],[{status:'processing'},{},409],[{originalPath:'other/private.pdf'},{},503],[{},{body:{}},404],[{},{deletedAt:'2026-09-28'},410]]){
  const ctx=await fixture(source,draft);await assert.rejects(originalSourceLink(ctx,draftId),e=>e.status===status);assert.equal(ctx.calls.length,0);
 }
});
test('storage and repository failures propagate instead of becoming missing originals',async()=>{
 const ctx=await fixture();ctx.blobs.link=async()=>{throw Object.assign(Error('offline'),{status:503});};
 await assert.rejects(originalSourceLink(ctx,draftId),e=>e.status===503);
 ctx.store.begin=async()=>{throw Object.assign(Error('offline'),{status:503});};
 await assert.rejects(originalSourceLink(ctx,draftId),e=>e.status===503);
});
