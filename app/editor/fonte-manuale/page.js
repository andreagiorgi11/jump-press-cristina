import {redirect} from 'next/navigation';
import {requireEditor} from '../../../lib/server-client';
import ManualSource from './ManualSource';
export const dynamic='force-dynamic';
export default async function ManualSourcePage(){try{await requireEditor();}catch(e){if(e.status===401||e.status===403)redirect('/editor');throw e;}return <ManualSource/>;}
