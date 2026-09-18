import test from 'node:test';import assert from 'node:assert/strict';import {MemoryStore} from './helpers.mjs';import {readClipPages} from '../lib/editor-service.js';
test('clip batch reads each PDF once, keeps order and continuation without lowering quality',async()=>{
 const store=new MemoryStore();await store.commit({'assets/a.json':{kind:'clip',storage_path:'a'},'assets/b.json':{kind:'clip',storage_path:'b'}},await store.begin());
 let reads=0,renders=0;const ctx={role:'editor',store,blobs:{read:async path=>{reads++;return path;}},renderPages:async(path,pages)=>{renders++;return {images:pages.map(page=>({page,mimeType:'image/jpeg',data:path+page})),remainingPages:[]};}};
 const items=[{clipId:'a',page:1},{clipId:'b',page:1},{clipId:'a',page:2},{clipId:'a',page:1}];const result=await readClipPages(ctx,items);
 assert.equal(reads,2);assert.equal(renders,2);assert.deepEqual(result.images.map(x=>({clipId:x.clipId,page:x.page})),items);assert.deepEqual(result.remainingItems,[]);
 ctx.renderPages=async(path,pages)=>({images:pages.map(page=>({page,mimeType:'image/jpeg',data:'x'.repeat(1600000)})),remainingPages:[]});
 const limited=await readClipPages(ctx,items);assert.equal(limited.images.length,1);assert.deepEqual(limited.remainingItems,items.slice(1));
 await assert.rejects(readClipPages({...ctx,role:'anonymous'},items),e=>e.status===403);
 ctx.blobs.read=async()=>{throw Error('unavailable');};await assert.rejects(readClipPages(ctx,items),/unavailable/);
});
