import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {drawEditionCover} from './summary-pdf-cover.js';
import {summaryEdition,summarySections} from './summary-sections.js';
export async function exportEditionPdf(source,fonts){
 const body=summaryEdition(source);body.articles.sort((a,b)=>summarySections.indexOf(a.category)-summarySections.indexOf(b.category));
 const pdf=await PDFDocument.create();if(fonts)pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fonts?.regular||StandardFonts.Helvetica,{subset:true}),bold=await pdf.embedFont(fonts?.bold||StandardFonts.HelveticaBold,{subset:true}),serif=bold;
 pdf.setTitle('Rassegna stampa Juventus - '+body.date);pdf.setAuthor('Jump Press');
 const ink=rgb(.08,.1,.08),grey=rgb(.35,.38,.34),lime=rgb(.84,1,0),width=595.28,height=841.89,margin=42,lineWidth=width-margin*2;
 let page,y,currentCategory='';
 const clean=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u202f\u00a0]/g,' ').replace(/[^\x20-\x7e\xa0-\xff\u2018\u2019\u201c\u201d\u2026\u20ac]/g,'');
 const lines=(text,size,f,maxWidth=lineWidth)=>{const out=[];for(const paragraph of clean(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(f.widthOfTextAtSize(line?line+' '+word:word,size)>maxWidth&&line){out.push(line);line=word;}else line=line?line+' '+word:word;}out.push(line);}return out;};
 const next=()=>{page=pdf.addPage([width,height]);y=height-40;page.drawRectangle({x:margin,y:y-2,width:3,height:12,color:lime});page.drawText('JUMP PRESS',{x:margin+12,y,size:9,font:bold,color:ink});page.drawText(body.date,{x:width-margin-65,y,size:9,font,color:grey});page.drawLine({start:{x:margin,y:y-13},end:{x:width-margin,y:y-13},thickness:.5,color:rgb(.85,.87,.82)});y-=37;if(currentCategory){page.drawText(clean(currentCategory).toUpperCase(),{x:margin,y,size:8,font:bold,color:grey});y-=26;}};
 const space=n=>{if(y-n<55)next();};
 const heading=(s,count,index)=>{page.drawRectangle({x:margin,y:y-38,width:lineWidth,height:53,color:rgb(.94,.95,.92)});page.drawText(String(index+1).padStart(2,'0'),{x:margin+12,y:y-15,size:20,font:serif,color:rgb(.44,.52,.34)});page.drawText(s,{x:margin+48,y:y-6,size:14,font:bold,color:ink});page.drawText(`${count} articoli selezionati`,{x:margin+48,y:y-23,size:8.5,font,color:grey});y-=65;};
 next();
 await drawEditionCover({pdf,page,body,font,bold});
 next();
 const railWidth=30,articleX=margin+44,articleWidth=lineWidth-44;
 let articleNumber=0;
 const articleRows=article=>{
  const rows=[];
  const add=(value,size,face,color,gap,maxWidth=articleWidth)=>{
   const wrapped=lines(value,size,face,maxWidth);
   wrapped.forEach((value,index)=>rows.push({value,size,face,color,advance:size*1.45+(index===wrapped.length-1?gap:0)}));
  };
  add(article.outlet.toUpperCase(),8,bold,grey,9,articleWidth-120);
  add(article.title,17,serif,ink,6);
  if(article.author)add('di '+article.author,8.5,font,grey,8);
  add(article.summary,10.5,font,rgb(.21,.25,.2),12);
  return rows;
 };
 const articleHeight=article=>articleRows(article).reduce((sum,row)=>sum+row.advance,0)+19;
 for(const [categoryIndex,category] of summarySections.entries()){
  const articles=body.articles.filter(a=>a.category===category);if(!articles.length)continue;
  if(categoryIndex>0){currentCategory='';next();}
  currentCategory=category;space(65+Math.min(articleHeight(articles[0]),550));heading(category,articles.length,categoryIndex);
  for(const article of articles){
   articleNumber++;
   space(Math.min(articleHeight(article),650));
   let railTop=y+14;
   const drawRail=()=>{
    const bottom=y+3;
    page.drawRectangle({x:margin,y:bottom,width:railWidth,height:railTop-bottom,color:rgb(.09,.12,.09)});
    page.drawRectangle({x:margin,y:bottom,width:railWidth,height:3,color:rgb(.86,.96,.35)});
    const label=String(articleNumber).padStart(2,'0');
    page.drawText(label,{x:margin+(railWidth-bold.widthOfTextAtSize(label,11))/2,y:railTop-24,size:11,font:bold,color:rgb(.86,.96,.35)});
   };
   page.drawText('RILEVANZA',{x:width-margin-110,y:y+1,size:6.5,font,color:grey});
   for(let i=0;i<5;i++)page.drawRectangle({x:width-margin-54+i*11,y:y+1,width:8,height:4,color:i<article.rating?rgb(.42,.51,.29):rgb(.87,.89,.85)});
   for(const row of articleRows(article)){
    if(y-row.advance<55){drawRail();next();railTop=y+14;}
    page.drawText(row.value,{x:articleX,y,size:row.size,font:row.face,color:row.color});
    y-=row.advance;
   }
   drawRail();
   page.drawLine({start:{x:articleX,y:y+1},end:{x:width-margin,y:y+1},thickness:.45,color:rgb(.85,.87,.82)});y-=19;
  }
 }
 pdf.getPages().forEach((p,i)=>{p.drawLine({start:{x:margin,y:38},end:{x:width-margin,y:38},thickness:.5,color:grey});p.drawText('JUMP PRESS · '+body.date,{x:margin,y:24,size:8,font,color:grey});p.drawText(`${i+1} / ${pdf.getPageCount()}`,{x:width-margin-28,y:24,size:8,font,color:grey});});
 return pdf.save();
}
