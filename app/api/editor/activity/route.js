import {requireEditor} from '../../../../lib/server-client';
import {failure} from '../../../../lib/errors';
import {readActivityReport} from '../../../../lib/activity-store.js';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request){try{
 const {db}=await requireEditor(request),q=new URL(request.url).searchParams;
 return Response.json(await readActivityReport(db,q.get('date'),q.get('runId')),{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return failure(e);}}
