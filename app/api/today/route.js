import {requireEditor} from '../../../lib/server-client';
import {todayStatus,editorStatus,romeNow} from '../../../lib/today-status';
import {contentConfigured} from '../../../lib/config';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(request){
 if(!contentConfigured())return Response.json({error:'Archivio non configurato.'},{status:503,headers});
 try{
  const status=await todayStatus();
  let editor=null;
  try{const identity=await requireEditor(request);if(identity.role)editor=await editorStatus(identity,romeNow().date);}catch{}
  return Response.json({...status,editor},{headers});
 }catch{return Response.json({error:'Stato non disponibile.'},{status:503,headers});}
}
