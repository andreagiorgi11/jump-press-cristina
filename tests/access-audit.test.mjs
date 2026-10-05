import test from 'node:test';import assert from 'node:assert/strict';
import {MemoryStore} from './helpers.mjs';
import {getDraft,assetLink,publishDraft,publicClip} from '../lib/editor-service.js';
import {sameOrigin} from '../lib/errors.js';
import {sign,verify,roleFor} from '../lib/auth.js';
import {credentialVersion} from '../lib/passwords.js';
process.env.JUMP_SESSION_SECRET='isolated-audit-secret-never-used-in-production';
process.env.JUMP_PUBLIC_URL='https://audit.invalid';
const account={id:'audit',username:'audit',role:'publisher',passwordHash:'scrypt-v1$'+'1'.repeat(32)+'$'+'2'.repeat(128)};
process.env.JUMP_EDITOR_USERS=JSON.stringify([account]);
test('expired, tampered and wrong-purpose sessions fail; current role overrides old permissions',async()=>{
 const valid=await sign({sub:account.id,credentialVersion:credentialVersion(account)},'web-session',60);
 assert.equal((await verify(valid,'web-session')).sub,account.id);
 await assert.rejects(verify(await sign({sub:account.id},'web-session',-1),'web-session'),e=>e.status===401);
 const parts=valid.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);await assert.rejects(verify(parts.join('.'),'web-session'),e=>e.status===401);
 await assert.rejects(verify(valid,'mcp-access'),e=>e.status===401);
 process.env.JUMP_EDITOR_USERS=JSON.stringify([{...account,role:'editor'}]);assert.equal(roleFor(account.id,credentialVersion(account)),'editor');
 process.env.JUMP_EDITOR_USERS='[]';assert.throws(()=>roleFor(account.id,credentialVersion(account)),e=>e.status===403);
 process.env.JUMP_EDITOR_USERS=JSON.stringify([account]);
});
test('guessed identifiers do not bypass roles; lower roles cannot write publication',async()=>{
 const store=new MemoryStore();await store.commit({'drafts/private.json':{id:'private'},'assets/secret.json':{storage_path:'private.pdf'}},await store.begin());
 for(const role of [undefined,'guest','reader']){const ctx={role,store};await assert.rejects(getDraft(ctx,'private'),e=>e.status===403);await assert.rejects(assetLink(ctx,'secret'),e=>e.status===403);}
 for(const role of ['producer','editor'])await assert.rejects(publishDraft({role,store},'private',1,'PUBBLICA'),e=>e.status===403);
 assert.equal(store.files['published/private.json'],undefined);
});
test('public PDF requires clip type, matching publication and active index membership',async()=>{
 const store=new MemoryStore();let signed=0;const blobs={link:async()=>{signed++;return 'signed';}};
 const draft={id:'d',body:{date:'2026-09-26'}},clip={id:'c',kind:'clip',draft_id:'d',storage_path:'private.pdf'};
 await store.commit({'drafts/d.json':draft,'assets/c.json':clip,'assets/source.json':{...clip,kind:'source'},'published/2026-09-26.json':{draft_id:'d',body:{articles:[{clipId:'c'}]}}},await store.begin());
 assert.equal(await publicClip('c',store,blobs),null);
 await store.commit({'index.json':{format:1,drafts:[],published:[{draft_id:'d'}]}},await store.begin());
 assert.equal(await publicClip('c',store,blobs),'signed');assert.equal(await publicClip('source',store,blobs),null);assert.equal(await publicClip('other',store,blobs),null);
 await store.commit({'published/2026-09-26.json':{draft_id:'different',body:{articles:[{clipId:'c'}]}}},await store.begin());assert.equal(await publicClip('c',store,blobs),null);assert.equal(signed,1);
});
test('browser mutations reject missing or foreign Origin',()=>{
 for(const headers of [{},{origin:'https://other.invalid'}])assert.throws(()=>sameOrigin(new Request('https://audit.invalid/api/editor',{headers})),e=>e.status===403);
 sameOrigin(new Request('https://audit.invalid/api/editor',{headers:{origin:'https://audit.invalid'}}));
});
