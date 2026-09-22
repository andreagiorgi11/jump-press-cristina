import {readFile} from 'node:fs/promises';
import {rgb} from 'pdf-lib';

// Official artwork: https://jumpmedia.it/wp-content/uploads/2022/04/JUMP-LOGO-420.png
export async function embedJumpLogo(pdf){
 return pdf.embedPng(await readFile(process.cwd()+'/public/brand/jump-comunicazione.png'));
}
export function drawJumpLogo(page,logo,x=42,font){
 const height=18,width=height*logo.width/logo.height;
 page.drawImage(logo,{x,y:21,width,height});
 const label='PRESS',size=3.8,spacing=1.4;
 const textWidth=font.widthOfTextAtSize(label,size)+(label.length-1)*spacing;
 let cursor=x+(width-textWidth)/2;
 for(const letter of label){
  page.drawText(letter,{x:cursor,y:17,size,font,color:rgb(.08,.08,.08)});
  cursor+=font.widthOfTextAtSize(letter,size)+spacing;
 }
}
