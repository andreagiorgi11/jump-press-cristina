 'use client';
import {allDraftArticles,promoteReserve,parkArticle} from '../../lib/reserve-articles';
import {saveWithRecovery} from '../../lib/save-recovery';
import ArticleSourcePreview from './ArticleSourcePreview';
import {isEditorial,showAuthor} from '../../lib/article-author';
import {summaryCategory,articleSections,NATIONAL_TEAM} from '../../lib/summary-sections';
import {outletOptions} from '../../lib/outlet-options';
import {sectionArticleIds,moveArticleInSection} from '../../lib/article-position';
import {parseKeyPoint,formatKeyPoint} from '../../lib/key-point-signals';
import {useEffect,useState,useRef,useId} from 'react';
export default function RevisionEditor({draft,pdfSession,selection,onSaved,onReload,onClose}){
 const [body,setBody]=useState(()=>structuredClone(draft.body)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [replaceId,setReplaceId]=useState(''),[placement,setPlacement]=useState(null),[insertPosition,setInsertPosition]=useState('');
 const articleList=selection.reserved?'reserveArticles':'articles';
 const [desktop,setDesktop]=useState(false);
 useEffect(()=>{const query=window.matchMedia('(min-width: 1100px)');const update=()=>setDesktop(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 const dialog=useRef(null),locked=useRef(false),backdropPress=useRef(false),titleId=useId();
 const baseline=useRef(draft),[conflict,setConflict]=useState(null);
 const initial=useRef(JSON.stringify(draft.body)),version=useRef(draft.version);
 const dirty=JSON.stringify(body)!==initial.current;
 useEffect(()=>{dialog.current.showModal();},[]);
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function cancel(){if(busy)return;if(dirty&&!window.confirm('Scartare le modifiche non salvate?'))return;dialog.current.close();onClose();}
 function outsideDialog(e){const box=e.currentTarget.getBoundingClientRect();return e.target===e.currentTarget&&(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom);}
 function backdropClick(e){const startedOutside=backdropPress.current;backdropPress.current=false;if(startedOutside&&outsideDialog(e)&&!dirty&&!busy)cancel();}
 function article(key,value){setBody(b=>({...b,[articleList]:(b[articleList]||[]).map(a=>a.id===selection.articleId?{...a,[key]:value}:a)}));}
 function exportChanges(){const url=URL.createObjectURL(new Blob([JSON.stringify(body,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='modifiche-'+draft.body.date+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function loadLatest(){if(!conflict||!window.confirm('Caricare la versione del server? Prima scarica una copia se vuoi conservare le tue modifiche.'))return;baseline.current=conflict;version.current=conflict.version;initial.current=JSON.stringify(conflict.body);setBody(structuredClone(conflict.body));onReload?.(conflict);setConflict(null);setError('Versione aggiornata caricata.');}
 async function save(e,next=body){e?.preventDefault();if(locked.current||conflict)return;locked.current=true;setBusy(true);setError('');try{
 const input=selection.section==='tone'?{...next,tones:next.tones.map(t=>t.trim()).filter(Boolean)}:next;
 const result=await saveWithRecovery(baseline.current,input,{introConfirmed:selection.section==='intro'});
 if(result.saved){onSaved(result.draft);dialog.current.close();onClose();return;}
 if(result.conflicts.length){setConflict(result.draft);setError('La bozza è cambiata anche nei contenuti che stai modificando. Scarica una copia delle tue modifiche prima di caricare la versione aggiornata.');return;}
 baseline.current=result.draft;version.current=result.draft.version;initial.current=JSON.stringify(result.draft.body);setPlacement(null);setBody(result.body);
 setError('Modifiche conservate e versione aggiornata verificata. Controlla il testo e premi Salva in bozza per confermare.');
 }catch(e){setError(e.message+' Le modifiche restano in questa finestra.');}finally{locked.current=false;setBusy(false);}}

 const a=(body[articleList]||[]).find(a=>a.id===selection.articleId);
 const categories=articleSections;
 // Removing an article saves at once: counts, sections and charts are derived from the remaining articles.
 function remove(){if(busy||!a||(!selection.reserved&&body.articles.length<2))return;if(!window.confirm('Eliminare dalla bozza l’articolo «'+a.title+'»? Il conteggio degli articoli si aggiorna.'))return;save(null,{...body,[articleList]:body[articleList].filter(x=>x.id!==a.id)});}
 const outlets=outletOptions(body,draft.assets);
 const summaryView=process.env.NEXT_PUBLIC_JUMP_APPROVAL_LIVE==='1'||body.editorialModel==='summary-v1';
 const sectionIds=a&&!selection.reserved?sectionArticleIds(body,a.id,summaryView):[];
 function choosePlacement(mode){if(!dialog.current.querySelector('form').reportValidity())return;setReplaceId('');setInsertPosition('');setPlacement(mode);}
 const promoted=selection.reserved&&a?promoteReserve(body,a.id):null;
 const insertionIds=promoted?sectionArticleIds(promoted,a.id,summaryView):[];
 function confirmPlacement(){
  if(!dialog.current.querySelector('form').reportValidity())return;
  if(placement==='add'&&insertPosition){save(null,moveArticleInSection(promoted,a.id,Number(insertPosition),summaryView));}
  else if(placement==='replace'&&replaceId){save(null,promoteReserve(body,a.id,replaceId));}
 }
 const actions=<div className="section-edit-actions">{selection.section==='article'&&a&&(selection.reserved||body.articles.length>1)&&<button type="button" className="section-edit-delete" onClick={remove}>Elimina articolo</button>}{selection.section==='article'&&a&&!selection.reserved&&body.articles.length>1&&<button type="button" disabled={!!conflict} onClick={()=>save(null,parkArticle(body,a.id))}>Sposta in seconda scelta</button>}<button type="button" onClick={cancel}>Annulla</button><button form={titleId+'-form'} className={selection.reserved?'reserve-save-only':undefined} type="submit" disabled={(!dirty&&!(selection.section==='intro'&&body.introStale))||!!conflict}>{busy?'Salvataggio…':selection.section==='intro'&&body.introStale&&!dirty?'Conferma cappello':selection.reserved?'Salva':'Salva in bozza'}</button>{selection.reserved&&a&&<><button type="button" className="reserve-save-add" disabled={!!conflict} onClick={()=>choosePlacement('add')}>Salva e aggiungi</button><button type="button" disabled={!!conflict} onClick={()=>choosePlacement('replace')}>Salva e sostituisci</button></>}</div>;
 return <dialog ref={dialog} className={"section-edit-dialog"+(selection.reserved?' reserve-edit-dialog':'')+(selection.section==='article'?' article-edit-dialog'+(desktop?' article-edit-split':''):'')} aria-labelledby={titleId} onPointerDown={e=>{backdropPress.current=outsideDialog(e);}} onPointerCancel={()=>{backdropPress.current=false;}} onClick={backdropClick} onCancel={e=>{e.preventDefault();cancel();}}><form id={titleId+'-form'} onSubmit={save}><div className="section-edit-heading"><small>MODIFICA BOZZA</small><h2 id={titleId}>{selection.section==='article'?'Modifica articolo':selection.label.charAt(0).toUpperCase()+selection.label.slice(1)}</h2><p>Salva la correzione in bozza. La pubblicazione resta un passaggio separato.</p></div><fieldset disabled={busy}>
 {selection.section==='intro'&&<label>Introduzione<textarea autoFocus rows={7} maxLength={6000} value={body.intro} onChange={e=>setBody({...body,intro:e.target.value})}/></label>}
 {selection.section==='keyPoints'&&<><p>Seleziona i punti rilevanti della giornata, fino a cinque, senza quote per positivi e negativi.</p>{body.keyPoints.map((point,i)=>{const signal=parseKeyPoint(point);const update=(kind,text)=>setBody(b=>({...b,keyPoints:b.keyPoints.map((v,n)=>n===i?formatKeyPoint(kind,text):v)}));return <div key={i}><label>Valutazione del punto {i+1}<select value={signal.kind} onChange={e=>update(e.target.value,signal.text)}><option value="neutro">Non classificato</option><option value="positivo">Positivo</option><option value="negativo">Negativo</option></select></label><label>Punto chiave {i+1}<textarea autoFocus={i===0} required rows={3} maxLength={signal.kind==='neutro'?1000:990} value={signal.text} onChange={e=>update(signal.kind,e.target.value)}/></label><button type="button" onClick={()=>setBody(b=>({...b,keyPoints:b.keyPoints.filter((_,n)=>n!==i)}))}>Rimuovi punto {i+1}</button></div>;})}{body.keyPoints.length<5&&<button type="button" onClick={()=>setBody(b=>({...b,keyPoints:[...b.keyPoints,'Positivo: ']}))}>Aggiungi punto chiave</button>}</>}
 {selection.section==='tone'&&<><label>Toni prevalenti (uno per riga)<textarea autoFocus rows={3} value={body.tones.join('\n')} onChange={e=>setBody({...body,tones:e.target.value.split('\n')})}/></label><label>Analisi del tono<textarea rows={6} maxLength={3000} value={body.toneSummary||''} onChange={e=>setBody({...body,toneSummary:e.target.value})}/></label></>}
 {selection.section==='article'&&a&&<div className="article-edit-fields">
 <div className="article-placement-row"><label>Categoria<select value={a.category===NATIONAL_TEAM?NATIONAL_TEAM:summaryCategory(a)} onChange={e=>article('category',e.target.value)}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>{!selection.reserved&&<label>Posizione nella sezione<select value={sectionIds.indexOf(a.id)+1} onChange={e=>setBody(b=>moveArticleInSection(b,a.id,Number(e.target.value),summaryView))}>{sectionIds.map((id,index)=><option key={id} value={index+1}>{index+1} di {sectionIds.length}</option>)}</select></label>}</div>
 <div className="article-source-row"><label><span className="article-source-label">Testata</span><select required value={a.outlet} onChange={e=>article('outlet',e.target.value)}>{outlets.map(name=><option key={name} value={name}>{name}</option>)}</select></label><div className="article-author-field"><div className="article-field-heading"><label htmlFor={titleId+'-author'}>Autore</label><label className="article-check-option"><input type="checkbox" checked={showAuthor(a)} onChange={e=>article('showAuthor',e.target.checked)}/><span>Mostra autore</span></label></div><input id={titleId+'-author'} value={a.author||''} maxLength={150} onChange={e=>article('author',e.target.value)}/></div></div>
 <div className="article-title-heading"><label htmlFor={titleId+'-title'}>Titolo</label><label className="article-check-option"><input type="checkbox" checked={isEditorial(a)} onChange={e=>article('isEditorial',e.target.checked)}/><span>Editoriale</span></label></div><textarea id={titleId+'-title'} className="article-title-input" autoFocus rows={2} value={a.title} required maxLength={400} onChange={e=>article('title',e.target.value)}/>
 <label className="article-summary-field">Sintesi<textarea required rows={selection.reserved?4:5} maxLength={6000} value={a.summary} onChange={e=>article('summary',e.target.value)}/></label>
 {selection.reserved&&<><label>Motivo della seconda scelta<textarea rows={2} maxLength={600} value={a.reserveReason||''} onChange={e=>article('reserveReason',e.target.value)}/></label></>}
 </div>}
 {error&&<><p role="alert" className="section-edit-error">{error}</p><button type="button" onClick={exportChanges}>Scarica le mie modifiche</button>{conflict&&<button type="button" onClick={loadLatest}>Carica versione aggiornata</button>}</>}{!selection.reserved&&actions}</fieldset></form>{selection.section==='article'&&a&&<ArticleSourcePreview pdfSession={pdfSession} sourceImportId={draft.body.sourceImportId} draftId={draft.id} hasOriginal={!!draft.body.sourceImportId} clipId={a.clipId} title={allDraftArticles(draft.body).find(item=>item.id===a.id)?.title||a.title} pages={a.pages}/>}{selection.reserved&&<fieldset className="reserve-dialog-footer" disabled={busy}>{placement&&a&&<ReservePlacementDialog mode={placement} busy={busy} onClose={()=>setPlacement(null)}><p className="reserve-placement-context">{a.title}</p><label>{placement==='add'?'Posizione nella categoria «'+a.category+'»':'Articolo da sostituire'}<select autoFocus value={placement==='add'?insertPosition:replaceId} onChange={e=>placement==='add'?setInsertPosition(e.target.value):setReplaceId(e.target.value)}><option value="">Scegli…</option>{placement==='add'?insertionIds.map((id,i)=>{const existing=body.articles.find(item=>item.id===id);return <option key={id} value={i+1}>{i+1} · {existing?'Prima di: '+existing.title:'In fondo alla categoria'}</option>}):body.articles.map(item=><option key={item.id} value={item.id}>{item.category} · {item.title}</option>)}</select></label>{placement==='replace'&&<p>L’articolo sostituito rimane in seconda scelta.</p>}{error&&<p role="alert" className="reserve-placement-error">{error}</p>}<div className="reserve-placement-actions"><button type="button" onClick={()=>setPlacement(null)}>Annulla</button><button className="reserve-placement-confirm" type="button" disabled={busy||!!conflict||!(placement==='add'?insertPosition:replaceId)} onClick={confirmPlacement}>{busy?'Salvataggio…':placement==='add'?'Conferma e aggiungi':'Conferma e sostituisci'}</button></div></ReservePlacementDialog>}{actions}</fieldset>}</dialog>;
}

function ReservePlacementDialog({mode,busy,onClose,children}){
 const ref=useRef(null),id=useId();
 useEffect(()=>{const node=ref.current;node.showModal();return()=>{if(node.open)node.close();};},[]);
 return <dialog ref={ref} className="reserve-placement-prompt" aria-labelledby={id} onCancel={e=>{e.preventDefault();e.stopPropagation();if(!busy)onClose();}} onClick={e=>e.stopPropagation()}>
 <header><div><span className="reserve-placement-eyebrow">SECONDA SCELTA</span><h2 id={id}>{mode==='add'?'Aggiungi alla rassegna':'Sostituisci un articolo'}</h2></div><button className="reserve-placement-close" type="button" aria-label="Chiudi scelta inserimento" disabled={busy} onClick={onClose}>×</button></header>
 {children}
 </dialog>;
}
