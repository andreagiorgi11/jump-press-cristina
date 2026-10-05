import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {outletLogo} from './outlet-logos.js';
import {outletLogoSize} from './outlet-logo-sizes.js';
import {pdfTheme as theme} from './pdf-theme.js';
import {rgb} from 'pdf-lib';
import {analyseEdition} from './edition-analysis.js';
import {groupKeyPoints,splitKeyPoint,areaColor} from './key-point-signals.js';
import {articleSections} from './summary-sections.js';

export async function drawEditionCover({pdf,page,body,font,bold,heading=bold,sectionFont=bold,selectedSections=null}){
 const margin=42,width=511.28,height=841.89;
 const {ink,grey,red:accent,paper,border,yellow}=theme;
 const draw=(value,x,y,size=10,f=font,color=ink)=>page.drawText(String(value),{x,y,size,font:f,color});
 const wrap=(text,size,max,face=font)=>{const result=[];let line='';for(const word of String(text).split(/\s+/)){if(line&&face.widthOfTextAtSize(line+' '+word,size)>max){result.push(line);line=word;}else line=line?line+' '+word:word;}if(line)result.push(line);return result;};
 const card=(top,h,fill=rgb(1,1,1))=>page.drawRectangle({x:margin,y:top-h,width,height:h,color:fill,borderColor:border,borderWidth:.6});
 const date=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(body.date+'T12:00:00Z')).toUpperCase();
 const introLines=wrap(body.intro,11.5,width);
 const sections=articleSections.filter(s=>(!selectedSections||selectedSections.includes(s))&&body.articles.some(a=>a.category===s));
 const sectionLabelY=height-139-introLines.length*17,navSize=12.5,sectionLinks=[];
 let sectionY=sectionLabelY-23,sectionX=margin;
 const chips=sections.map(label=>{const w=heading.widthOfTextAtSize(label,navSize);if(sectionX+w>margin+width){sectionX=margin;sectionY-=29;}const chip={label,x:sectionX,y:sectionY,width:w};sectionX+=w+20;return chip;});
 const headerBottom=sectionY-(selectedSections?49:30);
 page.drawRectangle({x:0,y:headerBottom,width:595.28,height:height-headerBottom,color:ink});
 draw(date,margin,height-35,10,bold,yellow);
 const titleSize=Math.min(34,width/heading.widthOfTextAtSize('Rassegna stampa Juventus',1));
 draw('Rassegna stampa ',margin,height-81,titleSize,heading,rgb(1,1,1));
 draw('Juventus',margin+heading.widthOfTextAtSize('Rassegna stampa ',titleSize),height-81,titleSize,heading,rgb(.78,.78,.78));
 introLines.forEach((line,i)=>draw(line,margin,height-112-i*17,11.5,font,rgb(.92,.92,.92)));
 page.drawRectangle({x:margin,y:sectionLabelY,width:3,height:7,color:yellow});
 draw('SEZIONI',margin+10,sectionLabelY,7,bold,rgb(.75,.75,.75));
 for(const rowY of new Set(chips.map(chip=>chip.y)))page.drawLine({start:{x:margin,y:rowY-10},end:{x:margin+width,y:rowY-10},thickness:.5,color:rgb(.3,.3,.3)});
 for(const chip of chips){
  draw(chip.label,chip.x,chip.y,navSize,heading,rgb(.92,.92,.92));
  sectionLinks.push({label:chip.label,page,rect:[chip.x,chip.y-7,chip.x+chip.width,chip.y+navSize]});
 }
 if(selectedSections)draw('Grafico e punti chiave riferiti all’intera giornata',margin,sectionY-28,7,font,rgb(.75,.75,.75));
 let top=headerBottom-22;
 const a=analyseEdition(body);
 // PDF cover needs PNG: dedicated print versions in testate/pdf, otherwise the site PNG.
 const logoFile=outlet=>{const logo=outletLogo(outlet);if(!logo)return null;for(const p of ['/public/testate/pdf/'+logo.key+'.png',...(logo.file.endsWith('.png')?['/public/testate/'+logo.file]:[])])if(existsSync(process.cwd()+p))return process.cwd()+p;return null;};
 const rank=name=>/gazzetta dello sport/i.test(name)?0:/corriere dello sport/i.test(name)?1:/tuttosport/i.test(name)?2:3;
 const outlets=[...(a.outlets||[])].sort((a,b)=>rank(a)-rank(b)),rows=Math.ceil(outlets.length/3),coverHeight=48+rows*54;
 card(top,coverHeight);
 draw('Juventus in prima pagina',margin+(width-heading.widthOfTextAtSize('Juventus in prima pagina',14.5))/2,top-25,14.5,heading);
 page.drawLine({start:{x:margin+18,y:top-35},end:{x:margin+width-18,y:top-35},thickness:.5,color:border});

 // Balance rows (4 => 2+2, 7 => 3+2+2) and centre each occupied row.
 let offset=0;
 for(let row=0;row<rows;row++){
  const count=Math.ceil((outlets.length-offset)/(rows-row));
  for(let column=0;column<count;column++){
  const outlet=outlets[offset++];
  const x=margin+(width-count*160)/2+column*160+5,baseline=top-80.5-row*54;

  const logoPath=logoFile(outlet);if(logoPath){const logo=await pdf.embedPng(await readFile(logoPath));const size=outletLogoSize(outletLogo(outlet).key,2.2),factor=Math.min(115/logo.width,22/logo.height);const w=size?.width??logo.width*factor,h=size?.height??logo.height*factor;page.drawImage(logo,{x:x+(150-w)/2,y:baseline+12-h/2,width:w,height:h});}
  else wrap(outlet,8,145).forEach((line,j)=>draw(line,x+(150-bold.widthOfTextAtSize(line,8))/2,baseline+8-j*10,8,bold));
 }
 }
 top-=coverHeight+20;
 const signals=groupKeyPoints(body.keyPoints||[]).flatMap(g=>g.points.map((p,i)=>({...p,kind:g.kind,groupLabel:i===0?g.label:null})));
 const colorOf=(t,i)=>{const hex=areaColor(t.label,i);return rgb(...[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255));};
 const pointX=margin+220,pointWidth=width-238,descriptionSize=8.5;
 const pointRows=signals.map(p=>{const parts=splitKeyPoint(p.text);return {title:parts.title?wrap(parts.title,10,pointWidth-20,bold):[],detail:wrap(parts.detail,descriptionSize,pointWidth-20)};});
 const measure=(line,gap,group)=>pointRows.reduce((n,p,i)=>n+(p.title.length+p.detail.length)*line+gap+(signals[i].groupLabel?group:0),0);
 // Choose the roomiest spacing that fits above the footer. Keep group headings
 // clearly separate from the first bullet even in the compact layout.
 const layouts=[[12,10,37],[11.5,9,35],[11,7,33]];
 const [lineHeight,pointGap,groupGap]=layouts.find(values=>54+measure(...values)<=top-72)||layouts.at(-1);
 const pointsHeight=measure(lineHeight,pointGap,groupGap);
 const fullHeight=Math.max(262,54+pointsHeight);
 const separatePoints=top-fullHeight<54;
 const analysisHeight=separatePoints?262:fullHeight;
 if(top-analysisHeight<54){page=pdf.addPage([595.28,height]);top=height-42;}
 card(top,analysisHeight);
 draw('I temi della giornata',margin+97-heading.widthOfTextAtSize('I temi della giornata',14.5)/2,top-25,14.5,heading);
 page.drawLine({start:{x:margin+18,y:top-35},end:{x:margin+176,y:top-35},thickness:.5,color:border});
 if(!separatePoints)page.drawLine({start:{x:pointX,y:top-35},end:{x:pointX+pointWidth,y:top-35},thickness:.5,color:border});
 page.drawLine({start:{x:margin+194,y:top-20},end:{x:margin+194,y:top-analysisHeight+18},thickness:.6,color:border});
 const cx=margin+94,cy=top-94,r=37;
 a.themes.forEach((t,i)=>{const start=(t.start*3.6-90)*Math.PI/180,end=(t.end*3.6-90)*Math.PI/180;page.drawSvgPath('M 0 0 L '+r*Math.cos(start)+' '+r*Math.sin(start)+' A '+r+' '+r+' 0 '+(t.end-t.start>50?1:0)+' 1 '+r*Math.cos(end)+' '+r*Math.sin(end)+' Z',{x:cx,y:cy,color:colorOf(t,i)});});
 page.drawCircle({x:cx,y:cy,size:30,color:rgb(1,1,1)});draw(a.selected,cx-bold.widthOfTextAtSize(String(a.selected),19)/2,cy-3,19,bold);draw('articoli',cx-font.widthOfTextAtSize('articoli',7)/2,cy-15,7,font,grey);
 a.themes.forEach((t,i)=>{const yy=top-155-i*18;page.drawCircle({x:margin+22,y:yy+3,size:2.5,color:colorOf(t,i)});draw(t.label,margin+31,yy,8,font,grey);draw(t.count,margin+166,yy,8,bold);});
 draw('La giornata in sintesi',pointX+(pointWidth-heading.widthOfTextAtSize('La giornata in sintesi',14.5))/2,top-25,14.5,heading);
 if(separatePoints){
  // Only unusually long editions need a continuation; ordinary covers fit together.
  page=pdf.addPage([595.28,height]);top=height-42;
  draw('La giornata in sintesi',margin+(width-heading.widthOfTextAtSize('La giornata in sintesi',14.5))/2,top,14.5,heading);
  page.drawLine({start:{x:margin,y:top-12},end:{x:margin+width,y:top-12},thickness:.5,color:border});
 }
 let py=top-(separatePoints?35:45);let firstGroup=true;
 const textX=separatePoints?margin:pointX,maxWidth=separatePoints?width:pointWidth;
 signals.forEach(signal=>{
  const parts=splitKeyPoint(signal.text);
  const paragraph=[...(parts.title?wrap(parts.title,10,maxWidth-20,bold).map(text=>({text,face:bold,size:10})):[]),...wrap(parts.detail,descriptionSize,maxWidth-20).map(text=>({text,face:font,size:descriptionSize}))];
  const label=signal.groupLabel,required=paragraph.length*lineHeight+pointGap+(label?groupGap:0);
  if(py-required<60){page=pdf.addPage([595.28,height]);py=height-60;}
  if(label){
   if(!firstGroup)page.drawLine({start:{x:textX,y:py+5},end:{x:textX+maxWidth,y:py+5},thickness:.5,color:border});firstGroup=false;
   const positive=signal.kind==='positivo';
   if(positive)page.drawRectangle({x:textX,y:py-17,width:13,height:13,color:yellow});
   const arrowColor=positive?ink:rgb(.55,.22,.25),ax=textX+3,ay=py-13;
   page.drawLine({start:{x:ax,y:positive?ay:ay+6},end:{x:ax+6,y:positive?ay+6:ay},thickness:1.2,color:arrowColor});
   page.drawLine({start:{x:ax+6,y:positive?ay+6:ay},end:{x:ax+1,y:positive?ay+6:ay},thickness:1.2,color:arrowColor});
   page.drawLine({start:{x:ax+6,y:positive?ay+6:ay},end:{x:ax+6,y:positive?ay+1:ay+5},thickness:1.2,color:arrowColor});
   draw(label.toUpperCase(),textX+20,py-13,8,bold,ink);py-=groupGap;
  }
  page.drawCircle({x:textX+6.5,y:py+3.5,size:1.7,color:signal.kind==='negativo'?rgb(.55,.22,.25):ink});
  for(const line of paragraph){if(py<60){page=pdf.addPage([595.28,height]);py=height-60;}draw(line.text,textX+20,py,line.size,line.face,line.face===font?grey:ink);py-=lineHeight;}
  py-=pointGap;
 });
 return sectionLinks;
}
