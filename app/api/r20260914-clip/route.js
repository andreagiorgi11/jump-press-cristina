import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { PDFDocument } from 'pdf-lib';

export const dynamic='force-dynamic';
export const runtime='nodejs';

const SOURCE='https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260914_16364913.pdf';

function norm(s=''){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function tokens(s=''){return norm(s).split(/\s+/).filter(w=>w.length>2 && !['della','dello','delle','degli','alla','alle','con','per','una','uno','del','dei','che','non'].includes(w));}

export async function GET(request){
 const q=new URL(request.url).searchParams.get('q')||'';
 if(!q) return new Response('Missing q',{status:400});
 const up=await fetch(SOURCE,{cache:'no-store',redirect:'follow'});
 if(!up.ok) return new Response('Source unavailable',{status:502});
 const bytes=Buffer.from(await up.arrayBuffer());
 let pageNo=0; const pages=[];
 const pagerender=async pageData=>{pageNo++; const tc=await pageData.getTextContent({normalizeWhitespace:false,disableCombineTextItems:false}); const text=tc.items.map(i=>i.str).join(' '); pages[pageNo]=text; return `<<<PAGE:${pageNo}>>> ${text}\n`;};
 await pdfParse(bytes,{pagerender});
 const qt=tokens(q); let best=1,bestScore=-1;
 for(let i=1;i<pages.length;i++){
   const p=norm(pages[i]||''); let score=0;
   for(const t of qt){ if(p.includes(t)) score+= t.length>=8?3:1; }
   if(p.includes(norm(q))) score+=20;
   if(score>bestScore){bestScore=score;best=i;}
 }
 if(bestScore<=0) return new Response('Ritaglio non trovato',{status:404});
 const src=await PDFDocument.load(bytes,{ignoreEncryption:true});
 const out=await PDFDocument.create();
 const selected=[best-1];
 const copied=await out.copyPages(src,selected);
 copied.forEach(p=>out.addPage(p));
 const result=await out.save();
 return new Response(result,{headers:{'content-type':'application/pdf','content-disposition':'inline; filename="ritaglio-juventus-14-settembre.pdf"','cache-control':'private, no-store, max-age=0','x-source-page':String(best)}});
}
