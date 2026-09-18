import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
export async function exportSummaryPdf(summary,date){
 const sectionNames=['Prima squadra maschile','Prima squadra femminile','Politica sportiva','Varie'];
 if(summary.sections[0]?.items.length>5)throw Error('Prima squadra maschile: selezionare al massimo cinque temi, dando priorità alla rilevanza per la Juventus.');
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),page=pdf.addPage([595.28,841.89]);
 const ink=rgb(.09,.13,.09),grey=rgb(.38,.43,.35),lime=rgb(.85,.96,.3),left=44,width=507;
 pdf.setTitle('Juventus - Summary '+date);pdf.setAuthor('Jump Press');
 const clean=t=>String(t).replace(/[\u2010-\u2015]/g,'-').replace(/[\u202f\u00a0]/g,' ');
 const wrap=(text,size,f,max)=>{const result=[];let line='';for(const word of clean(text).split(/\s+/)){if(line&&f.widthOfTextAtSize(line+' '+word,size)>max){result.push(line);line=word;}else line=line?line+' '+word:word;}if(line)result.push(line);return result;};
 page.drawRectangle({x:0,y:720,width:595.28,height:122,color:ink});
 page.drawText('JUMP PRESS',{x:left,y:807,size:11,font:bold,color:lime});page.drawText(date,{x:480,y:807,size:9,font,color:rgb(.8,.84,.75)});
 page.drawText('Rassegna stampa Juventus',{x:left,y:769,size:23,font:bold,color:rgb(1,1,1)});page.drawText('SUMMARY',{x:left,y:744,size:10,font:bold,color:lime});
 let y=693;
 const paragraph=(text,{size=10.2,strong=false,x=left,max=width,gap=5}={})=>{const f=strong?bold:font;for(const line of wrap(text,size,f,max)){if(y<54)throw Error('Il Summary supera una pagina: accorciare gli highlights prima di esportare.');page.drawText(line,{x,y,size,font:f,color:ink});y-=size*1.4;}y-=gap;};
 const highlight=text=>{
  const value=clean(text),colon=value.indexOf(':'),size=10.2,start=left+13;
  let x=start,offset=0;
  for(const word of value.split(/\s+/)){
   const f=colon>=0&&offset<=colon?bold:font,w=f.widthOfTextAtSize(word,size);
   if(x>start&&x+w>left+width){x=start;y-=size*1.4;}
   if(y<54)throw Error('Il Summary supera una pagina: accorciare gli highlights prima di esportare.');
   page.drawText(word,{x,y,size,font:f,color:ink});x+=w+f.widthOfTextAtSize(' ',size);offset+=word.length+1;
  }
  y-=size*1.4+5;
 };
 paragraph('Sintesi generale',{size:12,strong:true,gap:6});paragraph(summary.intro,{size:10.6,gap:11});
 for(const [index,section] of summary.sections.entries()){
  y-=5;page.drawLine({start:{x:left,y:y+4},end:{x:left+width,y:y+4},thickness:.6,color:rgb(.82,.86,.78)});y-=14;
  paragraph(`${String(index+1).padStart(2,'0')}  ${sectionNames[index]||section.title}`,{size:11,strong:true,gap:7});
  for(const item of section.items){page.drawCircle({x:left+3,y:y+3,size:1.6,color:grey});highlight(item);}
 }
 page.drawLine({start:{x:left,y:38},end:{x:left+width,y:38},thickness:.6,color:grey});
 page.drawText('JUMP PRESS · PROPOSTA DA REVISIONARE',{x:left,y:24,size:7,font:bold,color:grey});page.drawText('01 / 01',{x:519,y:24,size:7,font,color:grey});
 return pdf.save();
}
