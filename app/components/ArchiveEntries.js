'use client';
import {useState} from 'react';
import Link from 'next/link';
import WithdrawEdition from './WithdrawEdition';
import DeleteArchiveDraft from './DeleteArchiveDraft';
export default function ArchiveEntries({entries,editor=false,unavailable=false}){
 const [filter,setFilter]=useState('all');
 const active=editor?filter:'all';
 const visible=entries.filter(e=>active==='all'||(active==='drafts'?e.draft:!e.draft));
 const count=entries.filter(e=>e.draft).length;
 return <>{editor&&<div className="archive-filters" role="group" aria-label="Filtra edizioni"><button type="button" aria-pressed={active==='all'} onClick={()=>setFilter('all')}>Tutte</button><button type="button" aria-pressed={active==='published'} onClick={()=>setFilter('published')}>Pubblicate</button><button type="button" aria-pressed={active==='drafts'} onClick={()=>setFilter('drafts')}>Bozze{!unavailable&&<span>{count}</span>}</button></div>}
<div className="archivegrid">{visible.map(entry=><div className="archive-entry" key={entry.key}><Link className="archivecard" href={entry.href}><small>{new Intl.DateTimeFormat('it-IT',{dateStyle:'long',timeZone:'UTC'}).format(new Date(entry.date+'T12:00:00Z'))}{editor&&!entry.draft&&<strong className="archive-published-label">PUBBLICATA</strong>}{entry.draft&&<strong style={{color:'#a6202b',marginLeft:10}}>BOZZA</strong>}</small><b>Rassegna stampa Juventus</b><span>{entry.draft?'Apri la bozza →':'Leggi l’edizione →'}</span></Link>{entry.editId&&<WithdrawEdition id={entry.editId} version={entry.editVersion} date={entry.date}/>} {entry.canDelete&&<DeleteArchiveDraft id={entry.key} version={entry.version} date={entry.date}/>}</div>)}</div>
{visible.length===0&&<p role="status">{unavailable?'Elenco non disponibile: riprova quando il servizio sarà ripristinato.':active==='drafts'?'Nessuna bozza da lavorare.':'Nessuna edizione presente.'}</p>}</>;
}
