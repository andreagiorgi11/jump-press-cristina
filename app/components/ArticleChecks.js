import {articleEditorialNote} from '../../lib/check-labels';
export default function ArticleChecks({article}){
 const pdf=article.pdfCheck,note=articleEditorialNote(article),editorialLabels=note?['Nota editoriale']:[];
 if(!pdf&&!note||(!pdf||pdf.status==='matched')&&!editorialLabels.length)return null;
 return <div className="article-checks" aria-label="Verifiche redazionali">
 {pdf&&pdf.status!=='matched'&&<p><strong>⚠ {pdf?.status==='pending'?'Verifica PDF in attesa':'PDF da verificare'}</strong> — {pdf?.note||'Associazione non verificata.'} Pagine: {article.pages?.join(', ')||'non indicate'}.</p>}
 {editorialLabels.map(label=><p key={label}><strong>⚠ {label}</strong> — {note}</p>)}
 </div>;
}
