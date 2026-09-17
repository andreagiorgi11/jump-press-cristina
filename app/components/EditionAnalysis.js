import {analyseEdition,ratingCopy} from '../../lib/edition-analysis';
const value=n=>n??<span className="unverified">Non verificato</span>;
const percentage=(n,total)=>total>0?`${(n/total*100).toLocaleString('it-IT',{maximumFractionDigits:1})}%`:null;
function Tile({number,label,note}){return <div><b className={typeof number==='string'?'unverified':undefined}>{number}</b><span>{label}</span>{note&&<small>{note}</small>}</div>}
export function EditionStats({body}){
 const a=analyseEdition(body);
 const metrics=body.coverage?null:body.metrics;
 return <div className="stats">{metrics?.length?metrics.map((m,i)=><div key={i}><b>{m.value}</b><span>{m.label}</span></div>):<><div><b>{value(a.examined)}</b><span>voci esaminate</span></div><div><b>{a.selected}</b><span>articoli selezionati</span></div><div><b>{value(a.frontPages)}</b><span>prime pagine verificate</span></div><div><b>{value(a.juventus)}</b><span>prime pagine con Juventus</span></div></>}</div>;
}
export default function EditionAnalysis({body}){
 const a=analyseEdition(body),coverage=body.coverage;
 return <>
  <section className="ranking"><small>QUADRO GENERALE DELLA RASSEGNA</small><h2>I numeri dell’intera copertura</h2>
   <div id="jump-daily-metrics">
    <Tile number={value(a.examined)} label="voci complessive esaminate" note="Base di lavoro prima della selezione editoriale"/>
    <Tile number={a.selected} label="pezzi selezionati" note={percentage(a.selected,a.examined)?`${percentage(a.selected,a.examined)} del totale esaminato`:'Articoli presenti in questa rassegna'}/>
    <Tile number={value(a.frontPages)} label="prime pagine verificate" note="Italiane e internazionali presenti nella rassegna"/>
    <Tile number={a.frontPages===null?'Non verificato':`${a.juventus} / ${a.frontPages}`} label="prime pagine con richiamo Juventus" note={percentage(a.juventus,a.frontPages)}/>
    <Tile number={a.sports===null?'Non verificato':`${a.sportsJuventus} / ${a.sports}`} label="quotidiani sportivi nazionali" note="Copertine con Juventus sul totale sportivo verificato"/>
    <Tile number={a.frontPages===null?'Non verificato':a.frontPages-a.juventus} label="prime pagine senza Juventus"/>
   </div>
   <div className="jump-frontpages-list"><b>Dove la Juventus è in prima pagina</b><div>{a.outlets===null?<p>Prime pagine da verificare.</p>:a.outlets.length?a.outlets.map(n=><span key={n}>{n}</span>):<p>Nessun richiamo Juventus nelle prime pagine verificate.</p>}</div></div>
   <div className="jump-frontpages-note"><b>Prime pagine: lettura generale</b><p>{coverage?.frontPageSummary||'Lettura delle prime pagine non ancora disponibile.'}</p></div>
   {coverage?.sourceNote&&<p className="coverage-source">Fonte e metodo: {coverage.sourceNote}</p>}
  </section>
  <section id="jump-coverage-donut"><div className="jcd-head"><small>DISTRIBUZIONE DELLA RASSEGNA</small><h2>Il peso dei temi di oggi</h2><p>Quota degli articoli selezionati per area editoriale. Ogni articolo appartiene a una sola area.</p></div>
   {a.selected>0?<div className="jcd-wrap"><div className="jcd-donut" aria-hidden="true" style={{background:`conic-gradient(${a.themes.map(t=>`${t.color} ${t.start}% ${t.end}%`).join(',')})`}}><div className="jcd-hole"><b>{a.selected}</b><span>articoli</span></div></div><div className="jcd-legend">{a.themes.map(t=><div className="jcd-row" key={t.label}><i style={{background:t.color}}/><span>{t.label}</span><strong>{t.count} · {Math.round(t.percent)}%</strong></div>)}</div></div>:<p>Nessun articolo ancora selezionato.</p>}
  </section>
  <section className="ranking jump-insights"><small>LETTURA DELLA RASSEGNA</small><h2>Temi, parole e tono di oggi</h2><div className="jump-insight-grid">
   <div className="jump-insight-card"><b>{body.keyPoints.length===3?'3 punti chiave':'Punti chiave'}</b>{body.keyPoints.length?<ul>{body.keyPoints.map((p,i)=><li key={i}>{p}</li>)}</ul>:<p>Punti chiave da completare.</p>}</div>
   <div className="jump-insight-card"><b>Toni prevalenti</b><div className="tonechips">{body.tones.map(t=><span key={t}>{t}</span>)}</div><p>{body.toneSummary||(body.tones.length?'':'Analisi del tono da completare.')}</p></div>
  </div></section>
  <section id="jump-rating-guide" className="ranking"><small>COME LEGGERE IL RATING</small><h2>Quanto pesa ogni notizia</h2><p>Le stelle misurano il <b>peso editoriale della notizia nella rassegna Juventus di oggi</b>. Non sono un voto alla qualità o all’affidabilità della testata e non indicano se la notizia è positiva o negativa.</p>{[5,4,3,2,1].map(n=><div className="rankrow" key={n}><strong>{'★'.repeat(n)}{'☆'.repeat(5-n)}</strong><span><b>{ratingCopy[n][0]} · {a.ratings[n]} {a.ratings[n]===1?'pezzo':'pezzi'}</b><small>{ratingCopy[n][1]}</small></span></div>)}</section>
 </>;
}
