export const isEditorial=article=>article.isEditorial??['Editoriali','Editoriale','Commenti'].includes(article.category);
export const showAuthor=article=>article.showAuthor??isEditorial(article);
// Site and PDF already mark editorials and show the byline: a summary opening with
// "EDITORIALE – Nome Autore." repeats both. The label (and the author right after it) is removed;
// an editorial summary opening with just "Nome Autore." or "Nome Autore:" loses the name too.
const label=/^\s*(?:l['’]\s*)?editoriale\b\s*(?:[–—:\-|·]\s*)?(?:di\s+)?/i;
export function cleanSummary(article){
 const original=String(article?.summary||''),author=String(article?.author||'').trim();
 let s=original,changed=false;
 const dropAuthor=()=>{if(author&&s.toLowerCase().startsWith(author.toLowerCase())&&/^\s*[.:,;–—\-]/.test(s.slice(author.length))){s=s.slice(author.length);changed=true;}};
 if(label.test(s)){s=s.replace(label,'');changed=true;dropAuthor();}
 else if(isEditorial(article))dropAuthor();
 if(!changed)return original;
 s=s.replace(/^\s*[.:,;–—\-]+\s*/,'').trimStart();
 return s?s[0].toUpperCase()+s.slice(1):original;
}
