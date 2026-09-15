export const dynamic='force-dynamic';
export const runtime='nodejs';
const SOURCE='https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260915_16369491.pdf';
export async function GET(){
  const upstream=await fetch(SOURCE,{cache:'no-store',redirect:'follow'});
  if(!upstream.ok) return new Response('Rassegna estera non disponibile',{status:502});
  const bytes=await upstream.arrayBuffer();
  const type=upstream.headers.get('content-type')||'application/pdf';
  return new Response(bytes,{status:200,headers:{'content-type':type,'content-disposition':'inline; filename="rassegna-estera-juventus-2026-09-15.pdf"','cache-control':'private, no-store, max-age=0'}});
}
