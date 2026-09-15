'use client';

import {useEffect} from 'react';

const ratingCopy={
  5:['Notizia dominante','Tema guida della giornata: ha il peso editoriale più alto e orienta la lettura complessiva.'],
  4:['Molto rilevante','Notizia con forte impatto sulla Juventus o con elementi sostanziali per capire squadra, mercato o scenario.'],
  3:['Rilevante','Informazione importante e utile alla rassegna, ma non dominante rispetto ai temi principali.'],
  2:['Secondaria','Notizia utile per completezza e contesto, con peso editoriale inferiore.'],
  1:['Marginale','Contesto o notizia di servizio: entra solo quando aggiunge un elemento concreto.']
};

const ratings14=[5,4,4,5,4,5,5,4,5,4,3,4,3,3,2,3,2,2,3,2,2,2,2];
const ratings15=[5,5,5,5,5,4,5,4,5,5,4,4,4,3,4,2,3,3,2,3,2,2,3,2];

const stopwords=new Set('alla allo agli alle anche avere aveva abbiamo hanno essere era sono come con che chi cui dal dalla dalle dagli dei del della delle degli dello di e ed è gli ha hanno il in io la le lo ma mi ne nel nella nelle nello non o per più può questa questo questi quelle quello se sia si sono su sul sulla tra un una uno suoi sue suo loro già dopo prima oggi ieri mentre senza contro molto ancora dove quando quanto poi delle nella della dello degli dalle dagli'.split(' '));

function recurringWords(articles){
  const counts=new Map();
  const text=[...articles].map(a=>`${a.querySelector('h2')?.textContent||''} ${a.querySelector('p')?.textContent||''}`).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9à-ÿ\s'-]/g,' ');
  for(const raw of text.split(/\s+/)){
    const w=raw.replace(/^['-]+|['-]+$/g,'');
    if(w.length<5||stopwords.has(w)||['juventus','juve','gazzetta','tuttosport','corriere','sport','stampa','pezzo','notizia'].includes(w)) continue;
    counts.set(w,(counts.get(w)||0)+1);
  }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,14);
}

function addRatings(articleEls,ratings){
  articleEls.forEach((article,i)=>{
    if(article.querySelector('.stars')) return;
    const n=ratings[i]||2;
    const stars=document.createElement('div');
    stars.className='stars';
    stars.setAttribute('aria-label',`Rating editoriale ${n} su 5`);
    stars.innerHTML=`<strong>${'★'.repeat(n)}${'☆'.repeat(5-n)}</strong><span>${ratingCopy[n][0]}</span>`;
    article.querySelector('.meta')?.insertAdjacentElement('afterend',stars);
  });
}

function addScaleMetrics15(main,header){
  const stats=header.querySelector('.stats');
  if(stats){
    stats.innerHTML='<div><b>190</b><span>voci esaminate</span></div><div><b>24</b><span>articoli selezionati</span></div><div><b>22</b><span>prime pagine verificate</span></div><div><b>3</b><span>prime pagine con Juventus</span></div>';
  }
  if(document.getElementById('jump-scale-metrics-15')) return;
  const block=document.createElement('section');
  block.id='jump-scale-metrics-15';
  block.className='ranking';
  block.innerHTML=`
    <small>QUADRO GENERALE DELLA RASSEGNA</small>
    <h2>I numeri dell'intera copertura</h2>
    <div id="jump-daily-metrics">
      <div><b>190</b><span>voci complessive esaminate</span><small>Base di lavoro prima della selezione editoriale</small></div>
      <div><b>24</b><span>pezzi selezionati</span><small>12,6% del totale esaminato</small></div>
      <div><b>22</b><span>prime pagine verificate</span><small>Italiane e internazionali presenti nella rassegna</small></div>
      <div><b>3 / 22</b><span>prime pagine con richiamo Juventus</span><small>13,6% delle copertine verificate</small></div>
      <div><b>3 / 3</b><span>quotidiani sportivi nazionali</span><small>Juventus presente su tutte le tre copertine sportive italiane</small></div>
      <div><b>19</b><span>prime pagine senza Juventus</span><small>Il richiamo bianconero è concentrato soprattutto sulla stampa sportiva</small></div>
    </div>
    <div class="jump-frontpages-list"><b>Dove la Juventus è in prima pagina</b><div><span>La Gazzetta dello Sport</span><span>Corriere dello Sport-Stadio</span><span>Tuttosport</span></div></div>
    <div class="jump-frontpages-note"><b>Prime pagine: lettura generale</b><p>La Juventus ha forte visibilità sulle copertine sportive italiane, ma non domina l'agenda complessiva delle 22 prime pagine: sulle testate generaliste e internazionali prevalgono temi politici, economici e internazionali.</p></div>`;
  header.insertAdjacentElement('afterend',block);
}

