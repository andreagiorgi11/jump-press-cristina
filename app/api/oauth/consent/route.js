import {requireEditor} from '../../../../lib/server-client.js';import {verify,sign,nonce} from '../../../../lib/auth.js';import {sameOrigin,failure} from '../../../../lib/errors.js';
export async function POST(request){try{
 sameOrigin(request);const {user,role}=await requireEditor(request),raw=await request.text();if(raw.length>20000)throw Object.assign(new Error('Richiesta troppo grande'),{status:413});const x=JSON.parse(raw),flow=await verify(x.request,'oauth-request');await verify(flow.clientId,'oauth-client');
 const url=new URL(flow.redirectUri);if(flow.state)url.searchParams.set('state',flow.state);
 if(x.decision==='deny')url.searchParams.set('error','access_denied');
 else {if(!['drafts','publish'].includes(x.decision))throw Object.assign(new Error('Decisione non valida.'),{status:400});
 const approvedRole=x.decision==='publish'&&role==='publisher'&&flow.scope.split(' ').includes('publish')?'publisher':role==='producer'?'producer':'editor';
 url.searchParams.set('code',await sign({sid:nonce(),clientId:flow.clientId,redirectUri:flow.redirectUri,challenge:flow.challenge,user,role:approvedRole},'oauth-code',120));}
 return Response.json({url:url.toString()},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
