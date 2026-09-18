'use client';
import {useEffect,useState} from 'react';
export default function Instructions(){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){setBusy(true);setError('');try{const r=await fetch('/api/editor/instructions',{cache:'no-store'}),x=await r.json();if(!r.ok)throw Error(x.error);setData(x);}catch(e){setError(e.message||'Istruzioni non disponibili.');}finally{setBusy(false);}}
 useEffect(()=>{load();},[]);
 return <main className="editor-main"><a className="editor-brand" href="/editor">JUMP <b>PRESS</b></a><p className="eyebrow">REDAZIONE · ISTRUZIONI</p><h1>Come preparare la rassegna</h1><p>Queste sono le istruzioni di consegna che ChatGPT legge da Jump Press a ogni esecuzione. Qui puoi consultarle e copiarle. Le modifiche sono consentite solo tramite il connettore.</p><a className="editor-return" href="/editor">← Torna alle bozze</a>
 <p className="editor-notice">L’automatismo prepara soltanto bozze. La pubblicazione richiede la richiesta esplicita di un editor sulla versione revisionata.</p>
 {error&&<p className="editor-error" role="alert">{error}</p>}
 {!data?<section className="editor-card"><p>{busy?'Caricamento istruzioni…':'Impossibile caricare le istruzioni.'}</p><button disabled={busy} onClick={load}>Riprova</button></section>:<section className="editor-card"><div className="editor-section-heading"><h2>Istruzioni di consegna</h2><span className="draft-badge">{data.localPreview?'ANTEPRIMA LOCALE · BASE VERSIONE':'VERSIONE'} {data.version} · SOLA LETTURA</span></div><p className="editor-hint">Ultimo aggiornamento: {new Date(data.updatedAt).toLocaleDateString('it-IT')}</p>{data.localPreview&&<p className="editor-notice">Procedura aggiornata solo in locale. Le istruzioni online non sono state modificate.</p>}<label>Prompt fisso dell’automatismo<textarea rows={3} value={data.automationPrompt} readOnly/></label><label>Testo delle istruzioni<textarea className="instructions-text" rows={32} value={data.text} readOnly/></label><div className="editor-actions"><button type="button" className="secondary" disabled={busy} onClick={load}>{busy?'Caricamento…':'Ricarica versione salvata'}</button></div></section>}
 </main>;
}
