import {readFile} from 'node:fs/promises';
import {exportSummaryPdf} from '../../../lib/executive-summary-pdf';
import {exportEditionPdf} from '../../../lib/summary-pdf';
export async function GET(request){
 if(process.env.JUMP_SUMMARY_SANDBOX!=='1'||process.env.VERCEL)return new Response(null,{status:404});
 const source=JSON.parse(await readFile(process.cwd()+'/.local/summary-edition.json','utf8'));
 const summary=new URL(request.url).searchParams.get('kind')==='summary';
 const fonts={regular:await readFile(process.cwd()+'/.local/arial.ttf'),bold:await readFile(process.cwd()+'/.local/arialbd.ttf')};
 const bytes=summary?await exportSummaryPdf(source.editorialModel==='summary-v1'?source.executiveSummary:JSON.parse(await readFile(process.cwd()+'/.local/summary-preview.json','utf8')),source.date,fonts):await exportEditionPdf(source,fonts);
 return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':(new URL(request.url).searchParams.has('inline')?'inline':'attachment')+'; filename="'+(summary?'summary-juventus-':'rassegna-juventus-')+source.date+'.pdf"','Cache-Control':'no-store'}});
}
