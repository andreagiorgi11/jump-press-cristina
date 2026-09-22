import {store,readIndex,problem} from './github-store.js';
import {blobs} from './blob-store.js';
// All reads use one immutable commit. Never resolve a public download via a draft.
export async function editionExport({date,draftId,version,ctx,repo=store,storage=blobs}){
 if(draftId&&!['producer','editor','publisher'].includes(ctx?.role))throw problem(403,'Accesso editor richiesto.');
 const head=await repo.begin();let row;
 if(draftId){
  row=await repo.read('drafts/'+draftId+'.json',head);
  if(!row||row.deletedAt)throw problem(404,'Bozza non disponibile.');
  if(row.version!==version)throw problem(409,'La bozza è cambiata. Aggiorna la pagina prima di esportare.');
 }else{
  const index=await readIndex(repo,head),entry=index.published.find(x=>x.edition_date===date);
  if(!entry)throw problem(404,'Edizione non pubblicata.');
  row=await repo.read('published/'+date+'.json',head);
  if(!row||row.draft_id!==entry.draft_id)throw problem(503,'Edizione pubblicata non disponibile.');
 }
 const body=row.body,id=draftId||row.draft_id;
 const allowed=new Set(body.articles.map(a=>a.clipId).filter(Boolean));
 return {body,async loadClip(clipId){
  if(!allowed.has(clipId))throw problem(404,'Ritaglio non incluso nell’edizione.');
  const asset=await repo.read('assets/'+clipId+'.json',head);
  if(!asset||asset.kind!=='clip'||asset.draft_id!==id)throw problem(404,'Ritaglio non disponibile.');
  return storage.read(asset.storage_path);
 }};
}
