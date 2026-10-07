'use client';
import PublishConfirmation from './PublishConfirmation';
import ManualSourceDialog from './ManualSourceDialog';
// Editor commands in the sidebar (replaces the floating top-right dock in the approval layout).
// Editors only; permissions, versions and confirmations are unchanged: this only moves the controls.
const icon=d=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const icons={preview:icon(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></>),back:icon(<path d="M19 12H5m6-6-6 6 6 6"/>),instructions:icon(<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></>),
 manual:icon(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M12 17v-6m-3 3 3-3 3 3"/></>),
 preferences:icon(<><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></>),
 pdf:icon(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M8.5 17.5v-4h1.4a1.3 1.3 0 0 1 0 2.6H8.5M13 17.5v-4h.9a2 2 0 0 1 0 4H13"/></>)};
export default function EditorSidebarSection({notice,error,readerPreview,onReaderPreview,onExitPreview,confirm,withdraw,onNavigate,originalPdfHref}){
 const hint="Disponibile aprendo una rassegna";
 const preloadInstructions=()=>window.dispatchEvent(new CustomEvent('jump-preload-instructions'));
 const openInstructions=()=>{onNavigate?.();window.dispatchEvent(new CustomEvent('jump-open-instructions'));};
 return <section className="sidebar-editor-section" aria-label="Redazione">
  <p className="summary-nav-label sidebar-editor-label"><span>REDAZIONE</span><small><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Solo editor</small></p>
  {notice&&<p className="sidebar-editor-message" role="status">{notice}</p>}
  {error&&<p className="sidebar-editor-message is-error" role="alert">{error}</p>}
  {!readerPreview&&<button className="summary-nav-item" aria-haspopup="dialog" onClick={()=>{onNavigate?.();window.dispatchEvent(new CustomEvent('jump-open-manual-source'));}}>{icons.manual}<span>Rassegna manuale</span></button>}
  {!readerPreview&&<button type="button" className="summary-nav-item" onPointerEnter={preloadInstructions} onFocus={preloadInstructions} onClick={openInstructions} aria-haspopup="dialog">{icons.preferences}<span>Istruzioni e preferenze</span></button>}
  {!readerPreview&&<button type="button" className="summary-nav-item" aria-haspopup="dialog" onClick={()=>{onNavigate?.();window.dispatchEvent(new CustomEvent('jump-open-interests'));}}>{icon(<><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-4-5.65"/></>)}<span>Persone di interesse</span></button>}
  {!readerPreview&&(originalPdfHref?<a className="summary-nav-item" href={originalPdfHref} target="_blank" rel="noopener noreferrer" onClick={onNavigate}>{icons.pdf}<span>PDF originale completo</span></a>:<button type="button" className="summary-nav-item is-inactive" disabled title={hint}>{icons.pdf}<span>PDF originale completo</span></button>)}
  <ManualSourceDialog/>
  {!readerPreview&&(withdraw||(confirm?<div className="sidebar-editor-confirm is-list-item"><PublishConfirmation {...confirm}/></div>:<div className="sidebar-editor-confirm is-list-item is-inactive"><button type="button" className="confirm-draft" disabled title={hint}><svg className="confirm-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21 3-9.5 9.5M21 3l-6.5 18-3-8.5L3 9.5 21 3Z"/></svg>Pubblica bozza</button></div>))}
 </section>;
}
