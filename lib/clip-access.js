// In-memory, per-editor-view capabilities. Every open still verifies the live session.
export function createClipAccess({fetcher=fetch,now=Date.now,onDenied=()=>{}}={}){
 let links=new Map(),generation=0;
 return {
  replace(next={}){generation++;links=new Map(Object.entries(next));},
  async url(id){
   const epoch=generation;
   const response=await fetcher('/api/auth/session',{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Verifica accesso temporaneamente non disponibile');
   const session=await response.json();
   if(!session.authenticated||!['producer','editor','publisher'].includes(session.role)){links.clear();onDenied();throw Error('Accesso scaduto. Accedi nuovamente.');}
   if(epoch!==generation)throw Error('La rassegna è cambiata. Riapri il ritaglio.');
   const cached=links.get(id);
   if(cached&&cached.expiresAt>now()+30000)return cached.url;
   const renewed=await fetcher('/api/editor',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'asset',assetId:id})});
   if(!renewed.ok)throw Error('Accesso al ritaglio non disponibile');
   const data=await renewed.json();
   if(epoch!==generation)throw Error('La rassegna è cambiata. Riapri il ritaglio.');
   links.set(id,{url:data.url,expiresAt:now()+(data.expiresIn||300)*1000});return data.url;
  }
 };
}

// A speculative download must never hold up the reader's progressive network load.
export async function waitForPreparedClip(pending,cancel,waitMs=120){
 if(!pending)return;
 let timer;
 try{await Promise.race([pending,new Promise(resolve=>{timer=setTimeout(()=>{cancel();resolve();},waitMs);})]);}
 finally{clearTimeout(timer);}
}
