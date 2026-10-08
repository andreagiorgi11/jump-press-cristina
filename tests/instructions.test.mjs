import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './helpers.mjs';
import {readInstructions,saveInstructions,readPreferences,savePreferences} from '../lib/editorial-instructions.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createEditorialMcp} from '../lib/mcp-server.js';
const context=(store,role='publisher')=>({store,role,user:{id:'editor'}});
test('base is immutable for every editor role; preferences have separate history and optimistic concurrency',async()=>{
 const store=new MemoryStore(),ctx=context(store),initial=await readInstructions(ctx);
 for(const role of ['producer','editor','publisher'])await assert.rejects(saveInstructions(context(store,role),1,'changed'),e=>e.status===403);
 const next=await savePreferences(ctx,0,'Preferisci fonti alternative a CronacaQui quando equivalenti.','SALVA_PREFERENZE');
 assert.equal(next.version,1);assert.equal(next.updatedBy,'editor');
 const current=await readInstructions(ctx);assert.equal(current.baseText,initial.baseText);assert.equal(current.version,initial.version);assert(current.text.includes(next.text));assert.equal(current.preferences.version,1);
 await assert.rejects(savePreferences(ctx,0,'stale','SALVA_PREFERENZE'),e=>e.status===409);
 assert(store.files['settings/editorial-preferences-history/1.json']);
 await savePreferences(ctx,1,'','SALVA_PREFERENZE');assert.equal((await readPreferences(ctx)).text,'');assert.equal(store.files['settings/editorial-preferences-history/1.json'].text,next.text);
});
test('permissions, confirmation and unavailable data fail closed',async()=>{
 const store=new MemoryStore(),ctx=context(store);
 await assert.rejects(savePreferences(context(store,'producer'),0,'x','SALVA_PREFERENZE'),e=>e.status===403);
 await assert.rejects(savePreferences({...ctx,automation:{}},0,'x','SALVA_PREFERENZE'),e=>e.status===403);
 await assert.rejects(savePreferences(ctx,0,'x'),e=>e.status===422);
 await assert.rejects(readInstructions(context(store,'anonymous')),e=>e.status===403);
 await assert.rejects(readInstructions(context({begin:async()=>{throw Error('offline');}})),/offline/);
 await store.commit({'settings/editorial-preferences.json':{text:'broken'}},await store.begin());
 await assert.rejects(readInstructions(ctx),e=>e.status===503);
});
test('preferences remain isolated by editorial profile',async()=>{
 const store=new MemoryStore(),ctx=context(store),summary={...ctx,editorialModel:'summary-v1'};
 await savePreferences(summary,0,'Preferenza Summary','SALVA_PREFERENZE');
 assert.equal((await readPreferences(ctx)).text,'');assert.equal((await readInstructions(summary)).preferences.text,'Preferenza Summary');
});
for(const role of ['producer','editor','publisher'])test('MCP '+role+' exposes immutable base and permission-aware preferences',async()=>{
 const store=new MemoryStore(),server=createEditorialMcp(context(store,role)),client=new Client({name:'preferences-test',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
 try{await server.connect(a);await client.connect(b);const {tools}=await client.listTools();
 assert(!tools.some(t=>t.name==='save_editorial_instructions'));
 assert.equal(tools.some(t=>t.name==='save_editorial_preferences'),role!=='producer');
 const before=JSON.parse((await client.callTool({name:'read_editorial_instructions',arguments:{}})).content[0].text);assert.match(before.saveDraftRequirements,/id in formato UUID/);assert.match(before.saveDraftRequirements,/Non compilare factCheck/);assert(tools.find(t=>t.name==='save_draft').description.includes(before.saveDraftRequirements));assert.equal(before.connectionPermissions.canEditInstructions,false);assert.match(before.preferencePolicy,/conferma esplicita/);
 if(role!=='producer'){
 const args={version:0,text:'Preferenza confermata'};
 assert((await client.callTool({name:'save_editorial_preferences',arguments:args})).isError);
 const saved=await client.callTool({name:'save_editorial_preferences',arguments:{...args,confirmation:'SALVA_PREFERENZE'}});assert(!saved.isError);
 const stale=await client.callTool({name:'save_editorial_preferences',arguments:{...args,confirmation:'SALVA_PREFERENZE'}});assert(stale.isError);assert.equal(JSON.parse(stale.content[0].text).status,409);
 const after=JSON.parse((await client.callTool({name:'read_editorial_instructions',arguments:{}})).content[0].text);assert.equal(after.preferences.text,args.text);assert.equal(after.baseText,before.baseText);
 }
 }finally{await client.close();await server.close();}
});

test('Summary reads only its active profile and preferences, concurrently at the same fresh commit',async()=>{
 const paths=[],heads=[];let release;const bothStarted=new Promise(resolve=>{release=resolve;});
 const saved={version:7,text:'Regole Summary correnti. '.repeat(8),updatedAt:'2026-10-07',updatedBy:'editor'};
 const store={begin:async()=>({sha:'current'}),read:async(path,head)=>{
  paths.push(path);heads.push(head.sha);if(paths.length===2)release();
  await bothStarted;
  if(path==='settings/summary-editorial-instructions.json')return saved;
  if(path==='settings/summary-editorial-preferences.json')return {version:2,text:'Preferenza corrente',updatedAt:null,updatedBy:null};
  throw Error('Unexpected legacy read');
 }};
 const result=await readInstructions({...context(store),editorialModel:'summary-v1'});
 assert(result.baseText.startsWith(saved.text.trim()));assert.equal(result.workflowRevision,"editorial-review-v1");assert.equal(result.preferences.version,2);
 assert.deepEqual(heads,['current','current']);assert.equal(paths.length,2);
});
test('Summary falls back only for an absent profile; failures never become default instructions',async()=>{
 const store=new MemoryStore(),ctx={...context(store),editorialModel:'summary-v1'};
 assert.equal((await readInstructions(ctx)).baseVersion,1);
 store.read=async path=>{if(path==='settings/summary-editorial-instructions.json')throw Error('offline');return null;};
 await assert.rejects(readInstructions(ctx),/offline/);
 store.read=async path=>path==='settings/summary-editorial-instructions.json'?{text:'invalid'}:null;
 await assert.rejects(readInstructions(ctx),e=>e.status===503);
});
