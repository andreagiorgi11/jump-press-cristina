import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {createEditorialMcp} from '../../lib/mcp-server';
import {requireEditor} from '../../lib/server-client';
import {siteUrl} from '../../lib/config';
import {failure} from '../../lib/errors';
import {after} from 'next/server';
import {purgeOriginals} from '../../lib/source-service.js';
import {incident} from '../../lib/errors.js';
import {activityTrace,activityEvent,activityBackground,activityStep,activityPersistence,hasActivityEvent} from '../../lib/activity-trace.js';
import {saveActivityBatch} from '../../lib/activity-store.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function POST(request){return activityTrace({kind:'request',defer:after},async()=>{try{
 const canonical=siteUrl();
 if(request.headers.get('origin') && request.headers.get('origin')!==canonical)return new Response('Origin non autorizzata',{status:403});
 if(!request.headers.get('authorization')?.startsWith('Bearer '))return challenge(canonical);
 const {db}=await activityStep('auth.check',()=>requireEditor(request));
 // Unauthenticated requests are runtime logs only; never fill the private archive.
 activityPersistence(saveActivityBatch);
 db.defer=after;
 const payload=await request.clone().text();
 if(payload.length>650000)return new Response('Richiesta troppo grande',{status:413});
 let call;try{call=JSON.parse(payload);}catch{}
 activityEvent('http.request',{operation:['tools/call','tools/list','initialize'].includes(call?.method)?call.method.replace('/','.'):'other',inputCharacters:payload.length});
 if(call?.method==='tools/call'&&call.params?.name==='read_editorial_instructions')after(activityBackground('source.retention',async()=>{try{await purgeOriginals(db);}catch{await incident('source_retention_failed');}}));
 const server=createEditorialMcp(db);
 const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
 await server.connect(transport);
 try{
  const response=await transport.handleRequest(request);activityEvent('http.response',{status:response.status});
  if(call?.method==='tools/call'&&!hasActivityEvent('tool.request'))activityEvent('tool.not_executed',{reason:'validation_or_unknown_tool',outcome:'error'});
  return response;
 }finally{await server.close();}
}catch(error){activityEvent('http.response',{status:error.status||503});if(error.status===401)return challenge(siteUrl());return failure(error);}});}
function challenge(origin){return Response.json({error:'Autenticazione editor richiesta'},{status:401,headers:{'WWW-Authenticate':`Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,'Cache-Control':'no-store'}});}
export async function GET(){return new Response('Usa POST per MCP Streamable HTTP',{status:405,headers:{Allow:'POST'}});}
export const DELETE=GET;
