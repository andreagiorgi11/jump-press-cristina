// Loading placeholder shaped like the page (sidebar with the Juventus mark, dark header, content card),
// so the editor appears immediately and fills in without layout jumps.
export default function EditorLoading(){
 return <div className="editor-loading" role="status" aria-live="polite">
  <span className="editor-loading-sr">Caricamento rassegna…</span>
  <aside className="editor-loading-sidebar" aria-hidden="true">
   <img src="/brand/juventus-j.svg" alt="" width="33" height="52"/>
   <i className="w40"/><i/><i/><i/><i/>
  </aside>
  <main className="editor-loading-main" aria-hidden="true">
   <div className="editor-loading-hero"><i className="w30 lime"/><i className="w70 tall"/><i/><i/><i className="w60"/></div>
   <div className="editor-loading-card"><i className="w40"/><i/><i className="w80"/></div>
  </main>
 </div>;
}
