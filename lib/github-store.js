export const problem=(status,message)=>Object.assign(new Error(message),{status});
// Reads anchored to a commit; non-fast-forward ref updates reject concurrent writes.
export class GithubStore {
 constructor({repo=process.env.JUMP_CONTENT_REPO,token=process.env.JUMP_GITHUB_TOKEN,branch=process.env.JUMP_CONTENT_BRANCH||'main',fetcher=fetch}={}){this.repo=repo;this.token=token;this.branch=branch;this.fetcher=fetcher;}
 async api(path,options={}){
  if(!/^[\w.-]+\/[\w.-]+$/.test(this.repo||'')||!this.token)throw problem(503,'Archivio GitHub non configurato.');
  let response;try{response=await this.fetcher('https://api.github.com/repos/'+this.repo+path,{...options,cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+this.token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',...options.headers}});}catch{throw problem(503,'GitHub temporaneamente non disponibile.');}
  if(response.status===404&&options.missing)return null;
  // storeConflict marks a lost race on the branch (someone else committed first), not a rejected change.
  if(!response.ok)throw options.conflict&&[409,422].includes(response.status)?Object.assign(problem(409,'La redazione è stata aggiornata. Rileggi la bozza e riprova.'),{storeConflict:true}):problem(503,'Archivio GitHub non disponibile. Verifica accesso e limiti del servizio.');
  return response.json();
 }
 async begin(){
  // Reads need only the branch head (one call). Privacy is rechecked every 10 minutes; the tree is fetched only to write.
  if(!(this.privateUntil>Date.now())){const repo=await this.api('');if(repo.private!==true)throw problem(503,'Il repository dei contenuti deve essere privato.');this.privateUntil=Date.now()+600000;}
  const ref=await this.api('/git/ref/heads/'+encodeURIComponent(this.branch));return {sha:ref.object.sha};
 }
 // A file at a given commit never changes, so reads are memoised per (commit, path) in the warm server instance.
 // The head itself is always fetched fresh by begin(): callers never see stale content. Callers get their own copy.
 async read(path,head){
  const key=head.sha+':'+path,cache=this.readCache||(this.readCache=new Map());
  if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value===null?null:structuredClone(value);}
  const value=await this.readFresh(path,head);
  cache.set(key,value);if(cache.size>200)cache.delete(cache.keys().next().value);
  return value===null?null:structuredClone(value);
 }
 async readFresh(path,head){
  const result=await this.api('/contents/'+path+'?ref='+head.sha,{missing:true});if(result===null)return null;
  if(result.encoding!=='base64'||result.size>950000)throw problem(503,'Formato o dimensione dell’archivio non supportati.');
  try{return JSON.parse(Buffer.from(result.content,'base64').toString('utf8'));}catch{throw problem(503,'File dell’archivio non valido.');}
 }
 async commit(files,head,message){
  const tree=Object.entries(files).map(([path,value])=>{const content=JSON.stringify(value);if(Buffer.byteLength(content)>900000)throw problem(413,'Documento troppo grande. Riduci la rassegna prima di salvare.');return {path,mode:'100644',type:'blob',content};});
  const baseTree=head.tree||(await this.api('/git/commits/'+head.sha)).tree.sha;
  const created=await this.api('/git/trees',{method:'POST',body:JSON.stringify({base_tree:baseTree,tree})});
  const commit=await this.api('/git/commits',{method:'POST',body:JSON.stringify({message,tree:created.sha,parents:[head.sha]})});
  await this.api('/git/refs/heads/'+encodeURIComponent(this.branch),{method:'PATCH',conflict:true,body:JSON.stringify({sha:commit.sha,force:false})});
 }
}
export const store=new GithubStore();
export async function readIndex(repo,head){const index=await repo.read('index.json',head);if(index===null||index.format!==1||!Array.isArray(index.drafts)||!Array.isArray(index.published))throw problem(503,'Archivio non inizializzato o non valido. Importa il file iniziale nel repository privato.');return index;}
