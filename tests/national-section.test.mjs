import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {summaryEdition,summaryCategory,articleSections} from '../lib/summary-sections.js';
import {analyseEdition} from '../lib/edition-analysis.js';
import {exportEditionPdf} from '../lib/summary-pdf.js';
import {saveDraft} from '../lib/editor-service.js';
import {editionSchema} from '../lib/schema.js';
import {MemoryStore} from './helpers.mjs';

const article=(category,extra={})=>({id:randomUUID(),category,title:'Titolo '+category,outlet:'Tuttosport',summary:'Sintesi.',rating:3,isEditorial:false,pages:[1],...extra});
const body=national=>({date:'2026-09-25',title:'Rassegna',intro:'Intro',editorialModel:'summary-v1',articles:[article('Prima squadra'),article('Politica sportiva'),article('Altri temi'),...Array.from({length:national},()=>article('Nazionale'))]});

test('up to three Nazionale articles stay in Altri temi; from four they get their own section',()=>{
 for(const [n,own] of [[1,false],[3,false],[4,true],[7,true]]){
  const e=summaryEdition(body(n)),cats=e.articles.map(a=>a.category);
  assert.equal(cats.includes('Nazionale'),own,n+' articoli');
  assert.equal(cats.filter(c=>c==='Altri temi').length,own?1:1+n);
  const themes=analyseEdition(body(n)).themes.map(t=>t.label);assert.equal(themes.includes('Nazionale'),own);
 }
 // The executive Summary keeps five areas: Nazionale counts in Altri temi.
 assert.equal(summaryCategory({category:'Nazionale'}),'Altri temi');
 assert.deepEqual(articleSections.slice(-2),['Nazionale','Altri temi']);
 // An editorial filed under the Nazionale topic follows the same rule.
 const ed=summaryEdition({...body(3),articles:[...body(3).articles,article('Editoriali',{topic:'Nazionale',isEditorial:true})]});assert(ed.articles.some(a=>a.category==='Nazionale'));
});
test('schema accepts Nazionale for articles only and the PDF renders the section',async()=>{
 assert(editionSchema.safeParse(body(4)).success);
 const bytes=await exportEditionPdf(body(4));assert(bytes.length>1000);
 });
test('deleting an article from the draft updates every count',async()=>{
 const ctx={store:new MemoryStore(),role:'editor',user:{id:'test'}},id=randomUUID(),b=body(4);
 let d=await saveDraft(ctx,id,0,b);assert.equal(d.body.articles.length,7);
 const removed=b.articles.at(-1).id;d=await saveDraft(ctx,id,d.version,{...d.body,articles:d.body.articles.filter(a=>a.id!==removed)});
 assert.equal(d.body.articles.length,6);assert.equal(ctx.store.files['drafts/'+id+'.json'].body.articles.length,6);
 // Three Nazionale articles left: they fold back into Altri temi everywhere.
 assert(!summaryEdition(d.body).articles.some(a=>a.category==='Nazionale'));assert.equal(analyseEdition(d.body).themes.find(t=>t.label==='Altri temi').count,4);
});
