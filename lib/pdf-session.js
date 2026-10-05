// One original per editor page. Closing an article does not discard downloaded PDF.js ranges.
// The owner clears this on source/edition changes and unmount; nothing is persisted to disk.
export function createPdfSession(){
 let current;
 function clear(){const old=current;current=undefined;if(old)old.controller.abort();}
 function get(key,load){
  if(current?.key===key)return current.promise;
  clear();
  const entry={key,controller:new AbortController()};current=entry;
  entry.promise=Promise.resolve().then(()=>load(entry.controller.signal)).then(value=>{
   if(entry.controller.signal.aborted)throw Object.assign(Error('PDF session closed'),{name:'AbortError'});
   return value;
  }).catch(error=>{if(current===entry){current=undefined;entry.controller.abort();}throw error;});
  return entry.promise;
 }
 return {get,clear};
}
