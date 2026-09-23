import {synthesisLabels} from '../../lib/check-labels';
export default function ArticleChecks({article}){
 const pdf=article.pdfCheck,synthesis=article.synthesisCheck,labels=synthesisLabels(synthesis);
 if(!pdf&&!synthesis)return null;
 return <div className="article-checks" aria-label="Verifiche redazionali">
 {pdf?.status!=='matched'&&<p><strong>⚠ PDF da verificare</strong> — {pdf?.note||'Associazione non verificata.'} Pagine: {article.pages?.join(', ')||'non indicate'}.</p>}
 {labels.filter(label=>label!=='Riscontro fonte incompleto').map(label=><p key={label}><strong>⚠ {label}</strong> — {synthesis?.editorialNote||synthesis?.note||'Controllo non documentato.'}</p>)}
 {(synthesis?.evidence?.length>0||synthesis?.sourceStatus==='incomplete')&&<details><summary>{synthesis.sourceStatus==='incomplete'?'Riscontro fonte incompleto':'Dettagli del riscontro fonte'}</summary>
 <p>Il riscontro degli estratti non certifica il significato della sintesi.</p>
 {!synthesis.evidence?.length&&<p>{synthesis.note}</p>}
 {synthesis.evidence?.map(e=><p key={e.index}>{e.note}{article.factCheck?.evidence?.[e.index-1]?.quote&&<> — «{article.factCheck.evidence[e.index-1].quote}»</>}</p>)}
 </details>}
 </div>;
}
