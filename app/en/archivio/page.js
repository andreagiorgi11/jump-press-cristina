import ArchiveEntries from '../../components/ArchiveEntries';
import ExportPage from '../../summary/ExportPage';
import '../../archivio/archive.css';
import {translatedPreviews} from '../../../lib/translations';
import EnglishDocument from '../../components/EnglishDocument';
export const dynamic='force-dynamic';
export const metadata={title:'Archive | JUMP PRESS Juventus'};
// English archive: only editions with an up-to-date translation.
export default async function EnglishArchive(){
 const {rows,unavailable}=await translatedPreviews('en');
 const entries=rows.map(r=>({date:r.date,href:'/en/edizioni/'+r.date,key:r.date,preview:r.preview}));
 return <><EnglishDocument/><ExportPage lang="en" archive live/><div className="summary-content"><main className="summary-edition archive-page"><div className="edition-view"><header><div className="edition-date-line"><small>JUVENTUS · ARCHIVE</small></div><h1>Review <em>archive</em></h1></header>
 <section className="archive-list" aria-label="Editions"><ArchiveEntries lang="en" entries={entries} unavailable={unavailable}/></section></div></main></div></>;
}
