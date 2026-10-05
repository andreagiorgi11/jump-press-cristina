import {requireEditor} from '../../../../lib/server-client';
import {readPreferences,savePreferences} from '../../../../lib/editorial-instructions';
import {failure,sameOrigin} from '../../../../lib/errors';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request){try{const {db}=await requireEditor(request);return Response.json(await readPreferences(db),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}
export async function POST(request){try{sameOrigin(request);const {db}=await requireEditor(request);const x=await request.json();return Response.json(await savePreferences(db,x.version,x.text,x.confirmation),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}
