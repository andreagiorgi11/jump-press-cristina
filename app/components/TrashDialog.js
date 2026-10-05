'use client';
import {useEffect,useRef,useState} from 'react';
import {sharedEditorActions} from './editor-actions';
// Deleted drafts, recoverable from the sidebar (replaces the Cestino entry of the old floating Editor menu).
// Same API calls and permissions as before; opened with the "jump-open-trash" event.
export default function TrashDialog(){
 const dialog=useRef(null),locked=useRef(false);
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const open=async()=>{setError('');setRows([]);dialog.current.showModal();setBusy(true);try{setRows(await sharedEditorActions().onTrash());}catch(e){setError(e.message);}finally{setBusy(false);}};
  window.addEventListener('jump-open-trash',open);return()=>window.removeEventListener('jump-open-trash',open);
 },[]);
 async function recover(row){if(locked.current)return;locked.current=true;setBusy(true);setError('');try{await sharedEditorActions().onRecover(row);dialog.current.close();}catch(e){setError(e.message);}finally{locked.current=false;setBusy(false);}}
 return <dialog className="publish-dialog" ref={dialog} aria-labelledby="trash-title" onCancel={e=>{if(busy)e.preventDefault();}}>
  <div className="publish-dialog-brand"><span>JUMP</span> PRESS</div><p className="publish-dialog-label">REDAZIONE</p><h2 id="trash-title">Cestino</h2>
  {busy&&!rows.length?<p role="status">Caricamento…</p>:rows.length?<ul className="trash-list">{rows.map(row=><li key={row.id}><div><b>{row.body.title}</b><small>{new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(row.body.date+'T12:00:00Z'))}</small></div><button disabled={busy} onClick={()=>recover(row)}>Ripristina</button></li>)}</ul>:!error&&<p>Il cestino è vuoto.</p>}
  {error&&<p role="alert" className="publish-dialog-error">{error}</p>}
  <div className="publish-dialog-actions"><button className="publish-cancel" disabled={busy} onClick={()=>dialog.current.close()}>Chiudi</button></div>
 </dialog>;
}
