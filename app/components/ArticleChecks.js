export default function ArticleChecks({article}){
 const pdf=article.pdfCheck,synthesis=article.synthesisCheck;
 if(!pdf&&!synthesis)return null;
 return <div className="article-checks" aria-label="Verifiche redazionali">
 {pdf?.status!=='matched'&&<p><strong>⚠ PDF da verificare</strong> — {pdf?.note||'Associazione non verificata.'} Pagine: {article.pages?.join(', ')||'non indicate'}.</p>}
 {synthesis?.status!=='verified'&&<p><strong>⚠ Sintesi da verificare</strong> — {synthesis?.note||'Controllo fattuale non documentato.'}</p>}
 </div>;
}
