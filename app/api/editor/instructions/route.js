import {requireEditor} from '../../../../lib/server-client';
import {readInstructions} from '../../../../lib/editorial-instructions';
import {failure} from '../../../../lib/errors';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request){try{const {db}=await requireEditor(request);return Response.json(await readInstructions(db),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}
