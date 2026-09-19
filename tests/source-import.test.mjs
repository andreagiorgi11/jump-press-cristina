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
test('concurrent imports reserve one job and deferred calls expose progress',async()=>{
 const ctx=await fixture(),work=[];ctx.defer=fn=>work.push(fn);
 const results=await Promise.allSettled([importPdf(ctx,{url,date:'2026-09-17'}),importPdf(ctx,{url,date:'2026-09-17'})]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(work.length,1);
 const id=results.find(x=>x.status==='fulfilled').value.importId;assert.equal((await getImport(ctx,id)).status,'processing');
 await work[0]();assert.equal((await getImport(ctx,id)).status,'ready');
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
