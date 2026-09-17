import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createEditorialMcp} from '../lib/mcp-server.js';
import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {MemoryStore} from './helpers.mjs';
import {sameOrigin} from '../lib/errors.js';
for(const role of ['producer','editor','publisher'])test(`MCP handshake and tool permissions: ${role}`,async()=>{
 const server=createEditorialMcp({role,store:new MemoryStore(),user:{id:"editor"}});
 const client=new Client({name:'isolated-test',version:'1.0'});
 const [a,b]=InMemoryTransport.createLinkedPair();
 try{
  await server.connect(a);await client.connect(b);
  const {tools}=await client.listTools();
  assert.equal(tools.some(t=>t.name==='publish_edition'),role==='publisher');
  for(const name of ['read_source_text_batch','read_source_pages','read_clip_pages','create_import_clips','import_source_url','read_import_status','read_source_text','read_source_page','create_import_clip','read_clip_page','prepare_clip_upload','read_draft','save_draft','create_clip','prepare_pdf_upload','restore_revision'])assert(tools.some(t=>t.name===name));
  const response=await client.callTool({name:'read_editorial_instructions',arguments:{}});
  assert(!response.isError);
  const {connectionPermissions:p,scheduledPublicationAllowed}=JSON.parse(response.content[0].text);
  assert.equal(p.effectiveRole,role);assert.equal(p.serverEnforced,true);
  assert.equal(p.canPublish,tools.some(t=>t.name==='publish_edition'));
  assert.equal(p.suitableForScheduledAutomation,true);
  assert.equal(p.scheduledPublicationAllowed,false);
  assert.equal(p.scheduledPublicationRestriction,'instruction_policy');
  assert.equal(p.publicationRequiresExplicitUserRequest,true);
  assert.equal(p.canWriteDrafts,true);assert.equal(p.canReadPrivateSources,true);
  assert.equal(scheduledPublicationAllowed,false);
  const invalid=await client.callTool({name:'save_draft',arguments:{id:'bad',version:0,body:{}}});
  assert.equal(invalid.isError,true);
 }finally{await client.close();await server.close();}
});
test('stateless HTTP responses remain readable after transport cleanup',async()=>{
 for(const payload of [
  {jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'test',version:'1'}}},
  {jsonrpc:'2.0',id:2,method:'tools/list',params:{}}
 ]){
  const server=createEditorialMcp({role:'publisher'});
  const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  await server.connect(transport);
  const response=await transport.handleRequest(new Request('https://test.invalid/mcp',{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify(payload)}));
  await server.close();assert.equal(response.status,200);assert((await response.json()).result);
 }
});
test('browser writes reject absent or foreign Origin and support Next internal hostname',()=>{
 const req=origin=>new Request('http://localhost:3015/api/editor',{headers:{host:'127.0.0.1:3015',...(origin?{origin}:{})}});
 assert.doesNotThrow(()=>sameOrigin(req('http://127.0.0.1:3015')));
 assert.throws(()=>sameOrigin(req('https://foreign.invalid')),/Origine/);
 assert.throws(()=>sameOrigin(req()),/Origine/);
});

test('MCP refuses missing or unrecognized authenticated roles',()=>{
 for(const role of [undefined,'guest'])assert.throws(()=>createEditorialMcp({role}),/autenticato/);
});
