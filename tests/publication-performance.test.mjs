import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {MemoryStore} from './helpers.mjs';
import {newEdition} from '../lib/schema.js';
import {saveDraft,publishDraft} from '../lib/editor-service.js';
async function fixture(fail=false){
 const store=new MemoryStore(),id=randomUUID(),sourceId=randomUUID();let active=0,peak=0,mails=0;const calls=[];
 const ctx={store,role:'publisher',user:{id:'test'},notifyPublished:async()=>{mails++;return {status:'sent'};},blobs:{exists:async path=>{calls.push(path);peak=Math.max(peak,++active);try{await delay(10);if(fail&&path==='clip0.pdf')throw Error('Missing PDF');}finally{active--;}}}};
 const articles=Array.from({length:12},(_,i)=>({id:randomUUID(),title:'Article '+i,summary:'Summary',category:'Juventus',outlet:'Test',sourceId,clipId:randomUUID(),pages:[i+1]}));
 const d=await saveDraft(ctx,id,0,{...newEdition('2026-10-07'),intro:'Intro',articles});
 d.assets=[{id:sourceId,kind:'source',draft_id:id,storage_path:'original.pdf'},...articles.map((a,i)=>({id:a.clipId,kind:'clip',draft_id:id,source_id:sourceId,pages:a.pages,storage_path:'clip'+i+'.pdf'}))];
 await store.commit({['drafts/'+id+'.json']:d},await store.begin());
 return {ctx,id,stats:()=>({active,peak,mails,calls})};
}
test('publication checks files concurrently with a limit and checks shared originals once',async()=>{
 const f=await fixture();await publishDraft(f.ctx,f.id,1,'PUBBLICA');
 const s=f.stats();assert.equal(s.peak,4);assert.equal(s.active,0);assert.equal(s.calls.length,13);assert.equal(s.calls.filter(p=>p==='original.pdf').length,1);assert.equal(s.mails,1);
});
test('failed parallel file check drains reads and prevents publication and mail',async()=>{
 const f=await fixture(true);await assert.rejects(publishDraft(f.ctx,f.id,1,'PUBBLICA'),/Missing PDF/);
 assert.equal(f.stats().active,0);assert.equal(f.stats().mails,0);assert.equal(f.ctx.store.files['index.json'].published.length,0);assert.equal(f.ctx.store.files['published/2026-10-07.json'],undefined);
});
