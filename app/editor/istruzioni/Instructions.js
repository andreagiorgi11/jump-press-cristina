'use client';
import {useEffect,useState} from 'react';
import {splitInterestList,mergeGeneralPreferences} from '../../../lib/interest-list';
export default function Instructions(){
 const [data,setData]=useState(null),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const dirty=data&&text!==splitInterestList(data.preferences.text).general;
 async function load(){
  if(dirty&&!window.confirm('Ricaricare scarta le preferenze non salvate. Vuoi continuare?'))return;
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/editor/instructions',{cache:'no-store'}),x=await r.json();if(!r.ok)throw Error(x.error);const general=splitInterestList(x.preferences.text).general;setData(x);setText(general);}
  catch(e){setError(e.message||'Istruzioni e preferenze non disponibili. Gli ultimi dati caricati restano visibili.');}finally{setBusy(false);}
 }
 async function save(){
  if(!window.confirm('Confermi queste preferenze per tutte le prossime rassegne?'))return;
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/editor/preferences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:data.preferences.version,text:mergeGeneralPreferences(text,data.preferences.text),confirmation:'SALVA_PREFERENZE'})}),x=await r.json();if(!r.ok)throw Error(x.error||'Salvataggio non confermato: conserva il testo e verifica la versione salvata prima di riprovare.');setData(d=>({...d,preferences:x}));setText(splitInterestList(x.text).general);setNotice('Preferenze salvate per le prossime rassegne.');}
  catch(e){setError(e.message||'Salvataggio non confermato. Il testo inserito è conservato: verifica la versione salvata prima di riprovare.');}finally{setBusy(false);}
 }
 useEffect(()=>{load();},[]);
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 return <main className="editor-main"><a className="editor-brand" href="/editor">JUMP <b>PRESS</b></a><p className="eyebrow">REDAZIONE · ISTRUZIONI E PREFERENZE</p><h1>Istruzioni e preferenze</h1><p>Le istruzioni di base sono fisse e consultabili. Le preferenze della redazione si modificano qui e vengono lette da GPT a ogni nuova lavorazione, insieme alle regole di base.</p><a className="editor-return" href="/editor" onClick={e=>{if(dirty&&!window.confirm('Uscire senza salvare le preferenze?'))e.preventDefault();}}>← Torna alle bozze</a>
 {error&&<p className="editor-error" role="alert">{error}</p>}{notice&&<p className="editor-notice" role="status">{notice}</p>}
 {!data?<section className="editor-card"><p>{busy?'Caricamento…':'Impossibile caricare istruzioni e preferenze.'}</p><button disabled={busy} onClick={load}>Riprova</button></section>:<>
 <section className="editor-card"><h2>Preferenze della redazione</h2><p>Indicazioni permanenti su fonti, firme, stile e priorità. Si applicano alle prossime rassegne; non modificano quelle già salvate e non possono derogare alle istruzioni di base. Per una correzione occasionale modifica soltanto la bozza.</p><p className="editor-hint">{data.preferences.updatedAt?'Versione '+data.preferences.version+' · '+new Date(data.preferences.updatedAt).toLocaleString('it-IT')+' · '+data.preferences.updatedBy:'Nessuna preferenza permanente salvata.'}</p>
 <p><a className="editor-return" href="/editor/persone" onClick={e=>{if(dirty&&!window.confirm('Uscire senza salvare le preferenze?'))e.preventDefault();}}>Modifica persone di interesse →</a></p><label>Preferenze per le prossime rassegne<textarea rows={10} maxLength={20000} value={text} readOnly={!data.canEditPreferences} disabled={busy} onChange={e=>setText(e.target.value)}/></label>
 <div className="editor-actions">{data.canEditPreferences&&<button disabled={busy||!dirty} onClick={save}>Salva preferenze</button>}<button className="secondary" disabled={busy} onClick={load}>Ricarica versione salvata</button></div>{dirty&&<p className="editor-hint">Modifiche non salvate. Prima di ricaricare, copia il testo se vuoi conservarlo.</p>}</section>
 <section className="editor-card"><h2>Istruzioni di base</h2><span className="draft-badge">VERSIONE {data.version} · SOLA LETTURA</span><p>Non modificabili dagli editor né dal connettore GPT.</p><label>Testo delle istruzioni<textarea className="instructions-text" rows={24} value={data.baseText} readOnly/></label><label>Gestione delle preferenze durante le modifiche<textarea rows={8} value={data.preferencePolicy} readOnly/></label></section></>}
 </main>;
}
