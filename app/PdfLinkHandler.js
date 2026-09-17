'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

export default function PdfLinkHandler(){
 const path=usePathname();
 useEffect(()=>{
  let active=null;
  const close=()=>{
   const state=active;if(!state)return;active=null;state.closed=true;
   state.render?.cancel();state.task?.destroy().catch(()=>{});state.dialog.remove();
   document.body.style.overflow=state.overflow;state.focus?.focus();
  };
  const open=async(url,title='Ritaglio completo')=>{
   close();const dialog=document.createElement('dialog');dialog.className='jump-clip-dialog';dialog.setAttribute('aria-label',title);
   const state={dialog,focus:document.activeElement,overflow:document.body.style.overflow,closed:false,page:1,zoom:1};active=state;
   const bar=document.createElement('div');bar.className='jump-clip-bar';
   const label=document.createElement('strong');label.textContent='JUMP PRESS · RITAGLIO';
   const button=document.createElement('button');button.type='button';button.textContent='Chiudi ×';button.setAttribute('aria-label','Chiudi ritaglio');button.onclick=close;bar.append(label,button);
   const controls=document.createElement('div');controls.className='jump-clip-navigation';
   const makeButton=(text,aria)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',aria);b.disabled=true;controls.append(b);return b;};
   const previous=makeButton('←','Pagina precedente'),counter=document.createElement('span');counter.setAttribute('aria-live','polite');controls.append(counter);
   const next=makeButton('→','Pagina successiva'),minus=makeButton('−','Riduci ingrandimento'),plus=makeButton('+','Aumenta ingrandimento');
   const area=document.createElement('div');area.className='jump-clip-pages';
   const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Caricamento ritaglio…';area.append(status);
   dialog.append(bar,controls,area);document.body.append(dialog);
   dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('click',e=>{if(e.target===dialog)close();});dialog.showModal();document.body.style.overflow='hidden';button.focus();
   const render=async()=>{
    previous.disabled=next.disabled=minus.disabled=plus.disabled=true;
    try{
     const page=await state.doc.getPage(state.page);if(state.closed)return;
     const base=page.getViewport({scale:1}),width=Math.max(280,area.clientWidth-32),scale=width/base.width*state.zoom,pixelRatio=Math.min(window.devicePixelRatio||1,2);
     const view=page.getViewport({scale:scale*pixelRatio}),canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);canvas.style.width=Math.round(view.width/pixelRatio)+'px';canvas.style.height=Math.round(view.height/pixelRatio)+'px';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',title+' — pagina '+state.page);
     state.render=page.render({canvasContext:canvas.getContext('2d'),viewport:view});await state.render.promise;if(state.closed)return;
     area.replaceChildren(canvas);area.scrollTop=0;counter.textContent=state.page+' / '+state.doc.numPages;
     previous.disabled=state.page<=1;next.disabled=state.page>=state.doc.numPages;minus.disabled=state.zoom<=.75;plus.disabled=state.zoom>=2;
    }catch(error){if(!state.closed){status.textContent='Impossibile visualizzare questa pagina. Chiudi e riprova.';area.replaceChildren(status);}}
   };
   previous.onclick=()=>{state.page--;render();};next.onclick=()=>{state.page++;render();};minus.onclick=()=>{state.zoom-=.25;render();};plus.onclick=()=>{state.zoom+=.25;render();};
   try{
    const pdfjs=await import(/* webpackIgnore: true */ '/pdfjs/pdf.mjs');if(state.closed)return;
    pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';
    state.task=pdfjs.getDocument({url,isEvalSupported:false,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/'});
    state.doc=await state.task.promise;if(state.closed)return;await render();
   }catch(error){if(!state.closed){status.textContent='Ritaglio non disponibile. Chiudi e riprova tra poco.';area.replaceChildren(status);}}
  };
  const onClick=e=>{
   const a=e.target.closest?.('a[href]');if(!a||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
   const url=new URL(a.href,location.href);if(url.origin!==location.origin)return;
   if(!/^\/(?:ritaglio\/|ritagli\/|api\/clips\/|api\/r\d{8}-(?:article|clip)(?:\/|$))/.test(url.pathname))return;
   if(url.pathname.startsWith('/ritaglio/')){url.pathname=url.pathname.replace('/ritaglio/','/ritagli/')+'.pdf';url.search='?raw=1';}
   e.preventDefault();open(url.href,a.closest('article')?.querySelector('h2')?.textContent||'Ritaglio completo');
  };
  const onPrivate=e=>{if(e.detail?.url)open(e.detail.url);};
  document.addEventListener('click',onClick,true);window.addEventListener('jump-open-clip',onPrivate);
  return()=>{close();document.removeEventListener('click',onClick,true);window.removeEventListener('jump-open-clip',onPrivate);};
 },[path]);
 return null;
}
