export const dynamic='force-dynamic';
export const runtime='nodejs';
const SOURCE='https://as.com/futbol/primera/aspas-se-rompe-f202609-n/';
export async function GET(){
  return Response.redirect(SOURCE,302);
}
