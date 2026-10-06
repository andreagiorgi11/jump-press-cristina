import ArchiveEntries from '../../components/ArchiveEntries';
import ExportPage from '../../summary/ExportPage';
import '../../archivio/archive.css';
import {publishedEditions,publishedPreviews} from '../../../lib/published';
import {translatedPreviews} from '../../../lib/translations';
import EnglishDocument from '../../components/EnglishDocument';
export const dynamic='force-dynamic';
export const metadata={title:'Archive | JUMP PRESS Juventus'};
// English archive includes Italian editions awaiting translation.
export default async function EnglishArchive(){
 const result=await publishedEditions(null,{full:false});
 const dates=(result.rows||[]).map(r=>r.edition_date).sort().reverse();
 const [italian,english]=await Promise.all([publishedPreviews(dates),translatedPreviews('en')]);
 const translated=new Map(english.rows.map(r=>[r.date,r.preview]));
 const unavailable=result.unavailable||english.unavailable;
 const entries=dates.map(date=>({date,href:'/en/edizioni/'+date,key:date,preview:translated.get(date)||italian[date]}));
 return <><EnglishDocument/><ExportPage lang="en" archive live/><div className="summary-content"><main className="summary-edition archive-page"><div className="edition-view"><header><div className="edition-date-line"><small>JUVENTUS · ARCHIVE</small></div><h1>Review <em>archive</em></h1></header>
 <section className="archive-list" aria-label="Editions"><ArchiveEntries lang="en" entries={entries} unavailable={unavailable}/></section></div></main></div></>;
}
