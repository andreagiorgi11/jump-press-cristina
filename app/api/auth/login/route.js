import {NextResponse} from 'next/server';
import {sign,cookieOptions,secureCookie,validReturn} from '../../../../lib/auth.js';
import {authenticate} from '../../../../lib/passwords.js';
import {sameOrigin,failure} from '../../../../lib/errors.js';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request){try{
 sameOrigin(request);const raw=await request.text();if(raw.length>4096)return new Response('Richiesta troppo grande',{status:413});
 const x=JSON.parse(raw),user=await authenticate(x.username,x.password);
 const response=NextResponse.json({returnTo:validReturn(x.returnTo)},{headers:{'Cache-Control':'no-store'}});
 response.cookies.set('jump_session',await sign({sub:user.id,login:user.login,credentialVersion:user.credentialVersion},'web-session',8*3600),{...cookieOptions,secure:secureCookie(),maxAge:8*3600});return response;
}catch(e){if(e instanceof SyntaxError)e.status=400;return failure(e);}}
export function GET(){return NextResponse.redirect(new URL('/editor',process.env.JUMP_PUBLIC_URL||'http://127.0.0.1:3015'));}
