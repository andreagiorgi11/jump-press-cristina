import './globals.css';
import EditorAccess from './components/EditorAccess';
import './controls.css';
import SiteEnhancements from './components/SiteEnhancements';

export const dynamic='force-dynamic';
export const revalidate=0;
export const fetchCache='force-no-store';

export const metadata={title:'JUMP PRESS Juventus',description:'Rassegna stampa Juventus — ultima edizione e archivio',manifest:'/manifest.webmanifest',applicationName:'JUMP PRESS Juventus',robots:{index:false,follow:false,nocache:true,googleBot:{index:false,follow:false,noimageindex:true,'max-snippet':-1,'max-image-preview':'none','max-video-preview':-1}},appleWebApp:{capable:true,title:'JUMP PRESS',statusBarStyle:'black'},formatDetection:{telephone:false}};
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0b0d0f'};
export default function RootLayout({children}){return <html lang="it"><body><SiteEnhancements/>{children}<EditorAccess/></body></html>}
