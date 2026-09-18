import {cookies} from 'next/headers';
import {requireEditor} from '../lib/server-client';
import './globals.css';
import EditorAccess from './components/EditorAccess';
import './controls.css';
import SiteEnhancements from './components/SiteEnhancements';

export const dynamic='force-dynamic';
export const revalidate=0;
export const fetchCache='force-no-store';

export const metadata={title:'JUMP PRESS Juventus',description:'Rassegna stampa Juventus — ultima edizione e archivio',manifest:'/manifest.webmanifest',applicationName:'JUMP PRESS Juventus',robots:{index:false,follow:false,nocache:true,googleBot:{index:false,follow:false,noimageindex:true,'max-snippet':-1,'max-image-preview':'none','max-video-preview':-1}},appleWebApp:{capable:true,title:'JUMP PRESS',statusBarStyle:'black'},formatDetection:{telephone:false}};
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0b0d0f'};
export default async function RootLayout({children}){
 if(process.env.JUMP_SUMMARY_SANDBOX==='1')return <html lang="it"><body>{children}</body></html>;
 let editorRole='';
 if(process.env.JUMP_SITE!=='news'&&(await cookies()).has('jump_session')){
  try{editorRole=(await requireEditor()).role;}catch(error){if(![401,403].includes(error.status))throw error;}
 }
 return <html lang="it"><body><SiteEnhancements editorRole={editorRole}/>{children}<EditorAccess/></body></html>}
