import {readFile} from 'node:fs/promises';
export async function GET(request,{params}){
 if(process.env.JUMP_SUMMARY_SANDBOX!=='1'||process.env.VERCEL)return new Response(null,{status:404});
 const {id}=await params;
 const body=JSON.parse(await readFile(process.cwd()+'/.local/summary-edition.json','utf8'));
 if(![...body.articles,...(body.coverage?.frontPages||[])].some(a=>a.clipId===id))return new Response(null,{status:404});
 try{
  const local=await readFile(process.cwd()+'/.local/clips/'+id+'.pdf').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(local)return new Response(local,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store'}});
  if(body.editorialModel==='summary-v1')return new Response('Ritaglio locale non disponibile',{status:503});
  const r=await fetch('https://jumpress-juventus.vercel.app/api/clips/'+encodeURIComponent(id),{signal:AbortSignal.timeout(20000),cache:'no-store'});
  if(!r.ok||!r.headers.get('content-type')?.includes('application/pdf'))return new Response('Ritaglio pubblico non disponibile',{status:503});
  return new Response(r.body,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store'}});
 }catch{return new Response('Ritaglio temporaneamente non disponibile',{status:503});}
}
