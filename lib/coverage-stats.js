export function outletKey(name=''){
 const key=name.normalize('NFKC').toLocaleLowerCase('it-IT').replace(/[–—-]/g,' ').replace(/\s+/g,' ').trim().replace(/\s+(?:ed\.?|edizione)\s+.+$/,'').trim();
 if(/^(la )?gazzetta dello sport$/.test(key))return 'gazzetta dello sport';
 if(/^corriere dello sport( stadio)?$/.test(key))return 'corriere dello sport';
 if(/^(la )?repubblica$/.test(key))return 'repubblica';
 if(/^(il )?sole\s*24\s*ore$/.test(key))return 'sole 24 ore';
 return key;
}

// Only count original documents referenced by this edition; clips are not sources.
export function originalPageCount(body,assets=[]){
 const ids=new Set([...(body.articles||[]),...(body.coverage?.frontPages||[])].map(a=>a.sourceId).filter(Boolean));
 const sources=assets.filter(a=>['source','source_reference'].includes(a.kind)&&(body.sourceImportId?a.importId===body.sourceImportId:ids.has(a.id)));
 if(!sources.length)return Number.isInteger(body.sourcePageCount)&&body.sourcePageCount>0?body.sourcePageCount:null;
 const unique=new Map();
 for(const source of sources){
  if(!Number.isInteger(source.pageCount)||source.pageCount<1)return null;
  const key=source.sha256||source.importId||source.id;
  if(unique.has(key)&&unique.get(key)!==source.pageCount)return null;
  unique.set(key,source.pageCount);
 }
 return [...unique.values()].reduce((sum,count)=>sum+count,0);
}

export function totalOutletCount(body,assets=[]){
 const sources=assets.filter(a=>['source','source_reference'].includes(a.kind)&&a.importId===body.sourceImportId&&body.sourceImportId);
 const lists=sources.map(a=>a.sourceOutlets);
 if(lists.length&&lists.every(Array.isArray))return new Set(lists.flat().map(outletKey)).size;
 return Number.isInteger(body.sourceOutletCount)&&body.sourceOutletCount>0?body.sourceOutletCount:null;
}
