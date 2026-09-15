export const dynamic='force-dynamic';
export const runtime='nodejs';

const allowed=new Set(['NBO9PL','NBOA81','NBNUSJ','NBO6I5','NBOBU4','NBO78D','NBO9YI','NBO6HK','NBO7RX','NBO683','NBOCKG','NBOBKU','NBOBNS','NBOBZ5','NBOC6I','NBOBR3','NBNZPP','NBNML8','NBOD28','NBH08G','NBH45E','NBO6QD','NBO7N5']);

export async function GET(request){
  const id=new URL(request.url).searchParams.get('id')||'';
  if(!allowed.has(id)) return new Response('Ritaglio non trovato',{status:404});
  const url=`https://rassegna.dominiocliente.it/imm3pdf/Image.aspx?&imgatt=${encodeURIComponent(id)}&imganno=2026&imgkey=B1ZF4PMEYZ8K0&rsdoc=2&tiplink=4`;
  const upstream=await fetch(url,{cache:'no-store',redirect:'follow'});
  if(!upstream.ok) return new Response('Ritaglio non disponibile',{status:502});
  const bytes=await upstream.arrayBuffer();
  const type=upstream.headers.get('content-type')||'application/pdf';
  return new Response(bytes,{status:200,headers:{'content-type':type,'content-disposition':`inline; filename="ritaglio-${id}.pdf"`,'cache-control':'private, no-store, max-age=0'}});
}
