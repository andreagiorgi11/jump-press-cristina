import './globals.css';
import './controls.css';
import PdfLinkHandler from './PdfLinkHandler';
import AppControls from './components/AppControls';
import BrandHomeHandler from './components/BrandHomeHandler';
import CoverageDonut from './components/CoverageDonut';
import DailyMetrics from './components/DailyMetrics';
import LiveAppRefresh from './components/LiveAppRefresh';

export const dynamic='force-dynamic';
export const revalidate=0;
export const fetchCache='force-no-store';

export const metadata={title:'JUMP PRESS Juventus',description:'Rassegna stampa Juventus — ultima edizione e archivio',manifest:'/manifest.webmanifest',applicationName:'JUMP PRESS Juventus',robots:{index:false,follow:false,nocache:true,googleBot:{index:false,follow:false,noimageindex:true,'max-snippet':-1,'max-image-preview':'none','max-video-preview':-1}},appleWebApp:{capable:true,title:'JUMP PRESS',statusBarStyle:'black'},formatDetection:{telephone:false},themeColor:'#0b0d0f'};
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0b0d0f'};
export default function RootLayout({children}){return <html lang="it"><body><LiveAppRefresh/><PdfLinkHandler/><BrandHomeHandler/><AppControls/><CoverageDonut/><DailyMetrics/>{children}</body></html>}
