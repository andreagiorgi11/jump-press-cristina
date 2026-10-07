import {z} from 'zod';
import {store,readIndex,problem} from './github-store.js';
import {archiveArticleRevision} from './archive-search.js';
const schema=z.object({lang:z.enum(['it','en']).default('it'),groups:z.array(z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),status:z.enum(['draft','published']),sourceId:z.string().uuid(),sourceVersion:z.number().int().positive(),contentRevision:z.string().regex(/^[a-f0-9]{64}$/),language:z.enum(['it','en']),articleIds:z.array(z.string().uuid()).min(1).max(200)}).strict()).min(1).max(100)}).strict();
export async function selectedArchiveArticles(input,identity=null,repo=store){
 const x=schema.parse(input);
 if(x.groups.reduce((n,g)=>n+g.articleIds.length,0)>200)throw problem(400,'Seleziona al massimo 200 articoli.');
 if(x.groups.some(g=>g.status==='draft')&&!['producer','editor','publisher'].includes(identity?.role))throw problem(403,'Accesso editor richiesto per esportare le bozze.');
 const head=await repo.begin(),index=await readIndex(repo,head),result=[],seen=new Set();
 for(const g of x.groups){
  const draft=g.status==='draft',entry=draft?index.drafts.find(d=>d.id===g.sourceId&&d.body.date===g.date):index.published.find(p=>p.edition_date===g.date&&p.draft_id===g.sourceId);
  if(!entry||entry.version!==g.sourceVersion)throw problem(409,'Una rassegna è cambiata. Ripeti la ricerca prima di esportare.');
  const row=await repo.read(draft?'drafts/'+g.sourceId+'.json':'published/'+g.date+'.json',head);
  if(!row?.body||row.deletedAt||row.version!==g.sourceVersion)throw problem(409,'Una rassegna non è più disponibile. Ripeti la ricerca.');
  let articles=row.body.articles;
  if(g.language==='en'){
   if(draft||x.lang!=='en')throw problem(400,'Lingua non valida.');
   if(!index.translations?.some(t=>t.lang==='en'&&t.edition_date===g.date&&t.source_version===g.sourceVersion))throw problem(409,'La traduzione è cambiata. Ripeti la ricerca.');
   const t=await repo.read('translations/en/'+g.date+'.json',head);
   if(!t?.content||t.source_version!==g.sourceVersion||t.source_draft_id!==g.sourceId)throw problem(409,'Traduzione non disponibile.');
   const byId=new Map(t.content.articles.map(a=>[a.id,a]));articles=articles.map(a=>({...a,...byId.get(a.id)}));
  }
  if(archiveArticleRevision(articles)!==g.contentRevision)throw problem(409,'I testi sono cambiati. Ripeti la ricerca prima di esportare.');
  const selected=[];
  for(const id of g.articleIds){const key=g.status+':'+g.sourceId+':'+id;if(seen.has(key))continue;seen.add(key);const article=articles.find(a=>a.id===id);if(!article)throw problem(404,'Articolo non disponibile.');selected.push(article);}
  if(selected.length)result.push({date:g.date,status:g.status,language:g.language,articles:selected});
 }
 return {lang:x.lang,groups:result.sort((a,b)=>b.date.localeCompare(a.date))};
}
