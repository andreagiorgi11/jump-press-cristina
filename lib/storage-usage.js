import {list} from '@vercel/blob';
import {problem} from './github-store.js';

// A byte inventory is not the provider's monthly billed usage or transfer quota.
export async function collectStorageUsage(listFiles=list,{limitBytes=null}={}){
 const totals={originals:0,articlePdfs:0,other:0},counts={originals:0,articlePdfs:0,other:0};
 let cursor;const seen=new Set();
 for(let page=0;page<100;page++){
  const result=await listFiles({limit:1000,...(cursor?{cursor}:{}),...(process.env.BLOB_READ_WRITE_TOKEN?{token:process.env.BLOB_READ_WRITE_TOKEN}:{}),abortSignal:AbortSignal.timeout(20000)});
  if(!Array.isArray(result.blobs)||typeof result.hasMore!=='boolean')throw problem(503,'Inventario spazio non disponibile.');
  for(const blob of result.blobs){
   if(typeof blob.pathname!=='string'||!Number.isSafeInteger(blob.size)||blob.size<0)throw problem(503,'Inventario spazio non valido.');
   if(seen.has(blob.pathname))continue;seen.add(blob.pathname);
   const kind=/^jump\/imports\/[^/]+\/original\.pdf$/.test(blob.pathname)?'originals':/^jump\/[^/]+\/[^/]+\.pdf$/.test(blob.pathname)?'articlePdfs':'other';
   totals[kind]+=blob.size;counts[kind]++;
  }
  if(!result.hasMore){
   const totalBytes=Object.values(totals).reduce((a,b)=>a+b,0),limit=Number.isSafeInteger(limitBytes)&&limitBytes>0?limitBytes:null,ratio=limit?totalBytes/limit:null;
   return {totalBytes,totals,counts,limitBytes:limit,remainingBytes:limit?Math.max(0,limit-totalBytes):null,level:ratio===null?'unknown':ratio>=.9?'critical':ratio>=.8?'warning':'normal',measuredAt:new Date().toISOString()};
  }
  if(!result.cursor||result.cursor===cursor)throw problem(503,'Inventario spazio incompleto.');cursor=result.cursor;
 }
 throw problem(503,'Inventario spazio incompleto.');
}
let cached=null,pending=null;
export async function readStorageUsage(){
 if(cached&&Date.now()-Date.parse(cached.measuredAt)<300000)return {...cached,stale:false};
 if(!pending)pending=collectStorageUsage(list,{limitBytes:Number(process.env.JUMP_STORAGE_LIMIT_BYTES)||null}).then(result=>{cached=result;return {...result,stale:false};}).catch(error=>{if(cached)return {...cached,stale:true,error:'Aggiornamento non riuscito: sono mostrati gli ultimi dati disponibili.'};throw error;}).finally(()=>{pending=null;});
 return pending;
}
