import test from 'node:test';
import assert from 'node:assert/strict';
import {dailySentiment} from '../lib/daily-sentiment.js';
test('Sentiment uses explicit classifications and never treats missing assessment as neutral',()=>{
 for(const points of [[],['Una vittoria'],['Positivo: Vittoria','Da valutare'],['Negativo: ']])assert.equal(dailySentiment(points).value,null);
 assert.equal(dailySentiment(['Negativo: Infortunio']).value,0);
 assert.equal(dailySentiment(['Positivo: Recupero']).value,1);
 assert.deepEqual(dailySentiment(['Positivo: Recupero','Negativo: Infortunio']),{value:.5,label:'Equilibrato'});
 assert.equal(dailySentiment(['Positivo: Recupero','Negativo: Infortunio','Positivo: Vittoria']).value,2/3);
});
