import {summarySections} from '../../../lib/summary-sections';
import {loadPdfFonts} from '../../../lib/pdf-theme';
import {readFile} from 'node:fs/promises';
import {exportSummaryPdf} from '../../../lib/executive-summary-pdf';
import {exportEditionPdf} from '../../../lib/summary-pdf';
export async function GET(request){
 if(process.env.JUMP_SUMMARY_SANDBOX!=='1'||process.env.VERCEL)return new Response(null,{status:404});
 const source=JSON.parse(await readFile(process.cwd()+'/.local/summary-edition.json','utf8'));
 const summary=new URL(request.url).searchParams.get('kind')==='summary';
 const raw=new URL(request.url).searchParams.get('sections');
 const indices=raw===null?null:raw.split(',').map(Number);
 if(indices&&(!raw||indices.some(i=>!Number.isInteger(i)||i<0||i>=summarySections.length)||new Set(indices).size!==indices.length))return new Response('Selezione non valida',{status:400});
 const selected=indices?.map(i=>summarySections[i]);
 const clipOption=new URL(request.url).searchParams.get('clips');
 if(clipOption!==null&&clipOption!=='1')return new Response('Opzione ritagli non valida',{status:400});
 const includeClips=!summary&&clipOption==='1';
 const fonts=await loadPdfFonts();
 try{
 const bytes=summary?await exportSummaryPdf(source.editorialModel==='summary-v1'?source.executiveSummary:JSON.parse(await readFile(process.cwd()+'/.local/summary-preview.json','utf8')),source.date,fonts):await exportEditionPdf(source,fonts,selected,includeClips?{loadClip:id=>readFile(process.cwd()+'/.local/clips/'+id+'.pdf')}:{});
 return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':(new URL(request.url).searchParams.has('inline')?'inline':'attachment')+'; filename="'+(summary?'summary-juventus-':selected&&selected.length<4?'rassegna-selezionata-juventus-':'rassegna-juventus-')+source.date+(includeClips?'-con-ritagli':'')+'.pdf"','Cache-Control':'no-store'}});
 }catch{return new Response(includeClips?'Impossibile preparare tutti i ritagli richiesti. Nessun PDF parziale è stato generato.':'Impossibile generare il PDF.',{status:503,headers:{'Cache-Control':'no-store'}});}
}
