'use client';
import {useEffect,useRef,useState} from 'react';
export default function SidebarEditorTools({children}){
 const [authenticated,setAuthenticated]=useState(false),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[exiting,setExiting]=useState(false);
 const dialog=useRef(null),trigger=useRef(null);
 useEffect(()=>{let active=true;fetch('/api/auth/session',{cache:'no-store'}).then(async response=>{if(!response.ok)throw Error('Accesso non verificabile. Ricarica la pagina.');return response.json();}).then(result=>{if(active)setAuthenticated(result.authenticated);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function openInstructions(){dialog.current.showModal();setLoading(true);setError('');try{const response=await fetch('/api/editor/instructions',{cache:'no-store'}),result=await response.json();if(!response.ok)throw Error(result.error||'Istruzioni non disponibili.');if(typeof result.text!=='string')throw Error('Istruzioni non disponibili.');setData(result);}catch(e){setError(e.message);}finally{setLoading(false);}}
 async function logout(){setExiting(true);setError('');try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw Error('Uscita non riuscita. Riprova.');window.location.assign('/');}catch(e){setError(e.message);setExiting(false);}}
 return <>
 {authenticated&&<button ref={trigger} className="summary-editor-access" type="button" aria-haspopup="dialog" onClick={openInstructions}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/></svg><span>Istruzioni</span></button>}
 {children}
 {authenticated?<button className="summary-editor-access" type="button" disabled={exiting} onClick={logout}><span aria-hidden="true">↪</span><span>{exiting?'Uscita…':'Esci'}</span></button>:<a className="summary-editor-access" href="/editor"><span aria-hidden="true">↗</span><span>Accesso editor</span></a>}
 {error&&!dialog.current?.open&&<p className="sidebar-access-error" role="alert">{error}</p>}
 <dialog ref={dialog} className="instructions-dialog" aria-labelledby="instructions-title" onClose={()=>trigger.current?.focus()}>
 <header><div><small>SOLO LETTURA</small><h2 id="instructions-title">Istruzioni GPT</h2>{data&&<p>{data.localPreview?'Anteprima locale · base versione ':'Versione '}{data.version}{data.instructionProfile?' · '+data.instructionProfile:''}</p>}</div><button type="button" aria-label="Chiudi istruzioni" onClick={()=>dialog.current.close()}>×</button></header>
 {loading&&<p role="status">Caricamento delle istruzioni correnti…</p>}{error&&<p role="alert">{error}{data?' Il testo sottostante è l’ultima versione caricata.':''}</p>}
 {data&&<pre className="instructions-readonly">{data.text}</pre>}
 </dialog>
 </>;
}
