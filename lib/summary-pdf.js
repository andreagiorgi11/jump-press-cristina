import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {pdfTheme as theme} from './pdf-theme.js';
import fontkit from '@pdf-lib/fontkit';
import {embedJumpLogo,drawJumpLogo} from './pdf-brand.js';
import {drawEditionCover} from './summary-pdf-cover.js';
import {addInternalPdfLink} from './pdf-links.js';
import {addPdfOutline} from './pdf-outline.js';
import {summaryEdition,summarySections} from './summary-sections.js';
export async function exportEditionPdf(source,fonts,selectedSections=null,{loadClip}={}){
 const body=summaryEdition(source);body.articles.sort((a,b)=>summarySections.indexOf(a.category)-summarySections.indexOf(b.category));
 const coverBody={...body,articles:[...body.articles]};
 const partial=selectedSections&&selectedSections.length<summarySections.length;
 if(partial)body.articles=body.articles.filter(a=>selectedSections.includes(a.category));
 if(!body.articles.length)throw Error('Nessun articolo nelle sezioni selezionate.');
 const pdf=await PDFDocument.create();if(fonts)pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fonts?.regular||StandardFonts.Helvetica,{subset:true}),bold=await pdf.embedFont(fonts?.bold||StandardFonts.HelveticaBold,{subset:true}),serif=fonts?.heading?await pdf.embedFont(fonts.heading,{subset:true}):bold;
 pdf.setTitle('Rassegna stampa Juventus - '+body.date+(partial?' - '+selectedSections.join(', '):''));pdf.setAuthor('Jump Press');
 const {ink,grey,red:accent}=theme,width=595.28,height=841.89,margin=42,lineWidth=width-margin*2;
 let page,y,currentCategory='';const outline=[],articleLinks=new Map();
 const clean=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u202f\u00a0]/g,' ').replace(/[^\x20-\x7e\xa0-\xff\u2018\u2019\u201c\u201d\u2026\u20ac]/g,'');
 const lines=(text,size,f,maxWidth=lineWidth)=>{const out=[];for(const paragraph of clean(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(f.widthOfTextAtSize(line?line+' '+word:word,size)>maxWidth&&line){out.push(line);line=word;}else line=line?line+' '+word:word;}out.push(line);}return out;};
 const next=()=>{page=pdf.addPage([width,height]);y=height-40;page.drawText(body.date,{x:width-margin-65,y,size:9,font,color:grey});page.drawLine({start:{x:margin,y:y-13},end:{x:width-margin,y:y-13},thickness:.5,color:theme.border});y-=37;if(currentCategory){page.drawText(clean(currentCategory).toUpperCase(),{x:margin,y,size:8,font:bold,color:grey});y-=26;}};
 const space=n=>{if(y-n<55)next();};
 const heading=(s,count,index)=>{page.drawRectangle({x:margin,y:y-38,width:lineWidth,height:53,color:theme.paper});page.drawText(String(index+1).padStart(2,'0'),{x:margin+12,y:y-15,size:20,font:serif,color:ink});page.drawRectangle({x:margin,y:y-38,width:3,height:53,color:theme.yellow});page.drawText(s,{x:margin+48,y:y-6,size:18,font:serif,color:ink});page.drawText(`${count} ${count===1?'articolo selezionato':'articoli selezionati'}`,{x:margin+48,y:y-23,size:8.5,font:bold,color:grey});y-=65;};
 next();
 outline.push({title:'Copertina · quadro della giornata',page});
 await drawEditionCover({pdf,page,body:coverBody,font,bold,heading:serif,selectedSections:partial?summarySections.filter(s=>selectedSections.includes(s)):null});next();
 const railWidth=30,articleX=margin+44,articleWidth=lineWidth-44;
 let articleNumber=0;
 const articleRows=article=>{
  const rows=[];
  const add=(value,size,face,color,gap,maxWidth=articleWidth,isTitle=false)=>{
   const wrapped=lines(value,size,face,maxWidth);
   wrapped.forEach((value,index)=>rows.push({value,size,face,color,isTitle,advance:size*1.45+(index===wrapped.length-1?gap:0)}));
  };
  add(article.outlet.toUpperCase(),8,bold,grey,9,articleWidth-120);
  add(article.title,20,serif,ink,6,articleWidth,true);
  if(article.author)add('di '+article.author,8.5,font,grey,8);
  add(article.summary,10.5,font,theme.ink,12);
  return rows;
 };
 const articleHeight=article=>articleRows(article).reduce((sum,row)=>sum+row.advance,0)+19;
 for(const [categoryIndex,category] of summarySections.entries()){
  const articles=body.articles.filter(a=>a.category===category);if(!articles.length)continue;
  if(articleNumber>0){currentCategory='';next();}
  currentCategory=category;space(65+Math.min(articleHeight(articles[0]),550));const sectionMark={title:category,page,y:y+18,children:[]};outline.push(sectionMark);heading(category,articles.length,categoryIndex);
  for(const article of articles){
   articleNumber++;
   space(Math.min(articleHeight(article),650));
   const articleTarget={title:article.outlet+' · '+article.title,page,y:y+18};
   sectionMark.children.push(articleTarget);const titleLinks=[];articleLinks.set(article,{target:articleTarget,links:titleLinks});
   let railTop=y+14;
   const drawRail=()=>{
    const bottom=y+3;
    page.drawRectangle({x:margin,y:bottom,width:railWidth,height:railTop-bottom,color:theme.ink});
    page.drawRectangle({x:margin,y:bottom,width:railWidth,height:3,color:theme.yellow});
    const label=String(articleNumber).padStart(2,'0');
    page.drawText(label,{x:margin+(railWidth-bold.widthOfTextAtSize(label,11))/2,y:railTop-24,size:11,font:bold,color:theme.white});
   };
   page.drawText('RILEVANZA',{x:width-margin-110,y:y+1,size:6.5,font,color:grey});
   for(let i=0;i<5;i++)page.drawRectangle({x:width-margin-54+i*11,y:y+1,width:8,height:4,color:i<article.rating?theme.red:theme.border});
   for(const row of articleRows(article)){
    if(y-row.advance<55){drawRail();next();railTop=y+14;}
    page.drawText(row.value,{x:articleX,y,size:row.size,font:row.face,color:row.color});
    if(loadClip&&row.isTitle)titleLinks.push({page,rect:[articleX,y-4,articleX+row.face.widthOfTextAtSize(row.value,row.size),y+row.size]});
    y-=row.advance;
   }
   drawRail();
   page.drawLine({start:{x:articleX,y:y+1},end:{x:width-margin,y:y+1},thickness:.45,color:theme.border});y-=19;
  }
 }
 const jumpLogo=await embedJumpLogo(pdf);
 pdf.getPages().forEach((p,i)=>{p.drawLine({start:{x:margin,y:48},end:{x:width-margin,y:48},thickness:.5,color:grey});drawJumpLogo(p,jumpLogo,margin,bold);p.drawText(partial?'RASSEGNA · SEZIONI SELEZIONATE':'RASSEGNA STAMPA COMPLETA',{x:margin+56,y:24,size:8,font,color:grey});p.drawText(`${i+1} / ${pdf.getPageCount()}`,{x:width-margin-28,y:24,size:8,font,color:grey});});
 if(loadClip){
  const included=new Map(),clipMarks=[];
  for(const article of body.articles){
   if(!article.clipId||!/^[a-zA-Z0-9-]+$/.test(article.clipId))throw Error('Ritaglio non disponibile per un articolo selezionato.');
   if(included.has(article.clipId)){for(const link of articleLinks.get(article).links)addInternalPdfLink(pdf,link.page,link.rect,included.get(article.clipId),'Apri ritaglio originale');continue;}
   const original=await PDFDocument.load(await loadClip(article.clipId));
   if(!original.getPageCount())throw Error('Ritaglio privo di pagine.');
   const pages=await pdf.copyPages(original,original.getPageIndices());
   pages.forEach(p=>{
    pdf.addPage(p);const box=p.getCropBox(),media=p.getMediaBox();
    // Add a separate footer outside the original crop; newspaper content stays untouched.
    p.setMediaBox(Math.min(media.x,box.x),Math.min(media.y,box.y-24),Math.max(media.x+media.width,box.x+box.width)-Math.min(media.x,box.x),Math.max(media.y+media.height,box.y+box.height)-Math.min(media.y,box.y-24));
    p.setCropBox(box.x,box.y-24,box.width,box.height+24);
    p.drawRectangle({x:box.x,y:box.y-24,width:box.width,height:24,color:theme.white});
    const label='Torna alla sintesi',x=box.x+14,baseline=box.y-16;
    p.drawText(label,{x,y:baseline,size:8,font:bold,color:ink});
    p.drawLine({start:{x,y:baseline-2},end:{x:x+bold.widthOfTextAtSize(label,8),y:baseline-2},thickness:.6,color:ink});
    addInternalPdfLink(pdf,p,[x,box.y-23,x+bold.widthOfTextAtSize(label,8)+8,box.y-2],articleLinks.get(article).target,label);
   });
   const clipTarget={title:article.outlet+' · '+article.title,page:pages[0]};clipMarks.push(clipTarget);included.set(article.clipId,clipTarget);
   for(const link of articleLinks.get(article).links)addInternalPdfLink(pdf,link.page,link.rect,clipTarget,'Apri ritaglio originale');
  }
  if(clipMarks.length)outline.push({title:'Ritagli originali',page:clipMarks[0].page,children:clipMarks});
 }
 addPdfOutline(pdf,outline);
 return pdf.save();
}
