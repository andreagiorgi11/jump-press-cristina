'use client';
import {useRef,useState,useEffect,useId} from 'react';
import ApprovalEdition from './ApprovalEdition';
import {parseKeyPoint,formatKeyPoint} from '../../lib/key-point-signals';
export default function EnglishEditableEdition({body,revision,sourceVersion,canEdit,...props}){
 const [edition,setEdition]=useState(body),[currentRevision,setRevision]=useState(revision),[selection,setSelection]=useState(null);
 useEffect(()=>{setEdition(body);setRevision(revision);},[body,revision]);
 return <><ApprovalEdition {...props} lang="en" body={edition} onEdit={canEdit?setSelection:undefined} onEditArticleText={canEdit?setSelection:undefined}/>{selection?.section==='article'&&<EnglishArticleDialog key={selection.articleId} article={edition.articles.find(a=>a.id===selection.articleId)} date={edition.date} sourceVersion={sourceVersion} revision={currentRevision} onClose={()=>setSelection(null)} onSaved={result=>{setEdition(b=>({...b,articles:b.articles.map(a=>a.id===result.article.id?{...a,title:result.article.title,summary:result.article.summary}:a)}));setRevision(result.revision);setSelection(null);}}/>}{selection&&selection.section!=='article'&&<EnglishSectionDialog key={selection.section} section={selection.section} value={edition[selection.section]} date={edition.date} sourceVersion={sourceVersion} revision={currentRevision} onClose={()=>setSelection(null)} onSaved={result=>{setEdition(b=>({...b,[result.section]:result.value}));setRevision(result.revision);setSelection(null);}}/>}</>;
}
function EnglishArticleDialog({article,date,sourceVersion,revision,onClose,onSaved}){
 const [title,setTitle]=useState(article.title),[summary,setSummary]=useState(article.summary),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dialog=useRef(null),locked=useRef(false),openedVersion=useRef({sourceVersion,revision}),id=useId();
 const dirty=title!==article.title||summary!==article.summary;
 useEffect(()=>{dialog.current.showModal();},[]);
 function close(){if(busy)return;if(dirty&&!window.confirm('Discard unsaved changes?'))return;onClose();}
 async function save(e){e.preventDefault();if(locked.current)return;locked.current=true;setBusy(true);setError('');
 try{const r=await fetch('/api/editor/english-article',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,...openedVersion.current,articleId:article.id,title,summary})});const result=await r.json();if(!r.ok)throw Error(result.error||'Could not save. Your changes are kept here.');onSaved(result);}catch(e){setError(e.message);}finally{locked.current=false;setBusy(false);}}
 return <dialog ref={dialog} className="section-edit-dialog" aria-labelledby={id} onCancel={e=>{e.preventDefault();close();}}><form onSubmit={save}><div className="section-edit-heading"><small>ENGLISH EDITION · PUBLISHED</small><h2 id={id}>Edit article text</h2><p>Changes update the English edition and its PDF immediately.</p></div><fieldset disabled={busy}><label>Title<textarea autoFocus required maxLength={400} rows={3} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Summary<textarea required maxLength={6000} rows={10} value={summary} onChange={e=>setSummary(e.target.value)}/></label>{error&&<p className="section-edit-error" role="alert">{error}</p>}<div className="section-edit-actions"><button type="button" onClick={close}>Cancel</button><button type="submit" disabled={!dirty}>{busy?'Saving…':'Save changes'}</button></div></fieldset></form></dialog>;
}

function EnglishSectionDialog({section,value,date,sourceVersion,revision,onClose,onSaved}){
 const [edited,setEdited]=useState(value),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dialog=useRef(null),locked=useRef(false),openedVersion=useRef({sourceVersion,revision}),id=useId();
 const dirty=JSON.stringify(value)!==JSON.stringify(edited);
 useEffect(()=>{dialog.current.showModal();},[]);
 function close(){if(busy)return;if(dirty&&!window.confirm('Discard unsaved changes?'))return;onClose();}
 async function save(e){e.preventDefault();if(locked.current)return;locked.current=true;setBusy(true);setError('');
  try{const r=await fetch('/api/editor/english-section',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,...openedVersion.current,section,value:edited})});const result=await r.json();if(!r.ok)throw Error(result.error||'Could not save. Your changes are kept here.');onSaved(result);}catch(e){setError(e.message);}finally{locked.current=false;setBusy(false);}}
 return <dialog ref={dialog} className="section-edit-dialog" aria-labelledby={id} onCancel={e=>{e.preventDefault();close();}}><form onSubmit={save}><div className="section-edit-heading"><small>ENGLISH EDITION · PUBLISHED</small><h2 id={id}>{section==='intro'?'Edit introduction':'Edit the day at a glance'}</h2><p>Changes update the English edition and its PDF immediately.</p></div><fieldset disabled={busy}>{section==='intro'?<label>Introduction<textarea autoFocus required maxLength={6000} rows={10} value={edited} onChange={e=>setEdited(e.target.value)}/></label>:edited.map((point,i)=>{const parsed=parseKeyPoint(point);return <label key={i}>{parsed.kind==='positivo'?'Positive development':parsed.kind==='negativo'?'Area of concern':'To follow'}<textarea autoFocus={i===0} required maxLength={1000-(point.length-parsed.text.length)} rows={4} value={parsed.text} onChange={e=>setEdited(points=>points.map((p,n)=>n===i?formatKeyPoint(parsed.kind,e.target.value):p))}/></label>;})}{error&&<p className="section-edit-error" role="alert">{error}</p>}<div className="section-edit-actions"><button type="button" onClick={close}>Cancel</button><button type="submit" disabled={!dirty}>{busy?'Saving…':'Save changes'}</button></div></fieldset></form></dialog>;
}
