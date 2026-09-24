'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {continuousClipReader} from '../lib/continuous-clip-reader';
import {attachPdfPan} from '../lib/pdf-pan';

export default function PdfLinkHandler(){
 const path=usePathname();
 useEffect(()=>{
  let active=null,worker=null,disposed=false;
  const cachedPdfs=new Map();
  const pendingPdfs=new Map(),controllers=new Set();
  const publicBytes=url=>{
   const key=new URL(url,location.href).href,cached=cachedPdfs.get(key);
   if(cached&&Date.now()-cached.at<60000)return Promise.resolve(cached.bytes);
   if(pendingPdfs.has(key))return pendingPdfs.get(key);
   if(pendingPdfs.size>=2)return Promise.resolve(null);
   const controller=new AbortController();controllers.add(controller);
   const request=fetch(key,{signal:controller.signal}).then(async response=>{
    if(!response.ok||!response.headers.get('content-type')?.includes('application/pdf'))return null;
    if(Number(response.headers.get('content-length'))>8*1024*1024)return null;
    const bytes=new Uint8Array(await response.arrayBuffer());if(disposed||bytes.byteLength>8*1024*1024)return null;
    cachedPdfs.delete(key);cachedPdfs.set(key,{bytes,at:Date.now()});while(cachedPdfs.size>3)cachedPdfs.delete(cachedPdfs.keys().next().value);return bytes;
   }).catch(()=>null).finally(()=>{pendingPdfs.delete(key);controllers.delete(controller);});
   pendingPdfs.set(key,request);return request;
  };
  const privateUrl=async clipId=>{const response=await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'asset',assetId:clipId})});const data=await response.json();if(!response.ok)throw Error('Accesso al ritaglio non disponibile');return data.url;};
  const pdfModule=()=>import(/* webpackIgnore: true */ '/pdfjs/pdf.mjs');
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
   close();const dialog=document.createElement('dialog');dialog.className='jump-clip-dialog';dialog.setAttribute('aria-label',title);
   // Popup sized so the whole first page is visible (then − / + to zoom, scroll for the next pages).
   // A4 estimate before paint, refined with the real page proportions once the PDF is open.
   const fitWidth=ratio=>{const phone=window.innerWidth<=600,room=window.innerHeight-(phone?16:48)-56-(phone?16:24);return Math.round(Math.min(window.innerWidth-(phone?16:32),room*ratio+(phone?16:24)+12));};
   dialog.style.width=fitWidth(.707)+'px';
   const state={dialog,focus:document.activeElement,overflow:document.body.style.overflow,closed:false,page:1,zoom:1};active=state;
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
   const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Caricamento ritaglio…';area.append(status);
   dialog.append(bar,area,controls);document.body.append(dialog);
   dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('click',e=>{if(e.target===dialog)close();});dialog.showModal();document.body.style.overflow='hidden';button.focus();
   try{
    const [pdfjs,resolvedUrl,prepared]=await Promise.all([pdfModule(),privateClipId?privateUrl(privateClipId):Promise.resolve(url),privateClipId?Promise.resolve(null):publicBytes(url)]);if(state.closed||disposed)return;
    pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';
    if(!worker)worker=new pdfjs.PDFWorker();
    const cacheKey=privateClipId||new URL(url,location.href).href,cached=cachedPdfs.get(cacheKey);
    const source=prepared?{data:prepared.slice()}:cached&&Date.now()-cached.at<60000?{data:cached.bytes.slice()}:{url:resolvedUrl};
    state.task=pdfjs.getDocument({...source,worker,isEvalSupported:false,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/'});
    state.doc=await state.task.promise;if(state.closed)return;
    {const first=(await state.doc.getPage(1)).getViewport({scale:1});if(state.closed)return;dialog.style.width=fitWidth(first.width/first.height)+'px';}await continuousClipReader({state,area,title,previous,next,minus,plus,fit,counter,zoomLabel});
    // Bounded, memory-only reuse; private access is checked again on every open.
    if(!state.closed)state.doc.getData().then(bytes=>{
     if(state.closed||disposed||bytes.byteLength>8*1024*1024)return;
     cachedPdfs.delete(cacheKey);cachedPdfs.set(cacheKey,{bytes:bytes.slice(),at:Date.now()});
     while(cachedPdfs.size>3)cachedPdfs.delete(cachedPdfs.keys().next().value);
    }).catch(()=>{});
   }catch(error){if(!state.closed){status.textContent='Ritaglio non disponibile. Chiudi e riprova tra poco.';area.replaceChildren(status);}}
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
   const link=e.target.closest?.('a[href]');if(!link)return;
   const url=new URL(link.href,location.href);
   if(url.origin!==location.origin||!url.pathname.startsWith('/api/clips/')||link.closest('[data-private-clip="true"]'))return;
   pdfModule().then(pdfjs=>{if(disposed)return;pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';if(!worker)worker=new pdfjs.PDFWorker();}).catch(()=>{});
   publicBytes(url.href);
  };
  document.addEventListener('pointerover',warm);document.addEventListener('focusin',warm);
  document.addEventListener('click',onClick,true);window.addEventListener('jump-open-clip',onPrivate);
  return()=>{disposed=true;close();controllers.forEach(c=>c.abort());cachedPdfs.clear();worker?.destroy();document.removeEventListener('pointerover',warm);document.removeEventListener('focusin',warm);document.removeEventListener('click',onClick,true);window.removeEventListener('jump-open-clip',onPrivate);};
 },[path]);
 return null;
}
