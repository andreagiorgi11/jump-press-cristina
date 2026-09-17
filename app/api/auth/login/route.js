import {NextResponse} from 'next/server';
import {nonce,hash,sign,cookieOptions,secureCookie,validReturn} from '../../../../lib/auth.js';
import {siteUrl,configured} from '../../../../lib/config.js';
import {failure} from '../../../../lib/errors.js';
export async function GET(request){try{
 if(!configured())throw Object.assign(new Error('Accesso GitHub non ancora configurato.'),{status:503});
 const state=nonce(),verifier=nonce(),returnTo=validReturn(new URL(request.url).searchParams.get('returnTo'));
 const url=new URL('https://github.com/login/oauth/authorize');url.search=new URLSearchParams({client_id:process.env.JUMP_GITHUB_CLIENT_ID,redirect_uri:siteUrl()+'/api/auth/callback',scope:'read:user',state,code_challenge:hash(verifier),code_challenge_method:'S256',allow_signup:'false'}).toString();
 const response=NextResponse.redirect(url);response.cookies.set('jump_login',await sign({state,verifier,returnTo},'github-flow',600),{...cookieOptions,secure:secureCookie(),maxAge:600});return response;
}catch(e){return failure(e);}}
