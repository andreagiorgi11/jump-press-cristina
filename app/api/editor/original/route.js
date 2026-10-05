import {z} from 'zod';
import {requireEditor} from '../../../../lib/server-client';
import {originalSourceLink} from '../../../../lib/original-source';
import {failure} from '../../../../lib/errors';
export const dynamic='force-dynamic';
export async function GET(request){
 try{
  const {db}=await requireEditor(request);
  const draft=z.string().uuid().parse(new URL(request.url).searchParams.get('draft'));
  const url=await originalSourceLink(db,draft);
  if(new URL(request.url).searchParams.get('format')==='json')return Response.json({url},{headers:{'Cache-Control':'private, no-store'}});
  return new Response(null,{status:302,headers:{Location:url,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 }catch(error){
  const response=await failure(error);
  if(new URL(request.url).searchParams.get('format')==='json')return response;
  const {error:message}=await response.json();
  return new Response(error.name==='ZodError'?'Riferimento alla rassegna non valido.':message,{status:response.status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
 }
}
