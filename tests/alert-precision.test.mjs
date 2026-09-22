import test from 'node:test';
import assert from 'node:assert/strict';
import {titleMatches,verifyArticle} from '../lib/automatic-clips.js';

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
test('wrong page gets a precise warning and never passes',()=>{
 const result=verify([{page:1,quote}],[{page:1,text:'Altro testo'},{page:2,text:quote}]);
 assert.equal(result.status,'attention');assert.match(result.note,/trovato nelle pagine 2/);
 const outside=verify([{page:1,quote}],[{page:1,text:'Altro testo'},{page:3,text:quote}]);
 assert.equal(outside.status,'attention');assert.match(outside.note,/non riscontrato letteralmente/);
});
test('altered names and numbers still raise warnings despite GPT verification note',()=>{
 for(const changed of [quote.replace('David','Bremer'),quote.replace('25','35')]){
  const result=verify([{page:1,quote:changed}],[{page:1,text:quote}]);
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
