import {normalizeExecutiveSummary,summarySections} from './summary-sections.js';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {pdfTheme as theme} from './pdf-theme.js';
import fontkit from '@pdf-lib/fontkit';
import {embedJumpLogo,drawJumpLogo} from './pdf-brand.js';
export async function exportSummaryPdf(summary,date,fonts){
 summary=normalizeExecutiveSummary(summary);
 const names=summarySections;
 if(summary.sections[0]?.items.length>5)throw Error('Prima squadra maschile: selezionare al massimo cinque temi, dando priorità alla rilevanza per la Juventus.');
 const pdf=await PDFDocument.create();if(fonts)pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fonts?.regular||StandardFonts.Helvetica,{subset:true}),bold=await pdf.embedFont(fonts?.bold||fonts?.strong||StandardFonts.HelveticaBold,{subset:true});
 const heading=fonts?.heading?await pdf.embedFont(fonts.heading,{subset:true}):bold;
 let page;const left=42,width=511.28;
 const {ink,grey:muted,border:line,red:accent,paper:wash}=theme;
 pdf.setTitle('Juventus - Summary '+date);pdf.setAuthor('Jump Press');
 const clean=t=>String(t).replace(/[\u2010-\u2015]/g,'-').replace(/[\u202f\u00a0]/g,' ');
 const wrap=(text,size,face,max)=>{const out=[];let row='';for(const word of clean(text).split(/\s+/)){if(row&&face.widthOfTextAtSize(row+' '+word,size)>max){out.push(row);row=word;}else row=row?row+' '+word:word;}if(row)out.push(row);return out;};
 const text=(value,x,y,size,face=font,color=ink)=>page.drawText(clean(value),{x,y,size,font:face,color});
 const rule=y=>page.drawLine({start:{x:left,y},end:{x:left+width,y},thickness:.6,color:line});
 // First compress spacing, then search for the smallest font reduction, rewrapping each time.
 const measure=(t,reduction=0)=>{
  const introSize=11-reduction,itemSize=10-reduction;
  const introLines=wrap(summary.intro,introSize,font,width-36);
  const sections=summary.sections.map(section=>({...section,rows:section.items.map(item=>{
   const value=clean(item),colon=value.indexOf(':'),title=colon>=0?value.slice(0,colon):'',body=colon>=0?value.slice(colon+1).trim():value;
   return {titleLines:title?wrap(title,itemSize,bold,width-13):[],bodyLines:wrap(body,itemSize,font,width-13)};
  })}));
  const mix=(normal,compact)=>normal+(compact-normal)*t;
  const layout={header:mix(144,88),topGap:mix(19,12),cardPadding:mix(49,39),introLeading:mix(15,13)-reduction,afterIntro:mix(29,22),sectionLead:mix(28,24),leading:mix(13,12)-reduction,itemGap:mix(7,3),sectionGap:mix(11,8)};
  layout.cardTop=841.89-layout.header-layout.topGap;
  layout.cardHeight=layout.cardPadding+introLines.length*layout.introLeading;
  let y=layout.cardTop-layout.cardHeight-layout.afterIntro,lowest=y;
  for(const section of sections){
   lowest=Math.min(lowest,y-26);y-=layout.sectionLead;
   for(const row of section.rows){
    const lines=row.titleLines.length+row.bodyLines.length;
    lowest=Math.min(lowest,y-Math.max(0,lines-1)*layout.leading);
    y-=lines*layout.leading+layout.itemGap;
   }
   y-=layout.sectionGap;
  }
  return {...layout,lowest,introSize,itemSize,introLines,sections};
 };
 const fit=(max,candidate)=>{let low=0,high=max;for(let i=0;i<20;i++){const mid=(low+high)/2;if(candidate(mid).lowest<60)low=mid;else high=mid;}return candidate(high);};
 let layout=measure(0);
 if(layout.lowest<60){
  layout=measure(1);
  if(layout.lowest>=60)layout=fit(1,t=>measure(t));
  else {layout=measure(1,1.5);if(layout.lowest>=60)layout=fit(1.5,r=>measure(1,r));}
 }
 const logo=await embedJumpLogo(pdf);
 function newPage(first=false){
  page=pdf.addPage([595.28,841.89]);
  const header=first?layout.header:88;
  page.drawRectangle({x:0,y:841.89-header,width:595.28,height:header,color:theme.ink});
  text('JUMP PRESS',left,807.89,8,bold,rgb(.8,.8,.8));
  text(date,left+width-bold.widthOfTextAtSize(date,11),807.89,11,bold,theme.yellow);
  if(header<144)text('Summary Juventus',left,841.89-header+20,32,heading,rgb(1,1,1));
  else {text('Summary',left,763.89,32,heading,rgb(1,1,1));text('Juventus',left,841.89-header+34,32,heading,rgb(1,1,1));}
  rule(48);drawJumpLogo(page,logo,left,bold);text('SUMMARY',left+56,24,8,font,theme.grey);
  return 841.89-header-layout.topGap;
 }
 let y=newPage(true);
 // Long introductions can continue too; no text is discarded to meet a page budget.
 const remaining=[...layout.introLines];
 do{
  const capacity=Math.max(1,Math.floor((y-60-layout.cardPadding)/layout.introLeading));
  const rows=remaining.splice(0,capacity),height=layout.cardPadding+rows.length*layout.introLeading;
  page.drawRectangle({x:left,y:y-height,width,height,color:wash});page.drawRectangle({x:left,y:y-height,width:3,height,color:theme.yellow});
  text('LA GIORNATA IN BREVE',left+18,y-20,8,bold,muted);
  rows.forEach((row,i)=>text(row,left+18,y-39-i*layout.introLeading,layout.introSize));
  y-=height+layout.afterIntro;
  if(remaining.length)y=newPage();
 }while(remaining.length);
 for(const [index,section] of layout.sections.entries()){
  const sectionHeading=(continued=false)=>{
   page.drawRectangle({x:left,y:y-2,width:3,height:17,color:theme.yellow});text(names[index]||section.title,left+11,y,index===0?18:16,heading);
   const count=continued?'segue':section.items.length+' '+(section.items.length===1?'tema':'temi');text(count,left+width-bold.widthOfTextAtSize(count,8),y+1,8,bold,muted);
   rule(y-10);y-=layout.sectionLead;
  };
  const first=section.rows[0],totalFirst=first?first.titleLines.length+first.bodyLines.length:1;
  const freshFirst=841.89-88-layout.topGap-12-layout.sectionLead;
  const firstLines=freshFirst-(totalFirst-1)*layout.leading>=60?totalFirst:Math.max(1,(first?.titleLines.length||0)+1);
  if(y-layout.sectionLead-(firstLines-1)*layout.leading<60)y=newPage()-12;
  sectionHeading();
  for(const {titleLines,bodyLines} of section.rows){
   const lines=[...titleLines.map(value=>({value,face:bold,color:ink})),...bodyLines.map(value=>({value,face:font,color:muted}))];
   const freshY=841.89-88-layout.topGap-12-layout.sectionLead;
   // Keep an item together whenever it fits on a fresh page.
   if(y-(lines.length-1)*layout.leading<60&&freshY-(lines.length-1)*layout.leading>=60){y=newPage()-12;sectionHeading(true);}
   for(const [i,row] of lines.entries()){
    if(y<60){y=newPage()-12;sectionHeading(true);}
    if(i===0)page.drawRectangle({x:left,y:y+3,width:3,height:3,color:accent});
    text(row.value,left+13,y,layout.itemSize,row.face,row.color);y-=layout.leading;
   }
   y-=layout.itemGap;
  }
  y-=layout.sectionGap;
 }
 return pdf.save();
}
