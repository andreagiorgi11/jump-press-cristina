import {requireEditor} from '../../../lib/server-client';
import {redirect} from 'next/navigation';
import DownloadTest from './DownloadTest';
export const dynamic='force-dynamic';
export default async function Page(){try{await requireEditor();}catch{redirect('/editor');}return <DownloadTest/>;}
