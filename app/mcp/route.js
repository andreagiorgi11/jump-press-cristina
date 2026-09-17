import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {createEditorialMcp} from '../../lib/mcp-server';
import {requireEditor} from '../../lib/server-client';
import {siteUrl} from '../../lib/config';
import {failure} from '../../lib/errors';
import {after} from 'next/server';
import {purgeOriginals} from '../../lib/source-service.js';
import {incident} from '../../lib/errors.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function POST(request){try{
 const canonical=siteUrl();
 if(request.headers.get('origin') && request.headers.get('origin')!==canonical)return new Response('Origin non autorizzata',{status:403});
 if(!request.headers.get('authorization')?.startsWith('Bearer '))return challenge(canonical);
 const {db}=await requireEditor(request);
 db.defer=after;
 const payload=await request.clone().text();
 if(payload.length>650000)return new Response('Richiesta troppo grande',{status:413});
 let call;try{call=JSON.parse(payload);}catch{}
 if(call?.method==='tools/call'&&call.params?.name==='read_editorial_instructions')after(async()=>{try{await purgeOriginals(db);}catch{await incident('source_retention_failed');}});
 const server=createEditorialMcp(db);
 const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
 await server.connect(transport);
 try{return await transport.handleRequest(request);}finally{await server.close();}
}catch(error){if(error.status===401)return challenge(siteUrl());return failure(error);}}
function challenge(origin){return Response.json({error:'Autenticazione editor richiesta'},{status:401,headers:{'WWW-Authenticate':`Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,'Cache-Control':'no-store'}});}
export async function GET(){return new Response('Usa POST per MCP Streamable HTTP',{status:405,headers:{Allow:'POST'}});}
export const DELETE=GET;
