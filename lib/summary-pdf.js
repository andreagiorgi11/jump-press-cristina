import {showAuthor,isEditorial,cleanSummary} from './article-author.js';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {pdfTheme as theme} from './pdf-theme.js';
import fontkit from '@pdf-lib/fontkit';
import {embedJumpLogo,drawJumpLogo} from './pdf-brand.js';
import {drawEditionCover} from './summary-pdf-cover.js';
import {addInternalPdfLink} from './pdf-links.js';
import {addPdfOutline} from './pdf-outline.js';
import {summaryEdition,articleSections,orderedSectionArticles} from './summary-sections.js';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {outletLogo} from './outlet-logos.js';
import {outletLogoSize} from './outlet-logo-sizes.js';
export async function exportEditionPdf(source,fonts,selectedSections=null,{loadClip}={}){
 const body=summaryEdition(source);body.articles=orderedSectionArticles(body.articles);
 const coverBody={...body,articles:[...body.articles]};
 const partial=selectedSections&&selectedSections.length<articleSections.length;
 if(partial)body.articles=body.articles.filter(a=>selectedSections.includes(a.category));
 if(!body.articles.length)throw Error('Nessun articolo nelle sezioni selezionate.');
 const pdf=await PDFDocument.create();if(fonts)pdf.registerFontkit(fontkit);
 const sectionFont=fonts?.semibold?await pdf.embedFont(fonts.semibold,{subset:true}):null;
 const font=await pdf.embedFont(fonts?.regular||StandardFonts.Helvetica,{subset:true}),bold=await pdf.embedFont(fonts?.strong||fonts?.bold||StandardFonts.HelveticaBold,{subset:true}),serif=fonts?.heading?await pdf.embedFont(fonts.heading,{subset:true}):bold;
 pdf.setTitle('Rassegna stampa Juventus - '+body.date+(partial?' - '+selectedSections.join(', '):''));pdf.setAuthor('Jump Press');
 const {ink,grey,red:accent}=theme,width=595.28,height=841.89,margin=42,lineWidth=width-margin*2;
 let page,y,currentCategory='';const outline=[],articleLinks=new Map();
 const clean=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u202f\u00a0]/g,' ').replace(/[^\x20-\x7e\xa0-\xff\u2018\u2019\u201c\u201d\u2026\u20ac]/g,'');
 const lines=(text,size,f,maxWidth=lineWidth)=>{const out=[];for(const paragraph of clean(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(f.widthOfTextAtSize(line?line+' '+word:word,size)>maxWidth&&line){out.push(line);line=word;}else line=line?line+' '+word:word;}out.push(line);}return out;};
 const next=()=>{page=pdf.addPage([width,height]);y=height-40;{const dateLabel=new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(body.date+'T12:00:00Z'));page.drawText(dateLabel,{x:width-margin-font.widthOfTextAtSize(dateLabel,9),y,size:9,font,color:grey});}page.drawLine({start:{x:margin,y:y-13},end:{x:width-margin,y:y-13},thickness:.5,color:theme.border});y-=37;if(currentCategory){page.drawRectangle({x:margin,y:y-13,width:lineWidth,height:28,color:theme.paper});page.drawRectangle({x:margin,y:y-13,width:3,height:28,color:theme.yellow});page.drawText(currentCategory,{x:margin+12,y:y-3,size:14,font:serif,color:ink});y-=40;}};
 const space=n=>{if(y-n<55)next();};
 const heading=(s,count,index)=>{page.drawRectangle({x:margin,y:y-38,width:lineWidth,height:53,color:theme.paper});page.drawRectangle({x:margin,y:y-38,width:3,height:53,color:theme.yellow});page.drawText(s,{x:margin+12,y:y-6,size:18,font:serif,color:ink});page.drawText(`${count} ${count===1?'articolo selezionato':'articoli selezionati'}`,{x:margin+12,y:y-23,size:8.5,font:bold,color:grey});y-=65;};
 next();
 outline.push({title:'Copertina · lettura della rassegna',page});
 const coverLinks=await drawEditionCover({pdf,page,body:coverBody,font,bold,heading:serif,sectionFont:sectionFont||bold,selectedSections:partial?articleSections.filter(s=>selectedSections.includes(s)):null});next();
 const railWidth=30,articleX=margin+44,articleWidth=lineWidth-44;
 const mastheads=new Map(),imageCache=new Map();
 for(const outlet of new Set(body.articles.map(a=>a.outlet))){
  const mark=outletLogo(outlet);if(!mark)continue;
  const paths=['/public/testate/pdf/'+mark.key+'.png',...(mark.file.endsWith('.png')?['/public/testate/'+mark.file]:[])];
  const path=paths.map(p=>process.cwd()+p).find(existsSync);if(!path)continue;
  if(!imageCache.has(path))imageCache.set(path,await pdf.embedPng(await readFile(path)));
  const image=imageCache.get(path),scale=Math.min(52/image.width,10/image.height);
  const size=outletLogoSize(mark.key);
  mastheads.set(outlet,{image,width:size?.width??image.width*scale,height:size?.height??image.height*scale});
 }
 let articleNumber=0;
 const articleRows=article=>{
  const rows=[];
  const add=(value,size,face,color,gap,maxWidth=articleWidth,isTitle=false)=>{
   const wrapped=lines(value,size,face,maxWidth);
   wrapped.forEach((value,index)=>rows.push({value,size,face,color,isTitle,advance:size*1.45+(index===wrapped.length-1?gap:0)}));
  };
  const masthead=mastheads.get(article.outlet);
  if(masthead)rows.push({masthead,advance:22});
  else add(article.outlet.toUpperCase(),8,bold,grey,9,articleWidth-120);
  add(article.title,20,serif,ink,6,articleWidth,true);
  if(isEditorial(article))add('Editoriale'+(article.author&&showAuthor(article)?'  ·  di '+article.author:''),8.5,font,grey,5);
  if(article.author&&showAuthor(article)&&!isEditorial(article))add('di '+article.author,8.5,font,grey,8);
  add(cleanSummary(article),10.5,font,theme.ink,12);
  return rows;
 };
 const articleHeight=article=>articleRows(article).reduce((sum,row)=>sum+row.advance,0)+19;
 for(const [categoryIndex,category] of articleSections.entries()){
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
   for(const row of articleRows(article)){
    if(y-row.advance<55){drawRail();next();railTop=y+14;}
    if(row.masthead){const m=row.masthead;page.drawImage(m.image,{x:articleX,y:y+3-m.height/2,width:m.width,height:m.height});}
    else page.drawText(row.value,{x:articleX,y,size:row.size,font:row.face,color:row.color});
    if(loadClip&&row.isTitle)titleLinks.push({page,rect:[articleX,y-4,articleX+row.face.widthOfTextAtSize(row.value,row.size),y+row.size]});
    y-=row.advance;
   }
   drawRail();
   page.drawLine({start:{x:articleX,y:y+1},end:{x:width-margin,y:y+1},thickness:.45,color:theme.border});y-=19;
  }
 }
 for(const link of coverLinks){const target=outline.find(item=>item.title===link.label);if(target)addInternalPdfLink(pdf,link.page,link.rect,target,link.label);}
 const jumpLogo=await embedJumpLogo(pdf);
 pdf.getPages().forEach((p,i)=>{p.drawLine({start:{x:margin,y:48},end:{x:width-margin,y:48},thickness:.5,color:grey});drawJumpLogo(p,jumpLogo,margin,bold);p.drawText(`${i+1} / ${pdf.getPageCount()}`,{x:width-margin-28,y:24,size:8,font,color:grey});});
 if(loadClip){
  const included=new Map(),clipMarks=[],missing=[];
  for(const article of body.articles){
   if(!article.clipId||!/^[a-zA-Z0-9-]+$/.test(article.clipId))throw Error('Ritaglio non disponibile per un articolo selezionato.');
   if(included.has(article.clipId)){const target=included.get(article.clipId);if(target)for(const link of articleLinks.get(article).links)addInternalPdfLink(pdf,link.page,link.rect,target,'Apri ritaglio originale');continue;}
   // A clip missing from the archive (e.g. files left on the old store) must not block the
   // whole PDF: the rest is delivered and a closing page lists what could not be attached.
   let clipBytes;
   try{clipBytes=await loadClip(article.clipId);}catch(error){if(error?.status!==404)throw error;missing.push(article);included.set(article.clipId,null);continue;}
   const original=await PDFDocument.load(clipBytes);
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
  if(missing.length){
   const note=pdf.addPage([width,height]);let ny=height-72;
   note.drawText('Ritagli non disponibili',{x:margin,y:ny,size:18,font:serif,color:ink});ny-=24;
   for(const line of lines(`Per questa edizione ${missing.length===1?'un ritaglio originale non è più disponibile':missing.length+' ritagli originali non sono più disponibili'} nell'archivio. Le sintesi restano complete nelle pagine precedenti.`,10,font))note.drawText(line,{x:margin,y:ny-=14,size:10,font,color:grey});
   ny-=16;
   for(const article of missing){for(const line of lines(clean(article.outlet)+' · '+clean(article.title),9.5,font)){if(ny<60)break;note.drawText(line,{x:margin,y:ny-=14,size:9.5,font,color:ink});}ny-=4;}
   outline.push({title:'Ritagli non disponibili',page:note});
  }
 }
 addPdfOutline(pdf,outline);
 return pdf.save();
}
