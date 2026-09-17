import Link from 'next/link';
import {publishedEditions} from '../../lib/published';
const legacy=['2026-09-15','2026-09-13','2026-08-26','2026-08-25','2026-08-24'];
export const dynamic='force-dynamic';
export const metadata={title:'Archivio | JUMP PRESS Juventus'};
export default async function Archivio(){
 const result=await publishedEditions();
 const dates=[...new Set([...(result.rows||[]).map(r=>r.edition_date),...legacy])].sort().reverse();
 return <main><div className="top"><div className="brand"><i>JUMP</i> PRESS</div><div className="edition">JUVENTUS · ARCHIVIO</div></div><section className="brief"><small>ARCHIVIO RASSEGNE</small><h2>Le edizioni precedenti</h2><p>Consulta le rassegne pubblicate. Le bozze sono riservate alla redazione.</p>{result.unavailable&&<p role="alert">Archivio online temporaneamente non disponibile. Qui sotto restano consultabili le edizioni storiche già incluse nel sito; l’elenco potrebbe essere incompleto.</p>}<div className="archivegrid">{dates.map(date=><Link className="archivecard" key={date} href={(result.rows||[]).some(r=>r.edition_date===date)?'/edizioni/'+date:'/archivio/'+date}><small>{new Intl.DateTimeFormat('it-IT',{dateStyle:'long',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'))}</small><b>Rassegna stampa Juventus</b><span>Leggi l’edizione →</span></Link>)}</div></section></main>;
}
