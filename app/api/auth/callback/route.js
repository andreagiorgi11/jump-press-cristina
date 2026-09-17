import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {verify,sign,roleFor,cookieOptions,secureCookie,validReturn} from '../../../../lib/auth.js';
import {siteUrl} from '../../../../lib/config.js';
import {failure} from '../../../../lib/errors.js';
export async function GET(request){try{
 const params=new URL(request.url).searchParams,jar=await cookies(),flow=await verify(jar.get('jump_login')?.value,'github-flow');
 jar.delete('jump_login');
 if(params.get('state')!==flow.state||!params.get('code'))throw Object.assign(new Error('Accesso GitHub non confermato. Riprova.'),{status:400});
 const res=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:process.env.JUMP_GITHUB_CLIENT_ID,client_secret:process.env.JUMP_GITHUB_CLIENT_SECRET,code:params.get('code'),redirect_uri:siteUrl()+'/api/auth/callback',code_verifier:flow.verifier}),signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error('GitHub non disponibile');const token=await res.json();if(!token.access_token)throw Object.assign(new Error('Accesso GitHub scaduto. Riprova.'),{status:401});
 const me=await fetch('https://api.github.com/user',{headers:{Authorization:'Bearer '+token.access_token,Accept:'application/vnd.github+json'},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!me.ok)throw Error('GitHub non disponibile');const user=await me.json();if(!Number.isInteger(user.id)||!user.login)throw Error('Identità non valida');roleFor(String(user.id));
 const response=NextResponse.redirect(siteUrl()+validReturn(flow.returnTo));response.cookies.set('jump_session',await sign({sub:String(user.id),login:user.login},'web-session',8*3600),{...cookieOptions,secure:secureCookie(),maxAge:8*3600});return response;
}catch(e){return failure(e);}}
