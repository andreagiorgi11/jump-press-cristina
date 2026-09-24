'use client';
import WithdrawEdition from '../components/WithdrawEdition';
import RevisionEditor from '../components/RevisionEditor';
import {useEffect,useState} from 'react';
import EditionView from '../components/EditionView';
import ApprovalEdition from '../components/ApprovalEdition';
import AppControls from '../components/AppControls';
import EditorLoading from '../components/EditorLoading';
import PublishConfirmation from '../components/PublishConfirmation';
import {sharedEditorActions} from '../components/editor-actions';
export default function EditorApp({ready}){
 const Frame=process.env.NEXT_PUBLIC_JUMP_APPROVAL_LIVE==='1'?'div':'main';
 const approval=process.env.NEXT_PUBLIC_JUMP_APPROVAL_LIVE==='1',Edition=approval?ApprovalEdition:EditionView;
 const [readerPreview,setReaderPreview]=useState(false);
 const [editing,setEditing]=useState(null);
 const [role,setRole]=useState(''),[notice,setNotice]=useState('');
 const [user,setUser]=useState(false),[current,setCurrent]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(ready);
 useEffect(()=>{let active=true;if(!ready)return;async function load(){try{const wanted=new URLSearchParams(location.search).get('draft');const r=await fetch('/api/editor?open='+encodeURIComponent(wanted||'latest'),{cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error||'Lettura non riuscita'),{status:r.status});if(!active)return;setUser(true);setRole(data.role);if(data.draft)setCurrent(data.draft);}catch(e){if(active&&e.status!==401)setError(e.message);}finally{if(active)setLoading(false);}}load();return()=>{active=false;};},[ready]);
 async function login(e){e.preventDefault();setBusy(true);setError('');const fields=new FormData(e.currentTarget);try{const query=new URLSearchParams(location.search);const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:fields.get('username'),password:fields.get('password'),returnTo:query.get('returnTo')||location.pathname+location.search})});const data=await r.json();if(!r.ok)throw Error(data.error||'Accesso non riuscito');location.assign(data.returnTo);}catch(e){setError(e.message);}finally{setBusy(false);}}
 function showAsset(assetId){setError('');window.dispatchEvent(new CustomEvent('jump-open-clip',{detail:{clipId:assetId}}));}
 async function mutate(action,row){const r=await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id:row.id,version:row.version})});const data=await r.json();if(!r.ok)throw Error(data.error||'Operazione non riuscita');return data;}
 const editorActions=['editor','publisher'].includes(role)?{
  onDelete:current&&(!current.publishedVersions?.length||current.withdrawnAt)?async()=>{await mutate('delete',current);setCurrent(null);setNotice('Bozza spostata nel cestino.');history.replaceState(null,'','/editor');}:undefined,
  ...sharedEditorActions(d=>{setCurrent(d);setNotice('Bozza ripristinata.');history.replaceState(null,'','/editor?draft='+d.id);})
 }:undefined;
 async function confirmSummary(){
  if(!current||busy)return;
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',id:current.id,version:current.version,body:current.body,summaryConfirmed:true})});const result=await r.json();if(!r.ok)throw Error(result.error||'Conferma del Summary non riuscita.');setCurrent(result);setNotice('Summary confermato.');}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function confirmDraft(){
  if(!current||busy||role!=='publisher')return;
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'publish',id:current.id,version:current.version,confirmation:'PUBBLICA'})});const result=await r.json();if(!r.ok)throw Error(result.error||'Pubblicazione non riuscita.');setCurrent(c=>({...c,withdrawnAt:undefined,publishedVersions:[...new Set([...(c.publishedVersions||[]),c.version])]}));setNotice('Rassegna pubblicata.');return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}
 }
 const canConfirm=current&&!editing&&role==='publisher'&&(!current.publishedVersions?.length||current.withdrawnAt);
 const canConfirmSummary=current&&!editing&&current.body.executiveSummaryStale===true&&['editor','publisher'].includes(role);
 const confirm=canConfirm?{onConfirm:confirmDraft,disabled:busy,isRevision:!!current.publishedVersions?.length,date:current.body.date,version:current.version,summaryStale:current.body.executiveSummaryStale===true}:null;
 const withdraw=current&&editorActions&&current.publishedVersions?.length>0&&!current.withdrawnAt?<div className="revision-entry"><WithdrawEdition id={current.id} version={current.version} date={current.body.date} icon={false} onWithdraw={d=>{setCurrent(d);setNotice('Rassegna ritirata dal sito e riportata in bozza.');}}/></div>:null;
 const sourceNotice=current?.automaticClips?.sourceUnavailable?'Verifica della fonte temporaneamente non disponibile. I controlli precedenti degli articoli invariati e i ritagli associati sono conservati.':'';
 // Approval layout: every editor command lives in the sidebar Redazione section; phones also get a fixed confirm bar.
 const editorPanel=approval&&current&&editorActions?{notice:[notice,readerPreview?'':sourceNotice].filter(Boolean).join(' '),error,readerPreview,onReaderPreview:!editing?()=>setReaderPreview(true):undefined,onExitPreview:()=>setReaderPreview(false),onConfirmSummary:canConfirmSummary?confirmSummary:undefined,confirm,withdraw,attention:!!(confirm||canConfirmSummary)}:null;
 if(loading)return approval?<EditorLoading/>:<main><p style={{color:'white'}} role="status">Caricamento rassegna…</p></main>;
 if(!user)return <div className="editor-shell"><main className="editor-main narrow"><a className="editor-brand" href="/">JUMP <b>PRESS</b></a><p className="eyebrow">AREA RISERVATA</p><h1>La redazione,<br/>in un unico posto.</h1><p className="editor-intro">Rivedi le bozze, controlla i ritagli e pubblica la rassegna quando è pronta.</p>
 <form className="editor-card" onSubmit={login}><h2>Accedi alla redazione</h2>{!ready&&<p className="editor-notice" role="status">Area editor in preparazione. Gli accessi devono essere configurati.</p>}
 <label>Nome utente<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={80} disabled={busy}/></label><label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} disabled={busy}/></label>
 {error&&<p className="editor-error" role="alert">{error}</p>}<button disabled={!ready||busy||loading}>{loading?'Verifica accesso…':busy?'Accesso…':'Accedi'}</button><p className="editor-hint">Solo gli account autorizzati possono entrare.</p></form><a className="editor-return" href="/">← Torna alla rassegna pubblica</a></main></div>;
 return <>{!approval&&(readerPreview?<div className="appcontrols reader-preview-controls" aria-label="Anteprima lettore"><span>Anteprima lettore</span><button type="button" onClick={()=>setReaderPreview(false)}>← Torna alla modifica</button></div>:<AppControls onReaderPreview={current&&editorActions&&!editing?()=>setReaderPreview(true):undefined} editorActions={editorActions} onConfirm={current&&!editing&&role==='publisher'&&(!current.publishedVersions?.length||current.withdrawnAt)?confirmDraft:undefined} confirmBusy={busy} isRevision={!!current?.publishedVersions?.length} confirmDate={current?.body.date} confirmVersion={current?.version} summaryStale={current?.body.executiveSummaryStale===true} onConfirmSummary={current&&!editing&&current.body.executiveSummaryStale===true&&['editor','publisher'].includes(role)?confirmSummary:undefined}/>)}<Frame>{!approval&&!readerPreview&&current?.automaticClips?.sourceUnavailable&&<p role="alert" className="editor-notice">Verifica della fonte temporaneamente non disponibile. I controlli precedenti degli articoli invariati e i ritagli associati sono conservati.</p>}{!approval&&!readerPreview&&notice&&<p role="status" className="editor-notice">{notice}</p>}{(!approval||!editorPanel)&&error&&<p className="editor-error" role="alert">{error}</p>}{!approval&&!readerPreview&&current&&editorActions&&current.publishedVersions?.length>0&&!current.withdrawnAt&&<div className="revision-entry"><WithdrawEdition id={current.id} version={current.version} date={current.body.date} icon={false} onWithdraw={d=>{setCurrent(d);setNotice('Rassegna ritirata dal sito e riportata in bozza.');}}/></div>}{current&&editing&&<RevisionEditor key={current.id+':'+editing.section+':'+(editing.articleId||'')} draft={current} selection={editing} onClose={()=>setEditing(null)} onSaved={d=>{setCurrent(d);setNotice('Correzione salvata in bozza.');}}/>}{current?<Edition assets={current.assets} draftId={current.id} version={current.version} onEdit={!readerPreview&&editorActions&&(!current.publishedVersions?.length||current.withdrawnAt)?setEditing:undefined} body={current.body} preview={!readerPreview&&!current.publishedVersions?.includes(current.version)} onClip={showAsset} privateClips editorStatus={!readerPreview} editorPanel={editorPanel}/>:!current&&<section className="ranking"><h1 style={{fontSize:32,color:'#111'}}>Nessuna bozza disponibile</h1><p>La rassegna preparata tramite GPT apparirà qui.</p></section>}</Frame>{approval&&!readerPreview&&confirm&&<div className="mobile-confirm-bar"><PublishConfirmation {...confirm}/></div>}</>;
}
