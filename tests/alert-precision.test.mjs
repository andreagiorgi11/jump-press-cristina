import test from 'node:test';
import assert from 'node:assert/strict';
import {titleMatches,verifyArticle} from '../lib/automatic-clips.js';

test('title OCR treats ell and capital i as equivalent without relaxing evidence',()=>{
 assert(titleMatches('Rivoluzione per i nuovi Yildiz','Rivoluzione per i nuovi YiIdiz'));
 assert(titleMatches('RIVOLUZIONE PER I NUOVI YILDIZ','rivoluzione per i nuovi yildiz'));
 assert(titleMatches('Rivoluzione per i nuovi Yildiz','Rivoluzione per i nuovi YiIduz'));
 const result=verifyArticle({title:'Titolo',pages:[1],factCheck:{status:'verified',evidence:[{page:1,quote:'Il futuro di Yildiz alla Juventus'}]}},[{page:1,text:'Il futuro di YiIdiz alla Juventus'}]);
 assert.equal(result.synthesis,undefined);
});

test('long titles tolerate one letter edit but not two edits or changed digits',()=>{
 const title='Juve, la rincorsa di Cambiaso';
 for(const text of ['Juve, la rincorsa di Cambialo','Juve, la rincorsa di Cambias','Juve, la rincorsa di Cambiasoo'])assert(titleMatches(title,text));
 assert(!titleMatches(title,'Juve, la rincorsa di Cambralo'));
 for(const text of ['Juve vince per 3 a 0','Juve vince per 22 a 0','Juve vince per a 0'])assert(!titleMatches('Juve vince per 2 a 0',text));
 assert(!titleMatches('Mea culpa Var','Mea culpa Vaz'));
 const result=verifyArticle({title,pages:[1],factCheck:{status:'verified',evidence:[{page:1,quote:'La rincorsa di Cambiaso prosegue oggi'}]}},[{page:1,text:'La rincorsa di Cambialo prosegue oggi'}]);
 assert.equal(result.synthesis,undefined);
 assert.equal(verifyArticle({title,pages:[1,2]},[{page:1,text:'Altro titolo'},{page:2,text:title}]).pdf.status,'attention');
});

test('short heading is recognized only in heading-like context',()=>{
 assert(titleMatches('Mea culpa Var','Orsato ammette cinque errori\nMea culpa\nVar LISSONE   Daniele Orsato fa autocritica'));
 assert(titleMatches('Mea culpa Var','Mea culpa Var\nIl testo della notizia.'));
 assert(!titleMatches('Mea culpa Var','Nel suo mea culpa Var e arbitri sono al centro della discussione.'));
 assert(!titleMatches('Mea culpa Var','Mea culpa Var e arbitri al centro del dibattito.'));
 assert(!titleMatches('Mea culpa Var','Mea culpa\nVarietà LISSONE Il testo.'));
 assert(!titleMatches('Juve','Juve'));
 const article={title:'Mea culpa Var',pages:[1,2]};
 assert.equal(verifyArticle(article,[{page:1,text:'Altra notizia'},{page:2,text:'Mea culpa Var'}]).pdf.status,'attention');
});

test('literal evidence never certifies synthesis or rescues an unrelated headline',()=>{const a={title:'Spalletti prepara la trasferta di Cagliari',pages:[1],factCheck:{status:'verified',evidence:[{page:1,quote:'Il centrocampista ha firmato il rinnovo fino al 2031'}]}};const r=verifyArticle(a,[{page:1,text:'Inter, vertice di mercato. Il centrocampista ha firmato il rinnovo fino al 2031'}]);assert.equal(r.pdf.status,'attention');assert.equal(r.synthesis,undefined);});
test('concrete editorial doubts remain visible, and an explicit empty note resolves historical doubts',async()=>{const {articleEditorialNote}=await import('../lib/check-labels.js');assert.equal(articleEditorialNote({factCheck:{status:'attention',note:'Firma da verificare'}}),'Firma da verificare');assert.equal(articleEditorialNote({editorialNote:'',factCheck:{status:'attention',note:'Vecchio dubbio'}}),'');assert.equal(articleEditorialNote({editorialNote:'Numero non leggibile'}),'Numero non leggibile');});
