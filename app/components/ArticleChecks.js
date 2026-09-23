import {synthesisLabels} from '../../lib/check-labels';
export default function ArticleChecks({article}){
 const pdf=article.pdfCheck,synthesis=article.synthesisCheck,labels=synthesisLabels(synthesis);
 const incomplete=synthesis?.sourceStatus==='incomplete';
 const editorialLabels=labels.filter(label=>label!=='Riscontro fonte incompleto');
 if(!pdf&&!synthesis||pdf?.status==='matched'&&!incomplete&&!editorialLabels.length)return null;
 return <div className="article-checks" aria-label="Verifiche redazionali">
 {pdf?.status!=='matched'&&<p><strong>⚠ {pdf?.status==='pending'?'Verifica PDF in attesa':'PDF da verificare'}</strong> — {pdf?.note||'Associazione non verificata.'} Pagine: {article.pages?.join(', ')||'non indicate'}.</p>}
 {editorialLabels.map(label=><p key={label}><strong>⚠ {label}</strong> — {synthesis?.editorialNote||synthesis?.note||'Controllo non documentato.'}</p>)}
 {incomplete&&<details><summary>Riscontro fonte incompleto</summary>
 <p>Il riscontro degli estratti non certifica il significato della sintesi.</p>
 {!synthesis.evidence?.length&&<p>{synthesis.note}</p>}
 {synthesis.evidence?.filter(e=>e.status==='unmatched').map(e=><p key={e.index}>{e.note}{article.factCheck?.evidence?.[e.index-1]?.quote&&<> — «{article.factCheck.evidence[e.index-1].quote}»</>}</p>)}
 </details>}
 </div>;
}
