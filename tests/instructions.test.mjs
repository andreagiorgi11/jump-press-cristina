import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './helpers.mjs';
import {readInstructions,saveInstructions} from '../lib/editorial-instructions.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createEditorialMcp} from '../lib/mcp-server.js';
const context=(store,role='publisher')=>({store,role,user:{id:'editor'}});
test('instructions preserve the source and support versioned saves without overwriting concurrent edits',async()=>{
 const store=new MemoryStore(),ctx=context(store),initial=await readInstructions(ctx);
 assert.equal(initial.version,1);assert.match(initial.text,/TITOLI – CONTROLLO OBBLIGATORIO/);assert.match(initial.text,/Ogni giorno alle 7:45/);assert.match(initial.text,/SOLO una bozza/);
 const saved=await saveInstructions(ctx,1,initial.text+'\nNota aggiunta dalla redazione.');
 assert.equal(saved.version,2);assert.equal((await readInstructions(ctx)).text,saved.text);
 await assert.rejects(saveInstructions(ctx,1,initial.text),e=>e.status===409);
 assert.equal((await readInstructions(ctx)).version,2);assert(store.files['settings/editorial-history/2.json']);
});
test('producer is read-only and service failures never become default instructions',async()=>{
 const store=new MemoryStore(),ctx=context(store,'producer'),initial=await readInstructions(ctx);
 await assert.rejects(saveInstructions(ctx,1,initial.text),e=>e.status===403);
 await assert.rejects(readInstructions(context(store,'anonymous')),e=>e.status===403);
 await assert.rejects(readInstructions(context({begin:async()=>{throw Error('offline');}})),/offline/);
 await store.commit({'settings/editorial-instructions.json':{text:'broken'}},await store.begin());
 await assert.rejects(readInstructions(ctx),e=>e.status===503);
});
test('MCP producer retrieves the latest instructions without a publication tool',async()=>{
 const store=new MemoryStore(),ctx=context(store,'producer'),server=createEditorialMcp(ctx,'producer');
 const client=new Client({name:'instructions-test',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
 try{await server.connect(a);await client.connect(b);const {tools}=await client.listTools();
 assert(!tools.some(t=>t.name==='publish_edition'));assert(tools.find(t=>t.name==='read_editorial_instructions').annotations.readOnlyHint);
 const r=await client.callTool({name:'read_editorial_instructions',arguments:{}});assert(!r.isError);const initial=JSON.parse(r.content[0].text);assert.equal(initial.version,1);
 await saveInstructions(context(store),1,initial.text+'\nNota aggiornata.');
 const next=await client.callTool({name:'read_editorial_instructions',arguments:{}});assert.equal(JSON.parse(next.content[0].text).version,2);
 }finally{await client.close();await server.close();}
});
