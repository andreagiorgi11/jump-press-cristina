'use client';
import {useEffect,useRef,useState} from 'react';
const labels={read_editorial_instructions:'Lettura istruzioni',read_source_text:'Lettura testo',read_source_text_batch:'Lettura testo',read_source_page:'Immagine originale',read_source_pages:'Immagini originali',read_clip_page:'Immagine ritaglio',read_clip_pages:'Immagini ritagli',save_draft:'Salvataggio bozza',read_draft:'Lettura bozza',update_articles:'Correzione articoli',import_source_url:'Importazione fonte',claim_automation_run:'Avvio esecuzione',renew_automation_run:'Aggiornamento fase',finish_automation_run:'Conclusione esecuzione'};
const count=n=>new Intl.NumberFormat('it-IT').format(n||0);
const duration=n=>n==null?'Non disponibile':(n/1000).toLocaleString('it-IT',{maximumFractionDigits:2})+' s';
const time=s=>s?new Date(s).toLocaleTimeString('it-IT',{timeZone:'Europe/Rome',hour12:false}):'—';
export default function Activity(){
 const [date,setDate]=useState(''),[run,setRun]=useState(''),[report,setReport]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);const pending=useRef(null);
 async function load(day,id=''){
  pending.current?.abort();const controller=new AbortController();pending.current=controller;setLoading(true);setError('');
  try{const response=await fetch('/api/editor/activity?date='+encodeURIComponent(day)+(id?'&runId='+encodeURIComponent(id):''),{cache:'no-store',signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.error||'Registro temporaneamente non disponibile.');if(pending.current===controller)setReport(data);}
  catch(e){if(e.name!=='AbortError'&&pending.current===controller)setError(e.message);}
  finally{if(pending.current===controller)setLoading(false);}
 }
 useEffect(()=>{const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());setDate(today);load(today);return()=>pending.current?.abort();},[]);
 return <main style={{maxWidth:1100,margin:'2rem auto',padding:'0 1rem'}}>
  <a href="/editor">← Redazione</a><h1>Attività dell’automatismo</h1>
  <p>Tempi e richieste osservati da Jump Press, senza operazioni aggiuntive per GPT. Orari italiani. Questi dati non misurano token o crediti.</p>
  <form onSubmit={e=>{e.preventDefault();load(date,run);}} style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end'}}>
   <label>Giorno<br/><input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label>Esecuzione (facoltativa)<br/><input value={run} onChange={e=>setRun(e.target.value)} placeholder="Identificativo esecuzione"/></label>
   <button disabled={loading}>{loading?'Caricamento…':'Aggiorna'}</button>
  </form>
  {error&&<p role="alert">{error} {report?'Rimangono visibili gli ultimi dati letti correttamente, del '+report.date+'.':''}</p>}
  {report&&<>
   <h2>Osservazione del {report.date}</h2>
   <p>{report.availability==='no_traces_observed'?'Nessuna traccia disponibile: non dimostra che non ci sia stata attività.':'Cronologia disponibile per '+count(report.traces)+' richieste e attività in background.'} La registrazione riguarda soltanto il periodo successivo alla sua attivazione.</p>
   <p>Le chiamate senza identificativo di esecuzione ({count(report.unassignedTraces)}) restano separate e sono visibili togliendo il filtro. Gli intervalli senza attività osservata possono comprendere ragionamento, scrittura, attese della piattaforma o registrazioni mancanti.</p>
   {!!report.warnings.length&&<p role="alert">Ci sono tracce incomplete: i totali osservati non descrivono tutta l’attività.</p>}
   <table><caption>Quantità osservate</caption><tbody>
    {[
     ['Letture delle istruzioni',count(report.totals.instructionCalls)],['Caratteri delle risposte con istruzioni',count(report.totals.instructionResponseCharacters)],
     ['Caratteri di tutte le risposte testuali',count(report.totals.responseTextCharacters)],['Caratteri del testo sorgente',count(report.totals.sourceTextCharacters)],
     ['Pagine di testo / ripetizioni',count(report.totals.uniqueTextPages)+' / '+count(report.totals.repeatedTextPages)],['Immagini restituite / ripetizioni',count(report.totals.imageCount)+' / '+count(report.totals.repeatedImages)],
     ['Ritagli creati / riutilizzati',count(report.totals.clipsCreated)+' / '+count(report.totals.clipsReused)],['Tempo con attività server osservata',duration(report.totals.serverObservedMs)],['Intervalli non osservabili',duration(report.totals.nonObservableMs)]
    ].map(([label,value])=><tr key={label}><th scope="row" style={{textAlign:'left',padding:'4px 18px 4px 0'}}>{label}</th><td>{value}</td></tr>)}
   </tbody></table>
   <p>I tempi sovrapposti non sono sommati. I caratteri includono le ripetizioni; non equivalgono ai token fatturati. Le immagini richieste non provano che GPT le abbia esaminate.</p>
   <a href={'/api/editor/activity?date='+report.date+(report.runId?'&runId='+report.runId:'')} download={'attivita-'+report.date+'.json'}>Scarica il registro completo JSON</a>
   <h2>Cronologia</h2>
   {report.calls.map(c=><details key={c.traceId} style={{padding:'10px 0',borderBottom:'1px solid #bbb'}}>
    <summary>{time(c.start)}–{time(c.end)} · {labels[c.tool]||c.tool||(c.kind==='background'?'Attività in background':'Richiesta al collegamento')} · {duration(c.durationMs)} · {c.outcome==='ok'?'conclusa':c.outcome==='error'?'errore':'incompleta'}</summary>
    <p>Esecuzione: {c.identity.runId||'non associata'} · Fase: {c.identity.phase||'non indicata'}</p>
    <ol>{c.events.filter(e=>['span.end','tool.result','tool.error','clip.reused','retry'].includes(e.event)).map(e=><li key={e.sequence}>{time(e.at)} · {e.operation||e.event}{e.durationMs!=null?' · '+duration(e.durationMs):''}{e.pages?.length?' · pagine '+e.pages.join(', '):''}{e.responseTextCharacters!=null?' · '+count(e.responseTextCharacters)+' caratteri, '+count(e.imageCount)+' immagini':''}{e.status?' · esito '+e.status:''}</li>)}</ol>
   </details>)}
   {!!report.gaps.length&&<><h2>Intervalli non osservabili</h2><ul>{report.gaps.map(g=><li key={g.start}>{time(g.start)}–{time(g.end)} · {duration(g.durationMs)}</li>)}</ul></>}
  </>}
 </main>;
}
