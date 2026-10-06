import {notFound,redirect} from 'next/navigation';
import {translatedEdition} from '../../../../lib/translations';
import ApprovalEdition from '../../../components/ApprovalEdition';
export const dynamic='force-dynamic';
export const metadata={title:'JUMP PRESS Juventus — press review'};
// An edition not translated (yet) opens in Italian, without notice.
export default async function EnglishEdition({params}){
 const {date}=await params;if(!/^\d{4}-\d{2}-\d{2}$/.test(date))notFound();
 const {row}=await translatedEdition(date,'en');
 if(!row)redirect('/edizioni/'+date);
 return <ApprovalEdition lang="en" body={row.body}/>;
}
