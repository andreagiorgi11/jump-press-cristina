'use client';
import ExportPage from '../summary/ExportPage';
import EditionView from './EditionView';
import {summaryEdition,summarySections} from '../../lib/summary-sections';
export default function ApprovalEdition({body,draftId,version,...props}){
 const query=draftId?'draft='+encodeURIComponent(draftId)+'&version='+version:'date='+body.date;
 return <><ExportPage date={body.date} live pdfEndpoint={'/api/edition-pdf?'+query} summaryAvailable={!!body.executiveSummary}/><div className="summary-content"><main id="rassegna-oggi" className="summary-edition"><EditionView {...props} hideBrand compactAnalysis categoryOrder={summarySections} body={summaryEdition(body)}/></main></div></>;
}
