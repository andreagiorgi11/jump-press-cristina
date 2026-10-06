'use client';
import {useEffect,useRef,useState} from 'react';
import {tr,locale} from '../../lib/i18n';
// Small chevron next to the edition date: a menu of recent editions, loaded on first open, without going to the archive.
const label=(date,lang)=>{const s=new Date(date+'T12:00:00Z').toLocaleDateString(locale(lang),{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});return s.charAt(0).toUpperCase()+s.slice(1);};
export default function EditionPicker({currentDate,lang='it'}){
 const t=text=>tr(lang,text);
 const [open,setOpen]=useState(false),[items,setItems]=useState(null),[error,setError]=useState(''),root=useRef(null);
 useEffect(()=>{
  if(!open)return;
  const close=e=>{if(e.type==='keydown'?e.key==='Escape':!root.current?.contains(e.target))setOpen(false);};
  document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);
  return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close);};
 },[open]);
 async function toggle(){
  const next=!open;setOpen(next);
  if(next&&!items){setError('');try{const r=await fetch('/api/editions'+(lang==='en'?'?lang=en':''),{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(t('Elenco non disponibile.'));setItems(data.editions);}catch(e){setError(e.message);}}
 }
 return <span className="edition-picker" ref={root}>
  <button type="button" className="edition-picker-toggle" aria-haspopup="listbox" aria-expanded={open} aria-label={t("Scegli un'altra rassegna")} title={t('Altre rassegne')} onClick={toggle}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
  {open&&<div className="edition-picker-menu" role="listbox" aria-label={t('Rassegne')}>
   {!items&&!error&&<p className="edition-picker-note" role="status">{t('Caricamento…')}</p>}
   {error&&<p className="edition-picker-note" role="alert">{error}</p>}
   {items?.map(item=><a key={item.date+item.status} role="option" aria-selected={item.date===currentDate} className={item.date===currentDate?'is-current':undefined} href={item.href}><span>{label(item.date,lang)}</span>{item.status==='draft'&&<small>Bozza</small>}</a>)}
   {items&&<a className="edition-picker-all" href={lang==='en'?'/en/archivio':'/archivio'}>{t("Tutto l'archivio →")}</a>}
  </div>}
 </span>;
}
