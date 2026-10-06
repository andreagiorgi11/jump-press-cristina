// English version of published editions (requested by the client on 06/10/2026).
// The Italian edition stays the source of truth: a translation is stored next to it in the content
// repository and is shown only while it matches the published Italian version it was made from.
// It is written by the ChatGPT automation through MCP and goes online immediately, without review,
// so the server checks that it has exactly the same structure as the Italian edition.
import {z} from 'zod';
import {store,readIndex,problem} from './github-store.js';
import {parseKeyPoint} from './key-point-signals.js';
import {incident} from './errors.js';
import {contentConfigured} from './config.js';

export const translationLanguages=['en'];
const text=z.string().trim();
export const translationSchema=z.object({
 intro:text.min(1).max(6000),
 executiveSummary:z.object({intro:text.min(1).max(1200),sections:z.array(z.object({items:z.array(text.min(1).max(500)).max(30)}).strict()).min(4).max(5)}).strict().nullable(),
 keyPoints:z.array(text.min(1).max(1000)).max(5),
 articles:z.array(z.object({id:z.string().uuid(),title:text.min(1).max(400),summary:text.min(1).max(6000)}).strict()).max(80),
}).strict();
const path=(lang,date)=>'translations/'+lang+'/'+date+'.json';
const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const langSchema=z.enum(translationLanguages);
const rolesAllowed=['producer','editor','publisher'];

// Rules returned with the content, so the automation does not depend on remembering them.
export const translationRules='Translate into natural British English for a professional football club audience. Translate every field; keep names, clubs, competitions, newspapers, numbers and dates exact. Keep the order and the same number of items. Each key point must keep its Italian prefix exactly ("Positivo: " or "Negativo: ") followed by the translated text. Summary items and key points keep the "Short title: detail" form when the Italian has it. Do not add, remove or merge content, do not add opinions or links.';

// What the automation needs: only the translatable text of the published edition and its version.
export async function editionForTranslation(ctx,{date,lang='en'}){
 if(!rolesAllowed.includes(ctx?.role))throw problem(403,'Collegamento autenticato richiesto.');
 dateSchema.parse(date);langSchema.parse(lang);
 const r=ctx.store||store,head=await r.begin(),index=await readIndex(r,head),row=index.published.find(x=>x.edition_date===date);
 if(!row)throw problem(404,'Nessuna rassegna italiana pubblicata per questa data.');
 const published=await r.read('published/'+date+'.json',head);if(!published?.body)throw problem(503,'Rassegna pubblicata non leggibile.');
 const b=published.body,existing=(index.translations||[]).find(x=>x.lang===lang&&x.edition_date===date);
 return {date,lang,sourceVersion:row.version,alreadyTranslated:existing?.source_version===row.version,rules:translationRules,content:{
  intro:b.intro,
  executiveSummary:b.executiveSummary?{intro:b.executiveSummary.intro,sections:b.executiveSummary.sections.map(s=>({title:s.title,items:s.items}))}:null,
  keyPoints:b.keyPoints||[],
  articles:(b.articles||[]).map(a=>({id:a.id,outlet:a.outlet,title:a.title,summary:a.summary})),
 }};
}

// Same articles, sections, items and key point kinds as the Italian edition, or nothing is published.
export function checkTranslation(body,t){
 const fail=m=>{throw problem(422,'Traduzione non pubblicata: '+m+'. Correggi e invia di nuovo.');};
 const ids=(body.articles||[]).map(a=>a.id),tids=t.articles.map(a=>a.id);
 if(ids.length!==tids.length||ids.some((id,i)=>id!==tids[i]))fail('gli articoli devono essere gli stessi, nello stesso ordine ('+ids.length+')');
 const es=body.executiveSummary||null;
 if(!!es!==!!t.executiveSummary)fail(es?'manca il Summary':'il Summary non esiste nella rassegna italiana');
 if(es){
  if(es.sections.length!==t.executiveSummary.sections.length)fail('il Summary deve avere '+es.sections.length+' sezioni');
  es.sections.forEach((s,i)=>{if(s.items.length!==t.executiveSummary.sections[i].items.length)fail('la sezione '+(i+1)+' del Summary deve avere '+s.items.length+' punti');});
 }
 const kp=body.keyPoints||[];
 if(kp.length!==t.keyPoints.length)fail('servono '+kp.length+' punti chiave');
 kp.forEach((p,i)=>{if(parseKeyPoint(p).kind!==parseKeyPoint(t.keyPoints[i]).kind)fail('il punto chiave '+(i+1)+' deve iniziare con lo stesso prefisso italiano (Positivo:/Negativo:)');});
}