function addInsights(main,sectionTitle,articleEls,{id,bullets,tones,toneText}){
  if(document.getElementById(id)) return;
  const words=recurringWords(articleEls);
  const max=Math.max(...words.map(([,n])=>n),1);
  const section=document.createElement('section');
  section.id=id;
  section.className='ranking jump-insights';
  section.innerHTML=`
    <small>LETTURA DELLA RASSEGNA</small>
    <h2>Temi, parole e tono di oggi</h2>
    <div class="jump-insight-grid">
      <div class="jump-insight-card"><b>3 punti chiave</b><ul>${bullets.map(x=>`<li><strong>${x[0]}:</strong> ${x[1]}</li>`).join('')}</ul></div>
      <div class="jump-insight-card"><b>Toni prevalenti</b><div class="tonechips">${tones.map(t=>`<span>${t}</span>`).join('')}</div><p>${toneText}</p></div>
    </div>
    <div class="jump-wordcloud-wrap"><b>Nuvola di parole</b><div class="jump-wordcloud">${words.map(([w,n])=>`<span style="font-size:${15+Math.round((n/max)*22)}px" title="${n} ricorrenze">${w}</span>`).join('')}</div></div>`;
  main.insertBefore(section,sectionTitle);
}

function addRatingGuide(main,sectionTitle,articleEls){
  if(document.getElementById('jump-rating-guide')) return;
  const counts={1:0,2:0,3:0,4:0,5:0};
  articleEls.forEach(article=>{
    const n=(article.querySelector('.stars strong')?.textContent.match(/★/g)||[]).length;
    if(counts[n]!==undefined) counts[n]++;
  });
  const guide=document.createElement('section');
  guide.id='jump-rating-guide';
  guide.className='ranking';
  guide.innerHTML='<small>COME LEGGERE IL RATING</small><h2>Quanto pesa ogni notizia</h2><p>Le stelle misurano il <b>peso editoriale della notizia nella rassegna Juventus di oggi</b>. Non sono un voto alla qualità o all’affidabilità della testata e non indicano se la notizia è positiva o negativa.</p>'+[5,4,3,2,1].map(n=>`<div class="rankrow"><strong>${'★'.repeat(n)}${'☆'.repeat(5-n)}</strong><span><b>${ratingCopy[n][0]} · ${counts[n]} ${counts[n]===1?'pezzo':'pezzi'}</b><small>${ratingCopy[n][1]}</small></span></div>`).join('');
  main.insertBefore(guide,sectionTitle);
}

function build13(main,header,sources,sectionTitle){
  if(!sources) return;
  const stats=header.querySelector('.stats');
  if(stats) stats.innerHTML='<div><b>18</b><span>pezzi selezionati</span></div><div><b>409</b><span>pagine analizzate</span></div><div><b>15</b><span>prime pagine verificate</span></div><div><b>3</b><span>prime pagine con Juventus</span></div>';
  addRatingGuide(main,sectionTitle,[...document.querySelectorAll('.articles article')]);
}

