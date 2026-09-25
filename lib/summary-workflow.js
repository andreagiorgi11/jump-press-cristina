import {problem} from './github-store.js';
import {summaryAreas} from './schema.js';
import {legacySummarySections,articleSections} from './summary-sections.js';
import {loadPdfFonts} from './pdf-theme.js';
import {exportSummaryPdf} from './executive-summary-pdf.js';
import {cleanSummary} from './article-author.js';
export const usesSummaryModel=ctx=>ctx?.editorialModel==='summary-v1'||process.env.JUMP_EDITORIAL_MODEL==='summary-v1'||process.env.JUMP_SUMMARY_SANDBOX==='1';
export async function validateSummaryReady(body){
 if(body.editorialModel!=='summary-v1')return;
 if(!body.executiveSummary)throw problem(422,'Summary mancante: prepararlo prima di pubblicare o chiudere la rassegna.');
 if(body.articles.some(a=>![...articleSections,...legacySummarySections].includes(a.category)))throw problem(422,'Classificare gli articoli nelle aree del nuovo modello (cinque aree più Nazionale).');
 if(!body.keyPoints.length||body.keyPoints.length>5)throw problem(422,'Servono da uno a cinque punti chiave per la pagina completa.');
 if(!body.executiveSummary.sections.some(s=>s.items.length))throw problem(422,'Il Summary non contiene highlights.');
 try{await exportSummaryPdf(body.executiveSummary,body.date,await loadPdfFonts());}catch(error){throw problem(422,error.message);}
}
// What the Summary depends on: selection, areas, summaries, weight, attribution and the words of titles.
// Typography in titles and summaries, article order, page intro and key points leave the Summary as it is.
// Ignore typography, but preserve word boundaries, numeric separators and meaningful symbols.
const titleWords=t=>String(t||'').normalize('NFKC').toLowerCase().replace(/(?<=\d)[.,:/-](?=\d)/gu,c=>({'.' :'DECIMALPOINT',',':'DECIMALCOMMA',':':'TIMESEPARATOR','/':'NUMBERSEPARATOR','-':'NUMBERRANGE'}[c])).replace(/%/g,' PERCENT ').replace(/[\p{P}\s]+/gu,' ').trim();
export function summarySubstance(body){return JSON.stringify({date:body.date,articles:[...body.articles].sort((a,b)=>a.id.localeCompare(b.id)).map(a=>({...a,summary:cleanSummary(a)})).map(({id,category,title,summary,topic,rating,outlet,author})=>({id,category,title:titleWords(title),summary:titleWords(summary),topic,rating,outlet,author}))});}
// Asset attachment does not invalidate editorial work; changed text or selection does.
export function editorialContent(body){return JSON.stringify({date:body.date,title:body.title,intro:body.intro,keyPoints:body.keyPoints,articles:[...body.articles].sort((a,b)=>a.id.localeCompare(b.id)).map(({id,category,title,summary,topic,rating,outlet,author})=>({id,category,title,summary,topic,rating,outlet,author}))});}
