import {PDFDocument,StandardFonts} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {pdfTheme as theme} from './pdf-theme.js';
import {formatDate} from './i18n.js';
export async function archiveSelectionPdf({groups,lang='it'},fonts){
 const pdf=await PDFDocument.create();if(fonts)pdf.registerFontkit(fontkit);
 const regular=await pdf.embedFont(fonts?.regular||StandardFonts.Helvetica,{subset:true}),bold=await pdf.embedFont(fonts?.strong||StandardFonts.HelveticaBold,{subset:true});
 const en=lang==='en',title=en?'Selected articles':'Articoli selezionati';pdf.setTitle('Jump Press - '+title);pdf.setAuthor('Jump Press');
 let page,y,groupLabel='';const width=595.28,height=841.89,left=44,right=width-44;
 function next(){page=pdf.addPage([width,height]);page.drawText('JUMP PRESS',{x:left,y:height-42,size:15,font:bold,color:theme.ink});page.drawText(title,{x:left,y:height-65,size:10,font:regular,color:theme.grey});page.drawRectangle({x:left,y:height-79,width:right-left,height:3,color:theme.yellow});y=height-104;if(groupLabel){page.drawText(groupLabel,{x:left,y,size:11,font:bold,color:theme.ink});y-=25;}}
 function line(text,font,size,gap){if(y-gap<55)next();page.drawText(text,{x:left,y,size,font,color:theme.ink});y-=gap;}
 function text(value,font,size,gap){for(const paragraph of String(value||'').replace(/[\u0000-\u0008\u000b-\u001f]/g,'').split('\n')){let current='';for(const word of paragraph.split(/\s+/)){if(font.widthOfTextAtSize(current?current+' '+word:word,size)<=right-left){current=current?current+' '+word:word;continue;}if(current){line(current,font,size,gap);current='';}for(const char of word){if(font.widthOfTextAtSize(current+char,size)>right-left){line(current,font,size,gap);current='';}current+=char;}}if(current)line(current,font,size,gap);}}
 for(const group of groups){groupLabel=formatDate(lang,group.date,{day:'numeric',month:'long',year:'numeric'})+' - '+(group.status==='draft'?(en?'DRAFT':'BOZZA'):(en?'PUBLISHED':'PUBBLICATA'));next();
  for(const article of group.articles){if(y<170)next();text(article.title,bold,16,21);y-=5;text([article.outlet,article.author].filter(Boolean).join(' - '),regular,9,13);y-=9;text(article.summary,regular,11,16);y-=20;}
 }
 const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:left,y:40},end:{x:right,y:40},thickness:.5,color:theme.border});p.drawText((i+1)+' / '+pages.length,{x:right-32,y:25,size:9,font:regular,color:theme.grey});});
 return pdf.save();
}
