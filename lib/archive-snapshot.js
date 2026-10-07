import {store,readIndex,problem} from './github-store.js';
// One current commit for publication visibility, draft versions and card previews.
// The caller must obtain identity through requireEditor; anonymous readers receive no drafts.
export async function archiveSnapshot(identity=null,repo=store){
 if(identity&&!['producer','editor','publisher'].includes(identity.role))throw problem(403,'Accesso editor richiesto.');
 const head=await repo.begin(),index=await readIndex(repo,head);
 return {head,rows:index.published,drafts:identity?index.drafts.slice().sort((a,b)=>b.updated_at.localeCompare(a.updated_at)):[]};
}
