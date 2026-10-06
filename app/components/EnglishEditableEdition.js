'use client';
import {useRef,useState,useEffect,useId} from 'react';
import ApprovalEdition from './ApprovalEdition';
export default function EnglishEditableEdition({body,revision,sourceVersion,canEdit,...props}){
 const [edition,setEdition]=useState(body),[currentRevision,setRevision]=useState(revision),[selection,setSelection]=useState(null);
 useEffect(()=>{setEdition(body);setRevision(revision);},[body,revision]);
 return <><ApprovalEdition {...props} lang="en" body={edition} onEditArticleText={canEdit?setSelection:undefined}/>{selection&&<EnglishArticleDialog key={selection.articleId} article={edition.articles.find(a=>a.id===selection.articleId)} date={edition.date} sourceVersion={sourceVersion} revision={currentRevision} onClose={()=>setSelection(null)} onSaved={result=>{setEdition(b=>({...b,articles:b.articles.map(a=>a.id===result.article.id?{...a,title:result.article.title,summary:result.article.summary}:a)}));setRevision(result.revision);setSelection(null);}}/>}</>;
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
