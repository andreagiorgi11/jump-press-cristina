import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MemoryStore} from './helpers.mjs';
import {newEdition} from '../lib/schema.js';
import {saveDraft,publishDraft,withdrawDraft} from '../lib/editor-service.js';
import {editionForTranslation,publishTranslation,englishReaderEdition,translatedEdition,translatedEditions,mergeTranslation} from '../lib/translations.js';
import {sendPublishedMail} from '../services/jump-press-files/source-mail.mjs';

async function fixture({notifyPublished}={}){
 const mails=[],ctx={store:new MemoryStore(),role:'publisher',user:{id:'isolated'},blobs:{exists:async()=>{}},notifyPublished:notifyPublished||(async x=>{mails.push(x);return {status:'sent'};})};
 const id=randomUUID(),sourceId=randomUUID(),clips=[randomUUID(),randomUUID()],articles=clips.map((clipId,i)=>({id:randomUUID(),title:'Titolo '+i,category:'Juventus',outlet:'Testata',summary:'Sintesi '+i,sourceId,clipId,pages:[i+1]}));
 const draft=await saveDraft(ctx,id,0,{...newEdition('2026-10-07'),intro:'Cappello italiano',keyPoints:['Positivo: Buona notizia: dettaglio','Negativo: Cattiva notizia: dettaglio'],articles});
 draft.assets=[{id:sourceId,kind:'source',draft_id:id,storage_path:'original.pdf'},...clips.map((clipId,i)=>({id:clipId,kind:'clip',draft_id:id,source_id:sourceId,pages:[i+1],storage_path:'clip'+i+'.pdf'}))];
 await ctx.store.commit({['drafts/'+id+'.json']:draft},await ctx.store.begin());
 return {ctx,draft,articles,mails};
}
const english=articles=>({intro:'English lead',executiveSummary:null,keyPoints:['Positivo: Good news: detail','Negativo: Bad news: detail'],articles:articles.map((a,i)=>({id:a.id,title:'Title '+i,summary:'Summary '+i}))});

test('publishing mails the translation request once per published version without blocking publication',async()=>{
 const {ctx,draft,mails}=await fixture();
 const result=await publishDraft(ctx,draft.id,1,'PUBBLICA');
 assert.equal(result.translationMail,'sent');assert.deepEqual(mails,[{date:'2026-10-07',version:1}]);
 const failing=await fixture({notifyPublished:async()=>{throw Object.assign(Error('SMTP down'),{status:503});}});
 const r2=await publishDraft(failing.ctx,failing.draft.id,1,'PUBBLICA');
 assert.equal(r2.published,true);assert.equal(r2.translationMail,'failed');
 const idx=await failing.ctx.store.read('index.json',await failing.ctx.store.begin());assert.equal(idx.published.length,1);
});

test('the automation reads only published text and publishes a structurally identical translation',async()=>{
 const {ctx,draft,articles}=await fixture();await publishDraft(ctx,draft.id,1,'PUBBLICA');
 const producer={...ctx,role:'producer'};
 const source=await editionForTranslation(producer,{date:'2026-10-07'});
 assert.equal(source.sourceVersion,1);assert.equal(source.alreadyTranslated,false);assert.equal(source.content.articles.length,2);assert.match(source.rules,/Positivo/);
 await assert.rejects(editionForTranslation({role:'reader'},{date:'2026-10-07'}),e=>e.status===403);
 const bad=english(articles);bad.articles.reverse();
 await assert.rejects(publishTranslation(producer,{date:'2026-10-07',sourceVersion:1,translation:bad}),e=>e.status===422);
 const badKind=english(articles);badKind.keyPoints[0]='Good news: detail';
 await assert.rejects(publishTranslation(producer,{date:'2026-10-07',sourceVersion:1,translation:badKind}),e=>e.status===422);
 await assert.rejects(publishTranslation(producer,{date:'2026-10-07',sourceVersion:9,translation:english(articles)}),e=>e.status===409);
 const ok=await publishTranslation(producer,{date:'2026-10-07',sourceVersion:1,translation:english(articles)});
 assert.equal(ok.url,'/en/edizioni/2026-10-07');
 const shown=await translatedEdition('2026-10-07','en',ctx.store);
 assert.equal(shown.row.body.intro,'English lead');assert.equal(shown.row.body.articles[0].title,'Title 0');assert.equal(shown.row.body.articles[0].originalTitle,'Titolo 0');assert.equal(shown.row.body.lang,'en');
 assert.equal((await editionForTranslation(producer,{date:'2026-10-07'})).alreadyTranslated,true);
});

