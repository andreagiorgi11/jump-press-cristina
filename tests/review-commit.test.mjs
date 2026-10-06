import test from 'node:test';
import assert from 'node:assert/strict';
import {GithubStore} from '../lib/github-store.js';
test('review commits all files atomically with expected head in one request',async()=>{
 let calls=0;
 const store=new GithubStore({repo:'owner/data',token:'test',fetcher:async(url,options)=>{calls++;assert.equal(url,'https://api.github.com/graphql');const {variables:{input}}=JSON.parse(options.body);assert.equal(input.expectedHeadOid,'previous');assert.equal(input.branch.branchName,'main');assert.deepEqual(input.fileChanges.additions.map(f=>JSON.parse(Buffer.from(f.contents,'base64'))),[{version:2},{drafts:[]}]);return {ok:true,json:async()=>({data:{createCommitOnBranch:{commit:{oid:'next'}}}})};}});
 await store.commitReview({'draft.json':{version:2},'index.json':{drafts:[]}},{sha:'previous'},'Review');assert.equal(calls,1);
});
for(const kind of ['conflict','network','missing','permission'])test('review '+kind+' is explicit and never retried',async()=>{
 let calls=0;const store=new GithubStore({repo:'owner/data',token:'test',fetcher:async()=>{calls++;if(kind==='network')throw Error('Offline');return {ok:true,json:async()=>kind==='conflict'?{errors:[{type:'STALE_DATA'}]}:kind==='permission'?{errors:[{type:'FORBIDDEN'}]}:{data:null}};}});
 await assert.rejects(store.commitReview({'draft.json':{}},{sha:'previous'},'Review'),e=>e.status===(kind==='conflict'?409:503));assert.equal(calls,1);
});
