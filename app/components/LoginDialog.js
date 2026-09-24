'use client';
import {useRef,useState} from 'react';
// Editor sign-in as a dialog over the current page; on success it closes and opens the editor.
export default function LoginDialog({className='summary-editor-access',children}){
 const dialog=useRef(null),trigger=useRef(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 function open(){setError('');dialog.current.showModal();}
 async function submit(e){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  const fields=new FormData(e.currentTarget);
  try{
   const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:fields.get('username'),password:fields.get('password'),returnTo:'/editor'})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||'Accesso non riuscito.');
   dialog.current.close();window.location.assign(data.returnTo||'/editor');
  }catch(err){setError(err.message);setBusy(false);}
 }
 return <>
  <button ref={trigger} type="button" className={className} aria-haspopup="dialog" onClick={open}>{children}</button>
  <dialog ref={dialog} className="login-dialog" aria-labelledby="login-dialog-title" onClose={()=>trigger.current?.focus()} onCancel={e=>{if(busy)e.preventDefault();}}>
   <form onSubmit={submit}>
    <header><div><img className="login-dialog-mark" src="/brand/juventus-j.svg" alt="" width="19" height="30"/><small>AREA RISERVATA · REDAZIONE</small><h2 id="login-dialog-title">Accedi alla redazione</h2></div><button type="button" className="login-dialog-close" aria-label="Chiudi" disabled={busy} onClick={()=>dialog.current.close()}>×</button></header>
    <label>Nome utente<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={80} disabled={busy} autoFocus/></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} disabled={busy}/></label>
    {error&&<p className="login-dialog-error" role="alert">{error}</p>}
    <button type="submit" className="login-dialog-submit" disabled={busy}>{busy?'Accesso…':'Accedi'}</button>
    <p className="login-dialog-hint">Solo gli account autorizzati possono entrare.</p>
   </form>
  </dialog>
 </>;
}
