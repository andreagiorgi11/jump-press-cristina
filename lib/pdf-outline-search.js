const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it').trim();
export function filterPdfOutline(items,query){
 const terms=normalize(query).split(/\s+/).filter(Boolean);if(!terms.length)return items;
 return items.flatMap(item=>{if(terms.every(term=>normalize(item.title).includes(term)))return [item];const children=filterPdfOutline(item.items||[],query);return children.length?[{...item,items:children}]:[];});
}
