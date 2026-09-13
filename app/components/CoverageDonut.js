'use client';

import {useEffect} from 'react';

const colorByLabel={
  'Prima squadra':'#d7ff00',
  'Mercato':'#111111',
  'Editoriali':'#737373',
  'Youth / Next Gen':'#ff8a00',
  'Politica sportiva':'#00a6a6',
  'Intervista':'#7c3aed',
  'Juventus Women':'#e11d48',
  'Prossimo avversario':'#2563eb',
  'Europa League':'#a16207',
  'Altri temi':'#0f766e',
  'Altro':'#64748b'
};
const fallback=['#be123c','#0369a1','#15803d','#c2410c','#4338ca','#b45309','#0f766e','#9f1239'];
const groupLabel=(raw)=>{
  const v=String(raw||'').trim();
  if(v==='Juventus') return 'Prima squadra';
  if(v==='Mercato') return 'Mercato';
  if(v==='Editoriali') return 'Editoriali';
  if(v==='Juventus Youth'||v==='Next Gen') return 'Youth / Next Gen';
  if(v==='Women'||v==='Juventus Women') return 'Juventus Women';
  if(v==='Politica sportiva') return 'Politica sportiva';
  if(v==='Altre squadre'||v==='Altri sport') return 'Altri temi';
  return v||'Altro';
};

function build(){
  const main=document.querySelector('main');
  const header=main?.querySelector(':scope > header');
  const brief=main?.querySelector(':scope > .brief');
  if(!main||!header||!brief) return;
  document.getElementById('jump-coverage-donut')?.remove();

  const counts=new Map();
  document.querySelectorAll('.articles article label span').forEach(el=>{
    const label=groupLabel(el.textContent);
    counts.set(label,(counts.get(label)||0)+1);
  });
  if(!counts.size) return;
  const order=['Prima squadra','Mercato','Editoriali','Youth / Next Gen','Politica sportiva','Intervista','Juventus Women','Prossimo avversario','Europa League','Altri temi','Altro'];
  const entries=[...counts.entries()].sort((a,b)=>{
    const ia=order.indexOf(a[0]),ib=order.indexOf(b[0]);
    return (ia<0?99:ia)-(ib<0?99:ib);
  });
  const total=entries.reduce((s,[,n])=>s+n,0);
  const colors=entries.map(([label],i)=>colorByLabel[label]||fallback[i%fallback.length]);
  let cursor=0;
  const stops=entries.map(([,n],i)=>{
    const start=cursor;
    cursor+=n/total*100;
    return `${colors[i]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  }).join(',');

  const section=document.createElement('section');
  section.id='jump-coverage-donut';
  section.innerHTML=`<div class="jcd-head"><small>DISTRIBUZIONE DELLA RASSEGNA</small><h2>Il peso dei temi di oggi</h2><p>Quota degli articoli selezionati per area editoriale. Ogni area ha un colore univoco.</p></div><div class="jcd-wrap"><div class="jcd-donut" style="background:conic-gradient(${stops})"><div class="jcd-hole"><b>${total}</b><span>articoli</span></div></div><div class="jcd-legend">${entries.map(([label,n],i)=>`<div class="jcd-row"><i style="background:${colors[i]}"></i><span>${label}</span><strong>${n} · ${Math.round(n/total*100)}%</strong></div>`).join('')}</div></div>`;
  brief.parentNode.insertBefore(section,brief);
}

export default function CoverageDonut(){
  useEffect(()=>{
    const run=()=>requestAnimationFrame(build);
    run();
    const obs=new MutationObserver(()=>{if(!document.getElementById('jump-coverage-donut')) run();});
    obs.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('pageshow',run);
    return()=>{obs.disconnect();window.removeEventListener('pageshow',run);};
  },[]);
  return <style>{`
    #jump-coverage-donut{max-width:1120px;margin:30px auto;padding:30px;border:1px solid #deded8;border-radius:30px;background:#fff;box-sizing:border-box}
    #jump-coverage-donut .jcd-head small{font-size:12px;font-weight:900;letter-spacing:.18em;color:#777}
    #jump-coverage-donut .jcd-head h2{font-size:32px;line-height:1.05;margin:10px 0 8px}
    #jump-coverage-donut .jcd-head p{margin:0;color:#666;font-size:15px}
    #jump-coverage-donut .jcd-wrap{display:grid;grid-template-columns:minmax(220px,320px) 1fr;gap:38px;align-items:center;margin-top:26px}
    #jump-coverage-donut .jcd-donut{width:min(68vw,290px);aspect-ratio:1;border-radius:50%;display:grid;place-items:center;margin:auto;box-shadow:inset 0 0 0 1px rgba(0,0,0,.05)}
    #jump-coverage-donut .jcd-hole{width:48%;aspect-ratio:1;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 0 1px rgba(0,0,0,.08)}
    #jump-coverage-donut .jcd-hole b{font-size:38px;line-height:1}
    #jump-coverage-donut .jcd-hole span{font-size:12px;font-weight:800;margin-top:5px;color:#666}
    #jump-coverage-donut .jcd-legend{display:flex;flex-direction:column;gap:0}
    #jump-coverage-donut .jcd-row{display:grid;grid-template-columns:14px 1fr auto;gap:11px;align-items:center;padding:12px 0;border-bottom:1px solid #ecece7;font-size:15px}
    #jump-coverage-donut .jcd-row:last-child{border-bottom:0}
    #jump-coverage-donut .jcd-row i{width:12px;height:12px;border-radius:4px}
    #jump-coverage-donut .jcd-row span{font-weight:750}
    #jump-coverage-donut .jcd-row strong{font-size:14px}
    @media(max-width:700px){#jump-coverage-donut{margin:22px 14px;padding:24px 20px;border-radius:24px}#jump-coverage-donut .jcd-head h2{font-size:28px}#jump-coverage-donut .jcd-wrap{grid-template-columns:1fr;gap:22px}#jump-coverage-donut .jcd-donut{width:min(64vw,260px)}#jump-coverage-donut .jcd-row{font-size:14px;padding:10px 0}}
  `}</style>;
}
