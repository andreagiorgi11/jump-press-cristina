 'use client';
import {editorialCategories,editorialTopics} from '../../lib/editorial-topics';
import {useEffect,useState,useRef,useId} from 'react';
export default function RevisionEditor({draft,selection,onSaved,onClose}){
 const [body,setBody]=useState(()=>structuredClone(draft.body)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dialog=useRef(null),locked=useRef(false),titleId=useId();
 const initial=useRef(JSON.stringify(draft.body)),version=useRef(draft.version);
 const dirty=JSON.stringify(body)!==initial.current;
 useEffect(()=>{dialog.current.showModal();},[]);
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function cancel(){if(busy)return;if(dirty&&!window.confirm('Scartare le modifiche non salvate?'))return;dialog.current.close();onClose();}
 function article(key,value){setBody(b=>({...b,articles:b.articles.map(a=>a.id===selection.articleId?{...a,[key]:value}:a)}));}
 async function save(e){e.preventDefault();if(locked.current)return;locked.current=true;setBusy(true);setError('');try{
 const r=await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',id:draft.id,version:version.current,body:selection.section==='tone'?{...body,tones:body.tones.map(t=>t.trim()).filter(Boolean)}:body})});const data=await r.json();if(!r.ok)throw Error(data.error||'Salvataggio non riuscito.');onSaved(data);dialog.current.close();onClose();
 }catch(e){setError(e.message+' Le modifiche restano in questa finestra.');}finally{locked.current=false;setBusy(false);}}
 const a=body.articles.find(a=>a.id===selection.articleId);
 return <dialog ref={dialog} className="section-edit-dialog" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();cancel();}}><form onSubmit={save}><div className="section-edit-heading"><small>MODIFICA BOZZA</small><h2 id={titleId}>{selection.section==='article'?'Modifica articolo':selection.label.charAt(0).toUpperCase()+selection.label.slice(1)}</h2><p>Salva la correzione in bozza. La pubblicazione resta un passaggio separato.</p></div><fieldset disabled={busy}>
 {selection.section==='intro'&&<label>Introduzione<textarea autoFocus rows={7} maxLength={6000} value={body.intro} onChange={e=>setBody({...body,intro:e.target.value})}/></label>}
 {selection.section==='keyPoints'&&body.keyPoints.map((point,i)=><label key={i}>Punto chiave {i+1}<textarea autoFocus={i===0} required rows={3} maxLength={1000} value={point} onChange={e=>setBody({...body,keyPoints:body.keyPoints.map((v,n)=>n===i?e.target.value:v)})}/></label>)}
 {selection.section==='keyPoints'&&body.keyPoints.length===0&&<p>I punti chiave non sono ancora stati preparati. Chiedi a GPT di completare la sezione.</p>}
 {selection.section==='tone'&&<><label>Toni prevalenti (uno per riga)<textarea autoFocus rows={3} value={body.tones.join('\n')} onChange={e=>setBody({...body,tones:e.target.value.split('\n')})}/></label><label>Analisi del tono<textarea rows={6} maxLength={3000} value={body.toneSummary||''} onChange={e=>setBody({...body,toneSummary:e.target.value})}/></label></>}
 {selection.section==='article'&&a&&<>{[['title','Titolo'],['outlet','Testata'],['author','Autore']].map(([key,label],i)=><label key={key}>{label}<input autoFocus={i===0} value={a[key]||''} required={key!=='author'} maxLength={key==='title'?400:key==='category'?100:150} onChange={e=>article(key,e.target.value)}/></label>)}<label>Categoria<select value={a.category} onChange={e=>article('category',e.target.value)}>{!editorialCategories.includes(a.category)&&<option value={a.category}>Da riclassificare: {a.category}</option>}{editorialCategories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>{a.category==='Editoriali'&&<label>Argomento dell’editoriale<select required value={a.topic||''} onChange={e=>article('topic',e.target.value)}><option value="" disabled>Seleziona l’argomento</option>{editorialTopics.map(t=><option key={t} value={t}>{t}</option>)}</select></label>}<label>Sintesi<textarea required rows={7} maxLength={6000} value={a.summary} onChange={e=>article('summary',e.target.value)}/></label><label>Peso editoriale<select value={a.rating} onChange={e=>article('rating',Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} su 5</option>)}</select></label></>}
 {error&&<p role="alert" className="section-edit-error">{error}</p>}<div className="section-edit-actions"><button type="button" onClick={cancel}>Annulla</button><button type="submit" disabled={!dirty}>{busy?'Salvataggio…':'Salva in bozza'}</button></div></fieldset></form></dialog>;
}
