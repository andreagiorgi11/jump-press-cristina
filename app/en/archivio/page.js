import {Suspense} from 'react';
import ArchivePreview from '../../components/ArchivePreview';
import ArchiveSearch from '../../components/ArchiveSearch';
import ArchiveEntries from '../../components/ArchiveEntries';
import ExportPage from '../../summary/ExportPage';
import '../../archivio/archive.css';
import {publishedEditions,publishedPreviews} from '../../../lib/published';
import {translatedPreviews} from '../../../lib/translations';
import EnglishDocument from '../../components/EnglishDocument';
export const dynamic='force-dynamic';
export const metadata={title:'Archive | JUMP PRESS Juventus'};
async function TranslationNotice({previews}){return (await previews).translationUnavailable?<p className="archive-alert" role="alert">English previews are temporarily unavailable. Italian previews remain available.</p>:null;}
// English archive includes Italian editions awaiting translation.
export default async function EnglishArchive(){
 const result=await publishedEditions(null,{full:false});
 const dates=(result.rows||[]).map(r=>r.edition_date).sort().reverse();
 const previews=Promise.all([publishedPreviews(dates),translatedPreviews('en')]).then(([italian,english])=>{
  const translated=new Map(english.rows.map(row=>[row.date,row.preview]));
  return {...Object.fromEntries(dates.map(date=>[date,translated.get(date)||italian[date]])),translationUnavailable:english.unavailable};
 });
 const unavailable=result.unavailable;
 const entries=dates.map(date=>({date,href:'/en/edizioni/'+date,key:date,previewContent:<Suspense fallback={null}><ArchivePreview previews={previews} date={date} lang="en"/></Suspense>}));
 return <><EnglishDocument/><ExportPage lang="en" archive live/><div className="summary-content"><main className="summary-edition archive-page"><div className="edition-view"><header><div className="edition-date-line"><small>JUVENTUS · ARCHIVE</small></div><div className="archive-title-row"><h1>Review <em>archive</em></h1><ArchiveSearch lang="en"/></div></header>
 {unavailable&&<p className="archive-alert" role="alert">The archive is temporarily unavailable. The list may be incomplete.</p>}<Suspense fallback={null}><TranslationNotice previews={previews}/></Suspense>
 <section className="archive-list" aria-label="Editions"><ArchiveEntries lang="en" entries={entries} unavailable={unavailable}/></section></div></main></div></>;
}
