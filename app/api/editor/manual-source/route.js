import {after} from 'next/server';
import {requireEditor} from '../../../../lib/server-client';
import {failure,sameOrigin} from '../../../../lib/errors';
import {prepareManualSource,finalizeManualSource,manualState,currentManualSource} from '../../../../lib/manual-source';
import {notifyManualSource} from '../../../../lib/source-notification';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function GET(request){try{const {db}=await requireEditor(request),q=new URL(request.url).searchParams;return Response.json(q.has('id')?await manualState(db,q.get('id')):await currentManualSource(db,q.get('date')),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}
export async function POST(request){try{
 sameOrigin(request);const {db}=await requireEditor(request),x=await request.json();let result;
 if(x.action==='prepare')result=await prepareManualSource(db,x.input);
 else if(x.action==='finalize')result=await finalizeManualSource({...db,defer:work=>after(work)},x.id);
 else if(x.action==='notify')result=await notifyManualSource(db,x.id);
 else throw Object.assign(Error('Operazione non valida.'),{status:400});
 return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return failure(e);}}
