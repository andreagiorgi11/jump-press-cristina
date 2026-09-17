import {get,put,head,issueSignedToken,presignUrl} from '@vercel/blob';
import {problem} from './github-store.js';
export const MAX_PDF=52428800;
export const blobs={
 async uploadLink(path){
  const validUntil=Date.now()+15*60*1000;
  const token=await issueSignedToken({pathname:path,operations:['put'],allowedContentTypes:['application/pdf'],maximumSizeInBytes:MAX_PDF,validUntil});
  const signed=await presignUrl(token,{access:'private',operation:'put',pathname:path,allowedContentTypes:['application/pdf'],maximumSizeInBytes:MAX_PDF,allowOverwrite:false,addRandomSuffix:false,validUntil});return signed.presignedUrl;
 },
 async link(path,seconds=300){const token=await issueSignedToken({pathname:path,operations:['get'],validUntil:Date.now()+seconds*1000});return (await presignUrl(token,{access:'private',operation:'get',pathname:path})).presignedUrl;},
 async read(path){
  const file=await get(path,{access:'private',useCache:false,abortSignal:AbortSignal.timeout(30000)});
  if(!file||file.statusCode!==200)throw problem(404,'PDF non caricato.');
  if(file.blob.size>MAX_PDF){await file.stream.cancel();throw problem(400,'PDF oltre il limite di 50 MB.');}
  const bytes=new Uint8Array(await new Response(file.stream).arrayBuffer());
  if(bytes.length>MAX_PDF||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw problem(400,'PDF non valido.');return bytes;
 },
 async write(path,bytes){await put(path,bytes,{access:'private',contentType:'application/pdf',allowOverwrite:false,addRandomSuffix:false});},
 async exists(path){const info=await head(path,{abortSignal:AbortSignal.timeout(15000)});if(!info||info.size>MAX_PDF||info.contentType!=='application/pdf')throw problem(400,'PDF non caricato o non valido.');}
};
