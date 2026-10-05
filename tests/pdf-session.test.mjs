import test from 'node:test';
import assert from 'node:assert/strict';
import {createPdfSession} from '../lib/pdf-session.js';

test('successive articles share the same original, including an in-flight load and its downloaded ranges',async()=>{
 const session=createPdfSession();let loads=0,finish;
 const doc={ranges:new Map([[0,new Uint8Array([1,2,3])]])};
 const load=async()=>{loads++;await new Promise(resolve=>finish=resolve);return doc;};
 const first=session.get('draft:source',load);await Promise.resolve();
 const second=session.get('draft:source',load);assert.equal(first,second);finish();
 assert.equal(await first,doc);assert.equal(await second,doc);
 assert.equal(await session.get('draft:source',load),doc);assert.equal(loads,1);
 assert.equal(doc.ranges.get(0).length,3);session.clear();
});

test('changing source and leaving the editor release the original; failed loads can be retried',async()=>{
 const session=createPdfSession();let aborted=0;
 const load=async signal=>{signal.addEventListener('abort',()=>aborted++,{once:true});return {};};
 await session.get('draft:source1',load);await session.get('draft:source2',load);assert.equal(aborted,1);
 session.clear();session.clear();assert.equal(aborted,2);
 await assert.rejects(session.get('draft:source2',async()=>{throw Error('Unavailable');}),/Unavailable/);
 assert.ok(await session.get('draft:source2',load));session.clear();assert.equal(aborted,3);
});

test('a late result from a cleared source cannot replace the new source',async()=>{
 const session=createPdfSession();let finish;
 const old=session.get('old',async()=>new Promise(resolve=>finish=resolve));await Promise.resolve();
 const rejected=assert.rejects(old,{name:'AbortError'});
 const newer={};assert.equal(await session.get('new',async()=>newer),newer);
 finish({});await rejected;
 assert.equal(await session.get('new',async()=>{throw Error('Must reuse');}),newer);session.clear();
});
