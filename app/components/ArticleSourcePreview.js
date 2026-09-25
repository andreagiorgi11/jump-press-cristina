'use client';
import {useEffect,useRef,useState} from 'react';
import {continuousClipReader} from '../../lib/continuous-clip-reader';
import {attachPdfPan} from '../../lib/pdf-pan';

export default function ArticleSourcePreview({clipId,title,pages=[]}){
 const area=useRef(null),controls=useRef(null),[attempt,setAttempt]=useState(0),[error,setError]=useState('');
 useEffect(()=>{
  if(!clipId)return;
  const state={closed:false,page:1,zoom:1},controller=new AbortController();let worker;
  const target=area.current;target.textContent='Caricamento PDF originale…';setError('');
  const buttons=Object.fromEntries([...controls.current.querySelectorAll('[data-control]')].map(el=>[el.dataset.control,el]));
  Object.values(buttons).forEach(el=>{if(el.tagName==='BUTTON')el.disabled=true;});
  (async()=>{try{
   const response=await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'asset',assetId:clipId}),signal:controller.signal});
   if(!response.ok)throw Error('PDF originale non disponibile.');
   const {url}=await response.json(),pdfjs=await import(/* webpackIgnore: true */ '/pdfjs/pdf.mjs');
   if(state.closed)return;
   pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';worker=new pdfjs.PDFWorker();
   state.task=pdfjs.getDocument({url,worker,isEvalSupported:false,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/'});
   state.doc=await state.task.promise;if(state.closed)return;
   state.disposePan=attachPdfPan(target);
   await continuousClipReader({state,area:target,title,...buttons});
  }catch(e){if(!state.closed){target.textContent='';setError('PDF originale non disponibile. Puoi continuare a correggere il testo o riprovare.');}}})();
  return()=>{state.closed=true;controller.abort();state.disposeReader?.();state.disposePan?.();state.task?.destroy().catch(()=>{});worker?.destroy();};
 },[clipId,attempt]);
 return <aside className="article-source-preview" aria-label="PDF originale affiancato"><header><div><strong>PDF originale</strong><small>{pages.length?'Pagine '+pages.join(', ')+' della fonte':'Ritaglio dell’articolo'}</small></div><span>Confronta e correggi</span></header>
 {!clipId?<p className="article-source-status">Nessun PDF associato a questo articolo.</p>:<>{error&&<div className="article-source-status" role="alert"><p>{error}</p><button type="button" onClick={()=>setAttempt(n=>n+1)}>Riprova PDF</button></div>}<div ref={area} className="article-source-pages"/><nav ref={controls} aria-label="Controlli PDF originale"><button type="button" data-control="previous" aria-label="Pagina originale precedente">←</button><span data-control="counter">…</span><button type="button" data-control="next" aria-label="Pagina originale successiva">→</button><button type="button" data-control="minus" aria-label="Riduci originale">−</button><span data-control="zoomLabel">100%</span><button type="button" data-control="plus" aria-label="Ingrandisci originale">+</button><button type="button" data-control="fit">Adatta</button></nav></>}
 </aside>;
}
