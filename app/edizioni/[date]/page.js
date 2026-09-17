import {notFound} from 'next/navigation';
import {publishedEditions} from '../../../lib/published';
import EditionView from '../../components/EditionView';
export const dynamic='force-dynamic';
export default async function Edition({params}){
 const {date}=await params;if(!/^\d{4}-\d{2}-\d{2}$/.test(date))notFound();
 const result=await publishedEditions(date);
 if(result.unavailable)return <main><section className="ranking"><h2>Edizione temporaneamente non disponibile</h2><p>Riprova tra poco.</p></section></main>;
 if(!result.rows.length)notFound();return <main><EditionView body={result.rows[0].body}/></main>;
}
