'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {continuousClipReader} from '../lib/continuous-clip-reader';
import {createClipAccess,waitForPreparedClip} from '../lib/clip-access';
import {attachPdfPan} from '../lib/pdf-pan';

export default function PdfLinkHandler(){
 const path=usePathname();
 useEffect(()=>{
  let active=null,worker=null,disposed=false,warmTimer=null;
  const cacheLifetime=5*60*1000;
  const cachedPdfs=new Map();
  const pendingPdfs=new Map(),controllers=new Set(),pendingControllers=new Map();
  const publicBytes=url=>{
   const key=new URL(url,location.href).href,cached=cachedPdfs.get(key);
   if(cached&&Date.now()-cached.at<cacheLifetime)return Promise.resolve(cached.bytes);
   if(pendingPdfs.has(key))return pendingPdfs.get(key);
   if(pendingPdfs.size>=2)return Promise.resolve(null);
   const controller=new AbortController();controllers.add(controller);pendingControllers.set(key,controller);const timeout=setTimeout(()=>controller.abort(),8000);
   const request=fetch(key,{signal:controller.signal}).then(async response=>{
    if(!response.ok||!response.headers.get('content-type')?.includes('application/pdf'))return null;
    if(Number(response.headers.get('content-length'))>8*1024*1024)return null;
    const bytes=new Uint8Array(await response.arrayBuffer());if(disposed||bytes.byteLength>8*1024*1024)return null;
    cachedPdfs.delete(key);cachedPdfs.set(key,{bytes,at:Date.now()});while(cachedPdfs.size>6)cachedPdfs.delete(cachedPdfs.keys().next().value);return bytes;
   }).catch(()=>null).finally(()=>{clearTimeout(timeout);if(pendingPdfs.get(key)===request){pendingPdfs.delete(key);pendingControllers.delete(key);}controllers.delete(controller);});
   pendingPdfs.set(key,request);return request;
  };
  const access=createClipAccess({onDenied:()=>{cachedPdfs.clear();controllers.forEach(c=>c.abort());}});
  const privateUrl=id=>access.url(id);
  let contextGeneration=0,nearObserver=null;
  const contextChanged=e=>{
   contextGeneration++;access.replace(e.detail?.links||{});cachedPdfs.clear();controllers.forEach(c=>c.abort());pendingPdfs.clear();pendingControllers.clear();nearObserver?.disconnect();close();
   const connection=navigator.connection;
   if(!e.detail?.key||connection?.saveData||/2g/.test(connection?.effectiveType||''))return;
   let warmed=0;
   nearObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&warmed<2){nearObserver.unobserve(entry.target);warmed++;warmPrivate(entry.target.dataset.clipId);}}},{rootMargin:'180px'});
   document.querySelectorAll('.articles > article[data-private-clip="true"][data-clip-id]').forEach(row=>nearObserver.observe(row));
  };
  const pdfModule=()=>import(/* webpackIgnore: true */ '/pdfjs/pdf.mjs');
  const prepareReader=()=>pdfModule().then(pdfjs=>{if(disposed)return;pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';if(!worker)worker=new pdfjs.PDFWorker();});
  const warmPrivate=async clipId=>{
   const cached=cachedPdfs.get(clipId);if(cached&&Date.now()-cached.at<cacheLifetime||pendingPdfs.has(clipId)||pendingPdfs.size>=2)return;
   const epoch=contextGeneration;const controller=new AbortController();controllers.add(controller);pendingControllers.set(clipId,controller);const timeout=setTimeout(()=>controller.abort(),8000);
   const request=(async()=>{try{
    const url=await privateUrl(clipId);if(disposed||epoch!==contextGeneration)return;
    const response=await fetch(url,{signal:controller.signal});
    if(!response.ok||!response.headers.get('content-type')?.includes('application/pdf'))return;
    if(Number(response.headers.get('content-length'))>8*1024*1024)return;
    const bytes=new Uint8Array(await response.arrayBuffer());if(disposed||epoch!==contextGeneration||bytes.byteLength>8*1024*1024)return;
    cachedPdfs.set(clipId,{bytes,at:Date.now()});while(cachedPdfs.size>6)cachedPdfs.delete(cachedPdfs.keys().next().value);
   }catch{}finally{clearTimeout(timeout);if(pendingPdfs.get(clipId)===request){pendingPdfs.delete(clipId);pendingControllers.delete(clipId);}controllers.delete(controller);}})();
   pendingPdfs.set(clipId,request);return request;
  };
  const idleWarm=setTimeout(()=>prepareReader().catch(()=>{}),800);
  const close=()=>{
   const state=active;if(!state)return;active=null;state.closed=true;
   state.disposeReader?.();state.disposePan?.();state.render?.cancel();state.task?.destroy().catch(()=>{});state.dialog.remove();
   document.body.style.overflow=state.overflow;state.focus?.focus();
  };
  const articleContext=clipId=>{
   const rows=[...document.querySelectorAll('.articles > article[data-clip-id]')].filter(a=>!a.hidden).map(a=>({clipId:a.dataset.clipId,private:a.dataset.privateClip==='true',title:a.querySelector('h2')?.textContent||'Ritaglio'}));
   const index=rows.findIndex(a=>a.clipId===clipId);return index<0?null:{rows,index};
  };
  const open=async(url,title='Ritaglio completo',context=null,privateClipId=null)=>{
   close();const dialog=document.createElement('dialog');dialog.className='jump-clip-dialog is-loading';dialog.setAttribute('aria-label',title);
   // Popup sized so the whole first page is visible (then − / + to zoom, scroll for the next pages).
   // A4 estimate before paint, refined with the real page proportions once the PDF is open.
   const fitWidth=ratio=>{const phone=window.innerWidth<=600,room=window.innerHeight-(phone?16:48)-56-(phone?16:24);return Math.round(Math.min(window.innerWidth-(phone?16:32),room*ratio+(phone?16:24)+12));};
   dialog.style.width=fitWidth(.707)+'px';
   dialog.style.setProperty('--clip-loading-height',Math.max(160,Math.min(window.innerHeight-150,(fitWidth(.707)-24)/.707))+'px');
   const state={openedAt:performance.now(),dialog,focus:document.activeElement,overflow:document.body.style.overflow,closed:false,page:1,zoom:1};active=state;
   const bar=document.createElement('div');bar.className='jump-clip-bar';
   // Only what reading needs (24/09/2026): the article title and Chiudi on top, the pages as large as possible
   // (scrolled top to bottom), and a floating − / + for zoom. No clip switching, page buttons or "Adatta".
   const label=document.createElement('strong');label.textContent=title;
   const button=document.createElement('button');button.type='button';button.textContent='Chiudi ×';button.setAttribute('aria-label','Chiudi ritaglio');button.onclick=close;bar.append(label,button);
   const controls=document.createElement('div');controls.className='jump-clip-navigation';
   const makeButton=(text,aria,shown=true)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',aria);b.disabled=true;if(shown)controls.append(b);return b;};
   // The reader still updates page and zoom state on these; they are simply not displayed.
   const previous=makeButton('←','Pagina precedente',false),counter=document.createElement('span');
   const next=makeButton('→','Pagina successiva',false),minus=makeButton('−','Riduci ingrandimento'),plus=makeButton('+','Aumenta ingrandimento'),fit=makeButton('Adatta','Adatta ritaglio alla larghezza',false);
   const zoomLabel=document.createElement('span');
   const area=document.createElement('div');area.className='jump-clip-pages';
   state.disposePan=attachPdfPan(area);
   const status=document.createElement('p');status.setAttribute('role','status');status.className='clip-loading-status';status.textContent='Apertura ritaglio…';area.append(status);area.setAttribute('aria-busy','true');
   dialog.append(bar,area,controls);document.body.append(dialog);
   dialog.addEventListener('cancel',e=>{e.preventDefault();close();});let backdropDown=false;dialog.addEventListener('pointerdown',e=>{backdropDown=e.target===dialog;});dialog.addEventListener('click',e=>{if(backdropDown&&e.target===dialog)close();backdropDown=false;});dialog.showModal();document.body.style.overflow='hidden';button.focus();
   try{
    const cacheKey=privateClipId||new URL(url,location.href).href;
    const [pdfjs,resolvedUrl]=await Promise.all([pdfModule(),privateClipId?privateUrl(privateClipId):Promise.resolve(url),waitForPreparedClip(pendingPdfs.get(cacheKey),()=>pendingControllers.get(cacheKey)?.abort())]);if(state.closed||disposed)return;
    dialog.dataset.accessMs=String(Math.round(performance.now()-state.openedAt));
    pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';
    if(!worker)worker=new pdfjs.PDFWorker();
    const cached=cachedPdfs.get(cacheKey);
    const source=cached&&Date.now()-cached.at<cacheLifetime?{data:cached.bytes.slice()}:{url:resolvedUrl};
    dialog.dataset.source=source.data?'memory':'network';
    state.task=pdfjs.getDocument({...source,worker,isEvalSupported:false,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/'});
    state.doc=await state.task.promise;if(state.closed)return;dialog.dataset.documentMs=String(Math.round(performance.now()-state.openedAt));
    {const first=(await state.doc.getPage(1)).getViewport({scale:1});if(state.closed)return;dialog.style.width=fitWidth(first.width/first.height)+'px';}await continuousClipReader({state,area,title,previous,next,minus,plus,fit,counter,zoomLabel,onFirstPaint:()=>{dialog.dataset.firstPageMs=String(Math.round(performance.now()-state.openedAt));}});
    dialog.classList.remove('is-loading');area.setAttribute('aria-busy','false');
    // Bounded, memory-only reuse; private access is checked again on every open.
    if(!state.closed)state.doc.getData().then(bytes=>{
     if(state.closed||disposed||bytes.byteLength>8*1024*1024)return;
     cachedPdfs.delete(cacheKey);cachedPdfs.set(cacheKey,{bytes:bytes.slice(),at:Date.now()});
     while(cachedPdfs.size>6)cachedPdfs.delete(cachedPdfs.keys().next().value);
    }).catch(()=>{});
   }catch(error){if(!state.closed){dialog.classList.remove('is-loading');dialog.classList.add('has-error');area.setAttribute('aria-busy','false');status.textContent='Ritaglio non disponibile. Chiudi e riprova tra poco.';area.replaceChildren(status);}}
  };
  const onClick=e=>{
   const a=e.target.closest?.('a[href]');if(!a||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
   const url=new URL(a.href,location.href);if(url.origin!==location.origin)return;
   if(!/^\/(?:ritaglio\/|ritagli\/|api\/clips\/|api\/r\d{8}-(?:article|clip)(?:\/|$))/.test(url.pathname))return;
   if(url.pathname.startsWith('/ritaglio/')){url.pathname=url.pathname.replace('/ritaglio/','/ritagli/')+'.pdf';url.search='?raw=1';}
   if(url.pathname.startsWith('/ritagli/'))url.searchParams.set('raw','1');
   e.preventDefault();open(url.href,a.closest('article')?.querySelector('h2')?.textContent||'Ritaglio completo',articleContext(a.closest('article')?.dataset.clipId));
  };
  const onPrivate=e=>{if(e.detail?.url||e.detail?.clipId){const context=articleContext(e.detail.clipId);open(e.detail.url,context?.rows[context.index].title||'Prima pagina',context,e.detail.url?null:e.detail.clipId);}};
  const warm=e=>{
   const target=e.target.closest?.('.article-title-link,a[href]');if(!target)return;
   clearTimeout(warmTimer);
   const row=target.closest('[data-private-clip="true"][data-clip-id]');
   if(row){warmTimer=setTimeout(()=>{if(!disposed){prepareReader().catch(()=>{});warmPrivate(row.dataset.clipId);}},180);return;}
   if(!target.href)return;const url=new URL(target.href,location.href);
   if(url.origin!==location.origin||!url.pathname.startsWith('/api/clips/'))return;
   warmTimer=setTimeout(()=>{if(!disposed){prepareReader().catch(()=>{});publicBytes(url.href);}},180);
  };
  const cancelWarm=()=>clearTimeout(warmTimer);
  window.addEventListener('jump-clip-context',contextChanged);
  document.addEventListener('pointerout',cancelWarm);document.addEventListener('focusout',cancelWarm);
  document.addEventListener('pointerover',warm);document.addEventListener('focusin',warm);
  document.addEventListener('click',onClick,true);window.addEventListener('jump-open-clip',onPrivate);
  return()=>{disposed=true;nearObserver?.disconnect();window.removeEventListener('jump-clip-context',contextChanged);access.replace();clearTimeout(idleWarm);clearTimeout(warmTimer);document.removeEventListener('pointerout',cancelWarm);document.removeEventListener('focusout',cancelWarm);close();controllers.forEach(c=>c.abort());cachedPdfs.clear();worker?.destroy();document.removeEventListener('pointerover',warm);document.removeEventListener('focusin',warm);document.removeEventListener('click',onClick,true);window.removeEventListener('jump-open-clip',onPrivate);};
 },[path]);
 return null;
}
