import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {pdfTheme as theme} from './pdf-theme.js';
import fontkit from '@pdf-lib/fontkit';
import {embedJumpLogo,drawJumpLogo} from './pdf-brand.js';
export async function exportSummaryPdf(summary,date,fonts){
 const names=['Prima squadra maschile','Prima squadra femminile','Politica sportiva','Varie'];
 if(summary.sections[0]?.items.length>5)throw Error('Prima squadra maschile: selezionare al massimo cinque temi, dando priorità alla rilevanza per la Juventus.');
 const pdf=await PDFDocument.create();if(fonts)pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fonts?.regular||StandardFonts.Helvetica,{subset:true}),bold=await pdf.embedFont(fonts?.bold||StandardFonts.HelveticaBold,{subset:true});
 const heading=fonts?.heading?await pdf.embedFont(fonts.heading,{subset:true}):bold;
 const page=pdf.addPage([595.28,841.89]),left=42,width=511.28;
 const {ink,grey:muted,border:line,red:accent,paper:wash}=theme;
 pdf.setTitle('Juventus - Summary '+date);pdf.setAuthor('Jump Press');
 const clean=t=>String(t).replace(/[\u2010-\u2015]/g,'-').replace(/[\u202f\u00a0]/g,' ');
 const wrap=(text,size,face,max)=>{const out=[];let row='';for(const word of clean(text).split(/\s+/)){if(row&&face.widthOfTextAtSize(row+' '+word,size)>max){out.push(row);row=word;}else row=row?row+' '+word:word;}if(row)out.push(row);return out;};
 const text=(value,x,y,size,face=font,color=ink)=>page.drawText(clean(value),{x,y,size,font:face,color});
 const rule=y=>page.drawLine({start:{x:left,y},end:{x:left+width,y},thickness:.6,color:line});
 const ensure=y=>{if(y<55)throw Error('Il Summary supera una pagina: accorciare gli highlights prima di esportare.');};
 page.drawRectangle({x:0,y:697.89,width:595.28,height:144,color:theme.ink});
 text('JUMP PRESS',left,807.89,8,bold,rgb(.8,.8,.8));
 text(date,left+width-bold.widthOfTextAtSize(date,11),807.89,11,bold,theme.yellow);
 text('Summary',left,763.89,32,heading,rgb(1,1,1));
 text('Juventus',left,731.89,32,heading,rgb(1,1,1));
 const introLines=wrap(summary.intro,11,font,width-36),cardTop=678.89,cardHeight=49+introLines.length*15;
 page.drawRectangle({x:left,y:cardTop-cardHeight,width,height:cardHeight,color:wash});page.drawRectangle({x:left,y:cardTop-cardHeight,width:3,height:cardHeight,color:theme.yellow});
 text('LA GIORNATA IN BREVE',left+18,cardTop-23,8,bold,muted);
 introLines.forEach((row,i)=>text(row,left+18,cardTop-44-i*15,11));
 let y=cardTop-cardHeight-29;
 for(const [index,section] of summary.sections.entries()){
  ensure(y-26);page.drawRectangle({x:left,y:y-2,width:3,height:17,color:theme.yellow});text(names[index]||section.title,left+11,y,index===0?18:16,heading);
  const count=section.items.length+' '+(section.items.length===1?'tema':'temi');text(count,left+width-bold.widthOfTextAtSize(count,8),y+1,8,bold,muted);
  y-=10;rule(y);y-=18;
  for(const item of section.items){
   const value=clean(item),colon=value.indexOf(':'),title=colon>=0?value.slice(0,colon):'',body=colon>=0?value.slice(colon+1).trim():value;
   const titleLines=title?wrap(title,10,bold,width-13):[],bodyLines=wrap(body,10,font,width-13);
   ensure(y-(titleLines.length+bodyLines.length-1)*13);page.drawRectangle({x:left,y:y+3,width:3,height:3,color:theme.red});
   for(const row of titleLines){text(row,left+13,y,10,bold);y-=13;}
   for(const row of bodyLines){text(row,left+13,y,10,font,muted);y-=13;}
   y-=7;
  }
  y-=11;
 }
 rule(48);drawJumpLogo(page,await embedJumpLogo(pdf),left,bold);
 text('SUMMARY',left+56,24,8,font,theme.grey);
 return pdf.save();
}
