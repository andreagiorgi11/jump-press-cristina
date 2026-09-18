export const editorialCategories=['Editoriali','Prima squadra','Prossimo avversario','Settore giovanile','Next Gen','Juventus Women','Politica sportiva','Altri temi'];
export const editorialTopics=editorialCategories.slice(1);
export const acceptedEditorialTopics=[...editorialTopics,'Mercato','Società e dirigenza','Arbitri e VAR','Nazionale','Competizioni europee'];
const mergedCategories={'Mercato':'Prima squadra','Società e dirigenza':'Prima squadra','Arbitri e VAR':'Politica sportiva','Nazionale':'Altri temi','Competizioni europee':'Altri temi'};
export function displayCategory(article){
 if(mergedCategories[article.category])return mergedCategories[article.category];
 if(editorialCategories.includes(article.category))return article.category;
 if(['Editoriale','Commenti'].includes(article.category))return 'Editoriali';
 if(['Youth League','Primavera'].includes(article.category))return 'Settore giovanile';
 // Old combined classifications and interviews need editorial review; do not guess their subject.
 if(editorialTopics.includes(article.topic))return article.topic;
 if(mergedCategories[article.topic])return mergedCategories[article.topic];
 return 'Altri temi';
}
export function orderedArticles(articles){return articles.map(a=>({...a,category:displayCategory(a)})).sort((a,b)=>editorialCategories.indexOf(a.category)-editorialCategories.indexOf(b.category));}
