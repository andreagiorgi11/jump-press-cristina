import test from 'node:test';
import assert from 'node:assert/strict';
import {dailySentiment} from '../lib/daily-sentiment.js';
import {saveDraft,publicBody} from '../lib/editor-service.js';
import {MemoryStore} from './helpers.mjs';
import {randomUUID} from 'node:crypto';
const article=tone=>({id:randomUUID(),category:'Prima squadra',title:'Titolo verificato',outlet:'Testata',summary:'Fatti della Juventus.',juventusSentiment:{tone,reason:'Valutazione fondata sul pezzo.'}});
test('Sentiment uses all selected articles, including neutral and mixed; incomplete reviews stay unknown',()=>{
 assert.equal(dailySentiment([]).value,null);assert.equal(dailySentiment(['Positivo: Un punto']).value,null);
 assert.equal(dailySentiment([article('positivo'),{title:'Non valutato'}]).value,null);
 assert.equal(dailySentiment([article('positivo'),article('negativo')]).value,.5);
 assert.equal(dailySentiment([article('neutro'),article('misto')]).value,.5);
 const all=[...Array.from({length:20},()=>article('positivo')),...Array.from({length:60},()=>article('negativo'))];
 assert.equal(dailySentiment(all).value,.25);assert.equal(dailySentiment(all).label,'Tendenza negativa');
});
test('Article assessments persist publicly; text changes invalidate stale assessment, clip changes do not',async()=>{
 const ctx={role:'editor',user:{id:'test'},store:new MemoryStore()},id=randomUUID();
 let draft=await saveDraft(ctx,id,0,{date:'2026-09-22',title:'Rassegna',intro:'Giornata',articles:[article('positivo')],keyPoints:['Negativo: Punto selezionato']});
 assert.equal(dailySentiment(publicBody(draft.body).articles).value,1);
 draft.body.articles[0].clipId=randomUUID();draft=await saveDraft(ctx,id,1,draft.body);assert.equal(draft.body.articles[0].juventusSentiment.tone,'positivo');
 draft.body.articles[0].summary='La fonte ora riferisce una criticità.';draft=await saveDraft(ctx,id,2,draft.body);
 assert.equal(draft.body.articles[0].juventusSentiment,null);assert.equal(dailySentiment(draft.body.articles).value,null);
});
