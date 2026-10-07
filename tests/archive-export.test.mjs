import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MemoryStore} from './helpers.mjs';
import {searchArchive} from '../lib/archive-search.js';
import {selectedArchiveArticles} from '../lib/archive-export.js';
import {archiveSelectionPdf} from '../lib/archive-selection-pdf.js';
import {PDFDocument} from 'pdf-lib';
async function fixture(){const repo=new MemoryStore(),id=randomUUID(),privateId=randomUUID(),articles=[{id:randomUUID(),title:'Spalletti primo',outlet:'Testata',author:'Autore',summary:'Sintesi completa. '.repeat(350)},{id:randomUUID(),title:'Spalletti secondo',summary:'Non selezionato',outlet:'Testata'}];
 await repo.commit({'index.json':{format:1,published:[{edition_date:'2026-10-06',draft_id:id,version:1}],drafts:[{id:privateId,version:2,body:{date:'2026-10-07'}}]},'published/2026-10-06.json':{draft_id:id,version:1,body:{articles}},['drafts/'+privateId+'.json']:{id:privateId,version:2,body:{articles}}},await repo.begin());
 const result=await searchArchive({query:'Spalletti'},{role:'editor'},repo);
 const input={lang:'it',groups:result.groups.map(g=>({date:g.date,status:g.status,sourceId:g.sourceId,sourceVersion:g.sourceVersion,contentRevision:g.contentRevision,language:g.language,articleIds:[g.articles[0].id]}))};return {repo,input,articles,privateId};}
test('selection export rechecks access, contains only selected articles and preserves full text',async()=>{
 const {repo,input,articles}=await fixture();await assert.rejects(selectedArchiveArticles(input,null,repo),e=>e.status===403);
 const selected=await selectedArchiveArticles(input,{role:'editor'},repo);assert.equal(selected.groups.length,2);for(const group of selected.groups)assert.deepEqual(group.articles,[articles[0]]);
 const publicOnly={...input,groups:input.groups.filter(g=>g.status==='published')};assert.equal((await selectedArchiveArticles(publicOnly,null,repo)).groups.length,1);
 const pdf=await PDFDocument.load(await archiveSelectionPdf(selected));assert.ok(pdf.getPageCount()>2);
 await assert.rejects(selectedArchiveArticles({...input,groups:[{...input.groups[0],articleIds:[randomUUID()]}]},{role:'editor'},repo),e=>e.status===404);
});
test('stale text, withdrawn publications and trashed drafts cannot be silently exported',async()=>{
 const {repo,input,privateId}=await fixture(),head=await repo.begin(),row=await repo.read('drafts/'+privateId+'.json',head);row.body.articles[0].summary='Changed';await repo.commit({['drafts/'+privateId+'.json']:row},head);
 await assert.rejects(selectedArchiveArticles(input,{role:'editor'},repo),e=>e.status===409);
 const index=await repo.read('index.json',await repo.begin());index.published=[];index.drafts=[];await repo.commit({'index.json':index},await repo.begin());
 for(const group of input.groups)await assert.rejects(selectedArchiveArticles({...input,groups:[group]},{role:'editor'},repo),e=>e.status===409);
});
