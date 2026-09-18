'use client';
import {useRef,useState,useId} from 'react';
import {useRouter} from 'next/navigation';
export default function DeleteArchiveDraft({id,version,date}){
 const dialog=useRef(null),locked=useRef(false),router=useRouter(),titleId=useId();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const formatted=new Intl.DateTimeFormat('it-IT',{dateStyle:'long',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
 async function remove(){
  if(locked.current)return;locked.current=true;setBusy(true);setError('');
  try{
   const response=await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id,version})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Impossibile eliminare la bozza.');
   dialog.current.close();router.refresh();
  }catch(e){setError(e.message);}finally{locked.current=false;setBusy(false);}
 }
 return <><button title="Elimina bozza" className="archive-delete" type="button" aria-label={'Elimina bozza del '+formatted} onClick={()=>{setError('');dialog.current.showModal();}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>
 <dialog className="publish-dialog" ref={dialog} aria-labelledby={titleId} onCancel={e=>{if(busy)e.preventDefault();}}><p className="publish-dialog-label">REDAZIONE</p><h2 id={titleId}>Eliminare la bozza del {formatted}?</h2><p>La bozza verrà spostata nel cestino. Potrai recuperarla dal menu editor.</p>{error&&<p role="alert" className="publish-dialog-error">{error}</p>}<div className="publish-dialog-actions"><button className="publish-cancel" disabled={busy} onClick={()=>dialog.current.close()}>Annulla</button><button className="publish-approve" disabled={busy} onClick={remove}>{busy?'Eliminazione…':'Sposta nel cestino'}</button></div></dialog></>;
}
