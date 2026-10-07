import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveSnapshot} from '../lib/archive-snapshot.js';
import {publishedPreviews} from '../lib/published.js';
const index={format:1,published:[{edition_date:'2026-10-06',draft_id:'a',version:4}],drafts:[{id:'a',version:4,updated_at:'2026-10-06',body:{date:'2026-10-06'}}]};
test('archive uses one fresh head and index, and anonymous readers never receive drafts',async()=>{
 let begins=0,reads=0;const repo={begin:async()=>{begins++;return {sha:'current'};},read:async(path,head)=>{reads++;assert.equal(path,'index.json');assert.equal(head.sha,'current');return structuredClone(index);}};
 const anonymous=await archiveSnapshot(null,repo);assert.deepEqual(anonymous.drafts,[]);assert.equal(anonymous.rows.length,1);assert.equal(begins,1);assert.equal(reads,1);
 const editor=await archiveSnapshot({role:'editor'},repo);assert.equal(editor.drafts[0].version,4);assert.equal(begins,2);assert.equal(reads,2);
 await assert.rejects(archiveSnapshot({role:'reader'},repo),error=>error.status===403);assert.equal(begins,2);
});
test('failed or corrupt index is not an empty archive',async()=>{
 await assert.rejects(archiveSnapshot(null,{begin:async()=>{throw Error('offline');}}),/offline/);
 await assert.rejects(archiveSnapshot(null,{begin:async()=>({sha:'x'}),read:async()=>null}),error=>error.status===503);
});
test('previews reuse the list snapshot and expose missing or failed details',async()=>{
 const seen=[];const repo={begin:async()=>{throw Error('Must reuse snapshot');},read:async(path,head)=>{seen.push(head.sha);if(path.includes('2026-10-05'))throw Error('offline');return null;}};
 const result=await publishedPreviews(['2026-10-05','2026-10-06'],{head:{sha:'list-head'}},repo);
 assert.deepEqual(seen,['list-head','list-head']);assert.deepEqual(result,{'2026-10-05':{unavailable:true},'2026-10-06':{unavailable:true}});
});
