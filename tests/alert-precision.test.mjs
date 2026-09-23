import test from 'node:test';
import assert from 'node:assert/strict';
import {titleMatches,verifyArticle} from '../lib/automatic-clips.js';

test('title OCR treats ell and capital i as equivalent without relaxing evidence',()=>{
 assert(titleMatches('Rivoluzione per i nuovi Yildiz','Rivoluzione per i nuovi YiIdiz'));
 assert(titleMatches('RIVOLUZIONE PER I NUOVI YILDIZ','rivoluzione per i nuovi yildiz'));
 assert(titleMatches('Rivoluzione per i nuovi Yildiz','Rivoluzione per i nuovi YiIduz'));
 const result=verifyArticle({title:'Titolo',pages:[1],factCheck:{status:'verified',evidence:[{page:1,quote:'Il futuro di Yildiz alla Juventus'}]}},[{page:1,text:'Il futuro di YiIdiz alla Juventus'}]);
 assert.equal(result.synthesis.status,'attention');
});

test('long titles tolerate one letter edit but not two edits or changed digits',()=>{
 const title='Juve, la rincorsa di Cambiaso';
 for(const text of ['Juve, la rincorsa di Cambialo','Juve, la rincorsa di Cambias','Juve, la rincorsa di Cambiasoo'])assert(titleMatches(title,text));
 assert(!titleMatches(title,'Juve, la rincorsa di Cambralo'));
 for(const text of ['Juve vince per 3 a 0','Juve vince per 22 a 0','Juve vince per a 0'])assert(!titleMatches('Juve vince per 2 a 0',text));
 assert(!titleMatches('Mea culpa Var','Mea culpa Vaz'));
 const result=verifyArticle({title,pages:[1],factCheck:{status:'verified',evidence:[{page:1,quote:'La rincorsa di Cambiaso prosegue oggi'}]}},[{page:1,text:'La rincorsa di Cambialo prosegue oggi'}]);
 assert.equal(result.synthesis.status,'attention');
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
const quote='David è a Madrid con riscatto a 25 milioni';
function verify(evidence, pages, status='verified'){
 return verifyArticle({title:'Titolo della notizia',summary:'Sintesi',pages:[1,2],factCheck:{status,note:'Verificati tutti i dati.',evidence}},pages).synthesis;
}
test('wrong page is resolved only within the assigned article',()=>{
 const result=verify([{page:1,quote}],[{page:1,text:'Altro testo'},{page:2,text:quote}]);
 assert.equal(result.status,'verified');assert.equal(result.evidence[0].originalPage,1);assert.equal(result.evidence[0].resolvedPage,2);assert.equal(result.evidence[0].status,'relocated');
 const outside=verify([{page:1,quote}],[{page:1,text:'Altro testo'},{page:2,text:'Altro testo'},{page:3,text:quote}]);
 assert.equal(outside.status,'attention');assert.match(outside.note,/non riscontrato letteralmente/);
});
test('altered names and numbers still raise warnings despite GPT verification note',()=>{
 for(const changed of [quote.replace('David','Bremer'),quote.replace('25','35')]){
  const result=verify([{page:1,quote:changed}],[{page:1,text:quote},{page:2,text:'Altro testo'}]);
  assert.equal(result.status,'attention');assert.match(result.note,/non riscontrato letteralmente/);assert.doesNotMatch(result.note,/Verificati tutti/);
 }
});
test('source unavailable, missing evidence and editorial doubt stay explicit',()=>{
 assert.match(verify([{page:1,quote}],[]).note,/non disponibile/);
 assert.match(verify([],[]).note,/mancano gli estratti/);
 assert.equal(verify([{page:1,quote}],[{page:1,text:quote}],'attention').status,'attention');
 assert.equal(verify([{page:1,quote}],[{page:1,text:quote}]).status,'verified');
 assert.equal(verify([{page:3,quote}],[{page:3,text:quote}]).status,'attention');
});

test('multiple matching pages stay explicit and editorial doubts remain independent',async()=>{
 const {synthesisLabels}=await import('../lib/check-labels.js');
 const a={title:'Titolo sufficientemente lungo',pages:[1,2,3],factCheck:{status:'attention',note:'La squadra del giocatore non è confermata.',evidence:[{page:1,quote}]}};
 const check=verifyArticle(a,[{page:1,text:'Altro testo'},{page:2,text:quote},{page:3,text:quote}]).synthesis;
 assert.deepEqual(check.evidence[0].matchedPages,[2,3]);assert.equal(check.evidence[0].resolvedPage,undefined);
 assert.equal(check.sourceStatus,'matched');assert.equal(check.editorialStatus,'attention');assert.deepEqual(synthesisLabels(check),['Sintesi da verificare']);
 const changed=verify([{page:1,quote:quote.replace('è a Madrid','non è a Madrid')}],[{page:1,text:quote},{page:2,text:'Altro testo'}]);
 assert.equal(changed.sourceStatus,'incomplete');assert.deepEqual(synthesisLabels(changed),['Riscontro fonte incompleto']);
 assert.deepEqual(synthesisLabels({status:'attention',note:'Vecchio controllo'}),['Verifica della sintesi non documentata']);
});
