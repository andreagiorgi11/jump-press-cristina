'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import ManualSource from '../editor/fonte-manuale/ManualSource';
export default function ManualSourceDialog({openOnMount=false}){
 const dialog=useRef(null),trigger=useRef(null),busy=useRef(false),titleId=useId();
 const [ready,setReady]=useState(false),[active,setActive]=useState(false),[opened,setOpened]=useState(false);
 useEffect(()=>{setReady(true);},[]);
 useEffect(()=>{if(!ready)return;const open=()=>{if(dialog.current.open)return;trigger.current=document.activeElement;setOpened(true);dialog.current.showModal();setActive(true);};window.addEventListener('jump-open-manual-source',open);if(openOnMount)open();return()=>window.removeEventListener('jump-open-manual-source',open);},[ready,openOnMount]);
 useEffect(()=>{if(!active)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.querySelector('.manual-close')?.focus();return()=>{document.body.style.overflow=previous;};},[active]);
 const close=()=>{if(!busy.current)dialog.current?.close();};
 return ready?createPortal(<dialog ref={dialog} className="manual-source-dialog" aria-labelledby={titleId} onCancel={e=>{if(busy.current)e.preventDefault();}} onClose={()=>{setActive(false);if(trigger.current?.getClientRects().length)trigger.current.focus();else document.querySelector('.summary-menu-toggle')?.focus();}} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}>{opened&&<ManualSource embedded titleId={titleId} onClose={close} onBusyChange={v=>{busy.current=v;}}/>}</dialog>,document.body):null;
}
