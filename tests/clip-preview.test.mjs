import test from 'node:test';
import assert from 'node:assert/strict';
import {createClipAccess,waitForPreparedClip} from '../lib/clip-access.js';
import {getDraftPreview} from '../lib/editor-service.js';
import {MemoryStore} from './helpers.mjs';
const response=(data,ok=true)=>({ok,json:async()=>data});
test('prepared clip access skips GitHub but checks the session on every open',async()=>{
 const calls=[];const access=createClipAccess({now:()=>100,fetcher:async(url)=>{calls.push(url);return response({authenticated:true,role:'editor'});}});
 access.replace({clip:{url:'https://files.test/one',expiresAt:300100}});
 assert.equal(await access.url('clip'),'https://files.test/one');assert.equal(await access.url('clip'),'https://files.test/one');assert.deepEqual(calls,['/api/auth/session','/api/auth/session']);
});
test('expiring link is renewed once and replacement invalidates the old capability',async()=>{
 let time=100;const calls=[];const access=createClipAccess({now:()=>time,fetcher:async(url)=>{calls.push(url);return response(url.includes('session')?{authenticated:true,role:'editor'}:{url:'https://files.test/new',expiresIn:300});}});
 access.replace({clip:{url:'old',expiresAt:101}});assert.equal(await access.url('clip'),'https://files.test/new');await access.url('clip');assert.equal(calls.filter(x=>x==='/api/editor').length,1);
 access.replace({clip:{url:'replacement',expiresAt:400000}});assert.equal(await access.url('clip'),'replacement');
});
test('logout, revoked role and failed session never serve a cached private link',async()=>{
 for(const session of [{authenticated:false},{authenticated:true,role:'reader'}]){let denied=0;const access=createClipAccess({fetcher:async()=>response(session),onDenied:()=>denied++});access.replace({clip:{url:'secret',expiresAt:Date.now()+300000}});await assert.rejects(access.url('clip'));assert.equal(denied,1);}
 const access=createClipAccess({fetcher:async()=>response({},false)});await assert.rejects(access.url('clip'),/temporaneamente/);
});
test('changing draft during access cannot return the previous draft link',async()=>{
 let resolve;const access=createClipAccess({fetcher:()=>new Promise(r=>resolve=r)});access.replace({clip:{url:'old',expiresAt:Date.now()+300000}});const pending=access.url('clip');access.replace();resolve(response({authenticated:true,role:'editor'}));await assert.rejects(pending,/cambiata/);
});
test('preview issues only referenced clips belonging to the authorized draft without writing',async()=>{
 const store=new MemoryStore(),draft={id:'d',version:2,body:{articles:[{clipId:'yes'},{clipId:'foreign'},{clipId:'source'}]},assets:[{id:'yes',kind:'clip',draft_id:'d',storage_path:'one'},{id:'foreign',kind:'clip',draft_id:'other',storage_path:'two'},{id:'source',kind:'source',draft_id:'d',storage_path:'original'},{id:'unused',kind:'clip',draft_id:'d',storage_path:'unused'}]};
 await store.commit({'drafts/d.json':draft},await store.begin());const version=store.version,calls=[];const ctx={role:'editor',store,blobs:{link:async(p,seconds)=>{calls.push([p,seconds]);return 'https://files.test/'+p;}}};
 const result=await getDraftPreview(ctx,'d');assert.deepEqual(Object.keys(result.previewLinks),['yes']);assert.deepEqual(calls,[['one',300]]);assert.equal(store.version,version);assert.equal((await store.read('drafts/d.json',await store.begin())).previewLinks,undefined);
 await assert.rejects(getDraftPreview({...ctx,role:'reader'},'d'),e=>e.status===403);
 await store.commit({'drafts/d.json':{...draft,deletedAt:'today'}},await store.begin());await assert.rejects(getDraftPreview(ctx,'d'),e=>e.status===410);
});

test('slow speculative download cannot block opening and completed download is retained',async()=>{
 let cancelled=0;await waitForPreparedClip(new Promise(()=>{}),()=>cancelled++,10);assert.equal(cancelled,1);
 await waitForPreparedClip(Promise.resolve(),()=>cancelled++,10);assert.equal(cancelled,1);
});
