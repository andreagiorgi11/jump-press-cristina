import {scrypt,randomBytes,timingSafeEqual,createHash,createHmac} from 'node:crypto';
import {promisify} from 'node:util';
import {problem,store} from './github-store.js';
const derive=promisify(scrypt),options={N:131072,r:8,p:1,maxmem:160*1024*1024};
const format=/^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/;
export function accounts(){
 let list;try{list=JSON.parse(process.env.JUMP_EDITOR_USERS||'[]');}catch{throw problem(503,'Accessi non configurati.');}
 if(!Array.isArray(list)||list.length>30||list.some(u=>!u||typeof u.id!=='string'||!u.id||!(/^[a-z0-9._-]{3,40}$/).test(u.username)||!['publisher','editor','producer'].includes(u.role)||!format.test(u.passwordHash))||new Set(list.map(u=>u.id)).size!==list.length||new Set(list.map(u=>u.username)).size!==list.length)throw problem(503,'Accessi non configurati.');
 return list;
}
export const credentialVersion=u=>createHash('sha256').update(u.passwordHash).digest('base64url');
export function accountRole(id,version){const u=accounts().find(u=>u.id===id);if(!u)throw problem(403,'Account non abilitato alla redazione.');if(!version||version!==credentialVersion(u))throw problem(401,'Sessione scaduta. Accedi di nuovo.');return u.role;}
export async function passwordHash(password){if(typeof password!=='string'||password.length<14||password.length>256)throw problem(400,'Usa una password da 14 a 256 caratteri.');const salt=randomBytes(16).toString('hex');return 'scrypt-v1$'+salt+'$'+(await derive(password,salt,64,options)).toString('hex');}
export async function passwordMatches(password,encoded){const value=format.test(encoded||'')?encoded:'scrypt-v1$'+'0'.repeat(32)+'$'+'0'.repeat(128);const [,salt,key]=value.split('$');const actual=await derive(password,salt,64,options);return timingSafeEqual(actual,Buffer.from(key,'hex'))&&Boolean(encoded);}
// Atomic reservation shared by all server instances. No usernames or IPs persisted.
export async function reserveLogin(username,repo=store,now=Date.now()){
 const secret=process.env.JUMP_SESSION_SECRET;if(!secret||secret.length<32)throw problem(503,'Accessi non configurati.');
 const head=await repo.begin(),path='auth/login-limits.json',saved=await repo.read(path,head);
 if(saved!==null&&(!Number.isFinite(saved.start)||!Number.isInteger(saved.total)||saved.total<0||!saved.users||typeof saved.users!=='object'||Array.isArray(saved.users)||Object.entries(saved.users).some(([k,v])=>!(/^[a-f0-9]{64}$/).test(k)||!Number.isInteger(v)||v<1)))throw problem(503,'Controllo accessi non disponibile.');
 const state=!saved||now-saved.start>=900000?{start:now,total:0,users:{}}:saved;
 const key=createHmac('sha256',secret).update(username).digest('hex');
 if(state.total>=60||(state.users[key]||0)>=8)throw problem(429,'Troppi tentativi. Riprova tra 15 minuti.');
 state.total++;state.users[key]=(state.users[key]||0)+1;
 try{await repo.commit({[path]:state},head,'Controllo tentativi di accesso');}catch(e){if(e.status===409)throw problem(429,'Accesso occupato. Riprova tra qualche secondo.');throw e;}
}
export async function authenticate(username,password,repo=store){
 const list=accounts();if(!list.length)throw problem(503,'Accessi non ancora configurati.');
 if(typeof username!=='string'||typeof password!=='string'||username.length>80||password.length>256)throw problem(401,'Nome utente o password non corretti.');
 username=username.trim().toLowerCase();
 const u=list.find(u=>u.username===username);
 // Same protection, less waiting: scrypt runs in parallel with the attempt reservation, never replacing it.
 const [,matches]=await Promise.all([reserveLogin(username,repo),passwordMatches(password,u?.passwordHash)]);
 if(!matches)throw problem(401,'Nome utente o password non corretti.');
 return {id:u.id,login:u.username,credentialVersion:credentialVersion(u)};
}
