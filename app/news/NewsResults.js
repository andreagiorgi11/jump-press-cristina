'use client';
import {useEffect,useState} from 'react';
function formatDate(value){try{return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'short',timeStyle:'short'}).format(new Date(value));}catch{return 'Data e ora non disponibili';}}
export default function NewsResults({result}){
 const [last,setLast]=useState(result.rows);
 useEffect(()=>{if(result.rows.length||!result.failed)setLast(result.rows);},[result]);
 const rows=result.failed&&!result.rows.length?last:result.rows;
 return <section className="newslist">{result.failed>0&&<p role="alert" className="newsempty">{result.failed===result.total?'I servizi delle notizie non sono disponibili.':'Alcune fonti non rispondono: l’elenco è parziale.'} {rows.length?'Restano visibili le notizie disponibili.':'Riprova tra poco.'}</p>}{rows.map((n,i)=><a className="newscard" href={n.link} target="_blank" rel="noreferrer" key={`${n.link}-${i}`}><div className="newsmeta"><b>{n.source||'Notizia'}</b><span>{formatDate(n.date)}</span></div><h2>{n.title}</h2><span className="newsopen">Apri notizia ↗</span></a>)}{!rows.length&&!result.failed&&<div className="newsempty">Nessuna notizia presente nelle fonti consultate.</div>}</section>;
}
