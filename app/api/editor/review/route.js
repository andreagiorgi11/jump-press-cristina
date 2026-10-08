import {z} from 'zod';
import {requireEditor} from '../../../../lib/server-client';
import {failure} from '../../../../lib/errors';
import {readReview} from '../../../../lib/editorial-review';
export const dynamic='force-dynamic';
export async function GET(request){try{const {db}=await requireEditor(request);return Response.json(await readReview(db,z.string().uuid().parse(new URL(request.url).searchParams.get('id'))),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}
