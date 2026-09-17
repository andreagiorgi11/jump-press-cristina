export function routeAllowed(path,site){
 if(['/api/social-debug','/api/r20260914-full','/api/r20260908-4e17c9a2b63d4f10','/api/r20260913-6f9b2e61d4874e3a'].includes(path))return false;
 const news=path==='/news'||path.startsWith('/news/')||path==='/social'||path.startsWith('/social/')||path==='/api/social-feed'||path==='/api/social-search';
 if(site==='news')return news||path==='/'||path.startsWith('/_next/')||['/favicon.ico','/robots.txt','/manifest.webmanifest'].includes(path);
 return !news;
}
