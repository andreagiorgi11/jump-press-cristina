import test from 'node:test';
import assert from 'node:assert/strict';
import {collectStorageUsage} from '../lib/storage-usage.js';
test('inventory paginates, deduplicates and separates original PDFs from article files',async()=>{
 let calls=0;
 const data=await collectStorageUsage(async options=>++calls===1?{blobs:[{pathname:'jump/imports/a/original.pdf',size:60}],hasMore:true,cursor:'next'}:(assert.equal(options.cursor,'next'),{blobs:[{pathname:'jump/imports/a/original.pdf',size:60},{pathname:'jump/draft/clip.pdf',size:20},{pathname:'jump/imports/a/text.json',size:5}],hasMore:false}),{limitBytes:100});
 assert.equal(data.totalBytes,85);assert.equal(data.level,'warning');assert.equal(data.remainingBytes,15);assert.deepEqual(data.totals,{originals:60,articlePdfs:20,other:5});
});
test('unknown quota is not reported as available capacity',async()=>{
 const data=await collectStorageUsage(async()=>({blobs:[],hasMore:false}));assert.equal(data.limitBytes,null);assert.equal(data.remainingBytes,null);assert.equal(data.level,'unknown');
});
test('partial and failed inventories never become zero usage',async()=>{
 await assert.rejects(collectStorageUsage(async()=>{throw Error('unavailable');}));
 await assert.rejects(collectStorageUsage(async()=>({blobs:[],hasMore:true})),/incompleto/);
 await assert.rejects(collectStorageUsage(async()=>({blobs:[{pathname:'a',size:-1}],hasMore:false})),/non valido/);
});
