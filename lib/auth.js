import {accountRole} from './passwords.js';
import {SignJWT,jwtVerify} from 'jose';
import {createHash,randomBytes} from 'node:crypto';
import {siteUrl} from './config.js';
import {problem,store} from './github-store.js';
export const nonce=()=>randomBytes(32).toString('base64url');
export const hash=value=>createHash('sha256').update(value).digest('base64url');
function key(){const value=process.env.JUMP_SESSION_SECRET;if(!value||value.length<32)throw problem(503,'Chiave di sessione non configurata.');return new TextEncoder().encode(value);}
export async function sign(data,type,seconds){return new SignJWT({...data,type}).setProtectedHeader({alg:'HS256'}).setIssuer(siteUrl()).setAudience(type==='mcp-access'?siteUrl()+'/mcp':siteUrl()+'/'+type).setIssuedAt().setExpirationTime(Math.floor(Date.now()/1000)+seconds).sign(key());}
export async function verify(token,type){const k=key();try{const {payload}=await jwtVerify(token,k,{algorithms:['HS256'],issuer:siteUrl(),audience:type==='mcp-access'?siteUrl()+'/mcp':siteUrl()+'/'+type});if(payload.type!==type)throw Error();return payload;}catch{throw problem(401,'Sessione scaduta o non valida. Accedi di nuovo.');}}
export const roleFor=accountRole;
export function capRole(role,limit){if(role==='producer'||limit==='producer')return 'producer';return role==='publisher'&&limit==='publisher'?'publisher':'editor';}
export async function readAccess(token,repo=store){const p=await verify(token,'mcp-access');const grant=await repo.read('oauth/grants/'+p.sid+'.json',await repo.begin());if(!grant||grant.revoked||grant.expires<Date.now()||grant.user.id!==p.sub)throw problem(401,'Collegamento revocato o scaduto.');return {user:grant.user,role:capRole(roleFor(p.sub,grant.user.credentialVersion),grant.role)};}
export async function consumeCode(code,clientId,redirectUri,verifier,repo=store){
 const p=await verify(code,'oauth-code');
 if(p.clientId!==clientId||p.redirectUri!==redirectUri||!verifier||!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)||hash(verifier)!==p.challenge)throw problem(400,'invalid_grant');
 const head=await repo.begin(),path='oauth/grants/'+p.sid+'.json';if(await repo.read(path,head))throw problem(400,'invalid_grant');
 const refreshId=nonce(),grant={user:p.user,role:capRole(roleFor(p.user.id,p.user.credentialVersion),p.role),clientId,refreshHash:hash(refreshId),expires:Date.now()+30*86400000,revoked:false};
 await repo.commit({[path]:grant},head,'Autorizzazione collegamento MCP');
 return tokens(grant,p.sid,refreshId);
}
async function tokens(grant,sid,refreshId){return {access_token:await sign({sub:grant.user.id,sid},'mcp-access',3600),refresh_token:await sign({sid,clientId:grant.clientId,jti:refreshId},'oauth-refresh',30*86400),token_type:'Bearer',expires_in:3600,scope:grant.role==='publisher'?'editor publish':'editor'};}
export async function refreshGrant(token,clientId,repo=store){
 const p=await verify(token,'oauth-refresh');if(p.clientId!==clientId)throw problem(400,'invalid_grant');
 const head=await repo.begin(),path='oauth/grants/'+p.sid+'.json',grant=await repo.read(path,head);
 if(!grant||grant.revoked||grant.expires<Date.now()||grant.refreshHash!==hash(p.jti))throw problem(400,'invalid_grant');
 grant.role=capRole(roleFor(grant.user.id,grant.user.credentialVersion),grant.role);const refreshId=nonce();grant.refreshHash=hash(refreshId);
 await repo.commit({[path]:grant},head,'Rotazione sessione MCP');return tokens(grant,p.sid,refreshId);
}
export const cookieOptions={httpOnly:true,sameSite:'lax',path:'/'};
export const secureCookie=()=>siteUrl().startsWith('https:');
export function validReturn(value){return typeof value==='string'&&(value==='/editor'||value.startsWith('/editor/consent?request='))&&value.length<10000?value:'/editor';}
export function validRedirect(uri){try{const u=new URL(uri);return u.protocol==='https:'&&!u.hash&&!u.username&&!u.password&&uri.length<2048;}catch{return false;}}
export async function registerClient(body){if(!Array.isArray(body.redirect_uris)||!body.redirect_uris.length||body.redirect_uris.length>3||!body.redirect_uris.every(validRedirect))throw problem(400,'invalid_redirect_uri');
 if(body.token_endpoint_auth_method&&body.token_endpoint_auth_method!=='none')throw problem(400,'Solo client pubblici con PKCE sono supportati.');
 const client_name=String(body.client_name||'Client MCP').slice(0,100),redirect_uris=body.redirect_uris;
 return {client_id:await sign({name:client_name,redirects:redirect_uris},'oauth-client',365*86400),client_name,redirect_uris,token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']};
}
export async function authorizationRequest(params){
 const clientId=params.get('client_id'),client=await verify(clientId,'oauth-client'),redirectUri=params.get('redirect_uri'),challenge=params.get('code_challenge'),scope=params.get('scope')||'editor publish';
 if(params.get('response_type')!=='code'||!client.redirects.includes(redirectUri)||params.get('code_challenge_method')!=='S256'||!(/^[A-Za-z0-9_-]{43}$/).test(challenge||''))throw problem(400,'Richiesta OAuth non valida.');
 if(scope.split(' ').some(s=>!['editor','publish'].includes(s))||(params.get('state')||'').length>1000)throw problem(400,'Scope o stato non valido.');
 if(params.has('resource')&&params.get('resource')!==siteUrl()+'/mcp')throw problem(400,'invalid_target');
 return {clientId,name:client.name,redirectUri,challenge,scope,state:params.get('state')||''};
}
