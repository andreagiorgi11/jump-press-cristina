export const dynamic='force-dynamic';
export const runtime='nodejs';

const allowed=new Set(['NBGKLI','NBGM10','NBG5YI','NBGHJ8','NBG6FB','NBGBD4','NBGH8Z','NBGH7B','NBGHO2','NBGME1','NBGH3O','NBGH3X','NBGKZ7','NBGH5Q','NBGMO9','NBGMIS','NBGFWV','NBGMHV','NBGM0B','NBGH9R','NBG1OR','NBGHAM','NBGH5T']);

export async function GET(request){
  const id=new URL(request.url).searchParams.get('id')||'';
  if(!allowed.has(id)) return new Response('Ritaglio non trovato',{status:404});
  const url=`https://rassegna.dominiocliente.it/imm3pdf/Image.aspx?&imgatt=${encodeURIComponent(id)}&imganno=2026&imgkey=B1ZF26MEYZ8K0&rsdoc=2&tiplink=4`;
  const upstream=await fetch(url,{cache:'no-store',redirect:'follow'});
  if(!upstream.ok) return new Response('Ritaglio non disponibile',{status:502});
  const bytes=await upstream.arrayBuffer();
  const type=upstream.headers.get('content-type')||'application/pdf';
  return new Response(bytes,{status:200,headers:{'content-type':type,'content-disposition':`inline; filename="ritaglio-${id}.pdf"`,'cache-control':'private, no-store, max-age=0'}});
}
