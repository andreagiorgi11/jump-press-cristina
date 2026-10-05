'use client';
import {useState} from 'react';
import Link from 'next/link';
import WithdrawEdition from './WithdrawEdition';
import DeleteArchiveDraft from './DeleteArchiveDraft';
import TrashDialog from './TrashDialog';
const day=date=>new Date(date+'T12:00:00Z');
const fmt=options=>date=>new Intl.DateTimeFormat('it-IT',{...options,timeZone:'UTC'}).format(day(date));
const weekday=fmt({weekday:'long'}),dayNumber=fmt({day:'numeric'}),monthYear=fmt({month:'long',year:'numeric'}),fullDate=fmt({weekday:'long',day:'numeric',month:'long',year:'numeric'});
// Entries grouped by month, newest first (entries arrive already sorted).
function byMonth(entries){const groups=[];for(const e of entries){const key=e.date.slice(0,7),last=groups.at(-1);if(last?.key===key)last.entries.push(e);else groups.push({key,label:monthYear(e.date),entries:[e]});}return groups;}
export default function ArchiveEntries({entries,editor=false,unavailable=false}){
 const [filter,setFilter]=useState('all');
 const active=editor?filter:'all';
 const visible=entries.filter(e=>active==='all'||(active==='drafts'?e.draft:!e.draft));
 const count=entries.filter(e=>e.draft).length;
 return <>{editor&&<div className="archive-filters" role="group" aria-label="Filtra edizioni"><button type="button" aria-pressed={active==='all'} onClick={()=>setFilter('all')}>Tutte</button><button type="button" aria-pressed={active==='published'} onClick={()=>setFilter('published')}>Pubblicate</button><button type="button" aria-pressed={active==='drafts'} onClick={()=>setFilter('drafts')}>Bozze{!unavailable&&<span>{count}</span>}</button><button type="button" className="archive-trash-button" aria-haspopup="dialog" onClick={()=>window.dispatchEvent(new CustomEvent('jump-open-trash'))}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>Cestino</button></div>}
 {editor&&<TrashDialog/>}
 {byMonth(visible).map(group=><section className="archive-month" key={group.key} aria-label={group.label}>
  <h2 className="archive-month-heading">{group.label}<small>{group.entries.length===1?'1 edizione':group.entries.length+' edizioni'}</small></h2>
  <ol className="archive-cards">{group.entries.map(entry=>{const p=entry.preview;return <li className={'archive-entry'+(entry.draft?' is-draft':'')} key={entry.key}>
   <Link className="archive-card" href={entry.href} aria-label={(entry.draft?'Bozza del ':'Rassegna del ')+fullDate(entry.date)}>
    <span className="archive-card-day" aria-hidden="true"><small>{weekday(entry.date).slice(0,3)}</small><b>{dayNumber(entry.date)}</b></span>
    <span className="archive-card-body">
     <span className="archive-card-meta">{fullDate(entry.date)}{entry.draft?<strong className="archive-badge is-draft">Bozza</strong>:editor&&<strong className="archive-badge">Pubblicata</strong>}</span>
     <span className="archive-card-title">Rassegna stampa <em>Juventus</em></span>
     {p?.intro&&<span className="archive-card-intro">{p.intro}</span>}
     {p&&<span className="archive-card-tags"><span className="archive-card-count">{p.articles} articoli</span>{p.sections.map(s=><span key={s}>{s}</span>)}</span>}
     <span className="archive-card-action">{entry.draft?'Apri la bozza':'Leggi la rassegna'} <span aria-hidden="true">→</span></span>
    </span>
   </Link>
   {entry.editId&&<WithdrawEdition id={entry.editId} version={entry.editVersion} date={entry.date}/>} {entry.canDelete&&<DeleteArchiveDraft id={entry.key} version={entry.version} date={entry.date}/>}
  </li>;})}</ol>
 </section>)}
 {visible.length===0&&<p className="archive-empty" role="status">{unavailable?'Elenco non disponibile: riprova quando il servizio sarà ripristinato.':active==='drafts'?'Nessuna bozza da lavorare.':'Nessuna edizione presente.'}</p>}</>;
}
