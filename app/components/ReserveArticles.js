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
    <h3 id={'riserva-'+a.id}>{a.clipId?<button className="reserve-title-link" type="button" onClick={()=>onClip(a.clipId)} title="Apri il ritaglio originale">{a.title}</button>:a.title}</h3><p className="reserve-summary">{a.summary}</p>
    <div className="reserve-review-row">{a.reserveReason&&<div className="reserve-reason"><span>Perché considerarlo</span><p>{a.reserveReason}</p></div>}<div className="reserve-actions">{onEdit&&<button className="reserve-select-button" type="button" onClick={()=>onEdit({section:'article',articleId:a.id,reserved:true})}>Rivedi e seleziona <span aria-hidden="true">↗</span></button>}</div></div>
    {(!a.clipId||a.pdfCheck?.status==='attention'||a.pdfCheck?.status==='pending')&&<p className="reserve-warning">PDF da verificare</p>}
    {visibleSynthesisLabels(a.synthesisCheck).map(label=><p key={label} className="reserve-warning">{label}</p>)}
   </article>)}</div>
  </details>
 </section>;
}
