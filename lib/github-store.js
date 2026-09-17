export const problem=(status,message)=>Object.assign(new Error(message),{status});
// Reads anchored to a commit; non-fast-forward ref updates reject concurrent writes.
export class GithubStore {
 constructor({repo=process.env.JUMP_CONTENT_REPO,token=process.env.JUMP_GITHUB_TOKEN,branch=process.env.JUMP_CONTENT_BRANCH||'main',fetcher=fetch}={}){this.repo=repo;this.token=token;this.branch=branch;this.fetcher=fetcher;}
 async api(path,options={}){
  if(!/^[\w.-]+\/[\w.-]+$/.test(this.repo||'')||!this.token)throw problem(503,'Archivio GitHub non configurato.');
  let response;try{response=await this.fetcher('https://api.github.com/repos/'+this.repo+path,{...options,cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+this.token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',...options.headers}});}catch{throw problem(503,'GitHub temporaneamente non disponibile.');}
  if(response.status===404&&options.missing)return null;
  if(!response.ok)throw problem([409,422].includes(response.status)&&options.conflict?409:503,options.conflict&&[409,422].includes(response.status)?'La redazione è stata aggiornata. Rileggi la bozza e riprova.':'Archivio GitHub non disponibile. Verifica accesso e limiti del servizio.');
  return response.json();
 }
 async begin(){
  const repo=await this.api('');if(repo.private!==true)throw problem(503,'Il repository dei contenuti deve essere privato.');
  const ref=await this.api('/git/ref/heads/'+encodeURIComponent(this.branch));
  const commit=await this.api('/git/commits/'+ref.object.sha);return {sha:ref.object.sha,tree:commit.tree.sha};
 }
 async read(path,head){
  const result=await this.api('/contents/'+path+'?ref='+head.sha,{missing:true});if(result===null)return null;
  if(result.encoding!=='base64'||result.size>950000)throw problem(503,'Formato o dimensione dell’archivio non supportati.');
  try{return JSON.parse(Buffer.from(result.content,'base64').toString('utf8'));}catch{throw problem(503,'File dell’archivio non valido.');}
 }
 async commit(files,head,message){
  const tree=Object.entries(files).map(([path,value])=>{const content=JSON.stringify(value);if(Buffer.byteLength(content)>900000)throw problem(413,'Documento troppo grande. Riduci la rassegna prima di salvare.');return {path,mode:'100644',type:'blob',content};});
  const created=await this.api('/git/trees',{method:'POST',body:JSON.stringify({base_tree:head.tree,tree})});
  const commit=await this.api('/git/commits',{method:'POST',body:JSON.stringify({message,tree:created.sha,parents:[head.sha]})});
  await this.api('/git/refs/heads/'+encodeURIComponent(this.branch),{method:'PATCH',conflict:true,body:JSON.stringify({sha:commit.sha,force:false})});
 }
}
export const store=new GithubStore();
export async function readIndex(repo,head){const index=await repo.read('index.json',head);if(index===null||index.format!==1||!Array.isArray(index.drafts)||!Array.isArray(index.published))throw problem(503,'Archivio non inizializzato o non valido. Importa il file iniziale nel repository privato.');return index;}
