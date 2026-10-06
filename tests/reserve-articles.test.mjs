import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {MemoryStore} from './helpers.mjs';
import {editionSchema,mcpSummaryEditionSchema,summaryAreas} from '../lib/schema.js';
import {saveDraft,updateArticles,publicBody,publishDraft,publicClip} from '../lib/editor-service.js';
import {editionExport} from '../lib/edition-export.js';
import {promoteReserve,parkArticle} from '../lib/reserve-articles.js';
import {reconcileSave} from '../lib/save-recovery.js';
const article=(title='Preparazione Juventus')=>({id:randomUUID(),title,category:'Prima squadra',isEditorial:false,outlet:'Testata',author:'Firma',summary:'La squadra prepara la prossima gara.',pages:[1]});
function setup(){
 const ctx={role:'publisher',user:{id:'test'},store:new MemoryStore()};
 const body={date:'2026-09-28',title:'Rassegna',intro:'Cappello',keyPoints:['Preparazione'],editorialModel:'summary-v1',executiveSummary:{intro:'La preparazione.',sections:summaryAreas.map((title,i)=>({title,items:i?[]:['Preparazione: lavoro in campo.']}))},articles:[article(),article('Seconda notizia principale')],reserveArticles:[{...article('Alternativa privata'),reserveReason:'Approfondimento diverso'}]};
 return {ctx,body,id:randomUUID()};
}
test('private candidates persist without changing main selection, counts input or Summary',async()=>{
 const x=setup();let d=await saveDraft(x.ctx,x.id,0,x.body),main=structuredClone(d.body.articles);
 d=await saveDraft(x.ctx,x.id,d.version,{...d.body,reserveArticles:[...d.body.reserveArticles,article('Un’altra alternativa')]});
 assert.deepEqual(d.body.articles,main);assert(!d.body.executiveSummaryStale);assert(!d.body.introStale);
 const pub=publicBody(d.body);assert(!('reserveArticles' in pub));assert(!JSON.stringify(pub).includes('Alternativa privata'));assert.equal(pub.articles.length,2);
 const oldClient=structuredClone(d.body);delete oldClient.reserveArticles;oldClient.intro='Cappello aggiornato';
 d=await saveDraft(x.ctx,x.id,d.version,oldClient);assert.equal(d.body.reserveArticles.length,2);
 const correction=await updateArticles(x.ctx,x.id,d.version,[{id:d.body.reserveArticles[0].id,changes:{summary:'Riserva corretta senza modificare la selezione.'}}]);
 assert.equal(correction.articles[0].summary,'Riserva corretta senza modificare la selezione.');assert.equal(correction.executiveSummaryStale,false);
});
test('promotion and replacement preserve identity and mark intro and Summary; stale versions cannot overwrite',async()=>{
 const x=setup();let d=await saveDraft(x.ctx,x.id,0,x.body),old=d.body.articles[0],reserve=d.body.reserveArticles[0];
 d=await saveDraft(x.ctx,x.id,d.version,promoteReserve(d.body,reserve.id,old.id));
 assert.equal(d.body.articles.length,2);assert.equal(d.body.articles[0].id,reserve.id);assert.equal(d.body.reserveArticles[0].id,old.id);
 assert(d.body.introStale);assert(d.body.executiveSummaryStale);
 await assert.rejects(saveDraft(x.ctx,x.id,d.version-1,x.body),e=>e.status===409);
 d=await saveDraft(x.ctx,x.id,d.version,{...d.body,introStale:false});assert(d.body.introStale,'client flags are not trusted');
 d=await saveDraft(x.ctx,x.id,d.version,d.body,{introConfirmed:true,summaryConfirmed:true});assert(!d.body.introStale);assert(!d.body.executiveSummaryStale);
 const parked=parkArticle(d.body,reserve.id);assert.equal(parked.articles.length,1);assert.equal(parked.reserveArticles.length,2);
 assert.throws(()=>parkArticle(parked,parked.articles[0].id),/almeno/);
});
test('duplicate identities rejected across both lists, including inherited reserves; explicit empty clears',async()=>{
 const x=setup();assert(mcpSummaryEditionSchema.safeParse(x.body).success);
 assert(!editionSchema.safeParse({...x.body,reserveArticles:[x.body.articles[0]]}).success);
 let d=await saveDraft(x.ctx,x.id,0,x.body);const ambiguous={...d.body,articles:[...d.body.articles,d.body.reserveArticles[0]]};delete ambiguous.reserveArticles;
 await assert.rejects(saveDraft(x.ctx,x.id,d.version,ambiguous),/duplicati/);
 d=await saveDraft(x.ctx,x.id,d.version,{...d.body,reserveArticles:[]});assert.equal(d.body.reserveArticles.length,0);
});
test('reserves get verified clips; publication and PDF downloads exclude reserve texts and assets',async()=>{
 const x=setup(),importId=randomUUID(),pdf=await PDFDocument.create(),uploads=new Map();pdf.addPage([200,300]);pdf.addPage([210,300]);const bytes=await pdf.save();
 const titles=['Preparazione Juventus','Alternativa privata'];
 x.body.articles=[x.body.articles[0]];x.body.reserveArticles[0].pages=[2];x.body.sourceImportId=importId;
 for(const [i,a] of [...x.body.articles,...x.body.reserveArticles].entries())a.factCheck={status:'verified',note:'Verificato',evidence:[{page:i+1,quote:'La squadra prepara la prossima gara.'}]};
 await x.ctx.store.commit({['imports/'+importId+'.json']:{id:importId,status:'ready',date:x.body.date,pageCount:2,name:'Fonte',sha256:'a'.repeat(64),originalPath:'original',textPath:'text'}},await x.ctx.store.begin());
 x.ctx.blobs={readText:async()=>({pages:titles.map((title,i)=>({page:i+1,text:title+'\nLa squadra prepara la prossima gara.'}))}),readOriginal:async()=>bytes,write:async(p,b)=>uploads.set(p,b),read:async p=>uploads.get(p),exists:async p=>{assert(uploads.has(p));},link:async p=>'signed:'+p};
 let d=await saveDraft(x.ctx,x.id,0,x.body);assert.equal(uploads.size,2);assert.equal(d.body.reserveArticles[0].pdfCheck.status,'matched');assert.equal(d.body.reserveArticles[0].synthesisCheck.status,'verified');
 const reserveClip=d.body.reserveArticles[0].clipId,mainClip=d.body.articles[0].clipId;
 await publishDraft(x.ctx,x.id,d.version,'PUBBLICA');assert.equal(await publicClip(reserveClip,x.ctx.store,x.ctx.blobs),null);assert(await publicClip(mainClip,x.ctx.store,x.ctx.blobs));
 const snapshot=x.ctx.store.files['published/'+x.body.date+'.json'];assert(!JSON.stringify(snapshot).includes('Alternativa privata'));assert(!snapshot.body.reserveArticles);
 for(const mode of [{date:x.body.date},{draftId:d.id,version:d.version,ctx:x.ctx}]){const exp=await editionExport({...mode,repo:x.ctx.store,storage:x.ctx.blobs});await assert.rejects(exp.loadClip(reserveClip),e=>e.status===404);assert(await exp.loadClip(mainClip));}
 const before=d.body.reserveArticles[0];x.ctx.blobs.readText=async()=>{throw Error('No reread on promotion');};x.ctx.blobs.readOriginal=x.ctx.blobs.readText;
 d=await saveDraft(x.ctx,x.id,d.version,promoteReserve(d.body,before.id));assert.equal(d.body.articles[1].clipId,reserveClip);assert.equal(uploads.size,2);
});
test('concurrent changes of different reserve fields merge; moving lists conflicts safely',()=>{
 const {body}=setup(),base=editionSchema.parse(body),local=structuredClone(base),remote=structuredClone(base);
 local.reserveArticles[0].summary='Editor correction';remote.reserveArticles[0].clipId=randomUUID();
 const result=reconcileSave(base,local,remote);assert.equal(result.conflicts.length,0);assert.equal(result.body.reserveArticles[0].summary,'Editor correction');assert.equal(result.body.reserveArticles[0].clipId,remote.reserveArticles[0].clipId);
 const moved=promoteReserve(base,base.reserveArticles[0].id);assert(reconcileSave(base,moved,remote).conflicts.length);
});

