'use client';
import {useEffect,useRef,useState} from 'react';
import {continuousClipReader} from '../../lib/continuous-clip-reader';
import {attachPdfPan} from '../../lib/pdf-pan';

export default function ArticleSourcePreview({clipId,title,pages=[],draftId,hasOriginal=false,pdfSession,sourceImportId}){
 const area=useRef(null),controls=useRef(null),[attempt,setAttempt]=useState(0),[error,setError]=useState('');
 const [mode,setMode]=useState('clip');
 const documents=useRef({}),positions=useRef({}),retry=useRef(()=>{});
 useEffect(()=>()=>{for(const entry of Object.values(documents.current)){entry.task.destroy().catch(()=>{});entry.worker.destroy();}documents.current={};},[]);
 const full=mode==='full',available=full?hasOriginal&&draftId:clipId,firstPage=pages[0]||1;
 useEffect(()=>{
  if(!available)return;
  const key=full?'full:'+draftId+':'+sourceImportId:'clip:'+clipId,state={closed:false,page:positions.current[key]||(full?firstPage:1),zoom:1},controller=new AbortController();let worker;
  retry.current=()=>{positions.current[key]=state.page;if(full)pdfSession?.clear();const entry=documents.current[key];delete documents.current[key];entry?.task.destroy().catch(()=>{});entry?.worker.destroy();setAttempt(n=>n+1);};
  const target=area.current;target.textContent=full?'Caricamento PDF completo…':'Caricamento ritaglio…';setError('');
  const buttons=Object.fromEntries([...controls.current.querySelectorAll('[data-control]')].map(el=>[el.dataset.control,el]));
  Object.values(buttons).forEach(el=>{if(el.tagName==='BUTTON'||el.tagName==='INPUT')el.disabled=true;});
  buttons.counter.textContent='…';
  (async()=>{try{
   const load=async signal=>{
    const response=full
     ?await fetch('/api/editor/original?draft='+encodeURIComponent(draftId)+'&format=json',{cache:'no-store',signal})
     :await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'asset',assetId:clipId}),signal});
    const result=await response.json();
    if(!response.ok)throw Object.assign(Error(result.error||'PDF non disponibile.'),{userMessage:true});
    const pdfjs=await import(/* webpackIgnore: true */ '/pdfjs/pdf.mjs');
    signal.throwIfAborted();
    pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';
    const pdfWorker=new pdfjs.PDFWorker();
    const task=pdfjs.getDocument({url:result.url,worker:pdfWorker,disableAutoFetch:full,disableStream:full,rangeChunkSize:262144,isEvalSupported:false,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/'});
    const dispose=()=>{task.destroy().catch(()=>{});pdfWorker.destroy();};
    signal.addEventListener('abort',dispose,{once:true});
    task.onProgress=({loaded,total})=>{if(!state.closed&&!state.doc&&total>0)target.textContent='Caricamento '+(full?'PDF completo':'ritaglio')+'… '+Math.min(100,Math.round(loaded/total*100))+'%';};
    try{const doc=await task.promise;if(!(full&&pdfSession))signal.removeEventListener('abort',dispose);return {doc,task,worker:pdfWorker};}catch(e){signal.removeEventListener('abort',dispose);dispose();throw e;}
   };
   const shared=full&&pdfSession;
   const entry=shared?await pdfSession.get(key,load):documents.current[key]||await load(controller.signal);
   if(state.closed){if(!shared){entry.task.destroy().catch(()=>{});entry.worker.destroy();}return;}
   state.doc=entry.doc;state.task=entry.task;worker=entry.worker;
   if(!shared)documents.current[key]=entry;
   state.disposePan=attachPdfPan(target);
   await continuousClipReader({state,area:target,title,...buttons,startPage:positions.current[key]||(full?firstPage:1),onPageError:()=>{if(!state.closed)setError('Questa pagina non è stata caricata. Premi Riprova PDF per rinnovare il collegamento e riprovare dalla stessa pagina.');},areaLabel:full?'Pagine del PDF completo a scorrimento':'Pagine del ritaglio a scorrimento'});
  }catch(e){if(!state.closed){target.textContent='';setError((e.userMessage?e.message:'PDF temporaneamente non disponibile.')+' Puoi continuare a correggere il testo o tornare al ritaglio.');}}})();
  return()=>{positions.current[key]=state.page;state.closed=true;controller.abort();state.disposeReader?.();state.disposePan?.();if(full&&pdfSession){if(state.task)state.task.onProgress=null;}else if(!documents.current[key]){state.task?.destroy().catch(()=>{});worker?.destroy();}};
 },[clipId,draftId,available,full,firstPage,attempt,pdfSession,sourceImportId]);
 return <aside className="article-source-preview" aria-label="PDF originale affiancato"><header><div><strong>{full?'PDF completo':'Ritaglio dell’articolo'}</strong><small>{pages.length?'Pagine '+pages.join(', ')+' della fonte':'Confronta e correggi'}</small></div><div className="article-source-switch" role="group" aria-label="Documento da consultare"><button type="button" aria-pressed={!full} onClick={()=>setMode('clip')}>Ritaglio</button><button type="button" aria-pressed={full} onClick={()=>setMode('full')}>PDF completo</button></div></header>
 {!available?<p className="article-source-status">{full?'PDF completo non disponibile per questa rassegna.':'Nessun ritaglio associato a questo articolo.'}</p>:<>{error&&<div className="article-source-status" role="alert"><p>{error}</p><button type="button" onClick={()=>retry.current()}>Riprova PDF</button></div>}<div ref={area} className="article-source-pages"/><nav ref={controls} aria-label="Controlli PDF originale"><button type="button" data-control="previous" aria-label="Pagina originale precedente">←</button><input className="pdf-page-input" data-control="pageInput" type="number" min="1" step="1" required aria-label="Vai alla pagina"/><span data-control="counter">…</span><button type="button" data-control="goToPage">Vai</button><button type="button" data-control="next" aria-label="Pagina originale successiva">→</button><button type="button" data-control="minus" aria-label="Riduci originale">−</button><span data-control="zoomLabel">100%</span><button type="button" data-control="plus" aria-label="Ingrandisci originale">+</button><button type="button" data-control="fit">Adatta</button></nav></>}
 </aside>;
}
