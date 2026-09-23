import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {pdfTheme as theme} from './pdf-theme.js';
import fontkit from '@pdf-lib/fontkit';
import {embedJumpLogo,drawJumpLogo} from './pdf-brand.js';
export async function exportSummaryPdf(summary,date,fonts){
 const names=['Prima squadra maschile','Prima squadra femminile','Politica sportiva','Varie'];
 if(summary.sections[0]?.items.length>5)throw Error('Prima squadra maschile: selezionare al massimo cinque temi, dando priorità alla rilevanza per la Juventus.');
 const pdf=await PDFDocument.create();if(fonts)pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fonts?.regular||StandardFonts.Helvetica,{subset:true}),bold=await pdf.embedFont(fonts?.bold||fonts?.strong||StandardFonts.HelveticaBold,{subset:true});
 const heading=fonts?.heading?await pdf.embedFont(fonts.heading,{subset:true}):bold;
 const page=pdf.addPage([595.28,841.89]),left=42,width=511.28;
 const {ink,grey:muted,border:line,red:accent,paper:wash}=theme;
 pdf.setTitle('Juventus - Summary '+date);pdf.setAuthor('Jump Press');
 const clean=t=>String(t).replace(/[\u2010-\u2015]/g,'-').replace(/[\u202f\u00a0]/g,' ');
 const wrap=(text,size,face,max)=>{const out=[];let row='';for(const word of clean(text).split(/\s+/)){if(row&&face.widthOfTextAtSize(row+' '+word,size)>max){out.push(row);row=word;}else row=row?row+' '+word:word;}if(row)out.push(row);return out;};
 const text=(value,x,y,size,face=font,color=ink)=>page.drawText(clean(value),{x,y,size,font:face,color});
 const rule=y=>page.drawLine({start:{x:left,y},end:{x:left+width,y},thickness:.6,color:line});
 const ensure=y=>{if(y<55)throw Error('Il Summary supera una pagina: accorciare gli highlights prima di esportare.');};
 // Measure once, then use the least compression needed. Never stretch sparse pages.
 const introLines=wrap(summary.intro,11,font,width-36);
 const sections=summary.sections.map(section=>({...section,rows:section.items.map(item=>{
  const value=clean(item),colon=value.indexOf(':'),title=colon>=0?value.slice(0,colon):'',body=colon>=0?value.slice(colon+1).trim():value;
  return {titleLines:title?wrap(title,10,bold,width-13):[],bodyLines:wrap(body,10,font,width-13)};
 })}));
 const measure=t=>{
  const mix=(normal,compact)=>normal+(compact-normal)*t;
  const layout={header:mix(144,88),topGap:mix(19,12),cardPadding:mix(49,39),introLeading:mix(15,13),afterIntro:mix(29,22),sectionLead:mix(28,24),leading:mix(13,12),itemGap:mix(7,3),sectionGap:mix(11,8)};
  layout.cardTop=841.89-layout.header-layout.topGap;
  layout.cardHeight=layout.cardPadding+introLines.length*layout.introLeading;
  let y=layout.cardTop-layout.cardHeight-layout.afterIntro;
  let lowest=y;
  for(const section of sections){
   lowest=Math.min(lowest,y-26);y-=layout.sectionLead;
   for(const row of section.rows){
    const lines=row.titleLines.length+row.bodyLines.length;
    lowest=Math.min(lowest,y-Math.max(0,lines-1)*layout.leading);
    y-=lines*layout.leading+layout.itemGap;
   }
   y-=layout.sectionGap;
  }
  return {...layout,lowest};
 };
 let layout=measure(0);
 if(layout.lowest<60){
  if(measure(1).lowest<60)throw Error('Il Summary supera una pagina anche con spazi compatti: accorciare gli highlights prima di esportare.');
  let low=0,high=1;
  for(let i=0;i<20;i++){const mid=(low+high)/2;if(measure(mid).lowest<60)low=mid;else high=mid;}
  layout=measure(high);
 }
 page.drawRectangle({x:0,y:841.89-layout.header,width:595.28,height:layout.header,color:theme.ink});
 text('JUMP PRESS',left,807.89,8,bold,rgb(.8,.8,.8));
 text(date,left+width-bold.widthOfTextAtSize(date,11),807.89,11,bold,theme.yellow);
 if(layout.header<144)text('Summary Juventus',left,841.89-layout.header+20,32,heading,rgb(1,1,1));
 else {text('Summary',left,763.89,32,heading,rgb(1,1,1));text('Juventus',left,841.89-layout.header+34,32,heading,rgb(1,1,1));}
 const {cardTop,cardHeight}=layout;
 page.drawRectangle({x:left,y:cardTop-cardHeight,width,height:cardHeight,color:wash});page.drawRectangle({x:left,y:cardTop-cardHeight,width:3,height:cardHeight,color:theme.yellow});
 text('LA GIORNATA IN BREVE',left+18,cardTop-20,8,bold,muted);
 introLines.forEach((row,i)=>text(row,left+18,cardTop-39-i*layout.introLeading,11));
 let y=cardTop-cardHeight-layout.afterIntro;
 for(const [index,section] of sections.entries()){
  ensure(y-26);page.drawRectangle({x:left,y:y-2,width:3,height:17,color:theme.yellow});text(names[index]||section.title,left+11,y,index===0?18:16,heading);
  const count=section.items.length+' '+(section.items.length===1?'tema':'temi');text(count,left+width-bold.widthOfTextAtSize(count,8),y+1,8,bold,muted);
  rule(y-10);y-=layout.sectionLead;
  for(const {titleLines,bodyLines} of section.rows){
   ensure(y-(titleLines.length+bodyLines.length-1)*layout.leading);page.drawRectangle({x:left,y:y+3,width:3,height:3,color:theme.red});
   for(const row of titleLines){text(row,left+13,y,10,bold);y-=layout.leading;}
   for(const row of bodyLines){text(row,left+13,y,10,font,muted);y-=layout.leading;}
   y-=layout.itemGap;
  }
  y-=layout.sectionGap;
 }
 rule(48);drawJumpLogo(page,await embedJumpLogo(pdf),left,bold);
 text('SUMMARY',left+56,24,8,font,theme.grey);
 return pdf.save();
}
