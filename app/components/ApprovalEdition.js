'use client';
import {useEffect} from 'react';
import {analyseEdition} from '../../lib/edition-analysis';
import ExportPage from '../summary/ExportPage';
import EditionView from './EditionView';
import TodayNotice from './TodayNotice';
import {summaryEdition,articleSections} from '../../lib/summary-sections';
export default function ApprovalEdition({body,lang='it',translationPending=false,translationUnavailable=false,draftId,version,assets=[],today,editorPanel,...props}){
 useEffect(()=>{document.documentElement.lang=lang;},[lang]);
 const summaryAlert=!draftId||body.editorialModel!=='summary-v1'?null:!body.executiveSummary?'Manca il Summary':body.executiveSummaryStale?'Summary da ricontrollare':null;
 const query=(draftId?'draft='+encodeURIComponent(draftId)+'&version='+version:'date='+body.date)+(lang==='en'&&!translationPending?'&lang=en':'');
 return <><ExportPage lang={lang} coverageStats={analyseEdition(body,assets)} date={body.date} live pdfEndpoint={'/api/edition-pdf?'+query} summaryAvailable={!!body.executiveSummary} summaryAlert={summaryAlert} editorPanel={editorPanel}/><div className="summary-content">{today&&<TodayNotice initial={today}/>}<main id="rassegna-oggi" className="summary-edition">{translationPending&&<aside className="translation-notice" role="status" lang="en"><span className="translation-notice-icon" aria-hidden="true">EN</span><div><strong>{translationUnavailable?"English version temporarily unavailable":"English version coming soon"}</strong><p>{translationUnavailable?"We could not load the English version. You’re reading the Italian edition; please try again shortly.":"The English version is not available yet. You’re reading the Italian edition."}</p></div><svg className="translation-notice-clock" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round"/></svg></aside>}<EditionView {...props} lang={lang} hideBrand compactAnalysis categoryOrder={articleSections} body={summaryEdition(body)}/></main></div></>;
}
