import {summaryEdition} from './summary-sections.js';
import {displayCategory} from './editorial-topics.js';
export function sectionArticleIds(body,id,summaryView=body.editorialModel==='summary-v1'){
 const articles=summaryView?summaryEdition(body).articles:body.articles.map(a=>({...a,category:displayCategory(a)}));
 const selected=articles.find(a=>a.id===id);
 return selected?articles.filter(a=>a.category===selected.category).map(a=>a.id):[];
}
export function moveArticleInSection(body,id,position,summaryView){
 const ids=sectionArticleIds(body,id,summaryView);
 if(!Number.isInteger(position)||position<1||position>ids.length)throw Error('Posizione non valida nella sezione.');
 const ordered=ids.filter(value=>value!==id);ordered.splice(position-1,0,id);
 const byId=new Map(body.articles.map(a=>[a.id,a]));let index=0;const members=new Set(ids);
 return {...body,articles:body.articles.map(a=>members.has(a.id)?byId.get(ordered[index++]):a)};
}
