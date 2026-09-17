import {siteUrl} from '../../../lib/config.js';
export async function GET(){const root=siteUrl();return Response.json({resource:root+'/mcp',authorization_servers:[root],bearer_methods_supported:['header'],scopes_supported:['editor','publish']},{headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});}
export function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS'}});}
