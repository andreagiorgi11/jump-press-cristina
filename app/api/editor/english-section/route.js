import {requireEditor} from '../../../../lib/server-client';
import {sameOrigin,failure} from '../../../../lib/errors';
import {correctEnglishSection} from '../../../../lib/translations';
export const dynamic='force-dynamic';
export async function POST(request){try{
 sameOrigin(request);const {db}=await requireEditor(request);
 const raw=await request.text();if(raw.length>20000)return Response.json({error:'Request too large.'},{status:413});
 return Response.json(await correctEnglishSection(db,JSON.parse(raw)),{headers:{'Cache-Control':'private, no-store'}});
}catch(error){if(error instanceof SyntaxError)error.status=400;return failure(error);}}
