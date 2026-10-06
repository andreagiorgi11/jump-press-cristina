'use client';
import {useEffect} from 'react';
import {analyseEdition} from '../../lib/edition-analysis';
import ExportPage from '../summary/ExportPage';
import EditionView from './EditionView';
import TodayNotice from './TodayNotice';
import {summaryEdition,articleSections} from '../../lib/summary-sections';
export default function ApprovalEdition({body,lang='it',draftId,version,assets=[],today,editorPanel,...props}){
 useEffect(()=>{document.documentElement.lang=lang;},[lang]);
 const summaryAlert=!draftId||body.editorialModel!=='summary-v1'?null:!body.executiveSummary?'Manca il Summary':body.executiveSummaryStale?'Summary da ricontrollare':null;
 const query=(draftId?'draft='+encodeURIComponent(draftId)+'&version='+version:'date='+body.date)+(lang==='en'?'&lang=en':'');
 return <><ExportPage lang={lang} coverageStats={analyseEdition(body,assets)} date={body.date} live pdfEndpoint={'/api/edition-pdf?'+query} summaryAvailable={!!body.executiveSummary} summaryAlert={summaryAlert} editorPanel={editorPanel}/><div className="summary-content">{today&&<TodayNotice initial={today}/>}<main id="rassegna-oggi" className="summary-edition"><EditionView {...props} lang={lang} hideBrand compactAnalysis categoryOrder={articleSections} body={summaryEdition(body)}/></main></div></>;
}
