import {settings,siteUrl} from '../../../lib/config';
export async function GET(){try{
 const {url}=settings();return Response.json({resource:siteUrl()+'/mcp',authorization_servers:[url+'/auth/v1'],bearer_methods_supported:['header']},{headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});
}catch{return Response.json({error:'MCP non ancora configurato'},{status:503});}}
export function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS'}});}
