import {notFound} from 'next/navigation';
import {readFile} from 'node:fs/promises';
import EditionView from '../components/EditionView';
import ArticleFilter from '../components/ArticleFilter';
import PdfLinkHandler from '../PdfLinkHandler';
import ExportPage from './ExportPage';
import {summaryEdition,summarySections} from '../../lib/summary-sections';
import './edition-print.css';
export const dynamic='force-dynamic';
export default async function SummaryPage(){
 if(process.env.JUMP_SUMMARY_SANDBOX!=='1'||process.env.VERCEL)notFound();
 const source=JSON.parse(await readFile(process.cwd()+'/.local/summary-edition.json','utf8'));
 return <><ExportPage/><ArticleFilter/><PdfLinkHandler/><main className="summary-edition"><EditionView body={summaryEdition(source)} categoryOrder={summarySections} compactAnalysis/></main></>;
}
