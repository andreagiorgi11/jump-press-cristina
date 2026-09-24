'use client';
import PublishConfirmation from './PublishConfirmation';
// Editor commands in the sidebar (replaces the floating top-right dock in the approval layout).
// Editors only; permissions, versions and confirmations are unchanged: this only moves the controls.
const alert=<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3.2 22 20.5H2L12 3.2Z" fill="#f2a516" stroke="#c77c15" strokeWidth="1.2" strokeLinejoin="round"/><path d="M12 9.5v5" stroke="#1d1d1d" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="17.4" r="1.15" fill="#1d1d1d"/></svg>;
const icon=d=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const icons={preview:icon(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></>),back:icon(<path d="M19 12H5m6-6-6 6 6 6"/>),instructions:icon(<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></>)};
export default function EditorSidebarSection({notice,error,readerPreview,onReaderPreview,onExitPreview,onConfirmSummary,confirm,withdraw,onNavigate,editorHref}){
 const openInstructions=()=>{onNavigate?.();window.dispatchEvent(new CustomEvent('jump-open-instructions'));};
 return <section className="sidebar-editor-section" aria-label="Redazione">
  <p className="summary-nav-label sidebar-editor-label"><span>REDAZIONE</span><small><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Solo editor</small></p>
  {editorHref&&<a className="summary-nav-item" href={editorHref} onClick={onNavigate}>{icons.back}<span>Apri editor</span></a>}
  {notice&&<p className="sidebar-editor-message" role="status">{notice}</p>}
  {error&&<p className="sidebar-editor-message is-error" role="alert">{error}</p>}
  {readerPreview
   ?<button type="button" className="summary-nav-item" onClick={()=>{onNavigate?.();onExitPreview();}}>{icons.back}<span>Torna alla modifica</span></button>
   :onReaderPreview&&<button type="button" className="summary-nav-item" onClick={()=>{onNavigate?.();onReaderPreview();}}>{icons.preview}<span>Anteprima lettore</span></button>}
  {!readerPreview&&onConfirmSummary&&<button type="button" className="summary-nav-item" onClick={onConfirmSummary} title="Il Summary resta invariato ed è confermato valido dopo le modifiche">{alert}<span>Conferma Summary</span></button>}
  {!readerPreview&&<button type="button" className="summary-nav-item" onClick={openInstructions} aria-haspopup="dialog">{icons.instructions}<span>Istruzioni</span></button>}
  {!readerPreview&&withdraw}
  {!readerPreview&&confirm&&<div className="sidebar-editor-confirm is-list-item"><PublishConfirmation {...confirm}/></div>}
 </section>;
}
