import {publicClient} from '../../../../lib/server-client';
import {checked,failure} from '../../../../lib/errors';
import {z} from 'zod';
export async function GET(request,{params}){try{
 const {id}=await params;z.string().uuid().parse(id);
 const db=publicClient();const path=checked(await db.rpc('jump_public_clip',{p_id:id}));
 if(!path)return new Response('Ritaglio non pubblicato',{status:404});
 const link=checked(await db.storage.from('jump-files').createSignedUrl(path,60));
 return new Response(null,{status:302,headers:{Location:link.signedUrl,'Cache-Control':'no-store'}});
}catch(error){return failure(error);}}
