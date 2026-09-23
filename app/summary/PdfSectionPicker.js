'use client';
import {useEffect,useRef,useState} from 'react';
import {summarySections} from '../../lib/summary-sections';
export default function PdfSectionPicker({onClose,onConfirm,onSummary,summaryAvailable=true,initialSections=null,initialClips=false,onChange}){
 const dialog=useRef(null),[selected,setSelected]=useState(initialSections??summarySections.map((_,i)=>i));
 const [editionSelected,setEditionSelected]=useState(false);
 const [clipsInfo,setClipsInfo]=useState(false);
 const [includeClips,setIncludeClips]=useState(initialClips);
 useEffect(()=>{onChange?.(selected,includeClips);},[selected,includeClips,onChange]);
 const all=selected.length===summarySections.length;
 useEffect(()=>{dialog.current.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[]);
 const toggle=i=>setSelected(current=>current.includes(i)?current.filter(n=>n!==i):[...current,i].sort());
 return <dialog ref={dialog} className="pdf-section-picker" aria-labelledby="pdf-picker-title" onCancel={onClose}>
  <header><div><small>SCARICA PDF</small><h2 id="pdf-picker-title">Cosa vuoi scaricare?</h2></div><button type="button" onClick={onClose} aria-label="Chiudi scelta sezioni">×</button></header>
  <div className="pdf-sheet-tabs" aria-label="Formato PDF"><button className={`pdf-sheet-tab${!editionSelected?' is-selected':''}`} type="button" aria-pressed={!editionSelected} aria-controls="pdf-summary-options" onClick={()=>setEditionSelected(false)}>Summary<span>La giornata in sintesi</span></button><button className={`pdf-sheet-tab${editionSelected?' is-selected':''}`} type="button" aria-pressed={editionSelected} aria-controls="pdf-edition-options" onClick={()=>setEditionSelected(true)}>Rassegna completa<span>Sezioni e ritagli</span></button></div>
  {editionSelected?<section id="pdf-edition-options" className="pdf-sheet-panel" aria-label="Personalizza rassegna completa">
  <label className="pdf-pick-all"><input type="checkbox" checked={all} onChange={()=>setSelected(all?[]:summarySections.map((_,i)=>i))}/><strong>Tutta la rassegna</strong></label>
  <fieldset><legend>Sezioni incluse</legend>{summarySections.map((name,i)=><label key={name}><input type="checkbox" checked={selected.includes(i)} onChange={()=>toggle(i)}/><span>{name}</span></label>)}</fieldset>
  {!selected.length&&<p className="pdf-picker-note" role="status">Seleziona almeno una sezione.</p>}
  <div className="pdf-clips-row"><label htmlFor="pdf-include-clips"><input id="pdf-include-clips" type="checkbox" checked={includeClips} onChange={event=>setIncludeClips(event.target.checked)}/><strong>Includi i ritagli dei giornali</strong></label><span className="pdf-clips-info" onMouseEnter={()=>setClipsInfo(true)} onMouseLeave={()=>setClipsInfo(false)} onBlur={()=>setClipsInfo(false)} onKeyDown={event=>{if(event.key==='Escape'&&clipsInfo){event.preventDefault();event.stopPropagation();setClipsInfo(false);}}}><button type="button" className="pdf-info-button" aria-label="Informazioni sui ritagli" aria-describedby={clipsInfo?'pdf-clips-tooltip':undefined} onFocus={()=>setClipsInfo(true)} onClick={()=>setClipsInfo(true)}>i</button>{clipsInfo&&<span id="pdf-clips-tooltip" role="tooltip">Aggiunge in fondo al PDF gli originali degli articoli delle sezioni scelte. Il file sarà più grande.</span>}</span></div>
  <footer><button type="button" onClick={onClose}>Annulla</button><button type="button" disabled={!selected.length} onClick={()=>onConfirm(all?null:selected,includeClips)}>Apri PDF</button></footer></section>:<section id="pdf-summary-options" className="pdf-sheet-panel" aria-label="Summary"><p className="pdf-picker-note">{summaryAvailable?'La giornata in sintesi, raccolta in un unico PDF.':'Il Summary non è disponibile per questa edizione.'}</p><footer><button type="button" onClick={onClose}>Annulla</button><button type="button" disabled={!summaryAvailable} onClick={onSummary}>Apri PDF</button></footer></section>}
 </dialog>;
}
