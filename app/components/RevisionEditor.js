 'use client';
import {isEditorial,showAuthor} from '../../lib/article-author';
import {summaryAreas} from '../../lib/schema';
import {summaryCategory} from '../../lib/summary-sections';
import {outletOptions} from '../../lib/outlet-options';
import {sectionArticleIds,moveArticleInSection} from '../../lib/article-position';
import {parseKeyPoint,formatKeyPoint} from '../../lib/key-point-signals';
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
 const categories=summaryAreas;
 const outlets=outletOptions(body,draft.assets);
 const summaryView=process.env.NEXT_PUBLIC_JUMP_APPROVAL_LIVE==='1'||body.editorialModel==='summary-v1';
 const sectionIds=a?sectionArticleIds(body,a.id,summaryView):[];
 return <dialog ref={dialog} className={"section-edit-dialog"+(selection.section==='article'?' article-edit-dialog':'')} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();cancel();}}><form onSubmit={save}><div className="section-edit-heading"><small>MODIFICA BOZZA</small><h2 id={titleId}>{selection.section==='article'?'Modifica articolo':selection.label.charAt(0).toUpperCase()+selection.label.slice(1)}</h2><p>Salva la correzione in bozza. La pubblicazione resta un passaggio separato.</p></div><fieldset disabled={busy}>
 {selection.section==='intro'&&<label>Introduzione<textarea autoFocus rows={7} maxLength={6000} value={body.intro} onChange={e=>setBody({...body,intro:e.target.value})}/></label>}
 {selection.section==='keyPoints'&&<><p>Seleziona i punti rilevanti della giornata, fino a cinque, senza quote per positivi e negativi.</p>{body.keyPoints.map((point,i)=>{const signal=parseKeyPoint(point);const update=(kind,text)=>setBody(b=>({...b,keyPoints:b.keyPoints.map((v,n)=>n===i?formatKeyPoint(kind,text):v)}));return <div key={i}><label>Valutazione del punto {i+1}<select value={signal.kind} onChange={e=>update(e.target.value,signal.text)}><option value="neutro">Non classificato</option><option value="positivo">Positivo</option><option value="negativo">Negativo</option></select></label><label>Punto chiave {i+1}<textarea autoFocus={i===0} required rows={3} maxLength={signal.kind==='neutro'?1000:990} value={signal.text} onChange={e=>update(signal.kind,e.target.value)}/></label><button type="button" onClick={()=>setBody(b=>({...b,keyPoints:b.keyPoints.filter((_,n)=>n!==i)}))}>Rimuovi punto {i+1}</button></div>;})}{body.keyPoints.length<5&&<button type="button" onClick={()=>setBody(b=>({...b,keyPoints:[...b.keyPoints,'Positivo: ']}))}>Aggiungi punto chiave</button>}</>}
 {selection.section==='tone'&&<><label>Toni prevalenti (uno per riga)<textarea autoFocus rows={3} value={body.tones.join('\n')} onChange={e=>setBody({...body,tones:e.target.value.split('\n')})}/></label><label>Analisi del tono<textarea rows={6} maxLength={3000} value={body.toneSummary||''} onChange={e=>setBody({...body,toneSummary:e.target.value})}/></label></>}
 {selection.section==='article'&&a&&<div className="article-edit-fields">
 <div className="article-placement-row"><label>Categoria<select value={summaryCategory(a)} onChange={e=>article('category',e.target.value)}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label><label>Posizione nella sezione<select value={sectionIds.indexOf(a.id)+1} onChange={e=>setBody(b=>moveArticleInSection(b,a.id,Number(e.target.value),summaryView))}>{sectionIds.map((id,index)=><option key={id} value={index+1}>{index+1} di {sectionIds.length}</option>)}</select></label></div>
 <div className="article-source-row"><label><span className="article-source-label">Testata</span><select required value={a.outlet} onChange={e=>article('outlet',e.target.value)}>{outlets.map(name=><option key={name} value={name}>{name}</option>)}</select></label><div className="article-author-field"><div className="article-field-heading"><label htmlFor={titleId+'-author'}>Autore</label><label className="article-check-option"><input type="checkbox" checked={showAuthor(a)} onChange={e=>article('showAuthor',e.target.checked)}/><span>Mostra autore</span></label></div><input id={titleId+'-author'} value={a.author||''} maxLength={150} onChange={e=>article('author',e.target.value)}/></div></div>
 <div className="article-title-heading"><label htmlFor={titleId+'-title'}>Titolo</label><label className="article-check-option"><input type="checkbox" checked={isEditorial(a)} onChange={e=>article('isEditorial',e.target.checked)}/><span>Editoriale</span></label></div><textarea id={titleId+'-title'} className="article-title-input" autoFocus rows={2} value={a.title} required maxLength={400} onChange={e=>article('title',e.target.value)}/>
 <label className="article-summary-field">Sintesi<textarea required rows={5} maxLength={6000} value={a.summary} onChange={e=>article('summary',e.target.value)}/></label>
 </div>}
 {error&&<p role="alert" className="section-edit-error">{error}</p>}<div className="section-edit-actions"><button type="button" onClick={cancel}>Annulla</button><button type="submit" disabled={!dirty}>{busy?'Salvataggio…':'Salva in bozza'}</button></div></fieldset></form></dialog>;
}
