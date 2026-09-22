import {z} from 'zod';
import {requireEditor} from '../../../lib/server-client';
import {failure} from '../../../lib/errors';
import {editionExport} from '../../../lib/edition-export';
import {summarySections} from '../../../lib/summary-sections';
import {loadPdfFonts} from '../../../lib/pdf-theme';
import {exportSummaryPdf} from '../../../lib/executive-summary-pdf';
import {exportEditionPdf} from '../../../lib/summary-pdf';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function GET(request){try{
 const q=new URL(request.url).searchParams,kind=z.enum(['summary','edition']).parse(q.get('kind')||'edition');
 const draftId=q.get('draft'),date=q.get('date');let ctx,version;
 if(draftId){z.string().uuid().parse(draftId);ctx=(await requireEditor(request)).db;version=z.coerce.number().int().positive().parse(q.get('version'));}
 else z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(date);
 const raw=q.get('sections'),indices=raw===null?null:raw.split(',').map(Number);
 if(indices&&(!raw||indices.some(i=>!Number.isInteger(i)||i<0||i>=summarySections.length)||new Set(indices).size!==indices.length))return new Response('Selezione non valida',{status:400});
 const clips=q.get('clips');if(clips!==null&&clips!=='1')return new Response('Opzione non valida',{status:400});
 const source=await editionExport({date,draftId,version,ctx});
 if(kind==='summary'&&!source.body.executiveSummary)return new Response('Summary non disponibile per questa edizione.',{status:422,headers:{'Cache-Control':'private, no-store'}});
 const fonts=await loadPdfFonts();
 const bytes=kind==='summary'?await exportSummaryPdf(source.body.executiveSummary,source.body.date,fonts):await exportEditionPdf(source.body,fonts,indices?.map(i=>summarySections[i]),clips==='1'?{loadClip:source.loadClip}:{});
 // Stream the completed, validated document to support editions with large clips.
 let offset=0;
 const stream=new ReadableStream({pull(controller){
  if(offset>=bytes.length){controller.close();return;}
  const end=Math.min(offset+65536,bytes.length);
  controller.enqueue(bytes.subarray(offset,end));offset=end;
 }});
 return new Response(stream,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':(q.has('inline')?'inline':'attachment')+'; filename="'+(kind==='summary'?'summary':'rassegna')+'-juventus-'+source.body.date+'.pdf"'}});
}catch(error){return failure(error);}}
