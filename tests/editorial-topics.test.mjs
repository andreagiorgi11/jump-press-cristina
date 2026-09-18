import test from 'node:test';
import assert from 'node:assert/strict';
import {orderedArticles,displayCategory} from '../lib/editorial-topics.js';
import {articleSchema} from '../lib/schema.js';
import {publicBody} from '../lib/editor-service.js';
import {newEdition} from '../lib/schema.js';
test('fixed groups preserve relative order and do not mutate saved articles',()=>{
 const rows=[{id:'a',category:'Prima squadra'},{id:'b',category:'Editoriali',topic:'Mercato'},{id:'c',category:'Next Gen'},{id:'d',category:'Prima squadra'}];
 assert.deepEqual(orderedArticles(rows).map(a=>a.id),['b','a','d','c']);assert.equal(rows[0].id,'a');
 assert.equal(displayCategory({category:'Intervista',topic:'Juventus Women'}),'Juventus Women');
 assert.equal(displayCategory({category:'Intervista'}),'Altri temi');
});
test('editorial subject is validated and survives public projection',()=>{
 const a=articleSchema.parse({id:'00000000-0000-4000-8000-000000000001',category:'Editoriali',topic:'Mercato',title:'Titolo',outlet:'Testata',summary:'Sintesi'});
 assert.equal(publicBody({...newEdition('2026-09-18'),articles:[a]}).articles[0].topic,'Mercato');
 assert.equal(articleSchema.safeParse({...a,topic:'Intervista'}).success,false);
});

test('consolidated themes merge old classifications without losing articles',()=>{
 const rows=['Nazionale','Arbitri e VAR','Mercato','Next Gen','Società e dirigenza'].map((category,id)=>({id,category}));
 assert.deepEqual(orderedArticles(rows).map(a=>a.category),['Prima squadra','Prima squadra','Next Gen','Politica sportiva','Altri temi']);
 assert.equal(rows[2].category,'Mercato');
});
