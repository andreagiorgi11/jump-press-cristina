import test from 'node:test';
import assert from 'node:assert/strict';
import {GithubStore} from '../lib/github-store.js';
function fakeGithub(){
 const calls=[];let head='sha1';
 const files={'sha1:index.json':{format:1,drafts:[],published:[]},'sha2:index.json':{format:1,drafts:[{id:'x'}],published:[]}};
 const fetcher=async url=>{const path=url.replace('https://api.github.com/repos/o/r','');calls.push(path);
  if(path==='')return {ok:true,json:async()=>({private:true})};
  if(path.startsWith('/git/ref/'))return {ok:true,json:async()=>({object:{sha:head}})};
  const m=path.match(/^\/contents\/(.+)\?ref=(.+)$/);const value=files[m[2]+':'+m[1]];
  if(!value)return {ok:false,status:404,json:async()=>({})};
  return {ok:true,json:async()=>({encoding:'base64',size:10,content:Buffer.from(JSON.stringify(value)).toString('base64')})};};
 return {calls,fetcher,advance:()=>{head='sha2';}};
}
test('reads are memoised per commit; the head is always fresh; callers get independent copies',async()=>{
 const g=fakeGithub(),store=new GithubStore({repo:'o/r',token:'t',fetcher:g.fetcher});
 const h1=await store.begin();const a=await store.read('index.json',h1);a.drafts.push('mutated');
 const b=await store.read('index.json',h1);
 assert.deepEqual(b.drafts,[],'a caller mutation must not leak into the cache');
 assert.equal(g.calls.filter(c=>c.startsWith('/contents/')).length,1,'second read at the same commit comes from memory');
 assert.equal(await store.read('missing.json',h1),null);assert.equal(await store.read('missing.json',h1),null);
 assert.equal(g.calls.filter(c=>c.startsWith('/contents/missing')).length,1);
 g.advance();const h2=await store.begin();
 assert.equal(h2.sha,'sha2','begin always asks GitHub for the current head');
 assert.deepEqual((await store.read('index.json',h2)).drafts,[{id:'x'}]);
 assert.equal(g.calls.filter(c=>c==='').length,1,'privacy check reused within 10 minutes');
});
