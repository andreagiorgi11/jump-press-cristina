import {readFile} from 'node:fs/promises';
import {exportEditionPdf} from '../../../lib/summary-pdf';
export async function GET(){
 if(process.env.JUMP_SUMMARY_SANDBOX!=='1'||process.env.VERCEL)return new Response(null,{status:404});
 const source=JSON.parse(await readFile(process.cwd()+'/.local/summary-edition.json','utf8'));
 const bytes=await exportEditionPdf(source);
 return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="rassegna-juventus-'+source.date+'.pdf"','Cache-Control':'no-store'}});
}
