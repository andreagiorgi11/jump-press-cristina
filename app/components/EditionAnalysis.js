import CombinedAnalysis from './CombinedAnalysis';
import SectionEditButton from './SectionEditButton';
import OutletWordmark from './OutletWordmark';
import {analyseEdition,ratingCopy} from '../../lib/edition-analysis';
const frontpagePriority=name=>{const label=(name||'').toLocaleLowerCase('it-IT');return label.includes('gazzetta dello sport')?0:label.includes('corriere dello sport')?1:label.includes('tuttosport')?2:3;};
const value=n=>n??<span className="unverified">Non verificato</span>;
const percentage=(n,total)=>total>0?`${(n/total*100).toLocaleString('it-IT',{maximumFractionDigits:1})}%`:null;
function Tile({number,label,note}){return <div><b className={typeof number==='string'?'unverified':undefined}>{number}</b><span>{label}</span>{note&&<small>{note}</small>}</div>}
export function EditionStats({body}){
 const a=analyseEdition(body);
 const metrics=body.coverage?null:body.metrics;
 return <div className="stats">{metrics?.length?metrics.map((m,i)=><div key={i}><b>{m.value}</b><span>{m.label}</span></div>):<><div><b>{value(a.examined)}</b><span>voci esaminate</span></div><div><b>{a.selected}</b><span>articoli selezionati</span></div><div><b>{value(a.frontPages)}</b><span>prime pagine verificate</span></div><div><b>{value(a.juventus)}</b><span>prime pagine con Juventus</span></div></>}</div>;
}
export default function EditionAnalysis({body,onClip,privateClips=false,onEdit,compact=false}){
 const a=analyseEdition(body);
 return <>
  <section className="ranking"><small>QUADRO GENERALE DELLA RASSEGNA</small><h2>I numeri dell’intera copertura</h2>
   <div id="jump-daily-metrics">
    <Tile number={value(a.examined)} label="voci complessive esaminate" note="Base di lavoro prima della selezione editoriale"/>
    <Tile number={a.selected} label="pezzi selezionati" note={percentage(a.selected,a.examined)?`${percentage(a.selected,a.examined)} del totale esaminato`:'Articoli presenti in questa rassegna'}/>
    <Tile number={value(a.frontPages)} label="prime pagine verificate" note="Italiane e internazionali presenti nella rassegna"/>
    <Tile number={a.frontPages===null?'Non verificato':`${a.juventus} / ${a.frontPages}`} label="prime pagine con richiamo Juventus" note={percentage(a.juventus,a.frontPages)}/>
    <Tile number={a.sports===null?'Non verificato':`${a.sportsJuventus} / ${a.sports}`} label="quotidiani sportivi italiani" note="Copertine con Juventus sul totale degli sportivi italiani verificati"/>
    <Tile number={a.frontPages===null?'Non verificato':a.frontPages-a.juventus} label="prime pagine senza Juventus"/>
   </div>
   <div className="jump-frontpages-list frontpages-wordmarks"><b>Dove la Juventus è in prima pagina</b><div>{a.outlets===null?<p>Prime pagine da verificare.</p>:a.outlets.length?(body.coverage.frontPages.filter(p=>p.juventus).sort((x,y)=>compact?frontpagePriority(x.outlet)-frontpagePriority(y.outlet):0)).map(p=><div key={p.page}>{p.clipId?(privateClips?<button type="button" className="frontpage-link" onClick={()=>onClip?.(p.clipId)} aria-label={'Apri prima pagina di '+p.outlet}><OutletWordmark name={p.outlet}/></button>:<a className="frontpage-link" href={'/api/clips/'+p.clipId} target="_blank" rel="noreferrer" aria-label={'Apri prima pagina di '+p.outlet}><OutletWordmark name={p.outlet}/></a>):<OutletWordmark name={p.outlet}/>}</div>):<p>Nessun richiamo Juventus nelle prime pagine verificate.</p>}</div></div>
  </section>
  {compact?<CombinedAnalysis body={body} analysis={a}/>:<>
  <section id="jump-coverage-donut"><div className="jcd-head"><small>DISTRIBUZIONE DELLA RASSEGNA</small><h2>Il peso dei temi di oggi</h2><p>Quota degli articoli selezionati per area editoriale. Ogni articolo appartiene a una sola area.</p></div>
   {a.selected>0?<div className="jcd-wrap"><div className="jcd-donut" aria-hidden="true" style={{background:`conic-gradient(${a.themes.map(t=>`${t.color} ${t.start}% ${t.end}%`).join(',')})`}}><div className="jcd-hole"><b>{a.selected}</b><span>articoli</span></div></div><div className="jcd-legend">{a.themes.map(t=><div className="jcd-row" key={t.label}><i style={{background:t.color}}/><span>{t.label}</span><strong>{t.count} · {t.displayPercent}%</strong></div>)}</div></div>:<p>Nessun articolo ancora selezionato.</p>}
  </section>
  <section className="ranking jump-insights"><small>LETTURA DELLA RASSEGNA</small><h2>Temi, parole e tono di oggi</h2><div className="jump-insight-grid">
   <div className={`jump-insight-card ${onEdit?'editable-section':''}`}><SectionEditButton onEdit={onEdit} section="keyPoints" label="punti chiave"/><b>{body.keyPoints.length===3?'3 punti chiave':'Punti chiave'}</b>{body.keyPoints.length?<ul>{body.keyPoints.map((p,i)=><li key={i}>{p}</li>)}</ul>:<p>Punti chiave da completare.</p>}</div>
   <div className={`jump-insight-card ${onEdit?'editable-section':''}`}><SectionEditButton onEdit={onEdit} section="tone" label="toni prevalenti"/><b>Toni prevalenti</b><div className="tonechips">{body.tones.map(t=><span key={t}>{t}</span>)}</div><p>{body.toneSummary||(body.tones.length?'':'Analisi del tono da completare.')}</p></div>
  </div></section>
  </>}
  {!compact&&<aside id="jump-rating-guide" className="rating-note" aria-label="Come leggere le stelle"><p><b>Peso delle notizie.</b> Le stelle indicano la rilevanza nella rassegna, non la qualità della testata o il tono della notizia.</p><ul>{[5,4,3,2,1].map(n=><li key={n}><span className="rating-level" aria-label={`${n} su 5`}>{n}<span className="rating-segments" aria-hidden="true">{[1,2,3,4,5].map(i=><i key={i} className={i<=n?'is-filled':''}/>)}</span></span><span>{n===5?'Dominante':ratingCopy[n][0]}</span></li>)}</ul></aside>}
 </>;
}
