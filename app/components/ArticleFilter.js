'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

// Enhance the shared article markup, including the unchanged historical editions.
export default function ArticleFilter(){
 const path=usePathname();
 useEffect(()=>{
  let records=[];
  const prepare=()=>{
   records=records.filter(r=>{if(r.list.isConnected)return true;r.control.remove();return false;});
   document.querySelectorAll('.articles').forEach(list=>{
    const articles=[...list.querySelectorAll(':scope > article')];
    const heading=list.previousElementSibling;
    if(!articles.length||!heading?.classList.contains('sectiontitle'))return;
    let record=records.find(r=>r.list===list);
    if(!record){
     const control=document.createElement('label');control.className='article-filter';
     const label=document.createElement('span');label.textContent='Filtra per tema';
     const select=document.createElement('select');select.setAttribute('aria-label','Filtra articoli per tema');
     control.append(label,select);heading.append(control);heading.classList.add('has-article-filter');
     record={list,heading,control,select,signature:''};records.push(record);
     select.onchange=()=>apply(record);
    }
    const categories=[...new Set(articles.map(a=>a.querySelector('.meta span')?.textContent?.trim()).filter(Boolean))];
    const signature=JSON.stringify(categories);
    if(signature!==record.signature){
     record.signature=signature;const selected=record.select.value;
     record.select.replaceChildren(new Option('Tutti',''),...categories.map(c=>new Option(c,c)));
     record.select.value=categories.includes(selected)?selected:'';
    }
    apply(record);
   });
  };
  const apply=record=>{
   record.list.querySelectorAll(':scope > .article-group-heading').forEach(h=>{h.hidden=!!record.select.value&&h.dataset.category!==record.select.value;});
   record.list.querySelectorAll(':scope > article').forEach(a=>{a.hidden=!!record.select.value&&a.querySelector('.meta span')?.textContent?.trim()!==record.select.value;});
  };
  const jumpToCategory=event=>{
   const link=event.target.closest?.('a[data-edition-jump]');
   if(!link)return;
   const target=document.getElementById(link.hash.slice(1));
   const record=records.find(r=>r.list.contains(target));
   if(record&&target.hidden){record.select.value='';apply(record);}
  };
  document.addEventListener('click',jumpToCategory);
  prepare();const observer=new MutationObserver(prepare);observer.observe(document.body,{childList:true,subtree:true});
  return()=>{document.removeEventListener('click',jumpToCategory);observer.disconnect();records.forEach(r=>{r.control.remove();r.heading.classList.remove('has-article-filter');r.list.querySelectorAll('article,.article-group-heading').forEach(a=>{a.hidden=false;});});};
 },[path]);
 return null;
}
