import {notFound} from 'next/navigation';
import {englishReaderEdition} from '../../lib/translations';
import EnglishEditableEdition from './EnglishEditableEdition';
import {requireEditor} from '../../lib/server-client';
import ExportPage from '../summary/ExportPage';
import EnglishDocument from './EnglishDocument';
import {readerNotice,romeNow} from '../../lib/today-status';
export default async function EnglishEditionPage({date=null}){
 const {row,unavailable,translationPending}=await englishReaderEdition(date);
 if(!row){
  if(!unavailable&&date)notFound();
  return <><EnglishDocument/><ExportPage lang="en" live hasEdition={false}/><div className="summary-content"><main className="summary-edition"><h1>{unavailable?'Press review temporarily unavailable':'No published reviews yet'}</h1><p>{unavailable?'We could not load the published review. Please try again shortly.':'The next press review will appear here once published.'}</p></main></div></>;
 }
 let canEdit=false;
 if(!translationPending&&!unavailable&&row.translationRevision){try{const {role}=await requireEditor();canEdit=['editor','publisher'].includes(role);}catch(e){if(![401,403].includes(e.status))throw e;}}
 const today=!date&&!unavailable?{latestDate:row.body.date,notice:readerNotice(row.body.date)}:null;
 return <EnglishEditableEdition canEdit={canEdit} revision={row.translationRevision} sourceVersion={row.version} body={row.body} today={today} translationPending={translationPending} translationUnavailable={unavailable} translationCurrent={row.body.date===romeNow().date}/>;
}
