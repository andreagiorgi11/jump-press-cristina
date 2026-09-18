import test from 'node:test';
import assert from 'node:assert/strict';
import {editionSchema,newEdition} from '../lib/schema.js';
import {analyseEdition} from '../lib/edition-analysis.js';
import {saveDraft,getDraft,publicBody} from '../lib/editor-service.js';
import {MemoryStore} from './helpers.mjs';
const id='42424242-4242-4242-8242-424242424242';
const article={id,category:'Mercato',title:'Titolo di prova',outlet:'Testata',summary:'Sintesi',rating:4};
test('unknown coverage remains distinct from verified zero and old drafts remain readable',()=>{
 const body=editionSchema.parse(newEdition('2026-09-17'));
 assert.equal(analyseEdition(body).frontPages,null);assert.equal(analyseEdition(body).examined,null);
 const empty={...body,coverage:{examinedItems:0,sourceNote:'Verifica di prova',frontPages:[],frontPageSummary:''}};
 assert.equal(analyseEdition(editionSchema.parse(empty)).frontPages,0);
 assert.equal(analyseEdition(empty).examined,0);
});
test('coverage inventories, themes and ratings use the saved edition, not historical constants',()=>{
 const body=editionSchema.parse({...newEdition(),articles:[article],coverage:{examinedItems:12,sourceNote:'PDF prova, indice e copertine',frontPages:[{outlet:'Sport',page:1,juventus:true,nationalSports:true},{outlet:'Generalista',page:2,juventus:false,nationalSports:false}]}});
 const a=analyseEdition(body);assert.equal(a.selected,1);assert.equal(a.examined,12);assert.equal(a.frontPages,2);assert.equal(a.juventus,1);assert.equal(a.sportsJuventus,0);assert.equal(a.themes[0].percent,100);assert.equal(a.ratings[4],1);assert.deepEqual(a.outlets,['Sport']);
 assert(!editionSchema.safeParse({...body,coverage:{...body.coverage,frontPages:[body.coverage.frontPages[0],body.coverage.frontPages[0]]}}).success);
});
test('new coverage and tone data survive a versioned save without losing existing articles',async()=>{
 const ctx={store:new MemoryStore(),role:'publisher',user:{id:'editor'}};
 const body={...newEdition(),articles:[article],coverage:{examinedItems:12,sourceNote:'Fonte verificata',frontPages:[],frontPageSummary:'Nessuna copertina nel PDF'},toneSummary:'Tono di prova'};
 await saveDraft(ctx,id,0,body);
 const saved=await getDraft(ctx,id);assert.deepEqual(saved.body.coverage,body.coverage);assert.equal(saved.body.toneSummary,body.toneSummary);assert.equal(saved.body.articles[0].title,article.title);
});

 test('publication retains coverage and tone while private source notes stay private',()=>{
  const body=editionSchema.parse({...newEdition(),articles:[article],coverage:{examinedItems:12,sourceNote:'Private provenance',frontPages:[],frontPageSummary:'Copertine verificate'},toneSummary:'Tono verificato'});
  const published=publicBody(body);assert.equal(published.coverage.examinedItems,12);assert.equal(published.coverage.frontPageSummary,'Copertine verificate');assert.equal(published.toneSummary,'Tono verificato');assert(!('sourceNote' in published.coverage));assert.deepEqual(analyseEdition(published),analyseEdition(body));
 });

test('Italian sports coverage excludes foreign sports titles even when flagged national',()=>{
 const italian=['La Gazzetta dello Sport','Corriere dello Sport','Tuttosport'];
 const foreign=['AS','L’Équipe','Marca','Mundo Deportivo','Sport'];
 const pages=[...italian,...foreign].map((outlet,i)=>({outlet,page:i+1,juventus:i<3,nationalSports:true}));
 const body={articles:[],coverage:{frontPages:pages}};
 const result=analyseEdition(body);
 assert.equal(result.sports,3);assert.equal(result.sportsJuventus,3);assert.equal(result.frontPages,8);
 pages[0].juventus=false;
 assert.equal(analyseEdition(body).sportsJuventus,2);
 assert.equal(analyseEdition({articles:[]}).sports,null);
});

test('theme labels total 100 across different editions without changing counts or exact shares',()=>{
 for(const counts of [[5,9,1,1,2,3,1],[1,1,1],[1],[1,6],[13,27,5,8],[1,1,1,1,1,1,1],Array(101).fill(1)]){
  const articles=counts.flatMap((count,i)=>Array.from({length:count},()=>({category:`Theme ${i}`})));
  const themes=analyseEdition({articles}).themes;
  assert.equal(themes.reduce((sum,t)=>sum+t.displayPercent,0),100);
  themes.forEach((t,i)=>{assert.equal(t.count,counts[i]);assert.equal(t.percent,counts[i]/articles.length*100);assert(Math.abs(t.displayPercent-t.percent)<1);});
 }
 assert.deepEqual(analyseEdition({articles:[]}).themes,[]);
 assert.deepEqual(analyseEdition({articles:[{category:'A'},{category:'B'},{category:'C'}]}).themes.map(t=>t.displayPercent),[34,33,33]);
});
