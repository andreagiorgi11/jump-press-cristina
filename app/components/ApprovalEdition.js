'use client';
import {useEffect} from 'react';
import {analyseEdition} from '../../lib/edition-analysis';
import ExportPage from '../summary/ExportPage';
import EditionView from './EditionView';
import TodayNotice from './TodayNotice';
import EditionNotice from './EditionNotice';
import {summaryEdition,articleSections} from '../../lib/summary-sections';
export default function ApprovalEdition({body,lang='it',translationPending=false,translationUnavailable=false,translationCurrent=false,published=false,draftId,version,assets=[],today,editorPanel,onConfirmSummary,...props}){
 useEffect(()=>{document.documentElement.lang=lang;},[lang]);
 const summaryAlert=published||!draftId||body.editorialModel!=='summary-v1'?null:!body.executiveSummary?'Manca il Summary':body.executiveSummaryStale?'Summary da ricontrollare':null;
 const query=(draftId?'draft='+encodeURIComponent(draftId)+'&version='+version:'date='+body.date)+(lang==='en'&&!translationPending?'&lang=en':'');
 return <><ExportPage onConfirmSummary={onConfirmSummary} lang={lang} coverageStats={analyseEdition(body,assets)} date={body.date} live pdfEndpoint={'/api/edition-pdf?'+query} summaryAvailable={!!body.executiveSummary} summaryAlert={summaryAlert} editorPanel={editorPanel}/><div className="summary-content"><main id="rassegna-oggi" className="summary-edition">{today&&<TodayNotice initial={today} lang={lang}/>}{translationPending&&<EditionNotice badge="EN" lang="en" title={translationUnavailable?'English version temporarily unavailable':translationCurrent?'English version coming soon':'English version not available'}>{translationUnavailable?'We could not load the English version. You’re reading the Italian edition; please try again shortly.':translationCurrent?'The English version is not available yet. You’re reading the Italian edition.':'This edition is available in Italian only.'}</EditionNotice>}<EditionView {...props} lang={lang} hideBrand compactAnalysis categoryOrder={articleSections} body={summaryEdition(body)}/></main></div></>;
}
