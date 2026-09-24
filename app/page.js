import LegacyEdition from '../legacy/September15';
import {publishedEditions} from '../lib/published';
import PublishedHome from './components/PublishedHome';
import SummaryPage from './summary/page';
import {readerNotice} from '../lib/today-status';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {homeEditorDestination} from '../lib/home-entry';
export const dynamic='force-dynamic';
export default async function Home({searchParams}){
 if(process.env.JUMP_SUMMARY_SANDBOX==='1')return <SummaryPage searchParams={searchParams}/>;
 if(process.env.JUMP_APPROVAL_LIVE==='1'&&process.env.JUMP_SITE!=='news'){
  const destination=await homeEditorDestination((await cookies()).get('jump_session')?.value);
  if(destination)redirect(destination);
 }
 const result=await publishedEditions(),latestDate=result.rows?.[0]?.body?.date||null;
 // Computed on the server in Europe/Rome time; the client only refreshes it.
 const today=result.unavailable?null:{latestDate,notice:readerNotice(latestDate)};
 return <PublishedHome result={result} today={today} legacy={<LegacyEdition/>}/>;}
