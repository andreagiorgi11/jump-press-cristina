import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
import {settings} from './config';

export function publicClient(){
  const {url,key}=settings();
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,cache:'no-store',signal:AbortSignal.timeout(12000)})}});
}
export async function userClient(request){
  const {url,key}=settings();
  const authorization=request?.headers.get('authorization');
  if(authorization?.startsWith('Bearer ')) return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:authorization}}});
  const jar=await cookies();
  return createServerClient(url,key,{cookies:{getAll:()=>jar.getAll(),setAll:items=>{try{items.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server components cannot refresh cookies; API requests can. */}}}});
}
export async function requireEditor(request){
  const db=await userClient(request);
  const {data,error}=await db.auth.getUser();
  if(error || !data.user) throw Object.assign(new Error(error?.status>=500?'Autenticazione temporaneamente non disponibile.':'Accedi con un account editor.'),{status:error?.status>=500?503:401});
  const member=await db.from('jump_members').select('role').eq('user_id',data.user.id).maybeSingle();
  if(member.error) throw Object.assign(new Error('Verifica dei permessi non disponibile.'),{status:503});
  if(!member.data) throw Object.assign(new Error('Questo account non è autorizzato come editor.'),{status:403});
  return {db,user:data.user,role:member.data.role};
}
