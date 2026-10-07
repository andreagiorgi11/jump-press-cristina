'use client';
import {useEffect,useRef,useState} from 'react';
import LoginDialog from '../components/LoginDialog';
import InterestDialog from '../components/InterestDialog';
import InstructionsSearch from '../components/InstructionsSearch';
export default function SidebarEditorTools({children,hideInstructions=false,onAuthenticated,lang='it'}){
 const [authenticated,setAuthenticated]=useState(false),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[exiting,setExiting]=useState(false);
 const dialog=useRef(null),trigger=useRef(null),pending=useRef(null);
 useEffect(()=>{const open=()=>openInstructions(),preload=()=>loadInstructions();window.addEventListener('jump-open-instructions',open);window.addEventListener('jump-preload-instructions',preload);return()=>{window.removeEventListener('jump-open-instructions',open);window.removeEventListener('jump-preload-instructions',preload);};});
 useEffect(()=>{let active=true;fetch('/api/auth/session',{cache:'no-store'}).then(async response=>{if(!response.ok)throw Error('Accesso non verificabile. Ricarica la pagina.');return response.json();}).then(result=>{if(active){setAuthenticated(result.authenticated);onAuthenticated?.(result.authenticated);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[onAuthenticated]);
 async function loadInstructions(){
  if(pending.current)return pending.current;
  setLoading(true);setError('');
  pending.current=(async()=>{try{
   const response=await fetch('/api/editor/instructions',{cache:'no-store'}),result=await response.json();
   if(!response.ok){if([401,403].includes(response.status))setData(null);throw Error(result.error||'Istruzioni non disponibili.');}
   if(typeof result.baseText!=='string'||typeof result.preferences?.text!=='string')throw Error('Istruzioni non disponibili.');
   setData(result);
  }catch(e){setError(e.message);}finally{setLoading(false);pending.current=null;}})();
  return pending.current;
 }
 function openInstructions(){if(!dialog.current.open)dialog.current.showModal();loadInstructions();}
 async function logout(){setExiting(true);setError('');try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw Error('Uscita non riuscita. Riprova.');window.location.assign('/');}catch(e){setError(e.message);setExiting(false);}}
 return <>
 {authenticated&&!hideInstructions&&<button ref={trigger} className="summary-editor-access" type="button" aria-haspopup="dialog" onPointerEnter={loadInstructions} onFocus={loadInstructions} onClick={openInstructions}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/></svg><span>Istruzioni e preferenze</span></button>}
 {children}
 <InterestDialog/>
 {authenticated?<button className="summary-editor-access" type="button" disabled={exiting} onClick={logout}><span aria-hidden="true">↪</span><span>{exiting?'Uscita…':'Esci'}</span></button>:<LoginDialog><span aria-hidden="true">↗</span><span>{lang==='en'?'Editor login':'Accesso editor'}</span></LoginDialog>}
 {error&&!dialog.current?.open&&<p className="sidebar-access-error" role="alert">{error}</p>}
 <dialog ref={dialog} className="instructions-dialog" aria-labelledby="instructions-title" onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}} onClose={()=>trigger.current?.focus()}>
 <header><div><h2 id="instructions-title">Istruzioni e preferenze</h2>{data&&<p>{data.localPreview?'Anteprima locale · base versione ':'Versione '}{data.version}</p>}</div><button type="button" aria-label="Chiudi istruzioni" onClick={()=>dialog.current.close()}>×</button></header>
 {loading&&<p role="status">{data?'Aggiornamento della versione corrente…':'Caricamento delle istruzioni correnti…'}</p>}{error&&<p role="alert">{error}{data?' Il testo sottostante è l’ultima versione caricata.':''}</p>}
 {error&&<button type="button" disabled={loading} onClick={loadInstructions}>Riprova</button>}
 {data&&<InstructionsSearch data={data}/>}

 </dialog>
 </>;
}
