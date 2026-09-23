import test from 'node:test';
import assert from 'node:assert/strict';
import {summarySections,summaryEdition} from '../lib/summary-sections.js';
import {executiveSummarySchema} from '../lib/schema.js';
import {exportSummaryPdf} from '../lib/executive-summary-pdf.js';
import {PDFDocument} from 'pdf-lib';
import {outletOptions} from '../lib/outlet-options.js';
test('Five sections validate in order and preserve legacy article and clip identities',()=>{
 const sections=summarySections.map(title=>({title,items:['Un tema: una sintesi.']}));
 assert(executiveSummarySchema.safeParse({intro:'Introduzione',sections}).success);
 assert(!executiveSummarySchema.safeParse({intro:'Introduzione',sections:[sections[1],sections[0],...sections.slice(2)]}).success);
 const body={articles:[{id:'a',category:'Next Gen',clipId:'clip'},{id:'b',category:'Varie'},{id:'c',category:'Prima squadra femminile'},{id:'d',category:'Editoriali',topic:'Politica sportiva'}]};
 const converted=summaryEdition(body);assert.deepEqual(converted.articles.map(a=>a.category),['Next Gen e Primavera','Altri temi','Juventus Women','Politica sportiva']);assert.equal(converted.articles[0].clipId,'clip');assert.equal(body.articles[0].category,'Next Gen');
});
test('Summary PDF renders all five sections and old summaries remain exportable',async()=>{
 for(const titles of [summarySections,['Prima squadra maschile','Prima squadra femminile','Politica sportiva','Varie']]){
  const summary={intro:'Introduzione',sections:titles.map(title=>({title,items:['Tema: descrizione.']}))};
  const pdf=await PDFDocument.load(await exportSummaryPdf(summary,'2026-09-23'));assert.equal(pdf.getPageCount(),1);
 }
});
test('Outlet choices include source newspapers and preserve existing names without free input',()=>{
 const choices=outletOptions({articles:[{outlet:'Testata locale'}],coverage:{frontPages:[{outlet:'Sport estero'}]}},[{sourceOutlets:['Nuovo giornale','Tuttosport']}]);
 assert(choices.includes('Testata locale'));assert(choices.includes('Sport estero'));assert(choices.includes('Nuovo giornale'));assert.equal(choices.filter(x=>x==='Tuttosport').length,1);
});
