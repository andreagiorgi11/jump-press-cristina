import {createHmac} from 'node:crypto';
import {get,put,head,del,issueSignedToken,presignUrl} from '@vercel/blob';
import {problem} from './github-store.js';
export const MAX_PDF=52428800;
let originalCache=null;
// Use the configured private store credential explicitly; ambient CLI OIDC can
// target a different project locally. Never retry an authorization error with another identity.
const auth=()=>process.env.BLOB_READ_WRITE_TOKEN?{token:process.env.BLOB_READ_WRITE_TOKEN}:{};
const vercelBlobs={
 async writeOriginal(path,bytes){if(bytes.length>200*1024*1024)throw problem(413,'Originale oltre 200 MB.');await put(path,bytes,{...auth(),access:'private',contentType:'application/pdf',allowOverwrite:false,addRandomSuffix:false,multipart:true});},
 async readOriginal(path){
  if(originalCache?.path===path&&originalCache.expires>Date.now())return originalCache.promise;
  const entry={path,expires:Date.now()+120000,promise:readBounded(path,200*1024*1024)};originalCache=entry;
  try{return await entry.promise;}catch(e){if(originalCache===entry)originalCache=null;throw e;}
 },
 async writeText(path,value){await put(path,JSON.stringify(value),{...auth(),access:'private',contentType:'application/json',allowOverwrite:false,addRandomSuffix:false});},
 async readText(path){try{return JSON.parse(Buffer.from(await readBounded(path,32*1024*1024)).toString('utf8'));}catch(e){if(e.status)throw e;throw problem(503,'Testo estratto non leggibile.');}},
 async removeOriginal(path){if(!/^jump\/imports\/[a-f0-9-]{36}\/original\.pdf$/.test(path))throw problem(400,'Percorso di cancellazione originale non valido.');if(originalCache?.path===path)originalCache=null;await del(path,auth());},
 async uploadLink(path){
  const validUntil=Date.now()+15*60*1000;
  const token=await issueSignedToken({...auth(),pathname:path,operations:['put'],allowedContentTypes:['application/pdf'],maximumSizeInBytes:MAX_PDF,validUntil});
  const signed=await presignUrl(token,{...auth(),access:'private',operation:'put',pathname:path,allowedContentTypes:['application/pdf'],maximumSizeInBytes:MAX_PDF,allowOverwrite:false,addRandomSuffix:false,validUntil});return signed.presignedUrl;
 },
 async link(path,seconds=300){const token=await issueSignedToken({...auth(),pathname:path,operations:['get'],validUntil:Date.now()+seconds*1000});return (await presignUrl(token,{...auth(),access:'private',operation:'get',pathname:path})).presignedUrl;},
 async read(path){
  const file=await get(path,{...auth(),access:'private',useCache:false,abortSignal:AbortSignal.timeout(30000)});
  if(!file||file.statusCode!==200)throw problem(404,'PDF non caricato.');
  if(file.blob.size>MAX_PDF){await file.stream.cancel();throw problem(400,'PDF oltre il limite di 50 MB.');}
  const bytes=new Uint8Array(await new Response(file.stream).arrayBuffer());
  if(bytes.length>MAX_PDF||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw problem(400,'PDF non valido.');return bytes;
 },
 async write(path,bytes){await put(path,bytes,{...auth(),access:'private',contentType:'application/pdf',allowOverwrite:false,addRandomSuffix:false});},
 async exists(path){const info=await head(path,{...auth(),abortSignal:AbortSignal.timeout(15000)});if(!info||info.size>MAX_PDF||info.contentType!=='application/pdf')throw problem(400,'PDF non caricato o non valido.');}
};
async function readBounded(path,limit){
 const file=await get(path,{...auth(),access:'private',useCache:false,abortSignal:AbortSignal.timeout(55000)});
 if(!file||file.statusCode!==200)throw problem(404,'Fonte privata non disponibile.');
 if(file.blob.size>limit){await file.stream.cancel();throw problem(413,'Fonte oltre il limite.');}
 const chunks=[];let size=0;for await(const chunk of file.stream){size+=chunk.length;if(size>limit)throw problem(413,'Fonte oltre il limite.');chunks.push(chunk);}return Buffer.concat(chunks);
}

// Page cuts without a dedicated server: load the original once (2-minute cache) and copy the pages.
async function cutLocally(store,path,pages){
 const {PDFDocument}=await import('pdf-lib');const input=await PDFDocument.load(await store.readOriginal(path));
 if(pages.some(p=>!Number.isInteger(p)||p<1||p>input.getPageCount()))throw problem(400,'Pagina fuori intervallo.');
 const out=await PDFDocument.create();for(const p of await out.copyPages(input,pages.map(p=>p-1)))out.addPage(p);return out.save();
}
vercelBlobs.readPages=function(path,pages){return cutLocally(this,path,pages);};
vercelBlobs.clip=async function(source,pages,dest){const bytes=await cutLocally(this,source,pages);if(bytes.length>MAX_PDF)throw problem(413,'Ritaglio oltre 50 MB: seleziona meno pagine.');await this.write(dest,bytes);return {size:bytes.length};};

// Private file store on the AG Studio server (JUMP_FILES_URL + JUMP_FILES_SECRET).
// Pages and clips are cut next to the file: the site receives only the requested pages.
const filesBase=()=>String(process.env.JUMP_FILES_URL||'').replace(/\/+$/,'');
const filesSecret=()=>process.env.JUMP_FILES_SECRET||'';
const encodePath=path=>path.split('/').map(encodeURIComponent).join('/');
function signed(op,path,seconds,max=''){
 const exp=String(Date.now()+seconds*1000),sig=createHmac('sha256',filesSecret()).update([op,path,exp,max].join('\n')).digest('base64url');
 return filesBase()+'/s/'+encodePath(path)+'?exp='+exp+(max?'&max='+max:'')+'&sig='+sig;
}
async function call(route,{method='GET',body,headers={},timeout=60000,expect=[200]}={}){
 let res;
 try{res=await fetch(filesBase()+route,{method,body,headers:{Authorization:'Bearer '+filesSecret(),...headers},signal:AbortSignal.timeout(timeout),...(body&&typeof body!=='string'&&!(body instanceof Uint8Array)?{duplex:'half'}:{})});}
 catch{throw problem(503,'Archivio PDF non raggiungibile.');}
 if(expect.includes(res.status))return res;
 const detail=await res.json().catch(()=>({}));
 if(res.status===404)throw problem(404,'Fonte privata non disponibile.');
 if(res.status===409)throw problem(409,'File già presente nell’archivio.');
 if(res.status>=400&&res.status<500)throw problem(res.status,detail.error||'Richiesta all’archivio PDF non valida.');
 throw problem(503,'Archivio PDF non disponibile.');
}
async function bytesOf(res,limit){
 const declared=Number(res.headers.get('content-length')||0);if(declared>limit)throw problem(413,'Fonte oltre il limite.');
 const chunks=[];let size=0;for await(const chunk of res.body){size+=chunk.length;if(size>limit)throw problem(413,'Fonte oltre il limite.');chunks.push(chunk);}return Buffer.concat(chunks);
}
const putFile=(path,bytes,type)=>call('/o/'+encodePath(path),{method:'PUT',body:bytes,headers:{'Content-Type':type},timeout:120000});
const serverBlobs={
 async writeOriginal(path,bytes){if(bytes.length>200*1024*1024)throw problem(413,'Originale oltre 200 MB.');await putFile(path,bytes,'application/pdf');},
 async readOriginal(path){return bytesOf(await call('/o/'+encodePath(path),{timeout:120000}),200*1024*1024);},
 async writeText(path,value){await putFile(path,Buffer.from(JSON.stringify(value)),'application/json');},
 async readText(path){try{return JSON.parse((await bytesOf(await call('/o/'+encodePath(path)),32*1024*1024)).toString('utf8'));}catch(e){if(e.status)throw e;throw problem(503,'Testo estratto non leggibile.');}},
 async removeOriginal(path){if(!/^jump\/imports\/[a-f0-9-]{36}\/original\.pdf$/.test(path))throw problem(400,'Percorso di cancellazione originale non valido.');await call('/o/'+encodePath(path),{method:'DELETE'});},
 async uploadLink(path){return signed('put',path,15*60,String(MAX_PDF));},
 async link(path,seconds=300){return signed('get',path,seconds);},
 async read(path){
  const bytes=await bytesOf(await call('/o/'+encodePath(path),{timeout:30000}),MAX_PDF).catch(e=>{throw e.status===404?problem(404,'PDF non caricato.'):e.status===413?problem(400,'PDF oltre il limite di 50 MB.'):e;});
  if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw problem(400,'PDF non valido.');return new Uint8Array(bytes);
 },
 async write(path,bytes){await putFile(path,bytes,'application/pdf');},
 async exists(path){
  const res=await call('/o/'+encodePath(path),{method:'HEAD',timeout:15000,expect:[200,404]});
  if(res.status!==200||Number(res.headers.get('content-length'))>MAX_PDF||res.headers.get('content-type')!=='application/pdf')throw problem(400,'PDF non caricato o non valido.');
 },
 async readPages(path,pages){return new Uint8Array(await bytesOf(await call('/pages',{method:'POST',body:JSON.stringify({path,pages}),headers:{'Content-Type':'application/json'},timeout:120000}),MAX_PDF));},
 async clip(source,pages,dest){return (await call('/clip',{method:'POST',body:JSON.stringify({source,pages,dest}),headers:{'Content-Type':'application/json'},timeout:120000})).json();},
 async list(){return (await call('/list',{timeout:20000})).json();}
};
export const usesFileServer=()=>!!(filesBase()&&filesSecret());
export const blobs=new Proxy({},{get:(_,key)=>{const target=usesFileServer()?serverBlobs:vercelBlobs;const value=target[key];return typeof value==='function'?value.bind(target):value;}});

// Page cuts for any storage object, including test doubles that only implement readOriginal/write.
export async function readSourcePages(storage,path,pages){return storage.readPages?storage.readPages(path,pages):cutLocally(storage,path,pages);}
export async function writeSourceClip(storage,source,pages,dest){
 if(storage.clip)return storage.clip(source,pages,dest);
 const bytes=await cutLocally(storage,source,pages);if(bytes.length>MAX_PDF)throw problem(413,'Ritaglio oltre 50 MB: seleziona meno pagine.');await storage.write(dest,bytes);return {size:bytes.length};
}
