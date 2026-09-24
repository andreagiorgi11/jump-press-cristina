import LegacyEdition from '../legacy/September15';
import {publishedEditions} from '../lib/published';
import PublishedHome from './components/PublishedHome';
import SummaryPage from './summary/page';
import {readerNotice} from '../lib/today-status';
export const dynamic='force-dynamic';
export default async function Home({searchParams}){if(process.env.JUMP_SUMMARY_SANDBOX==='1')return <SummaryPage searchParams={searchParams}/>;const result=await publishedEditions(),latestDate=result.rows?.[0]?.body?.date||null;
 // Computed on the server in Europe/Rome time; the client only refreshes it.
 const today=result.unavailable?null:{latestDate,notice:readerNotice(latestDate)};
 return <PublishedHome result={result} today={today} legacy={<LegacyEdition/>}/>;}
