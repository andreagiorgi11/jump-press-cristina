import {notFound} from 'next/navigation';
import {readFile} from 'node:fs/promises';
import SummaryPreview from './SummaryPreview';
export const dynamic='force-dynamic';
export default async function SummaryPage(){
 if(process.env.JUMP_SUMMARY_SANDBOX!=='1'||process.env.VERCEL)notFound();
 const initial=JSON.parse(await readFile(process.cwd()+'/.local/summary-preview.json','utf8'));
 return <SummaryPreview initial={initial}/>;
}
