import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MemoryStore} from './helpers.mjs';
import {saveDraft,saveDraftForMcp} from '../lib/editor-service.js';
import {compactSavedDraft} from '../lib/save-verification.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createEditorialMcp} from '../lib/mcp-server.js';

const input=()=>({date:'2026-09-29',title:' Rassegna ',intro:'Introduzione',articles:[{id:randomUUID(),title:' Titolo ',author:'Autore',outlet:'Testata',category:'Prima squadra',isEditorial:true,summary:'EDITORIALE – Autore. La squadra prepara la gara.',pages:[1,2]}]});
const context=()=>({role:'editor',user:{id:'test'},store:new MemoryStore()});
test('MCP receipt verifies normalized content; web save still returns the full draft',async()=>{
 const ctx=context(),id=randomUUID(),body=input(),receipt=await saveDraftForMcp(ctx,id,0,body);
 assert.equal(receipt.verification.status,'verified');assert.equal(receipt.verification.editorialAccuracyVerified,false);
 assert.equal(receipt.version,1);assert.equal(receipt.saved,true);assert.equal(receipt.body,undefined);
 const actual=ctx.store.files['drafts/'+id+'.json'];assert.equal(actual.body.articles[0].summary,'La squadra prepara la gara.');
 assert.equal(actual.body.articles[0].title,'Titolo');assert.equal(actual.body.title,'Rassegna');
 const web=await saveDraft(ctx,id,1,{...actual.body,intro:'Nuova introduzione'});assert(web.body);assert(web.revisions);
});
test('every persisted editorial field is checked without forgiving content differences',async()=>{
 for(const [field,value] of [['title','Titolo diverso'],['author','Altra firma'],['summary','La squadra prepara 3 gare.'],['category','Altri temi'],['pages',[2,1]],['outlet','Altra testata']]){
  const ctx=context(),saved=await saveDraft(ctx,randomUUID(),0,input()),actual=structuredClone(saved);actual.body.articles[0][field]=value;
  const receipt=await compactSavedDraft({begin:async()=>({sha:'test'}),read:async()=>actual},saved);
  assert.equal(receipt.verification.status,'mismatch',field);assert.equal(receipt.verification.contentMatches,false);
  assert(receipt.verification.differences.includes('articles.0.'+field)||receipt.verification.differences.some(x=>x.startsWith('articles.0.'+field+'.')));
  assert.equal(receipt.warnings,null);
 }
});
test('read-back failure preserves successful write and does not retry it',async()=>{
 const ctx=context(),read=ctx.store.read.bind(ctx.store);ctx.store.read=async(p,h)=>{if(ctx.store.version>0&&p.startsWith('drafts/'))throw Error('private provider detail');return read(p,h);};
 const id=randomUUID(),r=await saveDraftForMcp(ctx,id,0,input());assert.equal(r.saved,true);assert.equal(r.verification.status,'unavailable');
 assert.equal(r.verification.contentMatches,null);assert.equal(r.verification.differences,null);assert.equal(r.warnings,null);
 assert.equal(ctx.store.version,1);assert(ctx.store.files['drafts/'+id+'.json']);assert(!JSON.stringify(r).includes('private provider detail'));
});
test('missing, malformed, deleted and concurrently changed drafts never pass',async()=>{
 const ctx=context(),d=await saveDraft(ctx,randomUUID(),0,input());
 for(const [actual,status] of [[null,'missing'],[{...d,id:randomUUID()},'invalid'],[{...d,body:null},'invalid'],[{...d,version:2},'version_conflict'],[{...d,deletedAt:'now'},'version_conflict']]){
  const r=await compactSavedDraft({begin:async()=>({sha:'test'}),read:async()=>actual},d);assert.equal(r.verification.status,status);assert.equal(r.verification.contentMatches,null);
 }
});
test('read-back uses a single fresh snapshot; later commits do not get silently mixed in',async()=>{
 const ctx=context(),d=await saveDraft(ctx,randomUUID(),0,input());let begins=0;
 const r=await compactSavedDraft({begin:async()=>{begins++;return {sha:'saved'};},read:async(p,h)=>{assert.equal(h.sha,'saved');assert.equal(p,'drafts/'+d.id+'.json');return structuredClone(d);}},d);
 assert.equal(begins,1);assert.equal(r.verification.status,'verified');
});
test('reserves, intro, Summary and missing articles are included in the comparison',async()=>{
 const ctx=context(),d=await saveDraft(ctx,randomUUID(),0,input());d.body.reserveArticles=[{...d.body.articles[0],id:randomUUID(),reserveReason:'Riserva'}];d.body.executiveSummary={intro:'Summary',sections:[]};
 for(const change of [x=>x.body.reserveArticles[0].summary='Diversa',x=>x.body.intro='Diversa',x=>x.body.executiveSummary.intro='Diverso',x=>x.body.articles=[]]){
  const actual=structuredClone(d);change(actual);const r=await compactSavedDraft({begin:async()=>({}),read:async()=>actual},d);assert.equal(r.verification.status,'mismatch');
 }
});
test('automatic clips final version and unsettled warnings survive compact receipt',async()=>{
 const ctx=context(),b=input();b.sourceImportId=randomUUID(); // Missing test source: must save explicit attention, not pretend clips exist.
 const r=await saveDraftForMcp(ctx,randomUUID(),0,b);assert.equal(r.version,2);assert.equal(r.verification.status,'verified');
 assert.equal(r.automaticClips.sourceUnavailable,true);assert(r.warnings.some(x=>x.type==='missingClip'));assert(r.warnings.some(x=>x.type==='pdfCheck'));
});
test('authorization and pre-save conflicts remain enforced',async()=>{
 const ctx=context(),id=randomUUID();await assert.rejects(saveDraftForMcp({...ctx,role:'guest'},id,0,input()),e=>e.status===403);assert.equal(ctx.store.version,0);
 const d=await saveDraft(ctx,id,0,input());await assert.rejects(saveDraftForMcp(ctx,id,0,d.body),e=>e.status===409);assert.equal(ctx.store.version,1);
});
test('real MCP save returns compact JSON and editor URL without full content',async()=>{
 const ctx=context(),server=createEditorialMcp(ctx),client=new Client({name:'receipt-test',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
 try{await server.connect(a);await client.connect(b);const body=input();body.articles=Array.from({length:27},()=>({...body.articles[0],id:randomUUID(),summary:'Contenuto verificato nella fonte. '.repeat(100)}));
  const result=await client.callTool({name:'save_draft',arguments:{id:randomUUID(),version:0,body}});assert(!result.isError);
  const r=JSON.parse(result.content[0].text);assert.equal(r.articleCount,27);assert.equal(r.verification.status,'verified');assert(r.editorUrl.includes('/editor?draft='));assert(!r.body);assert(!r.assets);assert(!r.revisions);
  assert(result.content[0].text.length<JSON.stringify(body).length/10,'receipt must avoid echoing large article text');
 }finally{await client.close();await server.close();}
});
