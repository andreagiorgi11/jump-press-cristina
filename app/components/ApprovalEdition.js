'use client';
import {analyseEdition} from '../../lib/edition-analysis';
import ExportPage from '../summary/ExportPage';
import EditionView from './EditionView';
import TodayNotice from './TodayNotice';
import {summaryEdition,summarySections} from '../../lib/summary-sections';
export default function ApprovalEdition({body,draftId,version,assets=[],today,...props}){
 const summaryAlert=!draftId||body.editorialModel!=='summary-v1'?null:!body.executiveSummary?'Summary da completare':body.executiveSummaryStale?'Summary da ricontrollare dopo le modifiche':null;
 const query=draftId?'draft='+encodeURIComponent(draftId)+'&version='+version:'date='+body.date;
 return <><ExportPage coverageStats={analyseEdition(body,assets)} date={body.date} live pdfEndpoint={'/api/edition-pdf?'+query} summaryAvailable={!!body.executiveSummary} summaryAlert={summaryAlert}/><div className="summary-content">{today&&<TodayNotice initial={today}/>}<main id="rassegna-oggi" className="summary-edition"><EditionView {...props} hideBrand compactAnalysis categoryOrder={summarySections} body={summaryEdition(body)}/></main></div></>;
}
