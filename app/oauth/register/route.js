import {registerClient} from '../../../lib/auth.js';
export async function POST(request){try{const raw=await request.text();if(raw.length>8000)throw Error();return Response.json(await registerClient(JSON.parse(raw)),{status:201,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});}catch{return Response.json({error:'invalid_client_metadata'},{status:400});}}
export function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});}
