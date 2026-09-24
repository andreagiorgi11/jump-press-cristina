import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {synthesisLabels,visibleSynthesisLabels} from '../lib/check-labels.js';
import {saveDraft} from '../lib/editor-service.js';
import {MemoryStore} from './helpers.mjs';

test('source-quote labels are computed but hidden; GPT declared doubts stay visible',()=>{
 const incomplete={status:'attention',sourceStatus:'incomplete',editorialStatus:'undocumented'};
 assert.deepEqual(synthesisLabels(incomplete),['Verifica editoriale non documentata','Riscontro fonte incompleto']);
 assert.deepEqual(visibleSynthesisLabels(incomplete),[]);
 assert.deepEqual(visibleSynthesisLabels({status:'pending'}),[]);
 assert.deepEqual(visibleSynthesisLabels({status:'attention',note:'Vecchio controllo'}),[]);
 assert.deepEqual(visibleSynthesisLabels({status:'attention',sourceStatus:'incomplete',editorialStatus:'attention'}),['Sintesi da verificare']);
});

test('per-article sentiment is accepted from old drafts but never stored again',async()=>{
 const ctx={role:'editor',user:{id:'test'},store:new MemoryStore()},id=randomUUID();
 const body={date:'2026-09-18',title:'Rassegna',intro:'',keyPoints:[],tones:[],metrics:[],articles:[{id:randomUUID(),category:'Prima squadra',title:'Titolo',outlet:'Testata',summary:'Fatti.',juventusSentiment:{tone:'misto',reason:'Motivo.'}}]};
 const d=await saveDraft(ctx,id,0,body);
 assert.equal('juventusSentiment' in d.body.articles[0],false);
});

test('partial saves keep omitted fields; a replaced piece inherits nothing from the source; explicit values win',async()=>{
 const ctx={role:'editor',user:{id:'test'},store:new MemoryStore()},id=randomUUID(),articleId=randomUUID();
 const full={id:articleId,category:'Prima squadra',title:'Scatto Juve Carnevali ora deve bloccarlo',outlet:'Tuttosport',author:'Firma',rating:5,isEditorial:false,summary:'Fatti.',pages:[38],factCheck:{status:'verified',note:'Controllato.',evidence:[{page:38,quote:'Estratto letterale della fonte.'}]}};
 let d=await saveDraft(ctx,id,0,{date:'2026-09-18',title:'Rassegna',intro:'',keyPoints:[],tones:[],metrics:[],articles:[full]});
 // GPT corrects only the title and resends a bare article.
 const bare={id:articleId,category:'Prima squadra',title:'Scatto Juve, Carnevali ora deve bloccarlo',outlet:'Tuttosport',summary:'Fatti.'};
 d=await saveDraft(ctx,id,d.version,{...d.body,articles:[bare]});
 let a=d.body.articles[0];
 assert.equal(a.title,'Scatto Juve, Carnevali ora deve bloccarlo');assert.equal(a.author,'Firma');assert.equal(a.rating,5);assert.deepEqual(a.pages,[38]);assert.deepEqual(a.factCheck,full.factCheck);
 // Explicit values win, including null.
 d=await saveDraft(ctx,id,d.version,{...d.body,articles:[{...bare,rating:2,factCheck:null}]});a=d.body.articles[0];
 assert.equal(a.rating,2);assert.equal(a.factCheck,null);
 // Same id reused for a different piece (other outlet or other first page): nothing source-bound is inherited.
 d=await saveDraft(ctx,id,d.version,{...d.body,articles:[{...full}]});
 for(const other of [{outlet:'Corriere dello Sport'},{pages:[12]}]){
  const replaced={id:articleId,category:'Prima squadra',title:'Altro pezzo',summary:'Altri fatti.',outlet:'Tuttosport',...other};
  const r=await saveDraft(ctx,id,d.version,{...d.body,articles:[replaced]});a=r.body.articles[0];
  assert.equal(a.factCheck,undefined);if(!other.pages)assert.deepEqual(a.pages,[]);assert.equal(a.author,'');assert.equal(a.rating,3);
  d=await saveDraft(ctx,id,r.version,{...r.body,articles:[{...full}]});
 }
});
