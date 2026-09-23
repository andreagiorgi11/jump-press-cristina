import {problem} from './github-store.js';
import {summaryAreas} from './schema.js';
import {legacySummarySections} from './summary-sections.js';
import {loadPdfFonts} from './pdf-theme.js';
import {exportSummaryPdf} from './executive-summary-pdf.js';
export const usesSummaryModel=ctx=>ctx?.editorialModel==='summary-v1'||process.env.JUMP_EDITORIAL_MODEL==='summary-v1'||process.env.JUMP_SUMMARY_SANDBOX==='1';
export async function validateSummaryReady(body){
 if(body.editorialModel!=='summary-v1')return;
 if(!body.executiveSummary)throw problem(422,'Summary mancante o da aggiornare dopo le modifiche alla rassegna.');
 if(body.articles.some(a=>![...summaryAreas,...legacySummarySections].includes(a.category)))throw problem(422,'Classificare gli articoli nelle cinque aree del nuovo modello.');
 if(!body.keyPoints.length||body.keyPoints.length>5)throw problem(422,'Servono da uno a cinque punti chiave per la pagina completa.');
 if(!body.executiveSummary.sections.some(s=>s.items.length))throw problem(422,'Il Summary non contiene highlights.');
 try{await exportSummaryPdf(body.executiveSummary,body.date,await loadPdfFonts());}catch(error){throw problem(422,error.message);}
}
// Asset attachment does not invalidate editorial work; changed text or selection does.
export function editorialContent(body){return JSON.stringify({date:body.date,title:body.title,intro:body.intro,keyPoints:body.keyPoints,articles:[...body.articles].sort((a,b)=>a.id.localeCompare(b.id)).map(({id,category,title,summary,topic,rating,outlet,author,sourceId,pages})=>({id,category,title,summary,topic,rating,outlet,author,sourceId,pages}))});}
