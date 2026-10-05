import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MemoryStore} from './helpers.mjs';
import {newEdition} from '../lib/schema.js';
import {saveDraft,getPublicationState,publishDraft,withdrawDraft} from '../lib/editor-service.js';
import {publicationWithRecovery} from '../lib/publication-recovery.js';

async function fixture(){
 const ctx={store:new MemoryStore(),role:'publisher',user:{id:'isolated'},blobs:{exists:async()=>{}}},id=randomUUID(),sourceId=randomUUID(),clipId=randomUUID();
 const draft=await saveDraft(ctx,id,0,{...newEdition('2026-09-26'),intro:'Introduzione verificata',articles:[{id:randomUUID(),title:'Titolo',category:'Juventus',outlet:'Testata',summary:'Sintesi',sourceId,clipId,pages:[1]}]});
 draft.assets=[{id:sourceId,kind:'source',draft_id:id,storage_path:'original.pdf'},{id:clipId,kind:'clip',draft_id:id,source_id:sourceId,pages:[1],storage_path:'clip.pdf'}];
 await ctx.store.commit({['drafts/'+id+'.json']:draft},await ctx.store.begin());return {ctx,draft};
}
function lostResponse(ctx,counter,after){return async(url,options)=>{
 if(options.method==='POST'){
  counter.writes++;const p=JSON.parse(options.body);
  await (p.action==='publish'?publishDraft:withdrawDraft)(ctx,p.id,p.version,p.confirmation);
  await after?.();throw new TypeError('Response lost');
 }
 assert.match(url,/\?publication=/);counter.reads++;
 return Response.json(await getPublicationState(ctx,new URL(url,'https://local.invalid').searchParams.get('publication')));
};}
test('publish and withdraw recover committed operations after lost responses with one write each',async()=>{
 const {ctx,draft}=await fixture(),counter={writes:0,reads:0},fetcher=lostResponse(ctx,counter);
 const published=await publicationWithRecovery('publish',draft,{fetcher});assert(published.publishedVersions.includes(draft.version));
 const withdrawn=await publicationWithRecovery('withdraw',published,{fetcher});assert(withdrawn.withdrawnAt);assert.equal(withdrawn.version,2);
 assert.deepEqual(counter,{writes:2,reads:2});assert.equal((await getPublicationState(ctx,draft.id)).publication,null);
});
test('a historical publication cannot be mistaken for an active one after withdrawal',async()=>{
 const {ctx,draft}=await fixture();await publishDraft(ctx,draft.id,1,'PUBBLICA');await withdrawDraft(ctx,draft.id,1,'RITIRA_E_MODIFICA');
 await assert.rejects(publishDraft(ctx,draft.id,1,'PUBBLICA'),e=>e.status===409);
 await assert.rejects(publicationWithRecovery('publish',draft,{fetcher:async(url,o)=>o.method==='POST'?Response.json({error:'Conflict'},{status:409}):Response.json(await getPublicationState(ctx,draft.id))}),e=>!!e.draft?.withdrawnAt);
});
test('publication recovery notices a concurrent withdrawal instead of showing success',async()=>{
 const {ctx,draft}=await fixture(),counter={writes:0,reads:0};
 await assert.rejects(publicationWithRecovery('publish',draft,{fetcher:lostResponse(ctx,counter,()=>withdrawDraft(ctx,draft.id,1,'RITIRA_E_MODIFICA'))}),/non risulta confermata/);
 assert.equal(counter.writes,1);
});
test('withdrawal recovery notices republication instead of showing success',async()=>{
 const {ctx,draft}=await fixture();await publishDraft(ctx,draft.id,1,'PUBBLICA');const counter={writes:0,reads:0};
 await assert.rejects(publicationWithRecovery('withdraw',draft,{fetcher:lostResponse(ctx,counter,()=>publishDraft(ctx,draft.id,2,'PUBBLICA'))}),/non risulta confermata/);
 assert.equal((await getPublicationState(ctx,draft.id)).publication.version,2);
});
test('unavailable reads do not cause a second publication attempt',async()=>{
 let calls=0;await assert.rejects(publicationWithRecovery('publish',{id:randomUUID(),version:1},{fetcher:async()=>{calls++;throw Error('offline');}}),/Esito non verificabile/);assert.equal(calls,2);
});
test('permission and validation errors are surfaced without recovery requests',async()=>{
 for(const status of [400,401,403,422]){let calls=0;await assert.rejects(publicationWithRecovery('publish',{id:randomUUID(),version:1},{fetcher:async()=>{calls++;return Response.json({error:'Denied'},{status});}}),e=>e.status===status);assert.equal(calls,1);}
});
test('publication state requires editor access and rejects inconsistent snapshots',async()=>{
 const {ctx,draft}=await fixture();await assert.rejects(getPublicationState({...ctx,role:'guest'},draft.id),e=>e.status===403);
 await publishDraft(ctx,draft.id,1,'PUBBLICA');await ctx.store.commit({'published/2026-09-26.json':{draft_id:draft.id,version:99}},await ctx.store.begin());
 await assert.rejects(getPublicationState(ctx,draft.id),e=>e.status===503);
});
