'use client';
import {usePathname} from 'next/navigation';
import ArticleFilter from './ArticleFilter';
import PdfLinkHandler from '../PdfLinkHandler';
import AppControls from './AppControls';
import BrandHomeHandler from './BrandHomeHandler';
import CoverageDonut from './CoverageDonut';
import DailyMetrics from './DailyMetrics';
import LiveAppRefresh from './LiveAppRefresh';
export default function SiteEnhancements(){const path=usePathname();if(path.startsWith('/editor'))return <><PdfLinkHandler/><ArticleFilter/></>;const news=process.env.NEXT_PUBLIC_JUMP_SITE==='news';return <><LiveAppRefresh/><BrandHomeHandler/><AppControls/>{!news&&<><PdfLinkHandler/><ArticleFilter/><CoverageDonut/><DailyMetrics/></>}</>;}
