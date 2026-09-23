export const isEditorial=article=>article.isEditorial??['Editoriali','Editoriale','Commenti'].includes(article.category);
export const showAuthor=article=>article.showAuthor??isEditorial(article);
