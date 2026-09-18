import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
export async function exportSummaryPdf(summary,date,fonts){
 const names=['Prima squadra maschile','Prima squadra femminile','Politica sportiva','Varie'];
 if(summary.sections[0]?.items.length>5)throw Error('Prima squadra maschile: selezionare al massimo cinque temi, dando priorità alla rilevanza per la Juventus.');
 const pdf=await PDFDocument.create();if(fonts)pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fonts?.regular||StandardFonts.Helvetica,{subset:true}),bold=await pdf.embedFont(fonts?.bold||StandardFonts.HelveticaBold,{subset:true});
 const page=pdf.addPage([595.28,841.89]),left=42,width=511.28;
 const ink=rgb(.10,.14,.12),muted=rgb(.38,.43,.40),line=rgb(.83,.87,.83),lime=rgb(.83,.98,.20),wash=rgb(.95,.97,.92);
 pdf.setTitle('Juventus - Summary '+date);pdf.setAuthor('Jump Press');
 const clean=t=>String(t).replace(/[\u2010-\u2015]/g,'-').replace(/[\u202f\u00a0]/g,' ');
 const wrap=(text,size,face,max)=>{const out=[];let row='';for(const word of clean(text).split(/\s+/)){if(row&&face.widthOfTextAtSize(row+' '+word,size)>max){out.push(row);row=word;}else row=row?row+' '+word:word;}if(row)out.push(row);return out;};
 const text=(value,x,y,size,face=font,color=ink)=>page.drawText(clean(value),{x,y,size,font:face,color});
 const rule=y=>page.drawLine({start:{x:left,y},end:{x:left+width,y},thickness:.6,color:line});
 const ensure=y=>{if(y<55)throw Error('Il Summary supera una pagina: accorciare gli highlights prima di esportare.');};
 page.drawRectangle({x:0,y:724,width:595.28,height:117.89,color:rgb(.06,.08,.06)});
 page.drawRectangle({x:left,y:798,width:4,height:13,color:lime});text('JUMP PRESS',left+12,800,10,bold,lime);
 const formatted=new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
 text(formatted,left+width-font.widthOfTextAtSize(formatted,9),800,9,font,rgb(.80,.84,.78));
 text('Juventus',left,759,29,bold,rgb(1,1,1));text('Il briefing del giorno',left,738,11,font,rgb(.80,.84,.78));
 text('SUMMARY',left+width-bold.widthOfTextAtSize('SUMMARY',9),760,9,bold,lime);
 const introLines=wrap(summary.intro,11,font,width-36),cardTop=716,cardHeight=49+introLines.length*15;
 page.drawRectangle({x:left,y:cardTop-cardHeight,width,height:cardHeight,color:wash});page.drawRectangle({x:left,y:cardTop-cardHeight,width:3,height:cardHeight,color:lime});
 text('LA GIORNATA IN BREVE',left+18,cardTop-23,8,bold,muted);
 introLines.forEach((row,i)=>text(row,left+18,cardTop-44-i*15,11));
 let y=cardTop-cardHeight-29;
 for(const [index,section] of summary.sections.entries()){
  ensure(y-26);text(names[index]||section.title,left,y,index===0?15:12.5,bold);
  const count=section.items.length+' '+(section.items.length===1?'tema':'temi');text(count,left+width-font.widthOfTextAtSize(count,8),y+1,8,font,muted);
  y-=10;rule(y);y-=18;
  for(const item of section.items){
   const value=clean(item),colon=value.indexOf(':'),title=colon>=0?value.slice(0,colon):'',body=colon>=0?value.slice(colon+1).trim():value;
   const titleLines=title?wrap(title,10,bold,width-13):[],bodyLines=wrap(body,10,font,width-13);
   ensure(y-(titleLines.length+bodyLines.length-1)*13);page.drawRectangle({x:left,y:y+3,width:3,height:3,color:rgb(.47,.58,.32)});
   for(const row of titleLines){text(row,left+13,y,10,bold);y-=13;}
   for(const row of bodyLines){text(row,left+13,y,10,font,muted);y-=13;}
   y-=7;
  }
  y-=11;
 }
 rule(38);text('JUMP PRESS  /  RASSEGNA STAMPA JUVENTUS',left,24,7,bold,muted);
 text('PROPOSTA DA REVISIONARE',left+width-bold.widthOfTextAtSize('PROPOSTA DA REVISIONARE',7),24,7,bold,muted);
 return pdf.save();
}
