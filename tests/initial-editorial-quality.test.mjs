import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MemoryStore} from './helpers.mjs';
import {claimRun,updateRun} from '../lib/automation-runs.js';
import {saveDraft} from '../lib/editor-service.js';
import {newEdition} from '../lib/schema.js';
import {showAuthor} from '../lib/article-author.js';
import {simplifyEditorialInstructions} from '../lib/editorial-simplification.js';

const article=(extra={})=>({id:randomUUID(),category:'Juventus',title:'Notizia',outlet:'Testata',author:'Autore',summary:'Fatto verificato sulla fonte.',isEditorial:false,showAuthor:true,...extra});
test('initial automation removes new news byline overrides, including reserves and later additions, preserving manual choices',async()=>{
 const date='2026-10-10',ctx={store:new MemoryStore(),role:'publisher',user:{id:'editor'}};
 const args={date,url:'https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20261010_16474068.pdf',requestId:randomUUID()};
 const job=await claimRun(ctx,args),automatic={...ctx,automation:job.run};
 let draft=await saveDraft(automatic,job.draftId,0,{...newEdition(date),articles:[article(),article({isEditorial:true}),article({showAuthor:false})],reserveArticles:[article()]});
 assert.equal(draft.body.articles[0].showAuthor,undefined);
 assert.equal(showAuthor(draft.body.articles[0]),false);
 assert.equal(showAuthor(draft.body.articles[1]),true);
 assert.equal(draft.body.articles[2].showAuthor,false);
 assert.equal(draft.body.reserveArticles[0].showAuthor,undefined);
 await updateRun(ctx,{run:job.run,phase:'drafting',status:'failed',retryable:true});
 draft=await saveDraft(ctx,draft.id,draft.version,{...draft.body,articles:draft.body.articles.map((a,i)=>i===0?{...a,showAuthor:true}:a)});
 assert.equal(showAuthor(draft.body.articles[0]),true);
 const resumed=await claimRun(ctx,{...args,requestId:randomUUID(),resume:true});
 assert.equal(resumed.acquired,true);
 const existing=draft.body.articles.map(({showAuthor,...a})=>a);
 draft=await saveDraft({...ctx,automation:resumed.run},draft.id,draft.version,{...draft.body,articles:[...existing,article()],reserveArticles:[...draft.body.reserveArticles,article()]});
 assert.equal(draft.body.articles[0].showAuthor,true);
 assert.equal(draft.body.articles[2].showAuthor,false);
 assert.equal(draft.body.articles.at(-1).showAuthor,undefined);
 assert.equal(draft.body.reserveArticles.at(-1).showAuthor,undefined);
});

test('interactive creation keeps an explicit news byline choice',async()=>{
 const ctx={store:new MemoryStore(),role:'publisher',user:{id:'editor'}};
 const draft=await saveDraft(ctx,randomUUID(),0,{...newEdition('2026-10-10'),articles:[article()]});
 assert.equal(showAuthor(draft.body.articles[0]),true);
});

test('first-save comparison returns without changing the second-review workflow or existing length criteria',()=>{
 const lengths='Notizie 70–90 parole, editoriali 90–110 parole; senza riempitivi.';
 const source='Esegui un passaggio distinto di confronto fonte–sintesi per OGNI articolo prima del salvataggio finale: ogni affermazione deve essere sostenuta dalla fonte.\n'+lengths+'\nEsegui la checklist della sezione 6 sulla versione salvata con read_draft;';
 const actual=simplifyEditorialInstructions(source);
 assert.match(actual,/Prima del primo salvataggio, confronta ogni sintesi con la fonte già consultata:/);
 assert(actual.includes(lengths));
 assert(!actual.includes('Le lunghezze sono riferimenti: non aggiungere frasi per raggiungere un numero.'));
 assert.match(actual,/il secondo automatismo svolgerà la revisione editoriale completa della sezione 6/);
 assert.match(actual,/claim_editorial_review/);
 assert.match(actual,/save_editorial_review/);
 assert.match(actual,/finish_editorial_review/);
 assert.match(actual,/La checklist editoriale completa spetta a questa seconda attività/);
});
