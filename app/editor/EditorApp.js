'use client';
import {publicationWithRecovery} from '../../lib/publication-recovery';
import WithdrawEdition from '../components/WithdrawEdition';
import ReserveArticles from '../components/ReserveArticles';
import RevisionEditor from '../components/RevisionEditor';
import {createPdfSession} from '../../lib/pdf-session';
import {useEffect,useState} from 'react';
import EditionView from '../components/EditionView';
import ExportPage from '../summary/ExportPage';
import ApprovalEdition from '../components/ApprovalEdition';
import AppControls from '../components/AppControls';
import EditorLoading from '../components/EditorLoading';
import PublishConfirmation from '../components/PublishConfirmation';
import {sharedEditorActions} from '../components/editor-actions';
export default function EditorApp({ready}){
 const Frame=process.env.NEXT_PUBLIC_JUMP_APPROVAL_LIVE==='1'?'div':'main';
 const approval=process.env.NEXT_PUBLIC_JUMP_APPROVAL_LIVE==='1',Edition=approval?ApprovalEdition:EditionView;
 const [loadAttempt,setLoadAttempt]=useState(0),[loadFailed,setLoadFailed]=useState(false);
 const [readerPreview,setReaderPreview]=useState(false);
 const [editing,setEditing]=useState(null);
 const [role,setRole]=useState(''),[notice,setNotice]=useState('');
 const [user,setUser]=useState(false),[current,setCurrent]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(ready);
 const [pdfSession]=useState(()=>createPdfSession());
 useEffect(()=>()=>pdfSession.clear(),[pdfSession,current?.id,current?.body.sourceImportId]);
 useEffect(()=>{let active=true;if(!ready)return;setLoading(true);setLoadFailed(false);setError('');async function load(){try{const wanted=new URLSearchParams(location.search).get('draft');const r=await fetch('/api/editor?open='+encodeURIComponent(wanted||'latest'),{cache:'no-store',signal:AbortSignal.timeout(30000)});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error||'Lettura non riuscita'),{status:r.status});if(!active)return;setUser(true);setRole(data.role);if(data.draft)setCurrent(data.draft);}catch(e){if(active&&e.status!==401){setError(e.name==='TimeoutError'?'Il servizio non ha risposto in tempo. Riprova tra poco.':e.message);setLoadFailed(true);}}finally{if(active)setLoading(false);}}load();return()=>{active=false;};},[ready,loadAttempt]);
 useEffect(()=>{
  window.dispatchEvent(new CustomEvent('jump-clip-context',{detail:{key:current?current.id+':'+current.version:'',links:current?.previewLinks||{}}}));
  return()=>window.dispatchEvent(new CustomEvent('jump-clip-context',{detail:{key:'',links:{}}}));
 },[current]);
 async function login(e){e.preventDefault();setBusy(true);setError('');const fields=new FormData(e.currentTarget);try{const query=new URLSearchParams(location.search);const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:fields.get('username'),password:fields.get('password'),returnTo:query.get('returnTo')||location.pathname+location.search})});const data=await r.json();if(!r.ok)throw Error(data.error||'Accesso non riuscito');location.assign(data.returnTo);}catch(e){setError(e.message);}finally{setBusy(false);}}
 function showAsset(assetId){setError('');window.dispatchEvent(new CustomEvent('jump-open-clip',{detail:{clipId:assetId}}));}
 async function mutate(action,row){const r=await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id:row.id,version:row.version})});const data=await r.json();if(!r.ok)throw Error(data.error||'Operazione non riuscita');return data;}
 const editorActions=['editor','publisher'].includes(role)?{
  onDelete:current&&(!current.publishedVersions?.length||current.withdrawnAt)?async()=>{await mutate('delete',current);setCurrent(null);setNotice('Bozza spostata nel cestino.');history.replaceState(null,'','/editor');}:undefined,
  ...sharedEditorActions(d=>{setCurrent(d);setNotice('Bozza ripristinata.');history.replaceState(null,'','/editor?draft='+d.id);})
 }:undefined;
 async function confirmDraft(){
  if(!current||busy||role!=='publisher')return;
  setBusy(true);setError('');setNotice('');
  try{const updated=await publicationWithRecovery('publish',current);setCurrent(updated);setNotice('Rassegna pubblicata.');return true;}catch(e){if(e.draft)setCurrent(e.draft);setError(e.message);return false;}finally{setBusy(false);}
 }
 const canConfirm=current&&!editing&&role==='publisher'&&(!current.publishedVersions?.length||current.withdrawnAt);
 const confirm=canConfirm?{onConfirm:confirmDraft,disabled:busy,isRevision:!!current.publishedVersions?.length,date:current.body.date,version:current.version,summaryStale:current.body.executiveSummaryStale===true,introStale:current.body.introStale===true}:null;
 const withdraw=current&&editorActions&&current.publishedVersions?.length>0&&!current.withdrawnAt?<div className="revision-entry"><WithdrawEdition id={current.id} version={current.version} date={current.body.date} icon={false} onWithdraw={d=>{setCurrent(d);setNotice('Rassegna ritirata dal sito e riportata in bozza.');}}/></div>:null;
 const sourceNotice=current?.automaticClips?.sourceUnavailable?'Verifica della fonte temporaneamente non disponibile. I controlli precedenti degli articoli invariati e i ritagli associati sono conservati.':'';
 // Approval layout: every editor command lives in the sidebar Redazione section; phones also get a fixed confirm bar.
 const editorPanel=approval&&current&&editorActions?{reserveCount:current.body.reserveArticles?.length||0,originalPdfHref:current.body.sourceImportId?'/api/editor/original?draft='+encodeURIComponent(current.id):null,notice:[notice,readerPreview?'':sourceNotice,!readerPreview&&current.body.introStale?'Cappello da ricontrollare dopo il cambio della selezione.':''].filter(Boolean).join(' '),error,readerPreview,onReaderPreview:!editing?()=>setReaderPreview(true):undefined,onExitPreview:()=>setReaderPreview(false),confirm,withdraw,attention:!!confirm}:null;
 if(loading)return approval?<EditorLoading/>:<main><p style={{color:'white'}} role="status">Caricamento rassegna…</p></main>;
 if(loadFailed&&!current)return <div className="editor-shell"><main className="editor-main narrow"><h1>Redazione temporaneamente non disponibile</h1><p role="alert">{error}</p><p>Non è stato possibile leggere la rassegna. I dati salvati non sono stati modificati.</p><button onClick={()=>setLoadAttempt(n=>n+1)}>Riprova</button></main></div>;
 if(!user)return <div className="editor-shell"><main className="editor-main narrow"><a className="editor-brand" href="/">JUMP <b>PRESS</b></a><p className="eyebrow">AREA RISERVATA</p><h1>La redazione,<br/>in un unico posto.</h1><p className="editor-intro">Rivedi le bozze, controlla i ritagli e pubblica la rassegna quando è pronta.</p>
 <form className="editor-card" onSubmit={login}><h2>Accedi alla redazione</h2>{!ready&&<p className="editor-notice" role="status">Area editor in preparazione. Gli accessi devono essere configurati.</p>}
 <label>Nome utente<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={80} disabled={busy}/></label><label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} disabled={busy}/></label>
 {error&&<p className="editor-error" role="alert">{error}</p>}<button disabled={!ready||busy||loading}>{loading?'Verifica accesso…':busy?'Accesso…':'Accedi'}</button><p className="editor-hint">Solo gli account autorizzati possono entrare.</p></form><a className="editor-return" href="/">← Torna alla rassegna pubblica</a></main></div>;
 return <>{!approval&&(readerPreview?<div className="appcontrols reader-preview-controls" aria-label="Anteprima lettore"><span>Anteprima lettore</span><button type="button" onClick={()=>setReaderPreview(false)}>← Torna alla modifica</button></div>:<AppControls onReaderPreview={current&&editorActions&&!editing?()=>setReaderPreview(true):undefined} editorActions={editorActions} onConfirm={current&&!editing&&role==='publisher'&&(!current.publishedVersions?.length||current.withdrawnAt)?confirmDraft:undefined} confirmBusy={busy} isRevision={!!current?.publishedVersions?.length} confirmDate={current?.body.date} confirmVersion={current?.version} summaryStale={current?.body.executiveSummaryStale===true}/>)}<Frame>{!approval&&!readerPreview&&current?.automaticClips?.sourceUnavailable&&<p role="alert" className="editor-notice">Verifica della fonte temporaneamente non disponibile. I controlli precedenti degli articoli invariati e i ritagli associati sono conservati.</p>}{!approval&&!readerPreview&&notice&&<p role="status" className="editor-notice">{notice}</p>}{(!approval||!editorPanel)&&error&&<p className="editor-error" role="alert">{error}</p>}{!approval&&!readerPreview&&current&&editorActions&&current.publishedVersions?.length>0&&!current.withdrawnAt&&<div className="revision-entry"><WithdrawEdition id={current.id} version={current.version} date={current.body.date} icon={false} onWithdraw={d=>{setCurrent(d);setNotice('Rassegna ritirata dal sito e riportata in bozza.');}}/></div>}{current&&editing&&<RevisionEditor key={current.id+':'+editing.section+':'+(editing.articleId||'')} draft={current} pdfSession={pdfSession} selection={editing} onReload={d=>{setCurrent(d);setNotice('Versione aggiornata caricata.');}} onClose={()=>setEditing(null)} onSaved={d=>{setCurrent(d);setNotice('Correzione salvata in bozza.');}}/>}{current?<Edition assets={current.assets} draftId={current.id} version={current.version} onEdit={!readerPreview&&editorActions&&(!current.publishedVersions?.length||current.withdrawnAt)?setEditing:undefined} body={current.body} preview={!readerPreview&&!current.publishedVersions?.includes(current.version)} onClip={showAsset} privateClips editorStatus={!readerPreview} editorPanel={editorPanel}/>:!current&&<>{approval&&editorActions&&<ExportPage date={new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date())} live hasEdition={false} summaryAvailable={false} editorPanel={{notice,error}}/>}<div className={approval?'summary-content':''}><section className="ranking"><h1 style={{fontSize:32,color:'#111'}}>Nessuna bozza disponibile</h1><p>La rassegna preparata tramite GPT apparirà qui.</p>{approval&&editorActions&&<p>Se la fonte principale manca, usa Rassegna manuale nella sidebar.</p>}</section></div></>}{current&&!readerPreview&&editorActions&&<div className={approval?'summary-content':''}><ReserveArticles body={current.body} onEdit={!current.publishedVersions?.length||current.withdrawnAt?setEditing:undefined} onClip={showAsset}/></div>}</Frame>{approval&&!readerPreview&&confirm&&<div className="mobile-confirm-bar"><PublishConfirmation {...confirm}/></div>}</>;
}
