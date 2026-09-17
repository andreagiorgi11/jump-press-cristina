import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './helpers.mjs';
import {authenticate,passwordHash,passwordMatches,reserveLogin,accountRole,credentialVersion,accounts} from '../lib/passwords.js';
process.env.JUMP_SESSION_SECRET='isolated-password-tests-not-production-123456';
test('salted passwords, generic failures and credential revocation',async()=>{
 const password='isolated test password only';
 const hash=await passwordHash(password),second=await passwordHash(password);
 assert.notEqual(hash,second);assert(await passwordMatches(password,hash));
 const user={id:'editor-1',username:'cristina',role:'publisher',passwordHash:hash};
 process.env.JUMP_EDITOR_USERS=JSON.stringify([user]);
 const repo=new MemoryStore();
 const signedIn=await authenticate(' Cristina ',password,repo);
 assert.equal(signedIn.login,'cristina');assert.equal(accountRole(signedIn.id,signedIn.credentialVersion),'publisher');
 let wrong,unknown;try{await authenticate('cristina','wrong',repo);}catch(e){wrong=e;}try{await authenticate('nobody','wrong',repo);}catch(e){unknown=e;}
 assert.equal(wrong.status,401);assert.equal(wrong.message,unknown.message);
 process.env.JUMP_EDITOR_USERS=JSON.stringify([{...user,passwordHash:second}]);
 assert.throws(()=>accountRole(signedIn.id,signedIn.credentialVersion),/Sessione scaduta/);
 assert.throws(()=>accountRole(signedIn.id),/Sessione scaduta/);
 process.env.JUMP_EDITOR_USERS=JSON.stringify([{...user,role:'editor'}]);assert.equal(accountRole(user.id,credentialVersion(user)),'editor');
});
test('shared attempt limits, recovery, concurrent reservations and provider errors',async()=>{
 const repo=new MemoryStore();for(let i=0;i<8;i++)await reserveLogin('cristina',repo,1000);
 await assert.rejects(reserveLogin('cristina',repo,1001),e=>e.status===429);
 await reserveLogin('andrea',repo,1001);await reserveLogin('cristina',repo,901001);
 assert(!JSON.stringify(repo.files).includes('cristina'));
 const concurrent=new MemoryStore(),results=await Promise.allSettled([reserveLogin('x',concurrent,1),reserveLogin('x',concurrent,1)]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.find(x=>x.status==='rejected').reason.status,429);
 await assert.rejects(reserveLogin('x',{begin:async()=>{throw Object.assign(Error('unavailable'),{status:503});}}),e=>e.status===503);
 const corrupt=new MemoryStore();await corrupt.commit({'auth/login-limits.json':{start:'broken'}},await corrupt.begin());await assert.rejects(reserveLogin('x',corrupt),e=>e.status===503);
});
test('rejects malformed credentials and unsafe password length',async()=>{
 await assert.rejects(passwordHash('short'),e=>e.status===400);
 process.env.JUMP_EDITOR_USERS='{}';assert.throws(accounts,e=>e.status===503);
});
