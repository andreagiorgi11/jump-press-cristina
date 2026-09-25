import {notFound} from 'next/navigation';
import {readFile} from 'node:fs/promises';
import EditionView from '../components/EditionView';
import ArticleFilter from '../components/ArticleFilter';
import PdfLinkHandler from '../PdfLinkHandler';
import {analyseEdition} from '../../lib/edition-analysis';
import ExportPage from './ExportPage';
import {summaryEdition,articleSections} from '../../lib/summary-sections';
import './edition-print.css';
import './juventus-brand.css';
import TodayNotice from '../components/TodayNotice';
const demoRun=(run,extra={})=>({notice:null,latestDate:'2026-09-18',editor:{date:'2026-09-24',published:false,draft:null,run:{status:'not_started',phase:null,nextPage:null,updatedAt:null,stalled:false,attemptsRemaining:3,warnings:0,...run},...extra}});
const demos={
 prima:{notice:{today:'2026-09-24',latestDate:'2026-09-23',state:'scheduled'},latestDate:'2026-09-23',editor:null},
 dopo:{notice:{today:'2026-09-24',latestDate:'2026-09-23',state:'preparing'},latestDate:'2026-09-23',editor:null},
 'editor-attesa':demoRun({}),
 'editor-lavoro':demoRun({status:'running',phase:'reading',nextPage:63,updatedAt:Date.parse('2026-09-24T06:52:00Z')}),
 'editor-fermo':demoRun({status:'running',phase:'reading',nextPage:63,updatedAt:Date.parse('2026-09-24T06:52:00Z'),stalled:true}),
 'editor-fermo-bozza':demoRun({status:'running',phase:'review',updatedAt:Date.parse('2026-09-24T06:30:00Z'),stalled:true},{draft:{id:'demo',version:6}}),
 'editor-errore':demoRun({status:'failed',phase:'import',attemptsRemaining:2}),
 'editor-pronta':demoRun({status:'completed',phase:'review',warnings:2},{draft:{id:'demo',version:4}})
};
export const dynamic='force-dynamic';
export default async function SummaryPage({searchParams}){
 if(process.env.JUMP_SUMMARY_SANDBOX!=='1'||process.env.VERCEL)notFound();
 const demo=demos[(await searchParams)?.avviso];
 const source=JSON.parse(await readFile(process.cwd()+'/.local/summary-edition.json','utf8'));
 return <><ExportPage coverageStats={analyseEdition(source)} date={source.date}/><ArticleFilter/><PdfLinkHandler/><div className="summary-content">{demo&&<TodayNotice demo={demo}/>}<main id="rassegna-oggi" className="summary-edition"><EditionView hideBrand body={summaryEdition(source)} categoryOrder={articleSections} compactAnalysis/></main></div></>;
}
