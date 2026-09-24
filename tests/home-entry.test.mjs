import test from 'node:test';
import assert from 'node:assert/strict';
process.env.JUMP_SESSION_SECRET='isolated-home-entry-test-secret-only-12345';
process.env.JUMP_PUBLIC_URL='https://home.test.invalid';
const account={id:'home-test',username:'test',role:'publisher',passwordHash:'scrypt-v1$'+'1'.repeat(32)+'$'+'2'.repeat(128)};
process.env.JUMP_EDITOR_USERS=JSON.stringify([account]);
const {sign}=await import('../lib/auth.js');
const {credentialVersion}=await import('../lib/passwords.js');
const {homeEditorDestination}=await import('../lib/home-entry.js');
const session=(seconds=60,type='web-session')=>sign({sub:account.id,login:account.username,credentialVersion:credentialVersion(account)},type,seconds);
test('home restores publisher and editor workspaces, but not anonymous or producer access',async()=>{
 const token=await session();
 assert.equal(await homeEditorDestination(),null);
 assert.equal(await homeEditorDestination(token),'/editor');
 for(const role of ['editor','producer']){
  process.env.JUMP_EDITOR_USERS=JSON.stringify([{...account,role}]);
  const current=await sign({sub:account.id,credentialVersion:credentialVersion({...account,role})},'web-session',60);
  assert.equal(await homeEditorDestination(current),role==='editor'?'/editor':null);
 }
 process.env.JUMP_EDITOR_USERS=JSON.stringify([account]);
});
test('expired, malformed, wrong-purpose and revoked sessions cannot redirect to editor',async()=>{
 assert.equal(await homeEditorDestination('invalid'),null);
 assert.equal(await homeEditorDestination(await session(-60)),null);
 assert.equal(await homeEditorDestination(await session(60,'mcp-access')),null);
 const token=await session();
 process.env.JUMP_EDITOR_USERS=JSON.stringify([{...account,passwordHash:account.passwordHash.slice(0,-1)+'3'}]);
 assert.equal(await homeEditorDestination(token),null);
 process.env.JUMP_EDITOR_USERS='[]';
 assert.equal(await homeEditorDestination(token),null);
 process.env.JUMP_EDITOR_USERS=JSON.stringify([account]);
});
test('session verification service errors remain explicit',async()=>{
 const secret=process.env.JUMP_SESSION_SECRET;
 delete process.env.JUMP_SESSION_SECRET;
 try{await assert.rejects(homeEditorDestination('present'),{status:503});}
 finally{process.env.JUMP_SESSION_SECRET=secret;}
});