function build(){
  const main=document.querySelector('main');
  const header=main?.querySelector(':scope > header');
  const sources=main?.querySelector(':scope > .sources');
  const sectionTitle=main?.querySelector(':scope > .sectiontitle');
  if(!main||!header||!sectionTitle) return;
  const articleEls=[...main.querySelectorAll('.articles article')];
  const headerText=header.textContent||'';

  if(headerText.includes('15 SETTEMBRE 2026')){
    main.querySelector(':scope > .brief')?.remove();
    sources?.remove();
    addScaleMetrics15(main,header);
    addRatings(articleEls,ratings15);
    addInsights(main,sectionTitle,articleEls,{
      id:'jump-insights-15',
      bullets:[
        ['Spalletti resta, ma deve correggere subito','Carnevali gli conferma fiducia, mentre le analisi convergono su equilibrio tattico, gestione dei momenti e bisogno di maggiore solidità.'],
        ['Kolo sotto pressione, Zhegrova sale','il centravanti resta senza gol e rischia di perdere centralità; Zhegrova, Nico Gonzalez e le alternative offensive guadagnano peso.'],
        ['Europa come prova e occasione','il NEC diventa il primo test della reazione, con McKennie e Cambiaso verso il recupero e una competizione importante anche sul piano economico.']
      ],
      tones:['Critico','Preoccupato','Reattivo'],
      toneText:'La rassegna è nettamente critica sulla prestazione e sulla costruzione della squadra, preoccupata per rendimento offensivo e leadership, ma lascia spazio a un tono reattivo: la fiducia a Spalletti resta e l’Europa viene letta come occasione immediata di risposta.'
    });
    addRatingGuide(main,sectionTitle,articleEls);
    return;
  }

  if(headerText.includes('14 SETTEMBRE 2026')){
    addRatings(articleEls,ratings14);
    addInsights(main,sectionTitle,articleEls,{
      id:'jump-insights-14',
      bullets:[
        ['Equilibrio e leadership','la sconfitta col Sassuolo riapre il tema della struttura della squadra e della gestione dei momenti della partita.'],
        ['Attacco sotto pressione','Kolo Muani resta al centro delle critiche, mentre Zhegrova emerge come risposta offensiva più concreta.'],
        ['Reazione immediata','il debutto europeo contro il NEC diventa il primo banco di prova, con Cambiaso e McKennie verso il recupero.']
      ],
      tones:['Critico','Preoccupato','Reattivo'],
      toneText:'La lettura complessiva è soprattutto critica verso equilibrio, leadership e rendimento offensivo; resta però un tono di attesa per la risposta europea.'
    });
    addRatingGuide(main,sectionTitle,articleEls);
    return;
  }

  if(headerText.includes('13 SETTEMBRE 2026')) build13(main,header,sources,sectionTitle);
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
    .jump-frontpages-list{margin-top:14px;padding:18px 20px;background:#f6f5f2;border:1px solid #dfddd7;border-radius:15px}
    .jump-frontpages-list>div{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    .jump-frontpages-list span{display:inline-block;padding:8px 11px;border-radius:999px;background:#111;color:#fff;font-size:12px;font-weight:800}
    .jump-frontpages-note{margin-top:14px;padding:18px 20px;border-left:4px solid #111;background:#faf9f7;border-radius:10px}
    .jump-frontpages-note p{margin:7px 0 0;line-height:1.5;color:#4d4d4d}
    #jump-rating-guide>p{font-size:17px;line-height:1.6;color:#444}
    .articles article .stars{display:flex;align-items:center;gap:10px;margin:10px 0 14px}
    .articles article .stars strong{font-size:18px;letter-spacing:1px;color:#111}
    .articles article .stars span{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#666}
    .jump-insights{margin-top:28px}
    .jump-insight-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:14px;margin-top:18px}
    .jump-insight-card,.jump-wordcloud-wrap{background:#f6f5f2;border:1px solid #dfddd7;border-radius:18px;padding:20px}
    .jump-insight-card>b,.jump-wordcloud-wrap>b{font-size:14px;text-transform:uppercase;letter-spacing:.08em}
    .jump-insight-card ul{margin:15px 0 0;padding-left:20px}
    .jump-insight-card li{margin:9px 0;line-height:1.5}
    .jump-insight-card p{margin:14px 0 0;line-height:1.55;color:#4d4d4d}
    .tonechips{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
    .tonechips span{display:inline-block;padding:8px 11px;border-radius:999px;background:#111;color:#fff;font-size:12px;font-weight:800}
    .jump-wordcloud-wrap{margin-top:14px;overflow:hidden}
    .jump-wordcloud{display:flex;align-items:center;justify-content:center;align-content:center;flex-wrap:wrap;gap:12px 20px;margin-top:18px;min-height:160px;padding:12px 8px}
    .jump-wordcloud span{font-weight:850;line-height:.95;color:#111;letter-spacing:-.02em}
    @media(max-width:700px){#jump-daily-metrics{grid-template-columns:1fr 1fr!important}#jump-daily-metrics b{font-size:22px}.jump-insight-grid{grid-template-columns:1fr}.jump-wordcloud{min-height:125px;gap:10px 14px}.articles article .stars{align-items:flex-start;flex-direction:column;gap:5px}}
  `}</style>;
}
