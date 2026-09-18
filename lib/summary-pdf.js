import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {summaryEdition,summarySections} from './summary-sections.js';
import {analyseEdition} from './edition-analysis.js';
export async function exportEditionPdf(source){
 const body=summaryEdition(source);body.articles.sort((a,b)=>summarySections.indexOf(a.category)-summarySections.indexOf(b.category));
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 pdf.setTitle('Rassegna stampa Juventus - '+body.date);pdf.setAuthor('Jump Press');
 const ink=rgb(.08,.1,.08),grey=rgb(.35,.38,.34),lime=rgb(.84,1,0),width=595.28,height=841.89,margin=42,lineWidth=width-margin*2;
 let page,y;
 const clean=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u202f\u00a0]/g,' ').replace(/[^\x20-\x7e\xa0-\xff\u2018\u2019\u201c\u201d\u2026\u20ac]/g,'');
 const lines=(text,size,f)=>{const out=[];for(const paragraph of clean(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(f.widthOfTextAtSize(line?line+' '+word:word,size)>lineWidth&&line){out.push(line);line=word;}else line=line?line+' '+word:word;}out.push(line);}return out;};
 const next=()=>{page=pdf.addPage([width,height]);y=height-48;page.drawText('JUMP PRESS',{x:margin,y,size:10,font:bold,color:ink});page.drawText(body.date,{x:width-margin-65,y,size:9,font,color:grey});y-=28;};
 const space=n=>{if(y-n<55)next();};
 const text=(s,{size=10.5,strong=false,color=ink,after=9}={})=>{const f=strong?bold:font;for(const l of lines(s,size,f)){space(size*1.45);page.drawText(l,{x:margin,y,size,font:f,color});y-=size*1.45;}y-=after;};
 const heading=s=>{space(65);y-=10;page.drawLine({start:{x:margin,y:y+15},end:{x:width-margin,y:y+15},thickness:1,color:rgb(.78,.82,.72)});text(s,{size:14,strong:true,after:15});};
 next();
 page.drawRectangle({x:0,y:height-185,width,height:185,color:ink});
 page.drawText('JUMP PRESS',{x:margin,y:height-42,size:12,font:bold,color:lime});
 page.drawText(body.date,{x:width-margin-70,y:height-42,size:10,font,color:rgb(.78,.83,.73)});
 page.drawText('Rassegna stampa',{x:margin,y:height-89,size:28,font:bold,color:rgb(1,1,1)});
 page.drawText('Juventus',{x:margin,y:height-123,size:28,font:bold,color:lime});
 page.drawText('IL QUADRO DELLA GIORNATA',{x:margin,y:height-155,size:9,font:bold,color:rgb(.78,.83,.73)});
 y=height-210;text(body.intro,{size:11,after:17});
 const a=analyseEdition(body);
 text('I numeri dell’intera copertura',{size:15,strong:true,after:10});
 const tiles=[[a.examined,'Voci esaminate'],[a.selected,'Articoli selezionati'],[a.frontPages,'Prime pagine verificate']];
 tiles.forEach(([n,label],i)=>{const x=margin+i*174;page.drawRectangle({x,y:y-59,width:163,height:63,color:rgb(.95,.96,.93)});page.drawText(String(n??'-'),{x:x+13,y:y-22,size:25,font:bold,color:ink});page.drawText(label,{x:x+13,y:y-43,size:9,font,color:grey});});y-=82;
 text(`${a.juventus} copertine con Juventus · ${a.frontPages-a.juventus} senza Juventus · Sportivi italiani: ${a.sportsJuventus}/${a.sports}`,{size:9,color:grey,after:8});
 text('In prima pagina: '+(a.outlets?.join(', ')||'Nessun richiamo'),{size:9,color:grey,after:17});
 text('I temi e i punti chiave',{size:15,strong:true,after:15});
 const cx=margin+51,cy=y-48,r=47,colors=[lime,ink,rgb(.45,.45,.45),rgb(1,.54,0)];
 a.themes.forEach((t,i)=>{for(let angle=t.start*3.6;angle<t.end*3.6;angle+=1){const rad=(angle-90)*Math.PI/180,nextRad=(Math.min(angle+1.3,t.end*3.6)-90)*Math.PI/180;page.drawSvgPath(`M 0 0 L ${r*Math.cos(rad)} ${r*Math.sin(rad)} L ${r*Math.cos(nextRad)} ${r*Math.sin(nextRad)} Z`,{x:cx,y:cy,color:colors[i%colors.length]});}});
 page.drawCircle({x:cx,y:cy,size:33,color:rgb(1,1,1)});page.drawText(String(a.selected),{x:cx-13,y:cy-2,size:22,font:bold,color:ink});page.drawText('articoli',{x:cx-14,y:cy-16,size:8,font,color:grey});
 a.themes.forEach((t,i)=>{const rowY=y-12-i*23;page.drawCircle({x:margin+135,y:rowY+3,size:3,color:colors[i%colors.length]});page.drawText(t.label,{x:margin+148,y:rowY,size:10,font,color:grey});page.drawText(String(t.count),{x:width-margin-20,y:rowY,size:11,font:bold,color:ink});});y-=120;
 text('3 PUNTI CHIAVE',{size:9,strong:true,color:grey,after:8});
 for(const [i,p] of (body.keyPoints||[]).entries())text(`${i+1}. ${p}`,{size:10.5,after:8});
 next();
 for(const category of summarySections){
  const articles=body.articles.filter(a=>a.category===category);if(!articles.length)continue;
  heading(category+' - '+articles.length+' articoli');
  for(const article of articles){
   const needed=lines(article.title,15,bold).length*22+lines(article.summary,10.5,font).length*15.3+75;space(Math.min(needed,650));
   page.drawRectangle({x:margin-9,y:y-2,width:3,height:10,color:lime});
   text('   '+article.outlet+'  /  Rilevanza '+article.rating+'/5',{size:9,strong:true,color:grey,after:8});
   text(article.title,{size:15,strong:true,after:5});if(article.author)text('di '+article.author,{size:9,color:grey,after:5});
   text(article.summary,{size:10.5,after:18});
  }
 }
 pdf.getPages().forEach((p,i)=>{p.drawLine({start:{x:margin,y:38},end:{x:width-margin,y:38},thickness:.5,color:grey});p.drawText('JUMP PRESS · '+body.date,{x:margin,y:24,size:8,font,color:grey});p.drawText(`${i+1} / ${pdf.getPageCount()}`,{x:width-margin-28,y:24,size:8,font,color:grey});});
 return pdf.save();
}
