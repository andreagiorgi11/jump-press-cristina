'use client';
import {sharedEditorActions} from './editor-actions';
import {usePathname} from 'next/navigation';
import ArticleFilter from './ArticleFilter';
import PdfLinkHandler from '../PdfLinkHandler';
import AppControls from './AppControls';
import BrandHomeHandler from './BrandHomeHandler';
import CoverageDonut from './CoverageDonut';
import DailyMetrics from './DailyMetrics';
import LiveAppRefresh from './LiveAppRefresh';
export default function SiteEnhancements({editorRole}){const path=usePathname();if((path.startsWith('/editor')||path==='/anteprima-locale'))return <><PdfLinkHandler/><ArticleFilter/></>;const news=process.env.NEXT_PUBLIC_JUMP_SITE==='news';return <><LiveAppRefresh/><BrandHomeHandler/><AppControls editorActions={!news&&['editor','publisher'].includes(editorRole)?sharedEditorActions():undefined}/>{!news&&<><PdfLinkHandler/><ArticleFilter/><CoverageDonut/><DailyMetrics/></>}</>;}
