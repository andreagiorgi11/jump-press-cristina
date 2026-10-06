import {notFound} from 'next/navigation';
import EnglishEditionPage from '../../../components/EnglishEditionPage';
export const dynamic='force-dynamic';
export const metadata={title:'JUMP PRESS Juventus — press review'};
export default async function EnglishEdition({params}){
 const {date}=await params;if(!/^\d{4}-\d{2}-\d{2}$/.test(date))notFound();
 return <EnglishEditionPage date={date}/>;
}
