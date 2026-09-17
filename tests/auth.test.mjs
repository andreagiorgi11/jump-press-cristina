import test from 'node:test';import assert from 'node:assert/strict';
import {MemoryStore} from './helpers.mjs';
process.env.JUMP_SESSION_SECRET='isolated-test-key-not-used-anywhere-else-123';
process.env.JUMP_PUBLIC_URL='https://press.test.invalid';
process.env.JUMP_GITHUB_MEMBERS='{"123":"publisher"}';
const {sign,verify,nonce,hash,registerClient,authorizationRequest,consumeCode,refreshGrant,readAccess}=await import('../lib/auth.js');
test('PKCE, client binding, replay protection, refresh rotation and role revocation',async()=>{
 const repo=new MemoryStore(),client=await registerClient({client_name:'Test',redirect_uris:['https://client.test.invalid/callback']}),verifier=nonce();
 const flow=await authorizationRequest(new URLSearchParams({client_id:client.client_id,redirect_uri:client.redirect_uris[0],response_type:'code',code_challenge:hash(verifier),code_challenge_method:'S256',resource:process.env.JUMP_PUBLIC_URL+'/mcp'}));
 const code=await sign({...flow,sid:nonce(),user:{id:'123',login:'test'},role:'editor'},'oauth-code',120);
 await assert.rejects(consumeCode(code,client.client_id,flow.redirectUri,nonce(),repo),/invalid_grant/);
 const token=await consumeCode(code,client.client_id,flow.redirectUri,verifier,repo);
 assert.equal((await readAccess(token.access_token,repo)).role,'editor');
 await assert.rejects(consumeCode(code,client.client_id,flow.redirectUri,verifier,repo),/invalid_grant/);
 await assert.rejects(verify(token.access_token,'web-session'),/non valida/);
 const fresh=await refreshGrant(token.refresh_token,client.client_id,repo);assert(fresh.refresh_token!==token.refresh_token);
 await assert.rejects(refreshGrant(token.refresh_token,client.client_id,repo),/invalid_grant/);
 process.env.JUMP_GITHUB_MEMBERS='{}';await assert.rejects(readAccess(token.access_token,repo),/non abilitato/);process.env.JUMP_GITHUB_MEMBERS='{"123":"publisher"}';
});
test('OAuth rejects unregistered redirect, wrong resource and non-PKCE clients',async()=>{
 await assert.rejects(registerClient({redirect_uris:['http://insecure.invalid/cb']}),/redirect/);
 const client=await registerClient({redirect_uris:['https://client.test.invalid/cb']});
 const params=new URLSearchParams({client_id:client.client_id,redirect_uri:'https://attacker.invalid/cb',response_type:'code',code_challenge:hash(nonce()),code_challenge_method:'S256'});
 await assert.rejects(authorizationRequest(params),/non valida/);
 params.set('redirect_uri',client.redirect_uris[0]);params.set('resource','https://elsewhere.invalid/mcp');await assert.rejects(authorizationRequest(params),/invalid_target/);
 params.delete('resource');params.set('code_challenge_method','plain');await assert.rejects(authorizationRequest(params),/non valida/);
});
