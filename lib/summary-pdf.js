import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {summaryEdition,summarySections} from './summary-sections.js';
import {analyseEdition} from './edition-analysis.js';
export async function exportEditionPdf(source){
 const body=summaryEdition(source);body.articles.sort((a,b)=>summarySections.indexOf(a.category)-summarySections.indexOf(b.category));
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),serif=await pdf.embedFont(StandardFonts.TimesRomanBold);
 pdf.setTitle('Rassegna stampa Juventus - '+body.date);pdf.setAuthor('Jump Press');
 const ink=rgb(.08,.1,.08),grey=rgb(.35,.38,.34),lime=rgb(.84,1,0),width=595.28,height=841.89,margin=42,lineWidth=width-margin*2;
 let page,y,currentCategory='';
 const clean=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u202f\u00a0]/g,' ').replace(/[^\x20-\x7e\xa0-\xff\u2018\u2019\u201c\u201d\u2026\u20ac]/g,'');
 const lines=(text,size,f)=>{const out=[];for(const paragraph of clean(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(f.widthOfTextAtSize(line?line+' '+word:word,size)>lineWidth&&line){out.push(line);line=word;}else line=line?line+' '+word:word;}out.push(line);}return out;};
 const next=()=>{page=pdf.addPage([width,height]);y=height-40;page.drawRectangle({x:margin,y:y-2,width:3,height:12,color:lime});page.drawText('JUMP PRESS',{x:margin+12,y,size:9,font:bold,color:ink});page.drawText(body.date,{x:width-margin-65,y,size:9,font,color:grey});page.drawLine({start:{x:margin,y:y-13},end:{x:width-margin,y:y-13},thickness:.5,color:rgb(.85,.87,.82)});y-=37;if(currentCategory){page.drawText(clean(currentCategory).toUpperCase(),{x:margin,y,size:8,font:bold,color:grey});y-=26;}};
 const space=n=>{if(y-n<55)next();};
 const text=(s,{size=10.5,strong=false,face,color=ink,after=9}={})=>{const f=face||(strong?bold:font);for(const l of lines(s,size,f)){space(size*1.45);page.drawText(l,{x:margin,y,size,font:f,color});y-=size*1.45;}y-=after;};
 const heading=(s,count,index)=>{page.drawRectangle({x:margin,y:y-38,width:lineWidth,height:53,color:rgb(.94,.95,.92)});page.drawText(String(index+1).padStart(2,'0'),{x:margin+12,y:y-15,size:20,font:serif,color:rgb(.44,.52,.34)});page.drawText(s,{x:margin+48,y:y-6,size:14,font:bold,color:ink});page.drawText(`${count} articoli selezionati`,{x:margin+48,y:y-23,size:8.5,font,color:grey});y-=65;};
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
 const articleHeight=article=>lines(article.title,17,serif).length*24.65+lines(article.summary,10.5,font).length*15.225+68;
 for(const [categoryIndex,category] of summarySections.entries()){
  const articles=body.articles.filter(a=>a.category===category);if(!articles.length)continue;
  if(categoryIndex>0){currentCategory='';next();}
  currentCategory=category;space(65+Math.min(articleHeight(articles[0]),550));heading(category,articles.length,categoryIndex);
  for(const article of articles){
   space(Math.min(articleHeight(article),650));
   page.drawText('RILEVANZA',{x:width-margin-110,y:y+1,size:6.5,font,color:grey});
   for(let i=0;i<5;i++)page.drawRectangle({x:width-margin-54+i*11,y:y+1,width:8,height:4,color:i<article.rating?rgb(.42,.51,.29):rgb(.87,.89,.85)});
   text(article.outlet.toUpperCase(),{size:8,strong:true,color:grey,after:9});
   text(article.title,{size:17,face:serif,after:6});if(article.author)text('di '+article.author,{size:8.5,color:grey,after:8});
   text(article.summary,{size:10.5,color:rgb(.21,.25,.2),after:12});
   page.drawLine({start:{x:margin,y:y+1},end:{x:width-margin,y:y+1},thickness:.45,color:rgb(.85,.87,.82)});y-=19;
  }
 }
 pdf.getPages().forEach((p,i)=>{p.drawLine({start:{x:margin,y:38},end:{x:width-margin,y:38},thickness:.5,color:grey});p.drawText('JUMP PRESS · '+body.date,{x:margin,y:24,size:8,font,color:grey});p.drawText(`${i+1} / ${pdf.getPageCount()}`,{x:width-margin-28,y:24,size:8,font,color:grey});});
 return pdf.save();
}
