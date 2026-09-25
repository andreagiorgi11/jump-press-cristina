// One-off recovery after moving storage to the AG Studio file server (25/09/2026):
// re-uploads a verified original (same SHA-256 as the import record), rebuilds its extracted text
// and recreates the draft's clips at their existing storage paths. Nothing is published.
// Usage: node scripts/restore-to-file-server.mjs <importId> <local-original.pdf> [--resave]
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const envFile=process.env.JUMP_REAL_ENV_FILE||'C:/Users/Andrea/Dropbox/Andrea/AG Studio/Clienti e collaborazioni/Cristina Guerri/Progetti/CG creator/jump-press-rassegna-stampa/.env.local';
for(const line of readFileSync(envFile,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(!m||process.env[m[1]])continue;let v=m[2].trim();if(v.startsWith('"')&&v.endsWith('"'))v=JSON.parse(v);else if(v.startsWith("'")&&v.endsWith("'"))v=v.slice(1,-1);process.env[m[1]]=v;}
Object.assign(process.env,{JUMP_SITE:'press',JUMP_EDITORIAL_MODEL:'summary-v1'});
const [importId,file,flag]=process.argv.slice(2);
const {blobs,usesFileServer}=await import('../lib/blob-store.js');
if(!usesFileServer())throw Error('JUMP_FILES_URL e JUMP_FILES_SECRET richiesti.');
const {store,readIndex}=await import('../lib/github-store.js');
const {extractSourceText}=await import('../lib/source-pdf.js');
const head=await store.begin(),row=await store.read('imports/'+importId+'.json',head);
if(!row||row.status!=='ready')throw Error('Importazione non pronta.');
const bytes=readFileSync(file),sha=createHash('sha256').update(bytes).digest('hex');
if(sha!==row.sha256||bytes.length!==row.bytes)throw Error('Il file locale non coincide con l’originale registrato.');
const put=async(label,fn)=>{try{await fn();console.log('caricato',label);}catch(e){if(e.status===409)console.log('già presente',label);else throw e;}};
await put('originale',()=>blobs.writeOriginal(row.originalPath,bytes));
await put('testo',async()=>blobs.writeText(row.textPath,await extractSourceText(bytes)));
const index=await readIndex(store,head),entry=index.drafts.find(d=>d.body.date===row.date);
if(!entry)throw Error('Bozza del giorno non trovata.');
const draft=await store.read('drafts/'+entry.id+'.json',head);
for(const clip of draft.assets.filter(a=>a.kind==='clip'&&a.importId===importId&&a.storage_path)){
 try{await blobs.clip(row.originalPath,clip.pages,clip.storage_path);console.log('ritaglio',clip.pages.join(','));}
 catch(e){if(e.status===409)console.log('ritaglio già presente',clip.pages.join(','));else throw e;}
}
if(flag==='--resave'){
 // Same body: the server re-runs clip preparation and checks with the current rules.
 const {saveDraft}=await import('../lib/editor-service.js');
 const saved=await saveDraft({role:'publisher',user:{id:'editor'},editorialModel:'summary-v1'},draft.id,draft.version,draft.body);
 console.log('bozza versione',saved.version,'PDF',saved.automaticClips?.status,saved.body.articles.filter(a=>a.pdfCheck?.status!=='matched').length,'da verificare');
}
