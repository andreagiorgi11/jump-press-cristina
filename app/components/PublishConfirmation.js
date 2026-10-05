 'use client';
import {useRef,useState} from 'react';
export default function PublishConfirmation({onConfirm,disabled=false,date,version,isRevision=false,summaryStale=false,introStale=false}){
 const dialog=useRef(null),cancel=useRef(null),locked=useRef(false);
 const problems=[introStale&&'Cappello da ricontrollare dopo il cambio della selezione',summaryStale&&'Summary da ricontrollare dopo le ultime modifiche'].filter(Boolean);
 const [pending,setPending]=useState(false),[error,setError]=useState(''),[tested,setTested]=useState(false);
 function open(){setError('');setTested(false);dialog.current.showModal();cancel.current?.focus();}
 async function approve(){if(locked.current)return;locked.current=true;setPending(true);setError('');try{if(!onConfirm){setTested(true);return;}const ok=await onConfirm();if(ok===false)setError('Pubblicazione non completata. Controlla il messaggio nella pagina prima di riprovare.');else dialog.current?.close();}catch{setError('Pubblicazione non completata. Riprova dopo aver verificato la bozza.');}finally{locked.current=false;setPending(false);}}
 return <><button type="button" className="confirm-draft" disabled={disabled} onClick={open}><svg className="confirm-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21 3-9.5 9.5M21 3l-6.5 18-3-8.5L3 9.5 21 3Z"/></svg>{isRevision?'Pubblica correzioni':'Pubblica bozza'}{problems.length>0&&<svg className="confirm-warning" viewBox="0 0 24 24" width="15" height="15" role="img" aria-label={'Attenzione: '+problems.join('; ')} focusable="false"><title>{problems.join(' · ')}</title><path d="M12 3 2.5 20h19L12 3Z" fill="currentColor"/><path d="M12 10v5" stroke="#151515" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="17.6" r="1.1" fill="#151515"/></svg>}</button><dialog className="publish-dialog" ref={dialog} aria-labelledby="publish-title" aria-describedby="publish-description" onCancel={e=>{if(pending)e.preventDefault();}}>
 <div className="publish-dialog-brand"><span>JUMP</span> PRESS</div>
 <p className="publish-dialog-label">{tested?'ANTEPRIMA LOCALE':'CONFERMA PUBBLICAZIONE'}</p>
 <h2 id="publish-title">{tested?'Prova completata':(isRevision?'Ripubblicare la rassegna corretta':'Pubblicare la rassegna')+(date?' del '+date.slice(8,10)+'/'+date.slice(5,7):'')+'?'}</h2>
 <p id="publish-description">{tested?'Nessun contenuto è stato pubblicato.':isRevision?<>La rassegna corretta sarà visibile sul sito per questa data. Controlla tutte le correzioni prima di confermare. I messaggi, PDF o testi già inviati all’esterno non vengono aggiornati né richiamati.</>:<>Diventerà visibile ai lettori della Juventus.</>}</p>
 {!tested&&introStale&&<p className="publish-dialog-error" role="note">Attenzione: il cappello non è stato ricontrollato dopo il cambio della selezione. Verrà pubblicato così com’è.</p>}
 {!tested&&summaryStale&&<p className="publish-dialog-error" role="note">Attenzione: il Summary non è stato ricontrollato dopo le ultime modifiche alla rassegna. Verrà pubblicato così com’è.</p>}
 {error&&<p className="publish-dialog-error" role="alert">{error}</p>}
 <div className="publish-dialog-actions"><button ref={cancel} type="button" className="publish-cancel" disabled={pending} onClick={()=>dialog.current.close()}>{tested?'Chiudi':'Annulla'}</button>{!tested&&<button type="button" className="publish-approve" disabled={pending} onClick={approve}>{pending?'Pubblicazione…':'Conferma e pubblica'}</button>}</div>
 </dialog></>;
}
