 'use client';
import {useRef,useState} from 'react';
export default function PublishConfirmation({onConfirm,disabled=false,date,version}){
 const dialog=useRef(null),cancel=useRef(null),locked=useRef(false);
 const [pending,setPending]=useState(false),[error,setError]=useState(''),[tested,setTested]=useState(false);
 function open(){setError('');setTested(false);dialog.current.showModal();cancel.current?.focus();}
 async function approve(){if(locked.current)return;locked.current=true;setPending(true);setError('');try{if(!onConfirm){setTested(true);return;}const ok=await onConfirm();if(ok===false)setError('Pubblicazione non completata. Controlla il messaggio nella pagina prima di riprovare.');else dialog.current?.close();}catch{setError('Pubblicazione non completata. Riprova dopo aver verificato la bozza.');}finally{locked.current=false;setPending(false);}}
 return <><button type="button" className="confirm-draft" disabled={disabled} onClick={open}>Conferma bozza</button><dialog className="publish-dialog" ref={dialog} aria-labelledby="publish-title" aria-describedby="publish-description" onCancel={e=>{if(pending)e.preventDefault();}}>
 <div className="publish-dialog-brand"><span>JUMP</span> PRESS</div>
 <p className="publish-dialog-label">{tested?'ANTEPRIMA LOCALE':'CONFERMA PUBBLICAZIONE'}</p>
 <h2 id="publish-title">{tested?'Prova completata':'Confermare la bozza?'}</h2>
 <p id="publish-description">{tested?'Nessun contenuto è stato pubblicato.':<>Sei sicuro di voler confermare{date?' la bozza del '+new Intl.DateTimeFormat('it-IT',{dateStyle:'long',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')):' la bozza'} e pubblicarla? La rassegna sarà visibile ai lettori.</>}</p>
 {!tested&&version&&<p className="publish-dialog-version">Versione salvata {version}</p>}
 {error&&<p className="publish-dialog-error" role="alert">{error}</p>}
 <div className="publish-dialog-actions"><button ref={cancel} type="button" className="publish-cancel" disabled={pending} onClick={()=>dialog.current.close()}>{tested?'Chiudi':'Annulla'}</button>{!tested&&<button type="button" className="publish-approve" disabled={pending} onClick={approve}>{pending?'Pubblicazione…':'Conferma e pubblica'}</button>}</div>
 </dialog></>;
}