test('a corrected Italian edition hides the old translation until the new one is published',async()=>{
 const {ctx,draft,articles}=await fixture();await publishDraft(ctx,draft.id,1,'PUBBLICA');
 await publishTranslation({...ctx,role:'producer'},{date:'2026-10-07',sourceVersion:1,translation:english(articles)});
 await withdrawDraft(ctx,draft.id,1,'RITIRA_E_MODIFICA');
 assert.equal((await translatedEdition('2026-10-07','en',ctx.store)).row,null);
 await publishDraft(ctx,draft.id,2,'PUBBLICA');
 assert.equal((await translatedEdition('2026-10-07','en',ctx.store)).row,null);assert.deepEqual((await translatedEditions('en',ctx.store)).rows,[]);
 await publishTranslation({...ctx,role:'producer'},{date:'2026-10-07',sourceVersion:2,translation:english(articles)});
 assert.equal((await translatedEdition(null,'en',ctx.store)).row.edition_date,'2026-10-07');
});

test('merge keeps everything that is not translated',()=>{
 const id=randomUUID(),body={date:'2026-10-07',intro:'it',keyPoints:['Positivo: a'],executiveSummary:{intro:'i',sections:[{title:'Prima squadra',items:['x']}]},articles:[{id,title:'t',summary:'s',outlet:'Tuttosport',clipId:'c'}]};
 const merged=mergeTranslation(body,{intro:'en',keyPoints:['Positivo: b'],executiveSummary:{intro:'e',sections:[{items:['y']}]},articles:[{id,title:'T',summary:'S'}]});
 assert.equal(merged.articles[0].outlet,'Tuttosport');assert.equal(merged.articles[0].clipId,'c');assert.equal(merged.executiveSummary.sections[0].title,'Prima squadra');assert.equal(merged.executiveSummary.sections[0].items[0],'y');
});

