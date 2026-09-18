'use client';
import {useState} from 'react';
import {flushSync} from 'react-dom';
import './summary.css';
export default function SummaryPreview({initial}){
 const [summary,setSummary]=useState(initial);
 const [editing,setEditing]=useState(false);
 const change=(key,value)=>setSummary(s=>({...s,[key]:value}));
 const itemChange=(i,j,value)=>setSummary(s=>({...s,sections:s.sections.map((section,n)=>n===i?{...section,items:section.items.map((item,k)=>k===j?value:item)}:section)}));
 return <div className="summary-lab">
  <nav className="summary-tools" aria-label="Comandi Summary"><div><strong>JUMP PRESS <span>LAB</span></strong><small>Progetto parallelo · solo locale</small></div><div><button onClick={()=>setEditing(!editing)}>{editing?'Chiudi modifica':'Modifica testi'}</button><button className="primary" onClick={()=>{flushSync(()=>setEditing(false));window.print();}}>Stampa / Salva PDF</button></div></nav>
  <p className="summary-notice">Proposta da revisionare · Basata sui 22 articoli selezionati del 18 settembre. Giovani e Next Gen nelle Varie, da confermare. Le modifiche restano in questa pagina e si perdono ricaricandola.</p>
  <article className="summary-sheet" aria-label="Summary della rassegna">
   <header><div className="summary-brand">JUMP <span>PRESS</span></div><div className="summary-date">18 SETTEMBRE 2026</div><p>RASSEGNA STAMPA JUVENTUS</p><h1>Il quadro della giornata.</h1><div className="summary-subtitle">SUMMARY <span>PROPOSTA DA REVISIONARE</span></div></header>
   <section className="summary-intro"><h2>Sintesi generale</h2>{editing?<textarea aria-label="Sintesi generale" value={summary.intro} onChange={e=>change('intro',e.target.value)}/>:<p>{summary.intro}</p>}</section>
   {summary.sections.map((section,i)=><section className="summary-section" key={section.title}><h2><span>0{i+1}</span>{section.title}</h2><ul>{section.items.map((item,j)=><li key={j}>{editing?<textarea aria-label={section.title+' tema '+(j+1)} value={item} onChange={e=>itemChange(i,j,e.target.value)}/>:<p><strong>{item.split(':')[0]}:</strong>{item.slice(item.indexOf(':')+1)}</p>}</li>)}</ul></section>)}
   <footer><strong>JUMP PRESS</strong><span>Highlights della selezione · 18.09.2026</span><span>01</span></footer>
  </article><p className="summary-print-note">Per il PDF: scegli “Salva come PDF”, formato A4, scala 100% e disattiva intestazioni e piè di pagina del browser. Verifica che l’anteprima resti di una pagina dopo le modifiche.</p>
 </div>;
}
