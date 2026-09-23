import test from 'node:test';
import assert from 'node:assert/strict';
import {moveArticleInSection,sectionArticleIds} from '../lib/article-position.js';
test('Move within section preserves other sections, article data and original input',()=>{
 const b={editorialModel:'summary-v1',articles:[{id:'a',category:'Prima squadra maschile',rating:3},{id:'x',category:'Varie'},{id:'b',category:'Prima squadra maschile'},{id:'c',category:'Prima squadra maschile'}]};
 const before=JSON.stringify(b),m=moveArticleInSection(b,'c',2);
 assert.deepEqual(m.articles.map(a=>a.id),['a','x','c','b']);assert.deepEqual(sectionArticleIds(m,'c'),['a','c','b']);
 assert.equal(m.articles[0],b.articles[0]);assert.equal(JSON.stringify(b),before);
 assert.deepEqual(moveArticleInSection(m,'a',3).articles.map(a=>a.id),['c','x','b','a']);
 assert.throws(()=>moveArticleInSection(b,'a',4));
});