test('published mail: fixed subject, one message per version, a new version mails again',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jp-pub-'));
 const env={CONTACT_SMTP_HOST:'smtp.invalid',CONTACT_SMTP_USER:'editor@test.invalid',CONTACT_SMTP_PASS:'test-only',JUMP_MAIL_TO:'recipient@test.invalid'};
 try{
  const sent=[],sendMail=async m=>{sent.push(m);return {accepted:[m.to]};};
  await sendPublishedMail({root,env,input:{date:'2026-10-07',version:3},sendMail});
  await sendPublishedMail({root,env,input:{date:'2026-10-07',version:3},sendMail});
  assert.equal(sent.length,1);assert.equal(sent[0].subject,'[Jump Press] Rassegna pubblicata — 07/10/2026 — traduzione EN');assert.match(sent[0].text,/read_edition_for_translation con date=2026-10-07/);
  await sendPublishedMail({root,env,input:{date:'2026-10-07',version:4},sendMail});assert.equal(sent.length,2);
  await assert.rejects(sendPublishedMail({root,env,input:{date:'2026-10-07',version:'x'},sendMail}),e=>e.status===400);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('English reader keeps the requested Italian edition until translated, then uses English',async()=>{
 const {ctx,draft,articles}=await fixture();await publishDraft(ctx,draft.id,1,'PUBBLICA');
 let result=await englishReaderEdition(null,ctx.store);
 assert.equal(result.translationPending,true);assert.equal(result.unavailable,false);assert.equal(result.row.body.intro,'Cappello italiano');
 await publishTranslation(ctx,{date:draft.body.date,sourceVersion:1,translation:english(articles)});
 result=await englishReaderEdition(draft.body.date,ctx.store);
 assert.equal(result.translationPending,false);assert.equal(result.row.body.intro,'English lead');
 assert.equal((await englishReaderEdition('2026-01-01',ctx.store)).row,null);
});
test('English reader distinguishes unavailable storage from an absent edition',async()=>{
 const result=await englishReaderEdition(null,{begin:async()=>{throw Error('offline');}});
 assert.equal(result.unavailable,true);assert.equal(result.row,null);assert.equal(result.translationPending,false);
});
import {correctEnglishArticle} from '../lib/translations.js';
test('English corrections change only article text, update public/PDF source, and send no mail',async()=>{
 const {ctx,draft,articles,mails}=await fixture();await publishDraft(ctx,draft.id,1,'PUBBLICA');await publishTranslation(ctx,{date:'2026-10-07',sourceVersion:1,translation:english(articles)});
 const before=structuredClone(ctx.store.files),view=await englishReaderEdition('2026-10-07',ctx.store);
 const input={date:'2026-10-07',sourceVersion:1,revision:view.row.translationRevision,articleId:articles[0].id,title:'Corrected English title',summary:'Corrected English summary'};
 const result=await correctEnglishArticle({...ctx,role:'editor'},input);
 assert.notEqual(result.revision,input.revision);assert.equal(mails.length,1);
 for(const [path,value] of Object.entries(before))if(path!=='translations/en/2026-10-07.json')assert.deepEqual(ctx.store.files[path],value,path);
 const after=await translatedEdition('2026-10-07','en',ctx.store);assert.equal(after.row.body.articles[0].title,input.title);assert.equal(after.row.body.articles[0].summary,input.summary);assert.equal(after.row.body.articles[0].outlet,articles[0].outlet);
 assert.deepEqual(ctx.store.files['translations/en/2026-10-07.json'].content.articles[1],before['translations/en/2026-10-07.json'].content.articles[1]);
 await assert.rejects(correctEnglishArticle(ctx,input),e=>e.status===409);
 for(const role of ['producer','reader',undefined])await assert.rejects(correctEnglishArticle({...ctx,role},{...input,revision:result.revision}),e=>e.status===403);
 for(const extra of [{outlet:'Other'},{category:'Other'},{position:2},{intro:'Changed'}])await assert.rejects(correctEnglishArticle(ctx,{...input,revision:result.revision,...extra}));
 await assert.rejects(correctEnglishArticle(ctx,{...input,revision:result.revision,title:''}));
 await assert.rejects(correctEnglishArticle(ctx,{...input,revision:result.revision,articleId:randomUUID()}),e=>e.status===404);
 await withdrawDraft(ctx,draft.id,1,'RITIRA_E_MODIFICA');await assert.rejects(correctEnglishArticle(ctx,{...input,revision:result.revision}),e=>e.status===409);
});
test('English correction cannot overwrite a newer translation or lose a concurrent commit',async()=>{
 const {ctx,draft,articles}=await fixture();await publishDraft(ctx,draft.id,1,'PUBBLICA');await publishTranslation(ctx,{date:'2026-10-07',sourceVersion:1,translation:english(articles)});
 const view=await englishReaderEdition('2026-10-07',ctx.store),input={date:'2026-10-07',sourceVersion:1,revision:view.row.translationRevision,articleId:articles[0].id,title:'Correction',summary:'Correction'};
 const next=english(articles);next.articles[0].title='New translation';await publishTranslation(ctx,{date:input.date,sourceVersion:1,translation:next});
 await assert.rejects(correctEnglishArticle(ctx,input),e=>e.status===409);
 input.revision=(await englishReaderEdition(input.date,ctx.store)).row.translationRevision;
 const commit=ctx.store.commit.bind(ctx.store);ctx.store.commit=async(files,head)=>{await commit({'unrelated.json':{updated:true}},head);return commit(files,head);};
 await assert.rejects(correctEnglishArticle(ctx,input),e=>e.status===409);
 assert.equal((await translatedEdition(input.date,'en',ctx.store)).row.body.articles[0].title,'New translation');
});

test('English reader loads both published bodies concurrently and retains Italian on translation errors',{timeout:2000},async()=>{
 const {ctx,draft,articles}=await fixture();await publishDraft(ctx,draft.id,1,'PUBBLICA');
 await publishTranslation(ctx,{date:draft.body.date,sourceVersion:1,translation:english(articles)});
 const read=ctx.store.read.bind(ctx.store);let release;
 const started=new Promise(resolve=>{release=resolve;});
 ctx.store.read=async(path,head)=>{
  if(path.startsWith('published/'))await started;
  if(path.startsWith('translations/'))release();
  return read(path,head);
 };
 const result=await englishReaderEdition(draft.body.date,ctx.store);
 assert.equal(result.unavailable,false);assert.equal(result.row.body.intro,'English lead');
 ctx.store.read=async(path,head)=>{if(path.startsWith('translations/'))throw Error('Temporary outage');return read(path,head);};
 const unavailable=await englishReaderEdition(draft.body.date,ctx.store);
 assert.equal(unavailable.unavailable,true);assert.equal(unavailable.translationPending,true);
 assert.equal(unavailable.row.body.intro,'Cappello italiano');
});
