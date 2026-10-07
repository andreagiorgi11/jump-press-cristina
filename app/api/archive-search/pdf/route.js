import {requireEditor} from '../../../../lib/server-client';
import {sameOrigin,failure} from '../../../../lib/errors';
import {selectedArchiveArticles} from '../../../../lib/archive-export';
import {archiveSelectionPdf} from '../../../../lib/archive-selection-pdf';
import {loadPdfFonts} from '../../../../lib/pdf-theme';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function POST(request){try{
 sameOrigin(request);let identity=null;try{identity=await requireEditor(request);}catch(e){if(![401,403].includes(e.status))throw e;}
 const raw=await request.text();if(raw.length>100000)return Response.json({error:'Selezione troppo grande.'},{status:413});
 const selected=await selectedArchiveArticles(JSON.parse(raw),identity);
 const bytes=await archiveSelectionPdf(selected,await loadPdfFonts());
 return new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="jump-press-articoli-selezionati.pdf"'}});
}catch(e){if(e instanceof SyntaxError)e.status=400;return failure(e);}}
