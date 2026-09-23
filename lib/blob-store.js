import {get,put,head,del,issueSignedToken,presignUrl} from '@vercel/blob';
import {problem} from './github-store.js';
export const MAX_PDF=52428800;
let originalCache=null;
// Use the configured private store credential explicitly; ambient CLI OIDC can
// target a different project locally. Never retry an authorization error with another identity.
const auth=()=>process.env.BLOB_READ_WRITE_TOKEN?{token:process.env.BLOB_READ_WRITE_TOKEN}:{};
export const blobs={
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
