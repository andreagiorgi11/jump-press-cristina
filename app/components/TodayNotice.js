'use client';
import {useEffect,useState} from 'react';
import './today-notice.css';
const POLL_MS=3*60*1000;
const day=date=>new Date(date+'T12:00:00Z').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Rome'});
const time=ms=>new Date(ms).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'});
const phases={import:'Importazione del PDF',reading:'Lettura degli articoli',drafting:'Scrittura della bozza',clips:'Preparazione dei ritagli',review:'Revisione finale'};
// Editor card: state of today's automation and draft, never document content.
function editorCard(e){
 const {run,draft}=e,phase=phases[run.phase]||'';
 if(e.published)return null;
 if(run.status==='completed'||(draft&&run.status!=='running'&&run.status!=='failed'))return {tone:'ready',title:'Bozza pronta per la revisione',text:(run.warnings?run.warnings+(run.warnings===1?' avviso da controllare. ':' avvisi da controllare. '):'')+'I lettori la vedranno solo dopo la conferma.',link:draft&&{href:'/editor?draft='+encodeURIComponent(draft.id),label:'Apri la bozza'}};
 if(run.status==='running'&&run.stalled)return {tone:'alert',title:'Automatismo fermo',text:phase+(run.updatedAt?' · ultimo aggiornamento alle '+time(run.updatedAt):'')+'. Il prossimo controllo programmato può riprenderlo.'};
 if(run.status==='running')return {tone:'working',title:'Rassegna in preparazione',text:phase+(run.phase==='reading'&&run.nextPage?' · pagina '+run.nextPage:'')+(run.updatedAt?' · aggiornato alle '+time(run.updatedAt):'')};
 if(run.status==='failed')return {tone:'alert',title:'Automatismo interrotto',text:(phase?'Fase: '+phase+'. ':'')+(run.phase==='import'&&run.attemptsRemaining>0?'La data resta disponibile per il prossimo controllo programmato.':'Serve un intervento: verifica da GPT.')};
 return {tone:'idle',title:'Automatismo non ancora partito',text:'Parte all’arrivo della mail Ecostampa; controllo programmato alle 7:45.'};
}
export default function TodayNotice({initial,demo}){
 const [data,setData]=useState(demo||{notice:initial?.notice||null,latestDate:initial?.latestDate||null,editor:null});
 useEffect(()=>{
  if(demo)return;
  let active=true,timer;
  const load=async()=>{
   if(document.hidden)return;
   try{const response=await fetch('/api/today',{cache:'no-store'});if(!response.ok)return;const next=await response.json();if(!active)return;
    // Today's edition just went live: show it instead of the previous one.
    if(initial?.latestDate&&next.latestDate&&next.latestDate!==initial.latestDate){window.location.reload();return;}
    setData(next);
   }catch{}
  };
  load();timer=setInterval(load,POLL_MS);document.addEventListener('visibilitychange',load);
  return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',load);};
 },[demo,initial?.latestDate]);
 const card=data.editor?editorCard(data.editor):null,notice=data.notice;
 if(card)return <section className={'today-notice is-editor is-'+card.tone} aria-live="polite">
  <small>Redazione · {day(data.editor.date)}</small>
  <h2><i aria-hidden="true"/>{card.title}</h2>
  <p>{card.text}</p>
  {card.link&&<a href={card.link.href}>{card.link.label} →</a>}
 </section>;
 if(!notice||data.editor?.published)return null;
 const scheduled=notice.state==='scheduled';
 return <section className={'today-notice '+(scheduled?'is-scheduled':'is-working')} aria-live="polite">
  <small>Rassegna di {day(notice.today)}</small>
  <h2><i aria-hidden="true"/>{scheduled?'Disponibile dalle 8:00':'In preparazione, disponibile a breve'}</h2>
  <p>{scheduled?'La redazione sta preparando la rassegna stampa di oggi.':'La rassegna di oggi sarà pubblicata appena la redazione completa la revisione.'}{notice.latestDate&&<> Intanto puoi consultare quella di <b>{day(notice.latestDate)}</b>.</>}</p>
 </section>;
}
