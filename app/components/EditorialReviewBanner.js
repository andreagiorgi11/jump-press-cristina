'use client';
import './editorial-review.css';
export default function EditorialReviewBanner({review,error,onRefresh}){
 if(!review&&!error)return null;
 const labels={waiting:'Bozza pronta — in attesa della revisione automatica',running:'Revisione editoriale in corso',completed:'Revisione automatica completata — pronta per il controllo della redazione',interrupted:'Revisione incompleta — controllo manuale necessario'};
 return <aside className={'editorial-review-banner review-'+(review?.status||'interrupted')} aria-label="Stato revisione editoriale" role="status">
  <div><span className="review-eyebrow">CONTROLLO EDITORIALE</span><strong>{labels[review?.status]||'Stato della revisione non disponibile'}</strong>
  {review?.status==='running'&&<p>Il secondo controllo sta rivedendo testi, firme, interviste ed eventuali omissioni. Le modifiche della redazione vengono conservate.</p>}
  {review?.status==='waiting'&&<p>La preparazione è terminata. Il secondo controllo non è ancora iniziato.</p>}
  {review?.report&&<p>{review.report}</p>}
  {review?.modifiedAfterReview&&<p>La redazione ha modificato la bozza dopo il controllo automatico.</p>}
  {['failed','uncertain'].includes(review?.notification?.status)&&<p>La notifica per avviare il controllo non è confermata. Segnala il problema ad Andrea.</p>}
  {error&&<p>Stato non aggiornabile: {error} L’ultimo stato disponibile è conservato.</p>}</div>
  <button type="button" onClick={onRefresh}>Aggiorna</button>
 </aside>;
}
