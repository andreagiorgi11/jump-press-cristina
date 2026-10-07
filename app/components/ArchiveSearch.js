'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import Link from 'next/link';
import {formatDate} from '../../lib/i18n';
import {archivePeriod} from '../../lib/archive-period';

export default function ArchiveSearch({lang='it'}){
 const [open,setOpen]=useState(false),en=lang==='en';
 return <><button type="button" className="archive-search-open" aria-haspopup="dialog" onClick={()=>setOpen(true)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>{en?'Search articles':'Cerca articoli'}</button>{open&&<SearchDialog lang={lang} onClose={()=>setOpen(false)}/>}</>;
}
function SearchDialog({lang,onClose}){
 const en=lang==='en',id=useId(),dialog=useRef(null),input=useRef(null),request=useRef(null),timer=useRef(null);
 const [selected,setSelected]=useState(new Set()),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
 const [titleOnly,setTitleOnly]=useState(false);
 const [period,setPeriod]=useState('day');
 const [from,setFrom]=useState(''),[to,setTo]=useState('');
 const [query,setQuery]=useState(''),[groups,setGroups]=useState([]),[resultQuery,setResultQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[unavailable,setUnavailable]=useState(0),[progress,setProgress]=useState(null);
 useEffect(()=>{dialog.current.showModal();input.current.focus();return ()=>request.current?.abort();},[]);
 const search=useCallback(async(event)=>{
  event?.preventDefault();clearTimeout(timer.current);const term=query.trim();if(term.length<2||!dialog.current?.querySelector('form')?.checkValidity())return;
  request.current?.abort();const controller=new AbortController();request.current=controller;
  setBusy(true);setError('');setProgress(null);
  const range=archivePeriod(period)||{from,to};
  let offset=0,revision,found=[],missing=0;
  try{do{
   const params=new URLSearchParams({q:term,lang,...range,titleOnly:String(titleOnly),offset:String(offset)});if(revision)params.set('revision',revision);
   const response=await fetch('/api/archive-search?'+params,{signal:controller.signal,cache:'no-store'}),data=await response.json();
   if(!response.ok)throw Error(en?'Search could not be completed. Please search again.':data.error||'Ricerca non disponibile. Riprova.');
   if(controller.signal.aborted)return;
   if(offset===0){setSelected(new Set());setExportError('');}
   found=[...found,...data.groups];missing+=data.unavailable;setGroups(found);setResultQuery(term);setUnavailable(missing);setProgress({scanned:data.scanned,total:data.total});
   offset=data.nextOffset;revision=data.revision;
  }while(offset!==null);
  }catch(e){if(!controller.signal.aborted)setError(e.message);}
  finally{if(request.current===controller)setBusy(false);}
 },[query,lang,period,from,to,titleOnly,en]);
 useEffect(()=>{
  request.current?.abort();request.current=null;setBusy(false);
  if(query.trim().length<2){setGroups([]);setResultQuery('');setSelected(new Set());setError('');setExportError('');setUnavailable(0);setProgress(null);return;}
  timer.current=setTimeout(()=>search(),1000);
  return ()=>{clearTimeout(timer.current);request.current?.abort();request.current=null;};
 },[search,query]);
 function toggle(key){setSelected(previous=>{const next=new Set(previous);next.has(key)?next.delete(key):next.add(key);return next;});}
 async function viewPdf(){
  if(exporting||!selected.size)return;setExportError('');
  const preview=window.open('about:blank','_blank');
  if(!preview){setExportError(en?'Allow pop-ups to view the PDF.':'Consenti l’apertura delle finestre per visualizzare il PDF.');return;}
  preview.opener=null;preview.document.title=en?'Preparing PDF':'Preparazione PDF';preview.document.body.textContent=en?'Preparing your PDF…':'Preparazione del PDF…';
  setExporting(true);
  try{
   const chosen=groups.map(g=>({date:g.date,status:g.status,sourceId:g.sourceId,sourceVersion:g.sourceVersion,contentRevision:g.contentRevision,language:g.language,articleIds:g.articles.filter(a=>selected.has(g.key+':'+a.id)).map(a=>a.id)})).filter(g=>g.articleIds.length);
   const response=await fetch('/api/archive-search/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang,groups:chosen})});
   if(!response.ok){const data=await response.json();throw Error(data.error||'PDF non disponibile.');}
   const url=URL.createObjectURL(await response.blob());
   if(preview.closed){URL.revokeObjectURL(url);return;}
   preview.location.replace(url);
   const cleanup=setInterval(()=>{if(preview.closed){URL.revokeObjectURL(url);clearInterval(cleanup);}},5000);
  }catch(e){preview.close();setExportError(e.message);}finally{setExporting(false);}
 }
 const count=groups.reduce((n,g)=>n+g.articles.length,0);
 return <dialog ref={dialog} className="archive-search-dialog" aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose();}}>
  <div className="archive-search-heading"><h2 id={id}>{en?'Search articles':'Cerca articoli'}</h2><button type="button" className="archive-search-close" aria-label={en?'Close':'Chiudi'} onClick={onClose}>×</button></div>
  <p className="archive-search-help">{en?'Search a name or phrase in titles, summaries and authors. Drafts are included only for editorial staff.':'Cerca un nome o una frase nei titoli, nelle sintesi e negli autori. Le bozze sono visibili solo alla redazione.'}</p>
  <form className="archive-search-form" onSubmit={search}><div className={"archive-search-fields"+(period==='custom'?' is-custom':'')}><div className="archive-search-query"><label htmlFor={id+'-query'}>{en?'Name or keywords':'Nome o parole da cercare'}</label><div><input ref={input} id={id+'-query'} autoFocus type="search" required minLength={2} maxLength={100} value={query} placeholder={en?'e.g. Spalletti':'Es. Spalletti'} onChange={e=>setQuery(e.target.value)}/></div></div><div className="archive-search-period-choice"><label>{en?'Period':'Periodo'}<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="day">{en?'Last day':'Ultimo giorno'}</option><option value="twoDays">{en?'Last two days':'Ultimi due giorni'}</option><option value="week">{en?'Last week':'Ultima settimana'}</option><option value="month">{en?'Last month':'Ultimo mese'}</option><option value="custom">{en?'Custom':'Personalizzato'}</option></select></label>{period==='custom'&&<div className="archive-search-period"><label>{en?'From':'Dal'}<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label><label>{en?'To':'Al'}<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label></div>}</div><button type="submit" disabled={query.trim().length<2}>{en?'Search':'Cerca'}</button></div><label className="archive-search-title-only"><input type="checkbox" checked={titleOnly} onChange={e=>setTitleOnly(e.target.checked)}/>{en?'Titles only':'Solo nel titolo'}</label></form>
  <div className="archive-search-status" role="status">{busy?(en?'Searching':'Ricerca in corso')+(progress?' · '+progress.scanned+' / '+progress.total:'')+'…':resultQuery&&!error?(en?`${count} articles for “${resultQuery}”`:`${count} articoli per “${resultQuery}”`):null}</div>
  {error&&<p className="archive-search-error" role="alert">{error}{resultQuery&&(en?' Results already found are kept below.':' I risultati già trovati restano qui sotto.')}</p>}
  {unavailable>0&&<p className="archive-search-error" role="alert">{en?'Some editions could not be read. Results may be incomplete.':'Alcune rassegne non sono leggibili al momento. I risultati potrebbero essere incompleti.'}</p>}
  {resultQuery&&groups.length>0&&<div className="archive-selection-bar"><span>{selected.size} {en?'selected':'selezionati'}</span><button type="button" disabled={!selected.size||busy||exporting} onClick={viewPdf}>{exporting?(en?'Preparing PDF…':'Preparazione PDF…'):(en?'View selected in PDF':'Visualizza selezionati in PDF')}</button>{selected.size>0&&<button type="button" disabled={exporting} onClick={()=>setSelected(new Set())}>{en?'Clear':'Deseleziona'}</button>}</div>}
  {exportError&&<p className="archive-search-error" role="alert">{exportError}</p>}
  {resultQuery&&<div className="archive-search-results" aria-label={(en?'Results for ':'Risultati per ')+resultQuery}>
   {groups.map(group=><section key={group.key} className="archive-search-group"><h3><time dateTime={group.date}>{formatDate(lang,group.date,{day:'numeric',month:'long',year:'numeric'})}</time><span className={'archive-badge'+(group.status==='draft'?' is-draft':'')}>{group.status==='draft'?(en?'Draft':'Bozza'):(en?'Published':'Pubblicata')}</span></h3><ul>{group.articles.map(article=><li key={article.id} className="archive-selectable-result"><input type="checkbox" aria-label={(en?'Select article: ':'Seleziona articolo: ')+article.title} checked={selected.has(group.key+':'+article.id)} disabled={exporting} onChange={()=>toggle(group.key+':'+article.id)}/><div><Link href={article.href} onClick={onClose}>{article.title}</Link><small>{[article.outlet,article.author].filter(Boolean).join(' · ')}{en&&group.language==='it'?' · IT':''}</small><p>{article.summary}</p></div></li>)}</ul></section>)}
   {!busy&&!error&&!unavailable&&!count&&<p>{en?'No articles found. Try another name.':'Nessun articolo trovato. Prova un altro nome.'}</p>}
  </div>}
 </dialog>;
}
