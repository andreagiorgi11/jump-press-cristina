'use client';

import {useEffect} from 'react';

const ratingCopy={
  5:['Notizia dominante','Tema guida della giornata: ha il peso editoriale più alto e orienta la lettura complessiva.'],
  4:['Molto rilevante','Notizia con forte impatto sulla Juventus o con elementi sostanziali per capire squadra, mercato o scenario.'],
  3:['Rilevante','Informazione importante e utile alla rassegna, ma non dominante rispetto ai temi principali.'],
  2:['Secondaria','Notizia utile per completezza e contesto, con peso editoriale inferiore.'],
  1:['Marginale','Contesto o notizia di servizio: entra solo quando aggiunge un elemento concreto.']
};

function build(){
  const main=document.querySelector('main');
  const header=main?.querySelector(':scope > header');
  const sources=main?.querySelector(':scope > .sources');
  const sectionTitle=main?.querySelector(':scope > .sectiontitle');
  if(!main||!header||!sources||!sectionTitle) return;
  if(!header.textContent?.includes('13 SETTEMBRE 2026')) return;

  const stats=header.querySelector('.stats');
  if(stats){
    stats.innerHTML='<div><b>18</b><span>pezzi selezionati</span></div><div><b>409</b><span>pagine analizzate</span></div><div><b>15</b><span>prime pagine verificate</span></div><div><b>3</b><span>prime pagine con Juventus</span></div>';
  }

  if(!document.getElementById('jump-daily-metrics')){
    const metrics=document.createElement('div');
    metrics.id='jump-daily-metrics';
    metrics.innerHTML='<div><b>3 / 15</b><span>prime pagine con richiamo Juventus</span><small>20% delle prime pagine presenti nel PDF</small></div><div><b>3 / 3</b><span>quotidiani sportivi nazionali</span><small>Gazzetta, Corriere dello Sport e Tuttosport: 100%</small></div><div><b>6</b><span>testate nella selezione</span><small>Le fonti dei 18 pezzi scelti</small></div><div><b>2</b><span>editoriali in apertura</span><small>Savelli e Vernazza</small></div><div><b>9</b><span>aree editoriali</span><small>Dalla prima squadra alla politica sportiva</small></div><div><b>12</b><span>prime pagine senza richiamo Juve</span><small>Sul totale delle 15 verificate</small></div>';
    const intro=sources.querySelector('.intro');
    intro?.insertAdjacentElement('afterend',metrics);
  }

  if(!document.getElementById('jump-rating-guide')){
    const counts={1:0,2:0,3:0,4:0,5:0};
    document.querySelectorAll('.articles article .stars').forEach(el=>{
      const n=(el.textContent.match(/★/g)||[]).length;
      if(counts[n]!==undefined) counts[n]++;
    });
    const guide=document.createElement('section');
    guide.id='jump-rating-guide';
    guide.className='ranking';
    guide.innerHTML='<small>COME LEGGERE IL RATING</small><h2>Quanto pesa ogni notizia</h2><p>Le stelle misurano il <b>peso editoriale della notizia nella rassegna Juventus di oggi</b>. Non sono un voto alla qualità o all’affidabilità della testata e non indicano se la notizia è positiva o negativa.</p>'+[5,4,3,2,1].map(n=>`<div class="rankrow"><strong>${'★'.repeat(n)}${'☆'.repeat(5-n)}</strong><span><b>${ratingCopy[n][0]} · ${counts[n]} ${counts[n]===1?'pezzo':'pezzi'}</b><small>${ratingCopy[n][1]}</small></span></div>`).join('');
    sectionTitle.parentNode.insertBefore(guide,sectionTitle);
  }
}

export default function DailyMetrics(){
  useEffect(()=>{
    const run=()=>requestAnimationFrame(build);
    run();
    window.addEventListener('pageshow',run);
    return()=>window.removeEventListener('pageshow',run);
  },[]);
  return <style>{`
    #jump-daily-metrics{display:grid!important;grid-template-columns:repeat(3,1fr);gap:12px!important;margin:22px 0 12px!important}
    #jump-daily-metrics>div{display:flex!important;flex-direction:column;gap:5px;background:#f6f5f2;border:1px solid #dfddd7;border-radius:15px;padding:17px 16px}
    #jump-daily-metrics b{font-size:25px;color:#111}
    #jump-daily-metrics span{font-size:13px;font-weight:900;color:#222}
    #jump-daily-metrics small{font-size:11px;line-height:1.35;color:#707070}
    #jump-rating-guide>p{font-size:17px;line-height:1.6;color:#444}
    @media(max-width:700px){#jump-daily-metrics{grid-template-columns:1fr 1fr!important}#jump-daily-metrics b{font-size:22px}}
  `}</style>;
}
