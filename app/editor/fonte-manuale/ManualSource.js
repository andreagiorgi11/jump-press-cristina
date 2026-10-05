'use client';
import {useEffect,useRef,useState} from 'react';
import './manual-source.css';
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());
async function api(body,query=''){const r=await fetch('/api/editor/manual-source'+query,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'}),x=await r.json();if(!r.ok)throw Error(x.error||'Servizio non disponibile.');return x;}
const labels={uploading:'Caricamento da completare',processing:'Preparazione dei PDF',ready:'PDF pronti',failed:'Preparazione interrotta'};
export default function ManualSource({embedded=false,onBusyChange,onClose,titleId}){
 const [date,setDate]=useState(today),[files,setFiles]=useState([]),[source,setSource]=useState(null),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const alive=useRef(true),lock=useRef(false);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
 async function refresh(){try{const x=await api(null,'?date='+date);setSource(x);setLoaded(true);setError('');return x;}catch(e){setError(e.message);throw e;}}
 useEffect(()=>{let valid=true;setLoaded(false);setSource(null);setFiles([]);setMessage('');api(null,'?date='+date).then(x=>{if(valid){setSource(x);setLoaded(true);setError('');}}).catch(e=>{if(valid)setError(e.message);});return()=>{valid=false;};},[date]);
 useEffect(()=>{if(!busy&&(!files.length||source?.notification?.status==='sent'))return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[busy,files.length,source?.notification?.status]);
 async function waitReady(id){for(let i=0;i<50;i++){const x=await api(null,'?id='+id);if(!alive.current)return null;setSource(x);if(x.status==='ready')return x;if(x.status==='failed')throw Error(x.error);await new Promise(resolve=>setTimeout(resolve,Math.min(2000+i*500,6000)));}throw Error('La preparazione continua. Premi Ricontrolla per leggere l’esito.');}
 async function notify(id){await api({action:'notify',id});setSource(await api(null,'?id='+id));setMessage('Rassegna inviata. La mail avvia GPT per preparare la bozza: puoi seguirne l’attività.');}
 async function start(){if(lock.current||!loaded)return;lock.current=true;setBusy(true);setError('');setMessage('');try{
  if(source?.status==='ready'){await notify(source.importId);return;}
  if(source?.status==='processing'){const x=await waitReady(source.importId);if(x)await notify(x.importId);return;}
  if(!files.length)throw Error('Aggiungi i PDF della rassegna.');
  const id=source?.importId||crypto.randomUUID(),prepared=await api({action:'prepare',input:{id,date,files:files.map(f=>({name:f.name,size:f.size}))}});setSource(prepared);
  for(let i=0;i<files.length;i++){setMessage('Caricamento '+(i+1)+' di '+files.length+': '+files[i].name);const r=await fetch(prepared.uploads[i].uploadUrl,{method:'PUT',headers:{'Content-Type':'application/pdf'},body:files[i]});if(!r.ok&&r.status!==409)throw Error('Caricamento non riuscito. I PDF già trasferiti sono conservati.');}
  setMessage('PDF caricati. Preparazione della rassegna…');setSource(await api({action:'finalize',id}));const ready=await waitReady(id);if(ready)await notify(id);
 }catch(e){setError(e.message);}finally{lock.current=false;if(alive.current)setBusy(false);}}
 function addFiles(e){const added=Array.from(e.target.files||[]);setFiles(old=>{if(source)return added;const next=[...old];for(const file of added)if(!next.some(f=>f.name===file.name&&f.size===file.size&&f.lastModified===file.lastModified))next.push(file);return next;});e.target.value='';}
 function move(i,delta){setFiles(xs=>{const copy=[...xs];[copy[i],copy[i+delta]]=[copy[i+delta],copy[i]];return copy;});}
 const sent=source?.notification?.status==='sent',frozen=busy||!!source,complete=source?.status==='ready'||source?.status==='processing';
 return <section className={'manual-source-page'+(embedded?' is-dialog':'')}>
  <header className="manual-header"><div><p className="manual-eyebrow">REDAZIONE</p><h1 id={titleId}>Rassegna manuale</h1><p>Carica i PDF nell’ordine desiderato. Invia rassegna manda la mail e avvia GPT, che preparerà la bozza.</p></div>{embedded?<button className="manual-close" aria-label="Chiudi rassegna manuale" disabled={busy} onClick={onClose}>×</button>:<a href="/editor">Torna alla rassegna</a>}</header>
  <div className="manual-content">
   <label className="manual-date">Data della rassegna<input type="date" value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label>
   <label className={'manual-upload'+((busy||complete)?' is-disabled':'')}><span aria-hidden="true">＋</span><strong>{source?'Seleziona di nuovo gli stessi PDF':'Aggiungi PDF'}</strong><small>Puoi selezionare più documenti e aggiungerne altri.</small><input type="file" aria-label="Aggiungi PDF alla rassegna" accept="application/pdf,.pdf" multiple disabled={busy||complete} onChange={addFiles}/></label>
   {files.length>0&&<><p className="manual-count">{files.length} PDF · {(files.reduce((n,f)=>n+f.size,0)/1048576).toFixed(1)} MB</p><ol className="manual-files">{files.map((f,i)=><li key={f.name+':'+i}><span className="manual-file-number">{i+1}</span><span className="manual-file-name">{f.name}<small>{(f.size/1048576).toFixed(1)} MB</small></span><button disabled={frozen||i===0} onClick={()=>move(i,-1)} aria-label={'Sposta su '+f.name}>↑</button><button disabled={frozen||i===files.length-1} onClick={()=>move(i,1)} aria-label={'Sposta giù '+f.name}>↓</button><button disabled={frozen} onClick={()=>setFiles(xs=>xs.filter((_,j)=>j!==i))} aria-label={'Rimuovi '+f.name}>×</button></li>)}</ol></>}
   {source&&<section className="manual-state" aria-label="Stato rassegna"><strong>{sent?'Rassegna inviata':labels[source.status]||source.status}</strong>{!files.length&&source.sections?.map((s,i)=><p key={i}>{s.name}</p>)}{source.pageCount>0&&<p>{source.pageCount} pagine pronte per GPT.</p>}{sent&&<a href="/editor/attivita">Segui l’attività di GPT →</a>}{['uploading','failed'].includes(source.status)&&<p>Per riprendere seleziona gli stessi PDF, nello stesso ordine.</p>}</section>}
   {message&&<p role="status" className="manual-feedback">{message}</p>}{error&&<p role="alert" className="manual-error">{error}</p>}
   <details className="manual-limits"><summary>Requisiti dei PDF</summary><p>50 MB per PDF, 200 MB complessivi, massimo 1000 pagine. Serve testo selezionabile. I documenti restano privati.</p></details>
  </div>
  <footer className="manual-footer"><p>GPT crea una bozza. La pubblicazione resta alla redazione.</p><div className="manual-actions"><button disabled={busy} onClick={()=>refresh().catch(()=>{})}>Ricontrolla</button><button className="manual-send" disabled={busy||!loaded||sent||(!files.length&&!complete)} onClick={start}>{busy?'Invio in corso…':sent?'Rassegna inviata':'Invia rassegna'}</button></div></footer>
 </section>;
}
