import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isEditorial,showAuthor} from '../lib/article-author.js';
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
