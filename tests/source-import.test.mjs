import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {MemoryStore} from './helpers.mjs';
import {sourceUrl} from '../lib/source-download.js';
import {extractSourceText,renderSourcePage} from '../lib/source-pdf.js';
import {importPdf,getImport,readImportText,createImportClip,purgeOriginals} from '../lib/source-service.js';
import {saveDraft,publishDraft,publicClip,withdrawDraft} from '../lib/editor-service.js';
import {newEdition} from '../lib/schema.js';
import {claimRun,readRun,updateRun} from '../lib/automation-runs.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createEditorialMcp} from '../lib/mcp-server.js';
const url='https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260917_16377886.pdf';
async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 doc.addPage().drawText('Juventus - articolo di prova per controllo estrazione pagina uno',{font,size:12,x:20,y:700});doc.addPage();
 const bytes=await doc.save(),files=new Map(),store=new MemoryStore();
 const put=async(p,b)=>{assert(!files.has(p),'immutable');files.set(p,b);};
 const blobs={writeOriginal:put,readOriginal:async p=>files.get(p),writeText:put,readText:async p=>files.get(p),write:put,read:async p=>files.get(p),exists:async p=>{assert(files.has(p));},link:async()=> 'https://test.invalid/clip',removeOriginal:async p=>files.delete(p)};
 return {role:'publisher',user:{id:'test'},store,blobs,files,downloadSource:async()=>({bytes}),extractSourceText};
}
test('Ecostampa importer rejects SSRF, credentials, altered paths and wrong dates',()=>{
 assert.equal(sourceUrl(url,'2026-09-17').name,'PP_RAS_1626482_20260917_16377886.pdf');
 for(const value of ['http://localhost/a.pdf',url.replace('rassegna.dominiocliente.it','127.0.0.1'),url+'&redirect=http://localhost',url.replace('https://','https://user:pass@'),url+'#test',url.replace('/Areas/Rassegna/Elab/CheckedDownload.aspx','/private')])assert.throws(()=>sourceUrl(value));
 assert.throws(()=>sourceUrl(url,'2026-09-18'),/data/);
});
test('server import -> text/image -> clip -> private draft -> explicit publication -> retention',async()=>{
 const ctx=await fixture(),r=await importPdf(ctx,{url,date:'2026-09-17'});
 assert.equal(r.status,'ready');assert.equal(r.pageCount,2);assert.deepEqual(r.pagesWithLittleText,[2]);
 assert.equal(ctx.store.files['index.json'].drafts.length,0);
 assert.equal((await importPdf(ctx,{url,date:'2026-09-17'})).importId,r.importId);
 const text=await readImportText(ctx,r.importId,1,2);assert.match(text.pages[0].text,/Juventus/);assert.equal(text.pages[1].needsVisualCheck,true);
 const row=await getImport(ctx,r.importId),image=await renderSourcePage(ctx.files.get(row.originalPath),1);assert(Buffer.from(image.data,'base64').length>1000);
 await assert.rejects(readImportText({...ctx,role:'guest'},r.importId,1,1),/Accesso/);
 await assert.rejects(readImportText(ctx,r.importId,1,3),/pagine/);
 const id=randomUUID();await saveDraft(ctx,id,0,newEdition('2026-09-17'));
 const clip=await createImportClip(ctx,{importId:r.importId,draftId:id,pages:[1]});
 assert.equal((await createImportClip(ctx,{importId:r.importId,draftId:id,pages:[1]})).clipId,clip.clipId);
 assert.equal(await publicClip(clip.clipId,ctx.store,ctx.blobs),null);
 assert.equal((await purgeOriginals(ctx)).deleted,0);
 const body={...newEdition('2026-09-17'),intro:'Test verificato',articles:[{id:randomUUID(),category:'Juventus',title:'Test',summary:'Testo verificato',outlet:'Testata',author:'',rating:3,sourceId:clip.sourceId,clipId:clip.clipId,pages:[1]}]};
 await saveDraft(ctx,id,1,body);
 await assert.rejects(publishDraft({...ctx,role:'producer'},id,2,'PUBBLICA'),/Permesso/);
 await publishDraft(ctx,id,2,'PUBBLICA');assert(await publicClip(clip.clipId,ctx.store,ctx.blobs));
 const published=await getImport(ctx,r.importId);assert(published.deleteAfter);
 assert.equal(Date.parse(published.deleteAfter)-Date.parse(published.firstPublishedAt),24*60*60*1000);
 const withdrawn=await withdrawDraft(ctx,id,2,'RITIRA_E_MODIFICA');
 assert.equal((await purgeOriginals(ctx,Date.parse(published.deleteAfter))).deleted,0);
 await publishDraft(ctx,id,withdrawn.version,'PUBBLICA');
 assert.equal((await getImport(ctx,r.importId)).deleteAfter,published.deleteAfter);
 assert.equal((await purgeOriginals(ctx,Date.parse(published.deleteAfter)-1)).deleted,0);
 assert.equal((await purgeOriginals(ctx,Date.parse(published.deleteAfter))).deleted,1);
 assert(!ctx.files.has(row.originalPath));assert(ctx.files.has(row.textPath));assert(await publicClip(clip.clipId,ctx.store,ctx.blobs));
 assert.equal((await readImportText(ctx,r.importId,1,1)).pages.length,1);
});
test('failed download stays failed, creates no blank edition and needs explicit retry',async()=>{
 const ctx=await fixture();ctx.downloadSource=async()=>{throw Object.assign(Error('Download fallito'),{status:502});};
 await assert.rejects(importPdf(ctx,{url,date:'2026-09-17'}),/fallito/);
 const result=await importPdf(ctx,{url,date:'2026-09-17'});assert.equal(result.status,'failed');assert.equal(ctx.store.files['index.json'].drafts.length,0);
});
test('a PDF not ready yet is checked again by the next call without retry',async()=>{
 const ctx=await fixture(),good=ctx.downloadSource;let calls=0;
 ctx.downloadSource=async(...a)=>{if(++calls===1)throw Object.assign(Error('PDF Ecostampa non ancora disponibile'),{status:422,sourceNotReady:true});return good(...a);};
 await assert.rejects(importPdf(ctx,{url,date:'2026-09-17'}),/non ancora disponibile/);
 const again=await importPdf(ctx,{url,date:'2026-09-17'});assert.equal(again.status,'ready');assert.equal(calls,2);
 assert.equal((await importPdf(ctx,{url,date:'2026-09-17'})).status,'ready');assert.equal(calls,2);
});
test('concurrent imports reserve one job and deferred calls expose progress',async()=>{
 const ctx=await fixture(),work=[];ctx.defer=fn=>work.push(fn);
 const results=await Promise.allSettled([importPdf(ctx,{url,date:'2026-09-17'}),importPdf(ctx,{url,date:'2026-09-17'})]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(work.length,1);
 const id=results.find(x=>x.status==='fulfilled').value.importId;assert.equal((await getImport(ctx,id)).status,'processing');
 await work[0]();assert.equal((await getImport(ctx,id)).status,'ready');
});

test('one automation can await a late PDF for an hour without spending recovery attempts or creating drafts',async()=>{
 const ctx=await fixture(),good=ctx.downloadSource,date='2026-09-17';
 let time=Date.parse('2026-09-17T07:28:00+02:00'),calls=0;
 ctx.now=()=>time;
 const job=await claimRun(ctx,{date,url,requestId:randomUUID()}),worker={...ctx,automation:job.run};
 ctx.downloadSource=worker.downloadSource=async(...args)=>{
  if(++calls<=30)throw Object.assign(Error('PDF non ancora disponibile'),{status:422,sourceNotReady:true});
  return good(...args);
 };
 for(let n=0;n<30;n++){
  await assert.rejects(importPdf(worker,{url,date}),e=>e.sourceNotReady===true);
  const state=await readRun(ctx,date);
  assert.equal(state.generation,1);assert.equal(state.attemptsRemaining,2);assert.equal(state.status,'running');
  assert.equal(ctx.store.files['index.json'].drafts.length,0);
  assert.equal((await claimRun(ctx,{date,url,requestId:randomUUID()})).reason,'in_progress');
  time+=120000;
 }
 const ready=await importPdf(worker,{url,date});assert.equal(ready.status,'ready');assert.equal(calls,31);
 assert.equal((await importPdf(worker,{url,date})).importId,ready.importId);assert.equal(calls,31);
 // The cutoff concerns source discovery: an imported source remains usable after 08:30.
 time=Date.parse('2026-09-17T08:35:00+02:00');
 await updateRun(ctx,{run:job.run,phase:'reading',checkpoint:{importId:ready.importId}});
 assert.match((await readImportText(worker,ready.importId,1,1)).pages[0].text,/Juventus/);
 assert.equal((await readRun(ctx,date)).generation,1);
 assert.equal(ctx.store.files['index.json'].drafts.length,0);
});

test('MCP deferred import exposes PDF readiness and safely retries in the same run',async()=>{
 const ctx=await fixture(),good=ctx.downloadSource,date='2026-09-17',pending=[];let calls=0;
 ctx.defer=fn=>pending.push(fn);
 ctx.downloadSource=async(...args)=>{if(++calls<=4)throw Object.assign(Error('PDF non pronto'),{status:422,sourceNotReady:true});return good(...args);};
 const server=createEditorialMcp(ctx),client=new Client({name:'readiness-test',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
 await server.connect(a);await client.connect(b);
 const call=async(name,args)=>{const r=await client.callTool({name,arguments:args});assert(!r.isError);return JSON.parse(r.content[0].text);};
 try{
  const job=await call('claim_automation_run',{date,url,requestId:randomUUID()});
  let finalId;
  for(let n=0;n<5;n++){
   const result=await call('import_source_url',{url,date,retry:false,run:job.run});
   assert.equal(result.status,'processing');assert.equal(pending.length,1);
   const reused=await call('import_source_url',{url,date,retry:false,run:job.run});
   assert.equal(reused.importId,result.importId);assert.equal(pending.length,1);
   await pending.shift()();
   const status=await call('read_import_status',{importId:result.importId,run:job.run});
   assert.equal(status.status,n<4?'failed':'ready');if(n<4)assert.equal(status.sourceNotReady,true);
   assert.equal((await readRun(ctx,date)).generation,1);finalId=result.importId;
  }
  assert.equal((await call('import_source_url',{url,date,retry:false,run:job.run})).importId,finalId);
  assert.equal(calls,5);assert.equal(pending.length,0);assert.equal(ctx.store.files['index.json'].drafts.length,0);
 }finally{await client.close();await server.close();}
});

test('batch text preserves whole pages and reports exact continuation',async()=>{
 const {readImportTextBatch}=await import('../lib/source-service.js');
 const ctx=await fixture(),r=await importPdf(ctx,{url,date:'2026-09-17'}),row=await getImport(ctx,r.importId);
 const stored=ctx.files.get(row.textPath);stored.pages[0].text='a'.repeat(80000);stored.pages[1].text='b'.repeat(80000);
 const first=await readImportTextBatch(ctx,r.importId,1);assert.equal(first.pages.length,1);assert.equal(first.nextPage,2);assert.equal(first.pages[0].text.length,80000);
 assert.equal((await readImportTextBatch(ctx,r.importId,2)).nextPage,null);
 await assert.rejects(readImportTextBatch({...ctx,role:'guest'},r.importId,1),/Accesso/);
 stored.pages.pop();await assert.rejects(readImportTextBatch(ctx,r.importId,2),/incompleta/);
});

async function batchFixture(){
 const ctx=await fixture(),r=await importPdf(ctx,{url,date:'2026-09-17'}),id=randomUUID();
 const body={...newEdition('2026-09-17'),intro:'Prova',articles:[1,2].map(n=>({id:randomUUID(),category:'Editoriali',title:'Articolo '+n,summary:'Sintesi',outlet:'Testata',author:'',rating:3,pages:[]}))};
 await saveDraft(ctx,id,0,body);
 return {ctx,r,id,body,items:body.articles.map((a,i)=>({articleId:a.id,pages:[i+1]}))};
}

test('batch clips associate in one revision, remain private and reuse checkpoints',async()=>{
 const {createImportClips}=await import('../lib/source-service.js');const {ctx,r,id,items}=await batchFixture();
 let reads=0;const read=ctx.blobs.readOriginal;ctx.blobs.readOriginal=async p=>{reads++;return read(p);};
 const result=await createImportClips(ctx,{importId:r.importId,draftId:id,version:1,items});
 assert.equal(result.status,'complete');assert.equal(result.version,2);assert.equal(reads,1);
 const d=ctx.store.files['drafts/'+id+'.json'];assert.equal(d.body.articles.filter(a=>a.clipId).length,2);
 for(const a of d.body.articles)assert.equal(await publicClip(a.clipId,ctx.store,ctx.blobs),null);
 const repeat=await createImportClips(ctx,{importId:r.importId,draftId:id,version:2,items});
 assert.deepEqual(repeat.completed.map(x=>x.clipId),result.completed.map(x=>x.clipId));
 await assert.rejects(createImportClips(ctx,{importId:r.importId,draftId:id,version:1,items}),/modificata/);
 await assert.rejects(createImportClips({...ctx,role:'guest'},{importId:r.importId,draftId:id,version:3,items}),/Accesso/);
});

test('batch failure retains successful clips and retry does not duplicate them',async()=>{
 const {createImportClips}=await import('../lib/source-service.js');const {ctx,r,id,items}=await batchFixture();
 const write=ctx.blobs.write;let count=0;ctx.blobs.write=async(...args)=>{if(++count===2)throw Error('storage outage');return write(...args);};
 const result=await createImportClips(ctx,{importId:r.importId,draftId:id,version:1,items});
 assert.equal(result.status,'partial');assert.equal(result.completed.length,1);assert.equal(result.associated,false);
 assert.equal(ctx.store.files['drafts/'+id+'.json'].version,1);
 ctx.blobs.write=write;
 const resumed=await createImportClips(ctx,{importId:r.importId,draftId:id,version:1,items});
 assert.equal(resumed.status,'complete');assert.equal(resumed.completed[0].clipId,result.completed[0].clipId);
 assert.equal(ctx.store.files['drafts/'+id+'.json'].assets.filter(a=>a.kind==='clip').length,2);
});

test('editor modification during batch is preserved without overwriting',async()=>{
 const {createImportClips}=await import('../lib/source-service.js');const {ctx,r,id,items,body}=await batchFixture();
 const commit=ctx.store.commit.bind(ctx.store);let changed=false;
 ctx.store.commit=async(...args)=>{const result=await commit(...args);if(!changed&&args[2]==='Ritaglio server da fonte Ecostampa verificata'){changed=true;await saveDraft(ctx,id,1,{...body,intro:'Modifica editor da conservare'});}return result;};
 const result=await createImportClips(ctx,{importId:r.importId,draftId:id,version:1,items});
 assert.equal(result.status,'partial');assert.equal(result.error.status,409);assert.equal(ctx.store.files['drafts/'+id+'.json'].body.intro,'Modifica editor da conservare');
});

test('batch images return labelled images and reject invalid ranges',async()=>{
 const {readImportPages}=await import('../lib/source-service.js');const ctx=await fixture(),r=await importPdf(ctx,{url,date:'2026-09-17'});
 const result=await readImportPages(ctx,r.importId,[2,1]);assert.deepEqual(result.images.map(x=>x.page),[2,1]);assert.deepEqual(result.remainingPages,[]);
 await assert.rejects(readImportPages(ctx,r.importId,[1,1]),/distinte/);
 await assert.rejects(readImportPages({...ctx,role:'guest'},r.importId,[1]),/Accesso/);
});

test('batch rejects unknown articles and invalid page lists before any clip write',async()=>{
 const {createImportClips}=await import('../lib/source-service.js');const {ctx,r,id,items}=await batchFixture();
 const before=ctx.files.size;
 for(const invalid of [[{articleId:randomUUID(),pages:[1]}],[{...items[0],pages:[3]}],[items[0],items[0]]])await assert.rejects(createImportClips(ctx,{importId:r.importId,draftId:id,version:1,items:invalid}));
 assert.equal(ctx.files.size,before);assert.equal(ctx.store.files['drafts/'+id+'.json'].assets.length,0);
});

test('final association refuses an editor change after the last clip',async()=>{
 const {createImportClips}=await import('../lib/source-service.js');const {ctx,r,id,items,body}=await batchFixture();
 const commit=ctx.store.commit.bind(ctx.store);let clips=0;
 ctx.store.commit=async(...args)=>{const result=await commit(...args);if(args[2]==='Ritaglio server da fonte Ecostampa verificata'&&++clips===2)await saveDraft(ctx,id,1,{...body,intro:'Revisione concorrente finale'});return result;};
 await assert.rejects(createImportClips(ctx,{importId:r.importId,draftId:id,version:1,items}),/modificata/);
 const d=ctx.store.files['drafts/'+id+'.json'];assert.equal(d.body.intro,'Revisione concorrente finale');assert.equal(d.assets.filter(a=>a.kind==='clip').length,2);
});
