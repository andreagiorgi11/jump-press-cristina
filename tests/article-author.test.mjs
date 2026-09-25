import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isEditorial,showAuthor,cleanSummary} from '../lib/article-author.js';
import {summaryEdition} from '../lib/summary-sections.js';
import {saveDraft,publicBody} from '../lib/editor-service.js';
import {MemoryStore} from './helpers.mjs';
test('Author visibility follows editorial type unless editor overrides it',()=>{
 assert.equal(showAuthor({author:'Nome',category:'Prima squadra'}),false);
 assert.equal(showAuthor({isEditorial:true}),true);
 assert.equal(showAuthor({isEditorial:true,showAuthor:false}),false);
 assert.equal(showAuthor({isEditorial:false,showAuthor:true}),true);
 assert.equal(isEditorial({author:'Firma nota'}),false);
 assert.equal(showAuthor(summaryEdition({articles:[{category:'Editoriali',topic:'Politica sportiva',author:'Nome'}]}).articles[0]),true);
});
test('Author controls persist through save, public projection and older clients',async()=>{
 const ctx={store:new MemoryStore(),role:'editor',user:{id:'test'}},id=randomUUID();
 const body={date:'2026-09-23',title:'Test',intro:'Intro',articles:[{id:randomUUID(),category:'Prima squadra',title:'Titolo',outlet:'Tuttosport',summary:'Sintesi',author:'Nome',isEditorial:true,showAuthor:false}]};
 let d=await saveDraft(ctx,id,0,body);assert.equal(publicBody(d.body).articles[0].showAuthor,false);
 delete d.body.articles[0].isEditorial;delete d.body.articles[0].showAuthor;
 d=await saveDraft(ctx,id,d.version,d.body);assert.equal(d.body.articles[0].isEditorial,true);assert.equal(d.body.articles[0].showAuthor,false);assert.equal(d.body.articles[0].author,'Nome');
});
test('editorial label and byline never repeat inside the summary',async()=>{
 const author='Mario Rossi',ed={author,isEditorial:true};
 for(const summary of ['EDITORIALE – Mario Rossi. La Juve deve cambiare.','Editoriale di Mario Rossi: la Juve deve cambiare.','L’editoriale — la Juve deve cambiare.','Mario Rossi. La Juve deve cambiare.','EDITORIALE: La Juve deve cambiare.'])assert.equal(cleanSummary({...ed,summary}),'La Juve deve cambiare.');
 // A thesis opening with the author as subject, or a normal news item, is untouched.
 assert.equal(cleanSummary({...ed,summary:'Mario Rossi sostiene che la Juve debba cambiare.'}),'Mario Rossi sostiene che la Juve debba cambiare.');
 assert.equal(cleanSummary({author,isEditorial:false,summary:'Mario Rossi. Notizia.'}),'Mario Rossi. Notizia.');
 assert.equal(cleanSummary({summary:'La Juve vince.'}),'La Juve vince.');
 const ctx={store:new MemoryStore(),role:'editor',user:{id:'test'}};
 const d=await saveDraft(ctx,randomUUID(),0,{date:'2026-09-24',title:'Test',intro:'Intro',articles:[{id:randomUUID(),category:'Prima squadra',title:'Titolo',outlet:'Tuttosport',summary:'EDITORIALE – Mario Rossi. La tesi.',author,isEditorial:true,rating:3,pages:[1]}]});
 assert.equal(d.body.articles[0].summary,'La tesi.');
});
test('outlet spellings resolve to one masthead with the local edition',async()=>{
 const {outletLogo}=await import('../lib/outlet-logos.js');
 const cases={'il Giornale':['giornale.svg',''],'La Repubblica - Ed. Torino':['repubblica.png','Torino'],'Corriere dello Sport Stadio - Ed. Campania':['corriere-sport.svg','Campania'],'Corriere Torino':['corriere-sera.svg','Torino'],'Libero Quotidiano':['libero.png',''],'L’Équipe':['equipe.png',''],'Torino CronacaQui':['cronacaqui.png',''],'La Stampa – Cronaca di Torino':['stampa.svg','Torino'],'Frankfurter Allgemeine Zeitung':['faz.png','']};
 for(const [name,[file,edition]] of Object.entries(cases))assert.deepEqual([outletLogo(name).file,outletLogo(name).edition],[file,edition],name);
 assert.equal(outletLogo('Il Fatto Quotidiano'),null);
 const {existsSync}=await import('node:fs');for(const name of Object.keys(cases))assert(existsSync('public/testate/'+outletLogo(name).file),name);
});
