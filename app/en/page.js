import {redirect} from 'next/navigation';
import {translatedEdition} from '../../lib/translations';
import ApprovalEdition from '../components/ApprovalEdition';
export const dynamic='force-dynamic';
export const metadata={title:'JUMP PRESS Juventus — press review'};
// English home: the latest edition with an up-to-date translation. Without one, the Italian home (no notice).
export default async function EnglishHome(){
 const {row}=await translatedEdition(null,'en');
 if(!row)redirect('/?it=1');
 return <ApprovalEdition lang="en" body={row.body}/>;
}
