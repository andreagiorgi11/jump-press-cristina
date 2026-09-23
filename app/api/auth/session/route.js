import {cookies} from 'next/headers';
import {requireEditor} from '../../../../lib/server-client';
import {failure} from '../../../../lib/errors';
export const dynamic='force-dynamic';
export async function GET(request){
 try{if(!request.headers.get('authorization')&&!(await cookies()).get('jump_session')?.value)return Response.json({authenticated:false},{headers:{'Cache-Control':'private, no-store'}});const {role}=await requireEditor(request);return Response.json({authenticated:true,role},{headers:{'Cache-Control':'private, no-store'}});}
 catch(error){if(error.status===401)return Response.json({authenticated:false},{headers:{'Cache-Control':'private, no-store'}});return failure(error);}
}
