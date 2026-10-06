'use client';
import {useEffect,useState} from 'react';
import {tr} from '../../lib/i18n';
import SectionLabel from './SectionLabel';

export default function SectionNavigation({articles,lang='it'}){
 const categories=[...new Set(articles.map(a=>a.category).filter(Boolean))];
 const [active,setActive]=useState(categories[0]);
 useEffect(()=>{
  let frame=0;
  const update=()=>{
   frame=0;
   const rows=articles.map(article=>({article,node:document.getElementById('sezione-'+article.id)||document.getElementById('articolo-'+article.id)})).filter(r=>r.node&&!r.node.hidden);
   let current=rows[0];
   const marker=(rows[0]&&parseFloat(getComputedStyle(rows[0].node).scrollMarginTop)||180)+1;
   for(const row of rows){if(row.node.getBoundingClientRect().top<=marker)current=row;else break;}
   if(current)setActive(current.article.category);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);document.addEventListener('change',schedule);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);document.removeEventListener('change',schedule);};
 },[articles]);
 if(categories.length<2)return null;
 return <nav className="edition-jump-nav" aria-label={tr(lang,'Vai agli articoli per tema')}><span>{tr(lang,'Sezioni')}</span><div className="edition-section-links">{categories.map(category=><a key={category} data-edition-jump="true" href={'#sezione-'+articles.find(a=>a.category===category).id} aria-current={active===category?'location':undefined} onClick={()=>setActive(category)}><SectionLabel lang={lang} category={category}/></a>)}</div></nav>;
}
