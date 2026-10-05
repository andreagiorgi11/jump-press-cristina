import {redirect} from 'next/navigation';
import {requireEditor} from '../../../lib/server-client';
import People from './People';
export const dynamic='force-dynamic';
export default async function PeoplePage(){
 try{await requireEditor();}catch(e){if(e.status===401||e.status===403)redirect('/editor');throw e;}
 return <People/>;
}
