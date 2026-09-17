import LegacyEdition from '../legacy/September15';
import {publishedEditions} from '../lib/published';
import PublishedHome from './components/PublishedHome';
export const dynamic='force-dynamic';
export default async function Home(){const result=await publishedEditions();return <PublishedHome result={result} legacy={<LegacyEdition/>}/>;}
