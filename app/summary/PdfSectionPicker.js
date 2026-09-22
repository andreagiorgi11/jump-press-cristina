'use client';
import {useEffect,useRef,useState} from 'react';
import {summarySections} from '../../lib/summary-sections';
export default function PdfSectionPicker({onClose,onConfirm,initialSections=null,initialClips=false,onChange}){
 const dialog=useRef(null),[selected,setSelected]=useState(initialSections??summarySections.map((_,i)=>i));
 const [includeClips,setIncludeClips]=useState(initialClips);
 useEffect(()=>{onChange?.(selected,includeClips);},[selected,includeClips,onChange]);
 const all=selected.length===summarySections.length;
 useEffect(()=>{dialog.current.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[]);
 const toggle=i=>setSelected(current=>current.includes(i)?current.filter(n=>n!==i):[...current,i].sort());
 return <dialog ref={dialog} className="pdf-section-picker" aria-labelledby="pdf-picker-title" onCancel={onClose}>
  <header><div><small>RASSEGNA PDF</small><h2 id="pdf-picker-title">Cosa vuoi scaricare?</h2></div><button type="button" onClick={onClose} aria-label="Chiudi scelta sezioni">×</button></header>
  <p>Scegli tutta la rassegna oppure seleziona le sezioni che ti interessano.</p>
  <label className="pdf-pick-all"><input type="checkbox" checked={all} onChange={()=>setSelected(all?[]:summarySections.map((_,i)=>i))}/><strong>Tutta la rassegna</strong></label>
  <fieldset><legend>Sezioni incluse</legend>{summarySections.map((name,i)=><label key={name}><input type="checkbox" checked={selected.includes(i)} onChange={()=>toggle(i)}/><span>{name}</span></label>)}</fieldset>
  <p className="pdf-picker-note" role="status">{all?'Include il quadro generale e tutti gli articoli.':selected.length?`${selected.length} sezioni selezionate. Copertina generale inclusa, seguita dagli articoli delle sezioni scelte.`:'Seleziona almeno una sezione.'}</p>
  <label className="pdf-include-clips"><input type="checkbox" checked={includeClips} onChange={event=>setIncludeClips(event.target.checked)}/><span><strong>Includi i ritagli dei giornali</strong><small>In fondo al PDF, gli originali degli articoli delle sezioni scelte. Il file sarà più grande.</small></span></label>
  <footer><button type="button" onClick={onClose}>Annulla</button><button type="button" disabled={!selected.length} onClick={()=>onConfirm(all?null:selected,includeClips)}>Apri PDF</button></footer>
 </dialog>;
}
