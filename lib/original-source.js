import {getDraft} from './editor-service.js';
import {getImport} from './source-service.js';
import {blobs} from './blob-store.js';
import {problem} from './github-store.js';

// Resolve only the original associated with an authorized draft; never accept a storage path from the browser.
export async function originalSourceLink(ctx,draftId){
 if(!['editor','publisher'].includes(ctx?.role))throw problem(403,'Accesso editor richiesto.');
 const draft=await getDraft(ctx,draftId),importId=draft.body.sourceImportId;
 if(!importId)throw problem(404,'PDF originale completo non disponibile per questa rassegna.');
 const source=await getImport(ctx,importId);
 if(source.originalDeletedAt)throw problem(410,'Il PDF originale completo è stato eliminato secondo la durata di conservazione prevista. I ritagli degli articoli restano disponibili.');
 if(source.status!=='ready')throw problem(409,'Il PDF originale completo non è ancora pronto. Riprova più tardi.');
 if(source.originalPath!=='jump/imports/'+importId+'/original.pdf')throw problem(503,'Riferimento al PDF originale non valido.');
 return (ctx.blobs||blobs).link(source.originalPath,300);
}
