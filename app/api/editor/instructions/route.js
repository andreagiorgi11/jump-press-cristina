import {requireEditor} from '../../../../lib/server-client';
import {readInstructions,saveInstructions} from '../../../../lib/editorial-instructions';
import {sameOrigin,failure} from '../../../../lib/errors';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request){try{const {db}=await requireEditor(request);return Response.json(await readInstructions(db),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}
export async function PUT(request){try{
 sameOrigin(request);const {db}=await requireEditor(request);const raw=await request.text();if(raw.length>70000)return Response.json({error:'Testo troppo lungo.'},{status:413});
 const input=JSON.parse(raw);return Response.json(await saveInstructions(db,input.version,input.text),{headers:{'Cache-Control':'private, no-store'}});
}catch(e){if(e instanceof SyntaxError)e.status=400;return failure(e);}}
