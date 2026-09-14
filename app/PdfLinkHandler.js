'use client';
import {useEffect} from 'react';

export default function PdfLinkHandler(){
 useEffect(()=>{
  const prepare=()=>{
   document.querySelectorAll('a[href^="/ritagli/"][href$=".pdf"]').forEach(a=>{
    const href=a.getAttribute('href');
    const m=href&&href.match(/^\/ritagli\/([^/]+)\.pdf$/);
    if(m){
      a.setAttribute('href',`/ritaglio/${encodeURIComponent(m[1])}`);
      a.removeAttribute('target');
      a.removeAttribute('rel');
    }
   });
  };

  const isClipHref=(href='')=>
    /^\/ritaglio\//.test(href) ||
    /^\/ritagli\/.*\.pdf(?:\?|$)/.test(href) ||
    /^\/api\/r\d{8}-article(?:\?|$)/.test(href);

  const isMobileViewer=()=>
    window.matchMedia('(max-width: 900px)').matches ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone===true;

  const closeViewer=()=>{
    const viewer=document.getElementById('jump-clip-viewer');
    if(viewer) viewer.remove();
    document.documentElement.style.overflow='';
    document.body.style.overflow='';
  };

  const openViewer=(href,title='Ritaglio completo')=>{
    closeViewer();
    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';

    const viewer=document.createElement('div');
    viewer.id='jump-clip-viewer';
    viewer.setAttribute('role','dialog');
    viewer.setAttribute('aria-modal','true');
    viewer.setAttribute('aria-label',title);
    viewer.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#fff;display:flex;flex-direction:column;width:100%;height:100dvh;';

    const bar=document.createElement('div');
    bar.style.cssText='height:58px;min-height:58px;padding:env(safe-area-inset-top) 12px 0 12px;box-sizing:content-box;background:#111;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #333;';

    const label=document.createElement('strong');
    label.textContent='RITAGLIO';
    label.style.cssText='font-size:13px;letter-spacing:.08em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

    const close=document.createElement('button');
    close.type='button';
    close.textContent='✕  CHIUDI';
    close.setAttribute('aria-label','Chiudi ritaglio');
    close.style.cssText='appearance:none;border:1px solid #fff;border-radius:9px;background:#fff;color:#111;font-weight:900;font-size:14px;padding:10px 13px;cursor:pointer;flex:0 0 auto;';
    close.addEventListener('click',closeViewer);

    bar.append(label,close);

    const frame=document.createElement('iframe');
    frame.src=href;
    frame.title=title;
    frame.style.cssText='display:block;width:100%;flex:1 1 auto;min-height:0;border:0;background:#fff;';

    viewer.append(bar,frame);
    document.body.appendChild(viewer);
    close.focus();
  };

  const onClick=(e)=>{
    const a=e.target.closest?.('a[href]');
    if(!a) return;
    const href=a.getAttribute('href')||'';
    if(!isClipHref(href) || !isMobileViewer()) return;
    e.preventDefault();
    e.stopPropagation();
    openViewer(href,a.textContent?.trim()||'Ritaglio completo');
  };

  const onKey=(e)=>{ if(e.key==='Escape') closeViewer(); };

  prepare();
  const observer=new MutationObserver(prepare);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',onClick,true);
  document.addEventListener('keydown',onKey);

  return()=>{
    observer.disconnect();
    document.removeEventListener('click',onClick,true);
    document.removeEventListener('keydown',onKey);
    closeViewer();
  };
 },[]);
 return null;
}