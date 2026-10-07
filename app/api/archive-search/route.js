import {requireEditor} from '../../../lib/server-client';
import {failure} from '../../../lib/errors';
import {searchArchive} from '../../../lib/archive-search';
export const dynamic='force-dynamic';
export async function GET(request){try{
 let identity=null;try{identity=await requireEditor(request);}catch(e){if(![401,403].includes(e.status))throw e;}
 const params=new URL(request.url).searchParams;
 const result=await searchArchive({query:params.get('q'),titleOnly:params.get('titleOnly')==='true',from:params.get('from')||'',to:params.get('to')||'',offset:Number(params.get('offset')||0),revision:params.get('revision'),lang:params.get('lang')||'it'},identity);
 return Response.json(result,{headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Authorization'}});
}catch(error){return failure(error);}}
