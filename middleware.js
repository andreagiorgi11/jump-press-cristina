import {NextResponse} from 'next/server';
import {routeAllowed} from './lib/routing';
export function middleware(request){
 const {pathname,searchParams}=request.nextUrl;
 const site=process.env.NEXT_PUBLIC_JUMP_SITE||'press';
 if(!routeAllowed(pathname,site))return new NextResponse('Pagina non disponibile',{status:404,headers:{'X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'}});
 if(site==='news'&&pathname==='/'){const url=request.nextUrl.clone();url.pathname='/news';return NextResponse.redirect(url);}
 if(['/editor','/api/editor','/api/auth','/api/oauth','/oauth','/.well-known','/mcp'].some(prefix=>pathname.startsWith(prefix))){
  const response=NextResponse.next();response.headers.set('Cache-Control','private, no-store');response.headers.set('X-Robots-Tag','noindex, nofollow');response.headers.set('Referrer-Policy','no-referrer');return response;
 }
 if(searchParams.get('raw')==='1') return NextResponse.next();
 const match=pathname.match(/^\/ritagli\/([^/]+)\.pdf$/);
 if(match){
   const url=request.nextUrl.clone();
   url.pathname=`/ritaglio/${match[1]}`;
   url.search='';
   return NextResponse.redirect(url);
 }
 return NextResponse.next();
}
export const config={matcher:['/((?!_next/static|_next/image).*)']};
