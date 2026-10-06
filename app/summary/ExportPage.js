'use client';
import {brandCrossPaths} from '../../lib/brand-cross';
import {useCallback,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {tr,formatDate,languagePath,LANG_COOKIE} from '../../lib/i18n';
import SidebarEditorTools from './SidebarEditorTools';
import EditorSidebarSection from '../components/EditorSidebarSection';
import StorageUsage from './StorageUsage';
import PdfPreview from './PdfPreview';
import PdfSectionPicker from './PdfSectionPicker';
function Icon({kind}){
 const paths={stats:<><path d="M4 20h16M7 16v-5M12 16V4M17 16V8"/></>,editor:<><path d="m4 16 12-12 4 4L8 20H4v-4ZM14 6l4 4"/></>,today:<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,archive:<><rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v12h14V8M9 12h6"/></>,download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,refresh:<><path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.5"/><path d="M20 3.5v5h-5"/></>,menu:<path d="M4 6h16M4 12h16M4 18h16"/>,close:<path d="m6 6 12 12M18 6 6 18"/>};
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}
export default function ExportPage({date,lang='it',archive=false,live=false,hasEdition=true,pdfEndpoint,summaryAvailable=true,summaryAlert=null,coverageStats,editorPanel=null}){
 const t=text=>tr(lang,text),pathname=usePathname()||'/';
 const editionDate=date?formatDate(lang,date):'';
 const homeHref=lang==='en'?'/en':'/',archiveHref=lang==='en'?'/en/archivio':'/archivio';
 // Archive mode: same sidebar, "Rassegna di oggi" leads home and Archivio is the current page.
 const home=archive?homeHref:'#rassegna-oggi';
 // Language switch: same page in the other language; the choice is remembered for the home page.
 const switchTo=next=>{try{document.cookie=LANG_COOKIE+'='+next+'; path=/; max-age=31536000; samesite=lax';}catch{}};
 const [refreshing,setRefreshing]=useState(false),[authenticated,setAuthenticated]=useState(false);
 const [coverageOpen,setCoverageOpen]=useState(false),[storageLevel,setStorageLevel]=useState('unknown');
 const [pdf,setPdf]=useState(false),[menuOpen,setMenuOpen]=useState(false);
 const [picker,setPicker]=useState(false),[sections,setSections]=useState(null);
 const [includeClips,setIncludeClips]=useState(false);
 const [savedSections,setSavedSections]=useState(null),[savedClips,setSavedClips]=useState(false);
 const rememberChoice=useCallback((selected,clips)=>{setSavedSections(selected);setSavedClips(clips);},[]);
 const coverage=useRef(null),coverageTrigger=useRef(null),archiveDialog=useRef(null),toggle=useRef(null),pdfTrigger=useRef(null);
 const closeMenu=()=>{setMenuOpen(false);toggle.current?.focus();};
 const openPdf=(kind,event)=>{pdfTrigger.current=menuOpen?toggle.current:event.currentTarget;setMenuOpen(false);if(kind==='edition')setPicker(true);else{setSections(null);setIncludeClips(false);setPdf(kind);}};
 const refresh=()=>{setRefreshing(true);const url=new URL(window.location.href);url.searchParams.set('v',Date.now().toString());window.location.replace(url.href);};
 return <>
 <aside className={`summary-sidebar${menuOpen?' is-open':''}`} onKeyDown={event=>{if(event.key==='Escape'&&menuOpen){event.preventDefault();closeMenu();}}}>
  <div className="summary-sidebar-heading"><a className="sidebar-client-mark" href={home} aria-label={t('Juventus, rassegna di oggi')} onClick={()=>setMenuOpen(false)}><img src="/brand/juventus-j.svg" alt="Juventus" width="33" height="52"/></a><button ref={toggle} className={'summary-menu-toggle'+(editorPanel?.attention?' has-attention':'')} type="button" aria-expanded={menuOpen} aria-controls="summary-sidebar-menu" aria-label={t(menuOpen?'Chiudi menu':'Apri menu')} onClick={()=>setMenuOpen(!menuOpen)}><Icon kind={menuOpen?'close':'menu'}/></button><nav className="lang-switch" aria-label="Lingua / Language">{['it','en'].map(code=><a key={code} href={languagePath(pathname,code)} hrefLang={code} lang={code} aria-current={code===lang?'true':undefined} className={code===lang?'is-current':undefined} onClick={()=>switchTo(code)}>{code.toUpperCase()}</a>)}</nav></div>
  <div className="summary-sidebar-menu" id="summary-sidebar-menu">

   <nav aria-label={t('Navigazione rassegna')}><div className="summary-nav-heading"><p className="summary-nav-label">{t('LEGGI')}</p><button className="sidebar-refresh" type="button" title={t('Aggiorna rassegna')} aria-label={t('Aggiorna rassegna')} aria-busy={refreshing} disabled={refreshing} onClick={refresh}><Icon kind="refresh"/></button></div><a className={'summary-nav-item'+(archive?'':' is-active')} href={home} aria-current={archive?undefined:'page'} onClick={()=>setMenuOpen(false)}><Icon kind="today"/><span>{t('Rassegna di oggi')}</span></a>
   {archive&&<button className="summary-nav-item is-inactive" type="button" disabled title={t('Disponibile aprendo una rassegna')}><Icon kind="stats"/><span>{t('Copertura odierna')}</span></button>}
   {coverageStats&&<button ref={coverageTrigger} className="summary-nav-item" type="button" aria-haspopup="dialog" onClick={()=>{setMenuOpen(false);setCoverageOpen(true);coverage.current.showModal();}}><Icon kind="stats"/><span>{t('Copertura odierna')}</span>{['warning','critical'].includes(storageLevel)&&<i className="storage-alert-dot" aria-label="Spazio in esaurimento"/>}</button>}
   {archive&&<button type="button" className="summary-nav-item is-inactive" disabled title={t('Disponibile aprendo una rassegna')}><Icon kind="download"/><span>{t('Scarica PDF')}</span></button>}
   {!archive&&<button type="button" className="summary-nav-item" aria-haspopup="dialog" disabled={!hasEdition} onClick={event=>openPdf('edition',event)}><Icon kind="download"/><span className="summary-nav-text">{t('Scarica PDF')}{summaryAlert&&<svg className="confirm-warning pdf-warning" viewBox="0 0 24 24" width="15" height="15" role="img" aria-label={'Attenzione: '+summaryAlert} focusable="false"><title>{summaryAlert}</title><path d="M12 3 2.5 20h19L12 3Z" fill="currentColor"/><path d="M12 10v5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="17.6" r="1.1" fill="#fff"/></svg>}</span></button>}
   {archive?<a className="summary-nav-item is-active" href={archiveHref} aria-current="page" onClick={()=>setMenuOpen(false)}><Icon kind="archive"/><span>{t('Archivio')}</span></a>:<button type="button" className="summary-nav-item" onClick={()=>{if(menuOpen)closeMenu();if(live)window.location.assign(archiveHref);else archiveDialog.current.showModal();}}><Icon kind="archive"/><span>{t('Archivio')}</span></button>}</nav>
   {(editorPanel||authenticated)&&<EditorSidebarSection {...(editorPanel||{})} onNavigate={()=>setMenuOpen(false)}/>}
   <div className="summary-sidebar-bottom"><nav className="sidebar-secondary" aria-label="Archivio e redazione"><SidebarEditorTools hideInstructions lang={lang} onAuthenticated={setAuthenticated}/></nav><a href={home} className="summary-sidebar-brand" aria-label={t('Jump × Juventus — rassegna di oggi')} onClick={()=>setMenuOpen(false)}><img className="summary-sidebar-jump" src="/brand/jump-comunicazione.png" width="104" height="57" alt="Jump"/><svg className="summary-sidebar-cross" viewBox="0 0 24 24" aria-hidden="true">{brandCrossPaths.map(path=><path key={path} d={path} fill="currentColor"/>)}</svg><img className="summary-sidebar-juventus" src="/brand/juventus-wordmark.svg" width="163" height="37" alt="Juventus"/></a><a className="summary-sidebar-signature" href="https://andreagiorgistudio.it/" target="_blank" rel="noopener noreferrer" aria-label={t('Powered by AG Studio — apri il sito in una nuova scheda')}><span>POWERED BY</span><img className="summary-ag-logo" src="/brand/andrea-giorgi-pittogramma.svg" alt="AG Studio"/></a></div>
  </div>
 </aside>
 {coverageStats&&<dialog ref={coverage} className="coverage-dialog" aria-labelledby="coverage-title" onClose={()=>{setCoverageOpen(false);(window.matchMedia('(max-width: 900px)').matches?toggle.current:coverageTrigger.current)?.focus();}} onClick={event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)coverage.current.close();}}}>
  <header className="coverage-dialog-header"><div><p>JUMP PRESS · JUVENTUS</p><h2 id="coverage-title">{t('Copertura odierna')}</h2><time dateTime={date}>{editionDate}</time></div><button type="button" aria-label={t('Chiudi statistiche')} onClick={()=>coverage.current.close()}><Icon kind="close"/></button></header>
  <dl className="coverage-grid">{[[coverageStats.sourcePages,'Pagine analizzate'],[coverageStats.frontPages,'Prime pagine controllate'],[coverageStats.juventus,'Prime pagine con la Juventus'],[coverageStats.selected,'Articoli selezionati',coverageStats.selectedOutlets?`${t('da')} ${coverageStats.selectedOutlets} ${t(coverageStats.selectedOutlets===1?'testata':'testate')}`:null]].map(([value,label,sub])=><div key={label}><dt>{t(label)}{sub&&<small>{sub}</small>}</dt><dd className={value==null?"coverage-unavailable":undefined}>{value??t('Non disponibile')}</dd></div>)}</dl>
  <p className="coverage-dialog-note">{t('Le edizioni locali della stessa testata sono conteggiate una sola volta.')}</p>
  <StorageUsage open={coverageOpen} onLevel={setStorageLevel}/>
 </dialog>}
 <dialog ref={archiveDialog} className="publish-dialog" aria-label="Archivio rassegne"><p className="publish-dialog-label">JUMP PRESS · JUVENTUS</p><h2>Rassegne</h2><p>{editionDate}</p><p>In questa anteprima è disponibile solo la rassegna del giorno.</p><div className="publish-dialog-actions"><button onClick={()=>archiveDialog.current.close()}>Leggi la rassegna</button></div></dialog>{picker&&<PdfSectionPicker lang={lang} summaryAvailable={summaryAvailable} onSummary={()=>{setSections(null);setIncludeClips(false);setPicker(false);setPdf('summary');}} initialSections={savedSections} initialClips={savedClips} onChange={rememberChoice} onClose={()=>{setPicker(false);pdfTrigger.current?.focus();}} onConfirm={(choice,clips)=>{setSections(choice);setIncludeClips(clips);setPicker(false);setPdf('edition');}}/>}{pdf&&<PdfPreview lang={lang} summaryAlert={summaryAlert} pdfEndpoint={pdfEndpoint} includeClips={includeClips} sections={sections} key={pdf} kind={pdf} date={editionDate} onClose={()=>{setPdf(false);pdfTrigger.current?.focus();}}/>}</>;
}
