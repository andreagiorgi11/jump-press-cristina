import {requireEditor} from '../../../../lib/server-client';
import {readStorageUsage} from '../../../../lib/storage-usage';
import {failure} from '../../../../lib/errors';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request){
 try{
  const {role}=await requireEditor(request);
  if(!['editor','publisher'].includes(role))return Response.json({error:'Accesso editor richiesto.'},{status:403});
  return Response.json(await readStorageUsage(),{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return failure(error);}
}
