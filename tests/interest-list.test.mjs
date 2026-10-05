import test from 'node:test';import assert from 'node:assert/strict';
import {MemoryStore} from './helpers.mjs';
import {splitInterestList,mergeInterestList,mergeGeneralPreferences,INTEREST_START} from '../lib/interest-list.js';
import {readInterests,saveInterests} from '../lib/interest-service.js';
import {readPreferences,savePreferences,readInstructions} from '../lib/editorial-instructions.js';
const entries=[{kind:'journalist',name:'Guido Vaciago',role:'Giornalista ed editorialista'},{kind:'subject',name:'Giorgio Chiellini',role:'Dirigente Juventus'}];
const context=store=>({store,role:'editor',editorialModel:'summary-v1',user:{id:'editor'}});
test('interest and general editors preserve each other and combined instructions deliver the list without MCP changes',async()=>{
 const store=new MemoryStore(),ctx=context(store);await savePreferences(ctx,0,'Preferisci fonti alternative a CronacaQui.','SALVA_PREFERENZE');
 const saved=await saveInterests(ctx,{version:1,entries});assert.equal(saved.version,2);assert.deepEqual(saved.entries,entries);
 const prefs=await readPreferences(ctx);assert.equal(splitInterestList(prefs.text).general,'Preferisci fonti alternative a CronacaQui.');
 const combined=await readInstructions(ctx);assert(combined.text.includes('Giorgio Chiellini'));assert(combined.text.includes('Guido Vaciago'));assert.equal(combined.preferences.version,2);
 await savePreferences(ctx,2,mergeGeneralPreferences('Nuova preferenza generale.',prefs.text),'SALVA_PREFERENZE');assert.deepEqual((await readInterests(ctx)).entries,entries);
 const removed=await saveInterests(ctx,{version:3,entries:[]});assert.deepEqual(removed.entries,[]);assert.equal(splitInterestList((await readPreferences(ctx)).text).general,'Nuova preferenza generale.');
 assert(store.files['settings/summary-editorial-preferences-history/2.json']);
});
test('stale edits are rejected and preserve both saved list and unrelated preferences',async()=>{
 const store=new MemoryStore(),ctx=context(store);await saveInterests(ctx,{version:0,entries});
 await assert.rejects(saveInterests(ctx,{version:0,entries:[]}),e=>e.status===409);assert.deepEqual((await readInterests(ctx)).entries,entries);
});
test('only interactive editors can write; producer reads and invalid inputs cannot corrupt the list',async()=>{
 const store=new MemoryStore(),ctx=context(store);
 for(const denied of [{...ctx,role:'producer'},{...ctx,automation:{}}])await assert.rejects(saveInterests(denied,{version:0,entries}),e=>e.status===403);
 for(const invalid of [[{...entries[0],name:''}],[{...entries[0],role:'bad\nrole'}],[entries[0],entries[0]]])await assert.rejects(saveInterests(ctx,{version:0,entries:invalid}),e=>e.status===422);
 await saveInterests(ctx,{version:0,entries});assert.equal((await readInterests({...ctx,role:'producer'})).canEdit,false);
});
test('unavailable and damaged preferences fail explicitly instead of reporting zero names',async()=>{
 const broken={begin:async()=>{throw Error('offline');}};await assert.rejects(readInterests(context(broken)),/offline/);
 assert.throws(()=>splitInterestList('Existing text\n'+INTEREST_START),e=>e.status===503);
 assert.throws(()=>splitInterestList(mergeInterestList('General',entries).replace(' — ',' | ')),e=>e.status===503);
});
