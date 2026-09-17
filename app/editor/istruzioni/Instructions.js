'use client';
import {useEffect,useState} from 'react';
export default function Instructions(){
 const [data,setData]=useState(null),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const dirty=data!==null&&text!==data.text;
 async function load(){setBusy(true);setError('');try{const r=await fetch('/api/editor/instructions',{cache:'no-store'}),x=await r.json();if(!r.ok)throw Error(x.error);setData(x);setText(x.text);}catch(e){setError(e.message||'Istruzioni non disponibili.');}finally{setBusy(false);}}
 useEffect(()=>{load();},[]);
 useEffect(()=>{const leave=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);},[dirty]);
 async function save(e){e.preventDefault();setBusy(true);setError('');setNotice('');try{const r=await fetch('/api/editor/instructions',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:data.version,text})}),x=await r.json();if(!r.ok)throw Error(x.error);setData(x);setText(x.text);setNotice('Istruzioni salvate. Saranno lette dalla prossima esecuzione.');}catch(e){setError((e.message||'Salvataggio non riuscito.')+' Il testo nel modulo è stato conservato.');}finally{setBusy(false);}}
 return <main className="editor-main"><a className="editor-brand" href="/editor">JUMP <b>PRESS</b></a><p className="eyebrow">REDAZIONE · ISTRUZIONI</p><h1>Come preparare la rassegna</h1><p>Queste sono le istruzioni di consegna che ChatGPT legge da Jump Press a ogni esecuzione. Puoi aggiornarle qui senza riscrivere l’automatismo.</p><a className="editor-return" href="/editor">← Torna alle bozze</a>
 <p className="editor-notice">L’automatismo prepara soltanto bozze. La pubblicazione richiede la richiesta esplicita di un editor sulla versione revisionata.</p>
 {error&&<p className="editor-error" role="alert">{error}</p>}{notice&&<p className="editor-notice" role="status">{notice}</p>}
 {!data?<section className="editor-card"><p>{busy?'Caricamento istruzioni…':'Impossibile caricare le istruzioni.'}</p><button disabled={busy} onClick={load}>Riprova</button></section>:<>
 <form className="editor-card" onSubmit={save}><div className="editor-section-heading"><h2>Istruzioni di consegna</h2><span className="draft-badge">VERSIONE {data.version}{dirty?' · MODIFICHE NON SALVATE':''}</span></div><p className="editor-hint">Ultimo aggiornamento: {new Date(data.updatedAt).toLocaleDateString('it-IT')}</p><label>Testo delle istruzioni<textarea className="instructions-text" rows={32} value={text} onChange={e=>setText(e.target.value)} minLength={100} maxLength={60000} required disabled={busy}/></label><div className="editor-actions"><button disabled={busy||!dirty}>{busy?'Salvataggio…':'Salva istruzioni'}</button><button type="button" className="secondary" disabled={busy} onClick={()=>{if(!dirty||confirm('Ricaricare e abbandonare le modifiche non salvate?'))load();}}>Ricarica versione salvata</button></div></form>
 </>}
 </main>;
}