export async function publishTranslation(ctx,{date,lang='en',sourceVersion,translation}){
 if(!rolesAllowed.includes(ctx?.role))throw problem(403,'Collegamento autenticato richiesto.');
 dateSchema.parse(date);langSchema.parse(lang);const t=translationSchema.parse(translation);
 const r=ctx.store||store,head=await r.begin(),index=await readIndex(r,head),row=index.published.find(x=>x.edition_date===date);
 if(!row)throw problem(404,'Nessuna rassegna italiana pubblicata per questa data.');
 if(row.version!==sourceVersion)throw problem(409,'La rassegna italiana è stata ripubblicata (versione '+row.version+'). Rileggi con read_edition_for_translation e traduci la versione attuale.');
 const published=await r.read('published/'+date+'.json',head);if(!published?.body)throw problem(503,'Rassegna pubblicata non leggibile.');
 checkTranslation(published.body,t);
 const at=new Date().toISOString(),entry={lang,edition_date:date,source_draft_id:row.draft_id,source_version:row.version,translated_at:at};
 index.translations=[entry,...(index.translations||[]).filter(x=>!(x.lang===lang&&x.edition_date===date))].sort((a,b)=>b.edition_date.localeCompare(a.edition_date));
 await r.commit({[path(lang,date)]:{...entry,content:t},'index.json':index},head,'Traduzione '+lang.toUpperCase()+' pubblicata '+date);
 return {published:true,date,lang,sourceVersion:row.version,url:'/'+lang+'/edizioni/'+date};
}

// Translated body: Italian edition with the translated text; the original title stays available.
export function mergeTranslation(body,content,lang='en'){
 const byId=new Map(content.articles.map(a=>[a.id,a]));
 return {...body,lang,intro:content.intro,keyPoints:content.keyPoints,
  executiveSummary:body.executiveSummary&&content.executiveSummary?{...body.executiveSummary,intro:content.executiveSummary.intro,sections:body.executiveSummary.sections.map((s,i)=>({...s,items:content.executiveSummary.sections[i]?.items||s.items}))}:body.executiveSummary,
  articles:body.articles.map(a=>{const tr=byId.get(a.id);return tr?{...a,originalTitle:a.title,title:tr.title,summary:tr.summary}:a;})};
}

// Local preview only, never on Vercel: a translation kept outside the content repository
// (JUMP_LOCAL_TRANSLATION_FIXTURE) to look at the English pages before the first real translation.
let fixtureCache;
async function localFixture(){
 if(process.env.NODE_ENV!=='development'||process.env.VERCEL||!process.env.JUMP_LOCAL_TRANSLATION_FIXTURE)return null;
 if(fixtureCache===undefined){try{const {readFile}=await import('node:fs/promises');fixtureCache=JSON.parse(await readFile(process.env.JUMP_LOCAL_TRANSLATION_FIXTURE,'utf8'));}catch{fixtureCache=null;}}
 return fixtureCache;
}
async function readTranslation(r,head,lang,date){
 const stored=await r.read(path(lang,date),head);if(stored)return stored;
 const fx=lang==='en'?await localFixture():null;return fx?.date===date?{content:fx.content}:null;
}
// Public reads. A translation counts only while it matches the published Italian version.
async function validEntries(r,head,index,lang){
 const published=new Map(index.published.map(p=>[p.edition_date,p]));
 const rows=(index.translations||[]).filter(x=>x.lang===lang&&published.get(x.edition_date)?.version===x.source_version);
 const fx=lang==='en'&&r===store?await localFixture():null;
 if(fx&&published.has(fx.date)&&!rows.some(x=>x.edition_date===fx.date))rows.push({lang,edition_date:fx.date,source_version:published.get(fx.date).version,local:true});
 return rows.sort((a,b)=>b.edition_date.localeCompare(a.edition_date));
}
export async function translatedEditions(lang='en',r=store){
 if(r===store&&!contentConfigured())return {rows:[],unavailable:false};
 try{const head=await r.begin(),index=await readIndex(r,head);return {rows:await validEntries(r,head,index,lang),unavailable:false};}
 catch{await incident('translation_list_unavailable');return {rows:null,unavailable:true};}
}
export async function translatedEdition(date,lang='en',r=store){
 if(r===store&&!contentConfigured())return {row:null,unavailable:false};
 try{
  const head=await r.begin(),index=await readIndex(r,head),entries=await validEntries(r,head,index,lang);
  const entry=date?entries.find(x=>x.edition_date===date):entries[0];if(!entry)return {row:null,unavailable:false};
  const [published,translation]=await Promise.all([r.read('published/'+entry.edition_date+'.json',head),readTranslation(r,head,lang,entry.edition_date)]);
  if(!published?.body||!translation?.content)return {row:null,unavailable:false};
  return {row:{edition_date:entry.edition_date,body:mergeTranslation(published.body,translation.content,lang)},unavailable:false};
 }catch{await incident('translation_read_unavailable');return {row:null,unavailable:true};}
}
// Archive cards in English: translated lead, article count and sections of the latest translated editions.
export async function translatedPreviews(lang='en',{limit=24}={},r=store){
 if(r===store&&!contentConfigured())return {rows:[],unavailable:false};
 const {summaryEdition,articleSections}=await import('./summary-sections.js');
 try{
  const head=await r.begin(),index=await readIndex(r,head),entries=(await validEntries(r,head,index,lang)).slice(0,limit);
  const rows=await Promise.all(entries.map(async e=>{try{
   const [published,translation]=await Promise.all([r.read('published/'+e.edition_date+'.json',head),readTranslation(r,head,lang,e.edition_date)]);
   if(!published?.body||!translation?.content)return {date:e.edition_date};
   const body=summaryEdition(published.body),present=new Set(body.articles.map(a=>a.category));
   return {date:e.edition_date,preview:{intro:translation.content.intro,articles:body.articles.length,sections:articleSections.filter(s=>present.has(s))}};
  }catch{return {date:e.edition_date};}}));
  return {rows,unavailable:false};
 }catch{await incident('translation_list_unavailable');return {rows:[],unavailable:true};}
}
