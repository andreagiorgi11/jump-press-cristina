import {notFound} from 'next/navigation';
import {englishReaderEdition} from '../../lib/translations';
import ApprovalEdition from './ApprovalEdition';
import ExportPage from '../summary/ExportPage';
import EnglishDocument from './EnglishDocument';
import {readerNotice,romeNow} from '../../lib/today-status';
export default async function EnglishEditionPage({date=null}){
 const {row,unavailable,translationPending}=await englishReaderEdition(date);
 if(!row){
  if(!unavailable&&date)notFound();
  return <><EnglishDocument/><ExportPage lang="en" live hasEdition={false}/><div className="summary-content"><main className="summary-edition"><h1>{unavailable?'Press review temporarily unavailable':'No published reviews yet'}</h1><p>{unavailable?'We could not load the published review. Please try again shortly.':'The next press review will appear here once published.'}</p></main></div></>;
 }
 const today=!date&&!unavailable?{latestDate:row.body.date,notice:readerNotice(row.body.date)}:null;
 return <ApprovalEdition lang="en" body={row.body} today={today} translationPending={translationPending} translationUnavailable={unavailable} translationCurrent={row.body.date===romeNow().date}/>;
}
