 'use client';
import {useEffect,useState,useRef} from 'react';
export default function ReadingNavigation({articles}){
 const [active,setActive]=useState(''),[visible,setVisible]=useState(false),nav=useRef(null);
 const categories=[...new Set(articles.map(a=>a.category).filter(Boolean))];
 useEffect(()=>{
  let frame=0;
  const update=()=>{
   frame=0;
   const rows=articles.map(a=>({article:a,node:document.getElementById('articolo-'+a.id)})).filter(r=>r.node&&!r.node.hidden);
   if(!rows.length){setVisible(false);return;}
   const marker=180;
   setVisible(rows[0].node.getBoundingClientRect().top<marker&&rows[rows.length-1].node.getBoundingClientRect().bottom>marker);
   let current=rows[0];
   for(const row of rows){if(row.node.getBoundingClientRect().top<=marker)current=row;else break;}
   setActive(current.article.category);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);document.addEventListener('change',schedule);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);document.removeEventListener('change',schedule);};
 },[articles]);
 useEffect(()=>{
  if(!visible)return;
  const link=nav.current?.querySelector('[aria-current="location"]');
  if(link){const scroller=link.parentElement;scroller.scrollTo({left:link.offsetLeft-scroller.clientWidth/2+link.offsetWidth/2,behavior:'instant'});}
 },[active,visible]);
 if(categories.length<2)return null;
 return <nav ref={nav} className="reading-navigation" hidden={!visible} aria-label="Navigazione rapida della rassegna"><div>{categories.map(category=><a key={category} href={'#articolo-'+articles.find(a=>a.category===category).id} data-edition-jump="true" aria-current={active===category?'location':undefined}>{category}</a>)}</div></nav>;
}
