import {createHash} from 'node:crypto';
import {store,readIndex,problem} from './github-store.js';
import {summaryEdition,articleSections} from './summary-sections.js';
import {incident} from './errors.js';

export const archiveArticleRevision=articles=>createHash('sha256').update(JSON.stringify(articles)).digest('hex');
const roles=['producer','editor','publisher'];
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it').replace(/\s+/g,' ').trim();
export async function mapArchiveItems(items,read){
 const results=new Array(items.length);let next=0;
 await Promise.all(Array.from({length:Math.min(4,items.length)},async()=>{while(next<items.length){const i=next++;results[i]=await read(items[i]);}}));
 return results;
}
export async function draftPreviews(drafts,head,identity,repo=store){
 if(!roles.includes(identity?.role))throw problem(403,'Accesso editor richiesto.');
 const values=await mapArchiveItems(drafts,async d=>{try{
  const row=await repo.read('drafts/'+d.id+'.json',head);
  if(!row?.body||row.deletedAt||row.version!==d.version)throw problem(503,'Bozza non disponibile.');
  const body=summaryEdition(row.body),present=new Set(body.articles.map(a=>a.category));
  return [d.id,{intro:body.intro||'',articles:body.articles.length,sections:articleSections.filter(s=>present.has(s))}];
 }catch{return [d.id,{unavailable:true}];}});
 return Object.fromEntries(values);
}
// Each request scans a small batch; the UI keeps searching without blocking the archive.
// Always recheck the live index: a caller cannot request an old, withdrawn publication by SHA.
export async function searchArchive({query,offset=0,revision,lang='it',from='',to='',titleOnly=false},identity=null,repo=store){
 if(identity&&!roles.includes(identity.role))throw problem(403,'Accesso editor richiesto.');
 const q=normalize(query);
 if(typeof titleOnly!=='boolean')throw problem(400,'Filtro titolo non valido.');
 if(q.length<2||q.length>100||!Number.isSafeInteger(offset)||offset<0||!['it','en'].includes(lang))throw problem(400,'Inserisci da 2 a 100 caratteri.');
 const validDate=value=>!value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
 if(!validDate(from)||!validDate(to)||(from&&to&&from>to))throw problem(400,'Periodo non valido: controlla le date Dal e Al.');
 const head=await repo.begin();if(offset&&revision!==head.sha)throw problem(409,'L’archivio è cambiato durante la ricerca. Avvia nuovamente la ricerca.');
 const index=await readIndex(repo,head);
 const entries=[...index.published.map(p=>({date:p.edition_date,id:p.draft_id,version:p.version,status:'published'})),...(identity?index.drafts.filter(d=>!index.published.some(p=>p.draft_id===d.id&&p.version===d.version)).map(d=>({date:d.body.date,id:d.id,version:d.version,status:'draft'})):[])].filter(entry=>(!from||entry.date>=from)&&(!to||entry.date<=to)).sort((a,b)=>b.date.localeCompare(a.date)||a.status.localeCompare(b.status));
 const batch=entries.slice(offset,offset+8);
 let unavailable=0;
 const groups=await mapArchiveItems(batch,async entry=>{try{
  const draft=entry.status==='draft',row=await repo.read(draft?'drafts/'+entry.id+'.json':'published/'+entry.date+'.json',head);
  if(!row?.body||row.deletedAt||row.version!==entry.version)throw problem(503,'Rassegna non disponibile.');
  let articles=row.body.articles,language='it';
  if(lang==='en'&&!draft&&index.translations?.some(t=>t.lang==='en'&&t.edition_date===entry.date&&t.source_version===entry.version)){
   try{const translated=await repo.read('translations/en/'+entry.date+'.json',head);
    if(!translated?.content||translated.source_version!==entry.version||translated.source_draft_id!==entry.id)throw problem(503,'Traduzione non disponibile.');
    const byId=new Map(translated.content.articles.map(a=>[a.id,a]));articles=articles.map(a=>({...a,...byId.get(a.id)}));language='en';
   }catch{unavailable++;}
  }
  const matches=articles.filter(a=>normalize(titleOnly?a.title:[a.title,a.summary,a.author].join(' ')).includes(q)).map(a=>({id:a.id,title:a.title,outlet:a.outlet,author:a.author||'',summary:String(a.summary||''),href:(draft?'/editor?draft='+encodeURIComponent(entry.id):(lang==='en'?'/en':'')+'/edizioni/'+entry.date)+'#articolo-'+encodeURIComponent(a.id)}));
  return matches.length?{key:entry.status+':'+entry.id,date:entry.date,status:entry.status,sourceId:entry.id,sourceVersion:entry.version,contentRevision:archiveArticleRevision(articles),language,articles:matches}:null;
 }catch{unavailable++;return null;}});
 if(unavailable)await incident('archive_search_partial_unavailable');
 const scanned=Math.min(offset+batch.length,entries.length);
 return {groups:groups.filter(Boolean),unavailable,scanned,total:entries.length,nextOffset:scanned<entries.length?scanned:null,revision:head.sha};
}
