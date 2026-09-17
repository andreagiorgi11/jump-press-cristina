import Link from 'next/link';
import {configured} from '../../lib/config';
import {requireEditor} from '../../lib/server-client';
import {listDrafts} from '../../lib/editor-service';
import {incident} from '../../lib/errors';
import {publishedEditions} from '../../lib/published';
const legacy=['2026-09-15','2026-09-13','2026-08-26','2026-08-25','2026-08-24'];
export const dynamic='force-dynamic';
export const metadata={title:'Archivio | JUMP PRESS Juventus'};
export default async function Archivio(){
 const result=await publishedEditions();
 let drafts=[],draftsUnavailable=false;
 if(configured())try{const {db}=await requireEditor();drafts=await listDrafts(db);}catch(e){if(e.status!==401){draftsUnavailable=true;await incident('archive_drafts_unavailable');}}
 // Explicit local visual fixture, never active in production or a deployed preview.
 if(process.env.NODE_ENV==='development'&&!process.env.VERCEL&&process.env.JUMP_LOCAL_ARCHIVE_FIXTURE){
  const {readFile}=await import('node:fs/promises');drafts=JSON.parse(await readFile(process.env.JUMP_LOCAL_ARCHIVE_FIXTURE,'utf8'));draftsUnavailable=false;
 }
 const dates=[...new Set([...(result.rows||[]).map(r=>r.edition_date),...legacy])].sort().reverse();
 const entries=[...dates.map(date=>({date,href:(result.rows||[]).some(r=>r.edition_date===date)?'/edizioni/'+date:'/archivio/'+date,key:date})),...drafts.filter(d=>!(result.rows||[]).some(r=>r.draft_id===d.id&&r.version===d.version)).map(d=>({date:d.body.date,href:d.localPreview?'/anteprima-locale':'/editor?draft='+encodeURIComponent(d.id),key:d.id,draft:true}))].sort((a,b)=>b.date.localeCompare(a.date)||Number(!!b.draft)-Number(!!a.draft));
 return <main><div className="top"><div className="brand"><i>JUMP</i> PRESS</div><div className="edition">JUVENTUS · ARCHIVIO</div></div><section className="brief"><small>ARCHIVIO RASSEGNE</small><h2>Tutte le edizioni</h2><p>{drafts.length?'Consulta le edizioni pubblicate e riapri le bozze della redazione.':'Consulta le rassegne pubblicate.'}</p>{result.unavailable&&<p role="alert">Archivio online temporaneamente non disponibile. Qui sotto restano consultabili le edizioni storiche già incluse nel sito; l’elenco potrebbe essere incompleto.</p>}{draftsUnavailable&&<p role="alert">Le bozze non sono disponibili al momento. Le edizioni pubblicate restano consultabili; riprova per recuperare le bozze.</p>}<div className="archivegrid">{entries.map(entry=><Link className="archivecard" key={entry.key} href={entry.href}><small>{new Intl.DateTimeFormat('it-IT',{dateStyle:'long',timeZone:'UTC'}).format(new Date(entry.date+'T12:00:00Z'))}{entry.draft&&<strong style={{color:'#a6202b',marginLeft:10}}>BOZZA</strong>}</small><b>Rassegna stampa Juventus</b><span>{entry.draft?'Apri la bozza →':'Leggi l’edizione →'}</span></Link>)}</div></section></main>;
}