test('saving edited intro keeps review pending; explicit intro confirmation leaves Summary pending',async()=>{
 const x=setup();let d=await saveDraft(x.ctx,x.id,0,x.body);
 d=await saveDraft(x.ctx,x.id,d.version,promoteReserve(d.body,d.body.reserveArticles[0].id,d.body.articles[0].id));
 d=await saveDraft(x.ctx,x.id,d.version,{...d.body,intro:'Cappello aggiornato dalla redazione.'});
 assert.equal(d.body.introStale,true);
 d=await saveDraft(x.ctx,x.id,d.version,d.body,{introConfirmed:true});
 assert(!d.body.introStale);assert.equal(d.body.executiveSummaryStale,true);
});
test('intro-only confirmation preserves pending PDF checks without accessing source files',async()=>{
 const x=setup();let d=await saveDraft(x.ctx,x.id,0,x.body);
 d.body.sourceImportId=randomUUID();d.body.introStale=true;d.body.executiveSummaryStale=true;
 d.body.articles[0].pdfCheck={status:'pending',note:'Fonte non disponibile'};
 d.body.articles[0].synthesisCheck={status:'attention',note:'Da verificare'};
 d.body=editionSchema.parse(d.body);
 await x.ctx.store.commit({['drafts/'+d.id+'.json']:d},await x.ctx.store.begin());
 let sourceReads=0;x.ctx.blobs={readOriginal:async()=>{sourceReads++;throw new Error('Unexpected PDF read');}};
 let importReads=0;const read=x.ctx.store.read.bind(x.ctx.store);
 x.ctx.store.read=async(p,h)=>{if(p.startsWith('imports/'))importReads++;return read(p,h);};
 const before=structuredClone(d.body.articles);
 const saved=await saveDraft(x.ctx,x.id,d.version,{...d.body,intro:'Cappello ricontrollato.'},{introConfirmed:true});
 assert.equal(sourceReads,0);assert.equal(importReads,0);assert.deepEqual(saved.body.articles,before);assert(!saved.body.introStale);
 assert.equal(saved.body.executiveSummaryStale,true);
 const again=await saveDraft(x.ctx,x.id,saved.version,saved.body,{introConfirmed:true});assert.equal(again.version,saved.version);
 await assert.rejects(saveDraft(x.ctx,x.id,d.version,d.body,{introConfirmed:true}),e=>e.status===409);
 const changed=structuredClone(saved.body);changed.articles[0].title='Titolo modificato';
 await saveDraft(x.ctx,x.id,saved.version,changed,{introConfirmed:true});
 assert(importReads>0,'changing an article must still run source preparation');
});
test('Summary confirmation skips source work, preserves intro warning and rejects stale revisions',async()=>{
 const x=setup();let d=await saveDraft(x.ctx,x.id,0,x.body);
 d.body.sourceImportId=randomUUID();d.body.introStale=true;d.body.executiveSummaryStale=true;
 d.body.articles[0].pdfCheck={status:'pending',note:'In attesa'};d.body=editionSchema.parse(d.body);
 await x.ctx.store.commit({['drafts/'+d.id+'.json']:d},await x.ctx.store.begin());
 const read=x.ctx.store.read.bind(x.ctx.store);x.ctx.store.read=async(p,h)=>{assert(!p.startsWith('imports/'),'Summary confirmation must not prepare PDFs');return read(p,h);};
 let reviewCommits=0;x.ctx.store.commitReview=async(...args)=>{reviewCommits++;return x.ctx.store.commit(...args);};
 const saved=await saveDraft(x.ctx,x.id,d.version,d.body,{summaryConfirmed:true});
 assert.equal(reviewCommits,1);
 assert(!saved.body.executiveSummaryStale);assert.equal(saved.body.introStale,true);assert.deepEqual(saved.body.articles,d.body.articles);
 await assert.rejects(saveDraft(x.ctx,x.id,d.version,d.body,{summaryConfirmed:true}),e=>e.status===409);
});
