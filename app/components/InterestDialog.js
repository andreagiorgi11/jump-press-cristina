'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './interest-dialog.css';

const groups={journalist:{title:'Giornalisti',hint:'Editoriali e commenti firmati da questi autori.',add:'Aggiungi giornalista'},subject:{title:'Persone e organizzazioni',hint:'Notizie, interviste e dichiarazioni sui protagonisti da seguire.',add:'Aggiungi persona o organizzazione'}};
function Icon({type}){
 const paths={people:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-4-5.65"/></>,search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,close:<path d="m6 6 12 12M18 6 6 18"/>,plus:<path d="M12 5v14M5 12h14"/>,trash:<><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></>,check:<path d="m5 12 4 4L19 6"/>};
 return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}
function InterestPanel({close,titleId}){
 const [data,setData]=useState(null),[entries,setEntries]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[conflict,setConflict]=useState(false);
 const [kind,setKind]=useState('journalist'),[query,setQuery]=useState(''),[pending,setPending]=useState('');
 const lock=useRef(false),closeButton=useRef(null),mounted=useRef(false),focused=useRef(false);
 const dirty=Boolean(data&&JSON.stringify(entries)!==JSON.stringify(data.entries));
 async function load(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/editor/interests',{cache:'no-store'}),x=await r.json();if(!r.ok)throw Error(x.error||'Elenco temporaneamente non disponibile.');if(!Array.isArray(x.entries))throw Error('Elenco non disponibile.');if(mounted.current){setData(x);setEntries(x.entries);setConflict(false);}}
  catch(e){if(mounted.current)setError(e.message+(data?' Gli ultimi dati caricati e le modifiche restano visibili.':''));}finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 async function save(){
  if(lock.current||!data||conflict)return;lock.current=true;setBusy(true);setError('');setNotice('');setPending('');
  try{const r=await fetch('/api/editor/interests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:data.version,entries})}),x=await r.json();if(!r.ok){if(r.status===409)setConflict(true);throw Error(x.error||'Salvataggio non confermato. Verifica la versione salvata prima di riprovare.');}setData(x);setEntries(x.entries);setNotice('Elenco salvato per le prossime rassegne.');}
  catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
 }
 function request(action){if(lock.current)return;if(dirty)setPending(action);else if(action==='close')close();else load();}
 function edit(index,key,value){setEntries(old=>old.map((entry,i)=>i===index?{...entry,[key]:value}:entry));setNotice('');setPending('');}
 useEffect(()=>{mounted.current=true;load();closeButton.current?.focus();return()=>{mounted.current=false;};},[]);
 useEffect(()=>{if(!busy&&!focused.current){closeButton.current?.focus();focused.current=true;}},[busy]);
 useEffect(()=>{const dialog=closeButton.current?.closest('dialog');const cancel=e=>{e.preventDefault();request('close');};dialog?.addEventListener('cancel',cancel);return()=>dialog?.removeEventListener('cancel',cancel);},[dirty]);
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const filtered=entries.map((entry,index)=>({entry,index})).filter(({entry})=>entry.kind===kind&&(!query.trim()||(entry.name+' '+entry.role).toLocaleLowerCase('it').includes(query.trim().toLocaleLowerCase('it'))));
 const counts={journalist:entries.filter(e=>e.kind==='journalist').length,subject:entries.filter(e=>e.kind==='subject').length};
 const canEdit=data?.canEdit&&!busy;
 return <>
  <header className="interest-header"><div className="interest-heading-icon"><Icon type="people"/></div><div className="interest-heading"><span className="interest-eyebrow">LE PRIORITÀ DELLA REDAZIONE</span><h2 id={titleId}>Persone di interesse</h2><p>Le firme e i protagonisti da tenere d’occhio.</p></div><button ref={closeButton} className="interest-icon-button interest-close" aria-label="Chiudi persone di interesse" disabled={busy} onClick={()=>request('close')}><Icon type="close"/></button></header>
  <div className="interest-toolbar"><div className="interest-tabs" role="tablist" aria-label="Tipi di interesse">{Object.entries(groups).map(([key,group])=><button key={key} id={titleId+'-'+key} role="tab" aria-selected={kind===key} aria-controls={titleId+'-panel'} tabIndex={kind===key?0:-1} className={kind===key?'is-active':''} onClick={()=>{setKind(key);setQuery('');}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'journalist':e.key==='End'?'subject':kind==='journalist'?'subject':'journalist';setKind(next);setQuery('');e.currentTarget.parentElement.querySelector('#'+CSS.escape(titleId+'-'+next))?.focus();}}}>{group.title}<span>{data?counts[key]:'—'}</span></button>)}</div><label className="interest-search"><Icon type="search"/><input type="search" aria-label="Cerca nell’elenco" placeholder="Cerca nome o ruolo…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
  <div className="interest-content" role="tabpanel" id={titleId+'-panel'} aria-labelledby={titleId+'-'+kind}>
   <div className="interest-section-intro"><p>{groups[kind].hint}</p>{data&&<span>{filtered.length} {filtered.length===1?'voce':'voci'}</span>}</div>
   {error&&<p className="interest-feedback is-error" role="alert">{error}</p>}{notice&&<p className="interest-feedback is-success" role="status"><Icon type="check"/>{notice}</p>}
   {!data?<div className="interest-empty"><Icon type="people"/><h3>{busy?'Caricamento dell’elenco…':'Elenco non disponibile'}</h3>{!busy&&<button className="interest-add" onClick={load}>Riprova</button>}</div>:<>
   <div className="interest-list">{filtered.map(({entry,index})=><div className="interest-person" key={index}><span className={'interest-avatar '+(entry.kind==='subject'?'is-subject':'')} aria-hidden="true">{entry.name.trim().split(/\s+/).filter(Boolean).map(word=>word[0]).slice(0,2).join('').toLocaleUpperCase('it')||'+'}</span><div className="interest-person-fields"><input className="interest-name" aria-label={'Nome completo '+(index+1)} placeholder="Nome completo" value={entry.name} maxLength={160} disabled={!canEdit} onChange={e=>edit(index,'name',e.target.value)}/><input className="interest-role" aria-label={'Ruolo o organizzazione '+(index+1)} placeholder="Ruolo o organizzazione" value={entry.role} maxLength={160} disabled={!canEdit} onChange={e=>edit(index,'role',e.target.value)}/></div>{data.canEdit&&<button className="interest-icon-button interest-remove" disabled={busy} title={'Rimuovi '+(entry.name||'voce')} aria-label={'Rimuovi '+(entry.name||'voce '+(index+1))} onClick={()=>{setEntries(old=>old.filter((_,i)=>i!==index));setNotice('');setPending('');}}><Icon type="trash"/></button>}</div>)}</div>
   {!filtered.length&&<div className="interest-empty"><Icon type="search"/><h3>{query?'Nessun risultato':'Un elenco da costruire'}</h3><p>{query?'Prova con un altro nome o ruolo.':'Aggiungi il primo nome da seguire.'}</p></div>}
   {data.canEdit&&<button className="interest-add" disabled={busy||entries.length>=100} onClick={()=>{setEntries(old=>[...old,{kind,name:'',role:''}]);setQuery('');setNotice('');setPending('');}}><Icon type="plus"/>{groups[kind].add}</button>}
   {conflict&&<label className="interest-conflict">Copia delle modifiche da conservare<textarea readOnly rows={5} value={entries.map(e=>e.name+' — '+e.role).join('\n')}/></label>}
   </>}
  </div>
  <footer className="interest-footer">{pending?<div className="interest-discard" role="alert"><div><strong>Ci sono modifiche non salvate.</strong><p>{pending==='close'?'Vuoi chiudere e scartarle?':'Ricaricando perderai le modifiche. Continuare?'}</p></div><button className="interest-secondary" onClick={()=>setPending('')}>Continua a modificare</button><button className="interest-discard-button" onClick={()=>{const action=pending;setPending('');if(action==='close')close();else load();}}>{pending==='close'?'Scarta e chiudi':'Scarta e ricarica'}</button></div>:<><div className="interest-footer-note"><span className={'interest-status-dot '+(dirty?'is-dirty':'')}/><div><strong>{dirty?'Modifiche da salvare':data?'Elenco aggiornato':'Priorità editoriali'}</strong><p>Si applica alle prossime rassegne.{data&&' · Versione '+data.version}</p></div></div><div className="interest-footer-actions"><button className="interest-secondary" disabled={busy} onClick={()=>request('reload')}>Ricarica</button>{data?.canEdit&&<button className="interest-save" disabled={busy||!dirty||conflict} onClick={save}><Icon type="check"/>{busy?'Salvataggio…':'Salva elenco'}</button>}</div></>}</footer>
 </>;
}
export default function InterestDialog({openOnMount=false}){
 const dialog=useRef(null),trigger=useRef(null),titleId=useId();
 const [active,setActive]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{setReady(true);},[]);
 useEffect(()=>{if(!ready)return;const open=()=>{if(dialog.current.open)return;trigger.current=document.activeElement;dialog.current.showModal();setActive(true);};window.addEventListener('jump-open-interests',open);if(openOnMount)open();return()=>window.removeEventListener('jump-open-interests',open);},[openOnMount,ready]);
 useEffect(()=>{if(!active)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[active]);
 return ready?createPortal(<dialog ref={dialog} className="interest-dialog" aria-labelledby={titleId} onClose={()=>{setActive(false);trigger.current?.focus();}} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.dispatchEvent(new Event('cancel',{cancelable:true}));}}>{active&&<InterestPanel titleId={titleId} close={()=>dialog.current.close()}/>}</dialog>,document.body):null;
}
