import {brandCrossPaths} from './brand-cross.js';
import {readFile} from 'node:fs/promises';
import {rgb} from 'pdf-lib';

// Official artwork: https://jumpmedia.it/wp-content/uploads/2022/04/JUMP-LOGO-420.png
export async function embedJumpLogo(pdf){
 const image=await pdf.embedPng(await readFile(process.cwd()+'/public/brand/jump-comunicazione.png'));
 // Wordmark only, using the lettering selected by Andrea; no standalone J icon.
 const svg=await readFile(process.cwd()+'/public/brand/juventus-wordmark.svg','utf8');
 const path=svg.match(/\bd="([^"]+)"/)?.[1];
 if(!path)throw Error('Lettering Juventus non disponibile.');
 return {image,path};
}
export function drawJumpLogo(page,brand,x=42){
 const logo=brand.image;
 const height=18,width=height*logo.width/logo.height;
 page.drawImage(logo,{x,y:21,width,height});
 const color=rgb(.40,.40,.40);
 for(const path of brandCrossPaths)page.drawSvgPath(path,{x:x+44.6,y:32.4,scale:.2,color});
 page.drawSvgPath(brand.path,{x:x+61,y:34.5,scale:9/36.6,color:rgb(.08,.08,.08)});
}
