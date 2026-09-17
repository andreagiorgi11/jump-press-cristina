import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {MemoryStore} from './helpers.mjs';
import {sourceUrl} from '../lib/source-download.js';
import {extractSourceText,renderSourcePage} from '../lib/source-pdf.js';
import {importPdf,getImport,readImportText,createImportClip,purgeOriginals} from '../lib/source-service.js';
import {saveDraft,publishDraft,publicClip} from '../lib/editor-service.js';
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
 assert.equal((await purgeOriginals(ctx,Date.parse(published.deleteAfter)-1)).deleted,0);
 assert.equal((await purgeOriginals(ctx,Date.parse(published.deleteAfter)+1)).deleted,1);
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
