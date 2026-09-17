import {consumeCode,refreshGrant,verify} from '../../../lib/auth.js';import {siteUrl} from '../../../lib/config.js';import {incident} from '../../../lib/errors.js';
export async function POST(request){try{
 const raw=await request.text();if(raw.length>20000)throw Error();const p=new URLSearchParams(raw),clientId=p.get('client_id');await verify(clientId,'oauth-client');
 if(p.has('resource')&&p.get('resource')!==siteUrl()+'/mcp')return Response.json({error:'invalid_target'},{status:400});
 let result;if(p.get('grant_type')==='authorization_code')result=await consumeCode(p.get('code'),clientId,p.get('redirect_uri'),p.get('code_verifier'));
 else if(p.get('grant_type')==='refresh_token')result=await refreshGrant(p.get('refresh_token'),clientId);
 else return Response.json({error:'unsupported_grant_type'},{status:400});
 return Response.json(result,{headers:{'Cache-Control':'no-store',Pragma:'no-cache','Access-Control-Allow-Origin':'*'}});
 }catch(e){if(e.status>=500){await incident('oauth_github_unavailable');return Response.json({error:'temporarily_unavailable'},{status:503});}return Response.json({error:'invalid_grant'},{status:400});}}
export function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});}
