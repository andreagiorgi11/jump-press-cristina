import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {drawEditionCover} from '../lib/summary-pdf-cover.js';

for(let count=0;count<=10;count++)test(`PDF front pages: ${count} outlets have balanced, centred rows`,async()=>{
 const pdf=await PDFDocument.create(),page=pdf.addPage([595.28,841.89]);
 const font=await pdf.embedFont(StandardFonts.Helvetica),marks=[];
 const original=page.drawText.bind(page);
 page.drawText=(text,options)=>{if(text.startsWith('Testata '))marks.push({text,...options});original(text,options);};
 await drawEditionCover({pdf,page,font,bold:font,body:{date:'2026-10-05',intro:'Prova',articles:[],keyPoints:[],coverage:{frontPages:Array.from({length:count},(_,i)=>({outlet:`Testata ${i+1}`,juventus:true}))}}});
 assert.equal(marks.length,count);
 const rows=Map.groupBy(marks,m=>m.y),sizes=[...rows.values()].map(row=>row.length);
 if(count)assert(Math.max(...sizes)-Math.min(...sizes)<=1);
 for(const row of rows.values()){
  const centres=row.map(m=>m.x+font.widthOfTextAtSize(m.text,8)/2);
  assert(Math.abs((centres[0]+centres.at(-1))/2-595.28/2)<.01);
  assert(row.every(m=>m.x>=42&&m.x+font.widthOfTextAtSize(m.text,8)<=553.28));
  assert(row.length<=3);
 }
 assert.equal((await pdf.save()).length>0,true);
});
