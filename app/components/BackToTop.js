'use client';
import {useEffect,useState} from 'react';
export default function BackToTop(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  const update=()=>setVisible(window.scrollY>600);
  update();window.addEventListener('scroll',update,{passive:true});
  return()=>window.removeEventListener('scroll',update);
 },[]);
 function goTop(){
  document.querySelector('.edition-view .brand')?.focus({preventScroll:true});
  if(location.hash.startsWith('#articolo-'))history.replaceState(history.state,'',location.pathname+location.search);
  window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
 return visible?<button type="button" className="back-to-top" onClick={goTop} aria-label="Torna all’inizio della rassegna">Torna su <span aria-hidden="true">↑</span></button>:null;
}
