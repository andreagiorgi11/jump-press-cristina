const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const canonical=x=>Array.isArray(x)?x.map(canonical):object(x)?Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,canonical(x[k])])):x;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
// Reordering/deletion conflicts stay explicit; unchanged article identities allow field-level recovery.
export function reconcileSave(base,local,remote){
 const conflicts=[];
 function merge(a,b,c,path){
  if(equal(a,b)||equal(b,c))return c;
  if(equal(a,c))return b;
  if((path==='articles'||path==='reserveArticles')&&[a,b,c].every(Array.isArray)&&a.every(x=>x?.id)&&equal(a.map(x=>x.id),b.map(x=>x.id))&&equal(a.map(x=>x.id),c.map(x=>x.id)))return a.map((x,i)=>merge(x,b[i],c[i],path+'.'+x.id));
  if(object(a)&&object(b)&&object(c))return Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b),...Object.keys(c)])].map(k=>[k,merge(a[k],b[k],c[k],path?path+'.'+k:k)]));
  conflicts.push(path);return b;
 }
 const body=merge(base,local,remote,'');return {body,conflicts,saved:conflicts.length===0&&equal(body,remote)};
}
export async function editorRequest(payload,{fetcher=fetch,timeout=300000,readParameter='id'}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const r=await fetcher('/api/editor'+(typeof payload==='string'?'?'+readParameter+'='+encodeURIComponent(payload):''),typeof payload==='string'?{cache:'no-store',signal:controller.signal}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
  const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error||'Operazione non riuscita.'),{status:r.status});return data;
 }finally{clearTimeout(timer);}
}
export async function saveWithRecovery(draft,body,options){
 try{return {saved:true,draft:await editorRequest({action:'save',id:draft.id,version:draft.version,body,introConfirmed:options?.introConfirmed===true},options)};}
 catch(error){
  if(error.status&&error.status!==409&&error.status<500)throw error;
  let latest;
  try{latest=await editorRequest(draft.id,{...options,timeout:15000});}
  catch{throw new Error('Non è possibile verificare se il salvataggio è riuscito. Conserva le modifiche e riprova quando la connessione torna disponibile.');}
  if(latest.id!==draft.id||latest.version<draft.version)throw new Error('Impossibile verificare la versione salvata.');
  const result=reconcileSave(draft.body,body,latest.body);
  if(options?.introConfirmed&&latest.body.introStale)result.saved=false;
  return {...result,draft:latest};
 }
}
