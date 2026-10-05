'use client';
import {visibleSynthesisLabels} from '../../lib/check-labels';
import './reserve-articles.css';
export default function ReserveArticles({body,onEdit,onClip}){
 const articles=body.reserveArticles||[];
 return <section id="seconda-scelta" className="reserve-choice" aria-label="Seconda scelta">
  {body.introStale&&<p className="reserve-review" role="status">Cappello da ricontrollare dopo il cambio della selezione. {onEdit&&<button type="button" onClick={()=>onEdit({section:'intro',label:'cappello'})}>Rivedi cappello</button>}</p>}
  <details open><summary className="reserve-heading"><span className="reserve-heading-copy"><span className="reserve-eyebrow">IL TAVOLO DELLA REDAZIONE</span><span className="reserve-title">Seconda scelta <span className="reserve-count">{articles.length}</span></span></span><svg className="reserve-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
   <p className="reserve-description">Alternative da aggiungere o sostituire alla selezione. Restano private finché non le scegli.</p>
   {!articles.length&&<p className="reserve-empty">{body.reserveArticles===undefined?'Seconda scelta non ancora preparata per questa rassegna.':'Nessun articolo aggiuntivo utile selezionato per questa rassegna.'}</p>}
   <div className="reserve-list">{articles.map((a,index)=><article key={a.id} className="reserve-card" aria-labelledby={'riserva-'+a.id}>
    <div className="reserve-card-top"><div className="reserve-tags"><span className="reserve-category">{a.category}</span>{a.isEditorial&&<span className="reserve-editorial">Editoriale</span>}</div><span className="reserve-number" aria-label={'Alternativa '+(index+1)}>{String(index+1).padStart(2,'0')}</span></div>
    <p className="reserve-meta"><span className="reserve-outlet">{a.outlet}</span>{a.author&&<span className="reserve-author">{a.author}</span>}</p>
    <h3 id={'riserva-'+a.id}>{a.title}</h3><p className="reserve-summary">{a.summary}</p>
    {a.reserveReason&&<div className="reserve-reason"><span>Perché considerarlo</span><p>{a.reserveReason}</p></div>}
    {(!a.clipId||a.pdfCheck?.status==='attention'||a.pdfCheck?.status==='pending')&&<p className="reserve-warning">PDF da verificare</p>}
    {visibleSynthesisLabels(a.synthesisCheck).map(label=><p key={label} className="reserve-warning">{label}</p>)}
    <div className="reserve-actions">{a.clipId&&<button className="reserve-source-button" type="button" onClick={()=>onClip(a.clipId)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></svg>Leggi ritaglio</button>}{onEdit&&<button className="reserve-select-button" type="button" onClick={()=>onEdit({section:'article',articleId:a.id,reserved:true})}>Rivedi e seleziona <span aria-hidden="true">↗</span></button>}</div>
   </article>)}</div>
  </details>
 </section>;
}
