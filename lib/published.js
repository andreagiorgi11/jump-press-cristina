import {store,readIndex,problem} from './github-store.js';
import {incident} from './errors.js';
import {contentConfigured} from './config.js';
export async function publishedEditions(date,{full=true}={}){
 if(!contentConfigured())return {configured:false,rows:[],unavailable:false};
 try{const head=await store.begin(),index=await readIndex(store,head);const rows=date?index.published.filter(x=>x.edition_date===date):index.published;
  if(full&&rows.length){const first=await store.read('published/'+rows[0].edition_date+'.json',head);if(!first)throw problem(503,'Edizione pubblicata non disponibile.');rows[0]=first;}
  return {configured:true,rows,unavailable:false};
 }catch{await incident('published_read_unavailable');return {configured:true,rows:null,unavailable:true};}
}
// Card data for the archive: intro, article count and sections of the most recent published editions.
// One read per edition (bounded); a missing or unreadable edition simply gets a plain card.
export async function publishedPreviews(dates,{limit=24}={}){
 if(!contentConfigured()||!dates.length)return {};
 const {summaryEdition,articleSections}=await import('./summary-sections.js');
 try{
  const head=await store.begin(),out={};
  await Promise.all(dates.slice(0,limit).map(async date=>{try{
   const row=await store.read('published/'+date+'.json',head);if(!row?.body)return;
   const body=summaryEdition(row.body),present=new Set(body.articles.map(a=>a.category));
   out[date]={intro:String(row.body.intro||''),articles:body.articles.length,sections:articleSections.filter(s=>present.has(s))};
  }catch{}}));
  return out;
 }catch{return {};}
}
