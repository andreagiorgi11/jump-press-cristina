// Draft-only candidates. Public views and counts continue to use body.articles.
export const allDraftArticles=body=>[...(body?.articles||[]),...(body?.reserveArticles||[])];
export const selectionIds=body=>JSON.stringify(body.articles.map(a=>a.id).sort());
export function promoteReserve(body,id,replaceId=''){
 const reserve=body.reserveArticles||[],article=reserve.find(a=>a.id===id);
 if(!article)throw Error('Articolo non presente nella seconda scelta.');
 const replaced=replaceId?body.articles.find(a=>a.id===replaceId):null;
 if(replaceId&&!replaced)throw Error('Articolo da sostituire non trovato.');
 return {...body,articles:replaced?body.articles.map(a=>a.id===replaceId?article:a):[...body.articles,article],reserveArticles:[...reserve.filter(a=>a.id!==id),...(replaced?[replaced]:[])]};
}
export function parkArticle(body,id){
 const article=body.articles.find(a=>a.id===id);
 if(!article)throw Error('Articolo non trovato nella selezione.');
 if(body.articles.length<2)throw Error('Mantieni almeno un articolo nella selezione.');
 return {...body,articles:body.articles.filter(a=>a.id!==id),reserveArticles:[...(body.reserveArticles||[]),article]};
}
