import LegacyEdition from '../legacy/September15';
import {publishedEditions} from '../lib/published';
import PublishedHome from './components/PublishedHome';
import SummaryPage from './summary/page';
export const dynamic='force-dynamic';
export default async function Home(){if(process.env.JUMP_SUMMARY_SANDBOX==='1')return <SummaryPage/>;const result=await publishedEditions();return <PublishedHome result={result} legacy={<LegacyEdition/>}/>;}
