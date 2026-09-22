'use client';
import {useCallback,useRef,useState} from 'react';
import PdfPreview from './PdfPreview';
import PdfSectionPicker from './PdfSectionPicker';
function Icon({kind}){
 const paths={today:<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,archive:<><rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v12h14V8M9 12h6"/></>,download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,refresh:<><path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></>,menu:<path d="M4 6h16M4 12h16M4 18h16"/>,close:<path d="m6 6 12 12M18 6 6 18"/>};
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}
export default function ExportPage({date,live=false,pdfEndpoint,summaryAvailable=true,coverageStats}){
 const editionDate=new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
 const [pdf,setPdf]=useState(false),[menuOpen,setMenuOpen]=useState(false);
 const [picker,setPicker]=useState(false),[sections,setSections]=useState(null);
 const [includeClips,setIncludeClips]=useState(false);
 const [savedSections,setSavedSections]=useState(null),[savedClips,setSavedClips]=useState(false);
 const rememberChoice=useCallback((selected,clips)=>{setSavedSections(selected);setSavedClips(clips);},[]);
 const archive=useRef(null),toggle=useRef(null),pdfTrigger=useRef(null);
 const closeMenu=()=>{setMenuOpen(false);toggle.current?.focus();};
 const openPdf=(kind,event)=>{pdfTrigger.current=menuOpen?toggle.current:event.currentTarget;setMenuOpen(false);if(kind==='edition')setPicker(true);else{setSections(null);setIncludeClips(false);setPdf(kind);}};
 const refresh=()=>{const url=new URL(window.location.href);url.searchParams.set('v',Date.now().toString());window.location.replace(url.href);};
 return <>
 <aside className={`summary-sidebar${menuOpen?' is-open':''}`} onKeyDown={event=>{if(event.key==='Escape'&&menuOpen){event.preventDefault();closeMenu();}}}>
  <div className="summary-sidebar-heading"><div className="summary-sidebar-client"><span>RASSEGNA STAMPA</span><strong>Juventus</strong></div><button ref={toggle} className="summary-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="summary-sidebar-menu" aria-label={menuOpen?'Chiudi menu':'Apri menu'} onClick={()=>setMenuOpen(!menuOpen)}><Icon kind={menuOpen?'close':'menu'}/></button></div>
  <div className="summary-sidebar-menu" id="summary-sidebar-menu">

   <nav aria-label="Navigazione rassegna"><p className="summary-nav-label">LEGGI</p><a className="summary-nav-item is-active" href="#rassegna-oggi" aria-current="page" onClick={()=>setMenuOpen(false)}><Icon kind="today"/><span>Rassegna di oggi</span></a><button className="summary-nav-item" type="button" onClick={()=>{if(menuOpen)closeMenu();if(live)window.location.assign('/archivio');else archive.current.showModal();}}><Icon kind="archive"/><span>Archivio</span></button><button className="summary-nav-item" type="button" onClick={refresh}><Icon kind="refresh"/><span>Aggiorna pagina</span></button></nav>
   <nav className="summary-downloads" aria-label="Scarica i PDF"><p className="summary-nav-label">SCARICA</p><button type="button" className="summary-nav-item" disabled={!summaryAvailable} title={summaryAvailable?'Apri Summary':'Summary non presente in questa edizione'} onClick={event=>openPdf('summary',event)}><Icon kind="download"/><span>Summary PDF<small>La giornata in sintesi</small></span></button><button type="button" className="summary-nav-item" onClick={event=>openPdf('edition',event)}><Icon kind="download"/><span>Rassegna PDF<small>Tutti gli articoli selezionati</small></span></button></nav>
   {coverageStats&&<section className="sidebar-coverage" aria-label="Numeri della copertura"><h2>LA COPERTURA</h2><dl>{[
 [coverageStats.examined,'Voci esaminate'],[coverageStats.selected,'Pezzi selezionati'],[coverageStats.frontPages,'Prime pagine verificate'],[coverageStats.frontPages===null?null:coverageStats.juventus,'Con richiamo Juventus'],[coverageStats.sports===null?null:coverageStats.sportsJuventus+' / '+coverageStats.sports,'Sportivi con Juventus'],[coverageStats.frontPages===null?null:coverageStats.frontPages-coverageStats.juventus,'Senza richiamo Juventus']
 ].map(([value,label])=><div key={label}><dt>{label}</dt><dd>{value??'Non verificato'}</dd></div>)}</dl></section>}
   <div className="summary-sidebar-bottom"><a href="#rassegna-oggi" className="summary-sidebar-brand" aria-label="Jump Press — rassegna di oggi" onClick={()=>setMenuOpen(false)}><img src="/brand/jump-comunicazione.png" width="104" height="57" alt="Jump"/><span>PRESS</span></a><span className="summary-sidebar-signature">POWERED BY <strong>AG STUDIO</strong></span></div>
  </div>
 </aside>
 <dialog ref={archive} className="publish-dialog" aria-label="Archivio rassegne"><p className="publish-dialog-label">JUMP PRESS · JUVENTUS</p><h2>Rassegne</h2><p>{editionDate}</p><p>In questa anteprima è disponibile solo la rassegna del giorno.</p><div className="publish-dialog-actions"><button onClick={()=>archive.current.close()}>Leggi la rassegna</button></div></dialog>{picker&&<PdfSectionPicker initialSections={savedSections} initialClips={savedClips} onChange={rememberChoice} onClose={()=>{setPicker(false);pdfTrigger.current?.focus();}} onConfirm={(choice,clips)=>{setSections(choice);setIncludeClips(clips);setPicker(false);setPdf('edition');}}/>}{pdf&&<PdfPreview pdfEndpoint={pdfEndpoint} includeClips={includeClips} sections={sections} key={pdf} kind={pdf} date={editionDate} onClose={()=>{setPdf(false);pdfTrigger.current?.focus();}}/>}</>;
}
