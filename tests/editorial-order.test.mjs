import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {orderedSectionArticles,summaryEdition} from '../lib/summary-sections.js';
import {exportEditionPdf} from '../lib/summary-pdf.js';
const a=(id,category,isEditorial=false)=>({id,title:id,category,isEditorial,outlet:'Tuttosport',summary:'Sintesi di prova.',rating:3});
const articles=[a('NewsOne','Prima squadra'),a('OpinionOne','Prima squadra',true),a('NewsTwo','Prima squadra'),a('OpinionTwo','Prima squadra',true),a('NationalNews','Nazionale'),a('NationalTwo','Nazionale'),a('NationalThree','Nazionale'),a('NationalOpinion','Nazionale',true)];
const expected=['OpinionOne','OpinionTwo','NewsOne','NewsTwo','NationalOpinion','NationalNews','NationalTwo','NationalThree'];
test('editorials lead each section, preserving relative order and original records',()=>{
 const before=structuredClone(articles);const sorted=orderedSectionArticles(articles);
 assert.deepEqual(sorted.map(a=>a.id),expected);assert.deepEqual(articles,before);
 assert.strictEqual(sorted[0],articles[1]);assert.deepEqual(orderedSectionArticles(sorted),sorted);
});
test('editorial priority also applies after small Nazionale sections merge into Altri temi',()=>{
 const body=summaryEdition({articles:[a('Other','Altri temi'),a('NationalOpinion','Nazionale',true)]});
 assert.deepEqual(orderedSectionArticles(body.articles).map(a=>[a.id,a.category]),[['NationalOpinion','Altri temi'],['Other','Altri temi']]);
});
test('exported PDF uses the same editorial ordering',async()=>{
 const bytes=await exportEditionPdf({date:'2026-09-30',title:'Rassegna',intro:'Introduzione.',articles});
 const parse=createRequire(import.meta.url)('pdf-parse/lib/pdf-parse.js');const result=await parse(Buffer.from(bytes));
 const positions=expected.map(title=>result.text.lastIndexOf(title));assert(positions.every(n=>n>=0));
 for(let i=1;i<positions.length;i++)assert(positions[i]>positions[i-1],expected[i]+' must follow '+expected[i-1]);
});
