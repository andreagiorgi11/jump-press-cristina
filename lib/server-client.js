import {cookies} from 'next/headers';
import {verify,readAccess,roleFor} from './auth.js';
export async function requireEditor(request){
 const authorization=request?.headers.get('authorization');
 let identity;
 if(authorization){if(!authorization.startsWith('Bearer '))throw Object.assign(new Error('Autenticazione non valida.'),{status:401});identity=await readAccess(authorization.slice(7));}
 else{const jar=await cookies(),p=await verify(jar.get('jump_session')?.value,'web-session');identity={user:{id:p.sub,login:p.login,credentialVersion:p.credentialVersion},role:roleFor(p.sub,p.credentialVersion)};}
 return {...identity,db:identity};
}
