import {acceptedEditorialTopics} from './editorial-topics.js';
import {z} from 'zod';
const text=z.string().trim();
export const articleSchema=z.object({
  id:z.string().uuid(), topic:z.enum(acceptedEditorialTopics).optional(), category:text.min(1).max(100), title:text.min(1).max(400),
  outlet:text.min(1).max(150), author:text.max(150).default(''), summary:text.min(1).max(6000),
  rating:z.number().int().min(1).max(5).default(3),
  sourceId:z.string().uuid().nullable().default(null),
  pages:z.array(z.number().int().positive()).max(100).default([]),
  clipId:z.string().uuid().nullable().default(null),
}).strict();
export const editionSchema=z.object({
  date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v,'Data non valida'),
  title:text.min(1).max(200), intro:text.max(6000),
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
