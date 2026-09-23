import {summarySections,legacySummarySections} from './summary-sections.js';
import {acceptedEditorialTopics} from './editorial-topics.js';
import {z} from 'zod';
const text=z.string().trim();
export const summaryAreas=summarySections;
// Homogeneous JSON Schema items keep the tool catalog compatible with MCP clients.
// Positional category and per-category limits are still enforced on the server.
const summarySectionSchema=z.object({title:z.enum([...summaryAreas,...legacySummarySections]),items:z.array(text.min(1).max(500)).max(30)}).strict();
export const executiveSummarySchema=z.object({intro:text.min(1).max(1200),sections:z.array(summarySectionSchema).min(4).max(5).describe('Cinque sezioni nell’ordine: Prima squadra (massimo 5 punti), Next Gen e Primavera, Juventus Women, Politica sportiva, Altri temi. Le quattro sezioni precedenti sono accettate solo per compatibilità con lo storico.').superRefine((sections,ctx)=>{
 const expected=sections.length===4?legacySummarySections:summaryAreas;
 sections.forEach((section,i)=>{
  if(section.title!==expected[i])ctx.addIssue({code:'custom',path:[i,'title'],message:'Sezione non valida: attesa '+expected[i]});
  if(i===0&&section.items.length>5)ctx.addIssue({code:'custom',path:[i,'items'],message:'Massimo cinque temi per la prima squadra maschile.'});
 });
})}).strict();
export const articleSchema=z.object({
  id:z.string().uuid(), topic:z.enum(acceptedEditorialTopics).optional(), category:text.min(1).max(100), title:text.min(1).max(400),
  isEditorial:z.boolean().optional().describe('Indica sempre true per un editoriale, false per una notizia o intervista: verifica la natura del pezzo nella fonte, non dedurla dalla firma.'),
  showAuthor:z.boolean().optional().describe('Visibilità della firma su sito e PDF. Se omesso: visibile solo per gli editoriali. Conserva la scelta esplicita dell’editor.'),
  outlet:text.min(1).max(150), author:text.max(150).default(''), summary:text.min(1).max(6000),
  juventusSentiment:z.object({tone:z.enum(['positivo','negativo','neutro','misto']),reason:text.min(1).max(600)}).strict().nullable().optional().describe('Valutazione del tono di questo articolo per la Juventus, distinta dalla rilevanza e dai punti chiave; motivazione fondata sulla fonte.'),
  rating:z.number().int().min(1).max(5).default(3),
  factCheck:z.object({status:z.enum(['verified','attention']),note:text.max(1000),evidence:z.array(z.object({page:z.number().int().positive(),quote:text.min(15).max(1000)}).strict()).max(20)}).strict().nullable().optional().describe('Dopo confronto separato fonte–sintesi: verifica fatti, nomi, squadre, numeri, tempi e fatto principale. Cita estratti testuali con pagina PDF; se resta un dubbio usa attention. Non dichiarare verified per il solo controllo del titolo.'),
  pdfCheck:z.object({status:z.enum(['pending','matched','attention']),note:text.max(1000)}).strict().optional(),
  synthesisCheck:z.object({status:z.enum(['pending','verified','attention']),note:text.max(1000),sourceStatus:z.enum(['matched','incomplete']).optional(),editorialStatus:z.enum(['declared_verified','attention','undocumented']).optional(),editorialNote:text.max(1000).optional(),evidence:z.array(z.object({index:z.number().int().positive(),originalPage:z.number().int().positive(),resolvedPage:z.number().int().positive().optional(),matchedPages:z.array(z.number().int().positive()),status:z.enum(['matched','relocated','unmatched']),note:text.max(1000)}).strict()).max(20).optional()}).strict().optional(),
  sourceId:z.string().uuid().nullable().default(null),
  pages:z.array(z.number().int().positive()).max(100).default([]),
  clipId:z.string().uuid().nullable().default(null),
}).strict();
export const editionSchema=z.object({
  sourceImportId:z.string().uuid().optional().describe('Importazione privata della fonte: abilita ritaglio e associazione automatici sul server dalle pages degli articoli. Usare numerazione del PDF completo da 1.'),
  date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v,'Data non valida'),
  title:text.min(1).max(200), intro:text.max(6000),
  editorialModel:z.literal('summary-v1').optional(),
  executiveSummary:executiveSummarySchema.nullable().optional(),
  keyPoints:z.array(text.min(1).max(1000)).max(5).default([]),
  tones:z.array(text.min(1).max(100)).max(5).default([]),
  metrics:z.array(z.object({label:text.min(1).max(150),value:z.number().nonnegative(),sourceNote:text.min(1).max(500)}).strict()).max(12).default([]),
  coverage:z.object({
    examinedItems:z.number().int().nonnegative().nullable(),
    sourceNote:text.min(1).max(2000),
    frontPages:z.array(z.object({outlet:text.min(1).max(150),page:z.number().int().positive(),juventus:z.boolean(),nationalSports:z.boolean(),sourceId:z.string().uuid().nullable().optional(),clipId:z.string().uuid().nullable().optional()}).strict()).max(500).nullable(),
    frontPageSummary:text.max(3000).default(''),
  }).strict().refine(c=>!c.frontPages||new Set(c.frontPages.map(p=>p.page)).size===c.frontPages.length,'Prime pagine duplicate').nullable().default(null),
  toneSummary:text.max(3000).default(''),
  articles:z.array(articleSchema).max(80),
}).strict().refine(v=>new Set(v.articles.map(a=>a.id)).size===v.articles.length,'ID articoli duplicati');
export function newEdition(date=new Date().toISOString().slice(0,10)) {
  return {date,title:'Rassegna stampa Juventus',intro:'',keyPoints:[],tones:[],metrics:[],articles:[]};
}

export const clipUploadSchema=z.object({
 name:z.string().trim().min(1).max(200),
 sourceName:z.string().trim().min(1).max(200),
 sourceDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
 sourceSha256:z.string().regex(/^[a-f0-9]{64}$/i),
 sourcePageCount:z.number().int().positive().max(10000),
 pages:z.array(z.number().int().positive()).min(1).max(100),
}).strict().refine(x=>new Set(x.pages).size===x.pages.length&&x.pages.every(p=>p<=x.sourcePageCount),'Pagine originali non valide');

// Strict MCP input for current Summary work; persisted historical editions retain editionSchema.
export const mcpSummaryEditionSchema=editionSchema.safeExtend({
 articles:z.array(articleSchema.extend({category:z.enum(summaryAreas),isEditorial:z.boolean().describe('Obbligatorio: true per editoriali, false per notizie e interviste.')})).max(80),
 executiveSummary:z.object({intro:text.min(1).max(1200),sections:z.array(z.object({title:z.enum(summaryAreas),items:z.array(text.min(1).max(500)).max(30)}).strict()).length(5).describe('Esattamente cinque sezioni: Prima squadra, Next Gen e Primavera, Juventus Women, Politica sportiva, Altri temi; items può essere vuoto.').superRefine((sections,ctx)=>{sections.forEach((s,i)=>{if(s.title!==summaryAreas[i])ctx.addIssue({code:'custom',path:[i,'title'],message:'Sezione attesa: '+summaryAreas[i]});if(i===0&&s.items.length>5)ctx.addIssue({code:'custom',path:[i,'items'],message:'Massimo cinque temi in Prima squadra.'});});})}).strict().nullable().optional(),
});
