import {requireEditor} from '../../../../lib/server-client';
import {readInterests,saveInterests} from '../../../../lib/interest-service';
import {failure,sameOrigin} from '../../../../lib/errors';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request){try{const {db}=await requireEditor(request);return Response.json(await readInterests(db),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}
export async function POST(request){try{sameOrigin(request);const {db}=await requireEditor(request);return Response.json(await saveInterests(db,await request.json()),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}
