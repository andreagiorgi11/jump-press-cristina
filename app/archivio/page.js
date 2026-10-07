import {Suspense} from 'react';
import ArchivePreview from '../components/ArchivePreview';
import ArchiveSearch from '../components/ArchiveSearch';
import {draftPreviews} from '../../lib/archive-search';
import {archiveSnapshot} from '../../lib/archive-snapshot';
import ArchiveEntries from '../components/ArchiveEntries';
import ExportPage from '../summary/ExportPage';
import './archive.css';
import {configured,contentConfigured} from '../../lib/config';
import {requireEditor} from '../../lib/server-client';
import {incident} from '../../lib/errors';
import {publishedPreviews} from '../../lib/published';
import {listedLegacyEditionDates as legacy} from '../../lib/archive-dates';
export const dynamic='force-dynamic';
export const metadata={title:'Archivio | JUMP PRESS Juventus'};
export default async function Archivio(){
 let drafts=[],draftsUnavailable=false,canDelete=false,identity=null;
 if(configured())try{identity=await requireEditor();canDelete=['editor','publisher'].includes(identity.role);}catch(e){if(e.status!==401&&e.status!==403){draftsUnavailable=true;await incident('archive_drafts_unavailable');}}
 let result={rows:[],unavailable:false,head:null};
 if(contentConfigured())try{const snapshot=await archiveSnapshot(identity);result={...snapshot,unavailable:false};drafts=snapshot.drafts;}catch{result={rows:null,unavailable:true,head:null};draftsUnavailable=Boolean(identity);await incident('published_read_unavailable');}
 // Explicit local visual fixture, never active in production or a deployed preview.
 if(process.env.NODE_ENV==='development'&&!process.env.VERCEL&&process.env.JUMP_LOCAL_ARCHIVE_FIXTURE){
  const {readFile}=await import('node:fs/promises');drafts=JSON.parse(await readFile(process.env.JUMP_LOCAL_ARCHIVE_FIXTURE,'utf8'));draftsUnavailable=false;
 }
 const dates=[...new Set([...(result.rows||[]).map(r=>r.edition_date),...legacy])].sort().reverse();
 const entries=[...dates.map(date=>({date,href:(result.rows||[]).some(r=>r.edition_date===date)?'/edizioni/'+date:'/archivio/'+date,key:date,editVersion:drafts.find(d=>d.id===(result.rows||[]).find(r=>r.edition_date===date)?.draft_id)?.version,editId:canDelete?(result.rows||[]).find(r=>r.edition_date===date)?.draft_id:null})),...drafts.filter(d=>!(result.rows||[]).some(r=>r.draft_id===d.id&&r.version===d.version)).map(d=>({date:d.body.date,href:d.localPreview?'/anteprima-locale':'/editor?draft='+encodeURIComponent(d.id),key:d.id,draft:true,version:d.version,canDelete:canDelete&&!d.localPreview&&!result.unavailable&&!(result.rows||[]).some(r=>r.draft_id===d.id)}))].sort((a,b)=>b.date.localeCompare(a.date)||Number(!!b.draft)-Number(!!a.draft));
 const previews=publishedPreviews((result.rows||[]).map(r=>r.edition_date).sort().reverse(),{head:result.head});
 const draftDetails=identity&&result.head?draftPreviews(drafts.filter(d=>entries.some(e=>e.draft&&e.key===d.id)),result.head,identity):Promise.resolve({});
 for(const entry of entries)if(entry.draft)entry.previewContent=<Suspense fallback={null}><ArchivePreview previews={draftDetails} date={entry.key}/></Suspense>;else entry.previewContent=<Suspense fallback={null}><ArchivePreview previews={previews} date={entry.date}/></Suspense>;
 return <><ExportPage archive live/><div className="summary-content"><main className="summary-edition archive-page"><div className="edition-view"><header><div className="edition-date-line"><small>JUVENTUS · ARCHIVIO</small></div><div className="archive-title-row"><h1>Archivio <em>rassegne</em></h1><ArchiveSearch/></div></header>
 {result.unavailable&&<p className="archive-alert" role="alert">Archivio online temporaneamente non disponibile. L’elenco potrebbe essere incompleto.</p>}{draftsUnavailable&&<p className="archive-alert" role="alert">Le bozze non sono disponibili al momento. Le edizioni pubblicate restano consultabili; riprova per recuperare le bozze.</p>}
 <section className="archive-list" aria-label="Edizioni"><ArchiveEntries entries={entries} editor={canDelete} unavailable={draftsUnavailable||result.unavailable}/></section></div></main></div></>;
}
