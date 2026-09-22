import {readFile} from 'node:fs/promises';
import {pdfTheme as theme} from './pdf-theme.js';
import {rgb} from 'pdf-lib';
import {analyseEdition} from './edition-analysis.js';
import {groupKeyPoints,splitKeyPoint,themeColors} from './key-point-signals.js';
import {summarySections} from './summary-sections.js';

export async function drawEditionCover({pdf,page,body,font,bold,heading=bold,sectionFont=bold,selectedSections=null}){
 const margin=42,width=511.28,height=841.89;
 const {ink,grey,red:accent,paper,border,yellow}=theme;
 const draw=(value,x,y,size=10,f=font,color=ink)=>page.drawText(String(value),{x,y,size,font:f,color});
 const wrap=(text,size,max,face=font)=>{const result=[];let line='';for(const word of String(text).split(/\s+/)){if(line&&face.widthOfTextAtSize(line+' '+word,size)>max){result.push(line);line=word;}else line=line?line+' '+word:word;}if(line)result.push(line);return result;};
 const card=(top,h,fill=rgb(1,1,1))=>page.drawRectangle({x:margin,y:top-h,width,height:h,color:fill,borderColor:border,borderWidth:.6});
 const date=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(body.date+'T12:00:00Z')).toUpperCase();
 const introLines=wrap(body.intro,11.5,width);
 const sections=summarySections.filter(s=>(!selectedSections||selectedSections.includes(s))&&body.articles.some(a=>a.category===s));
 let sectionY=height-139-introLines.length*17,sectionX=margin+48;
 const chips=sections.map(label=>{const w=font.widthOfTextAtSize(label,8)+18;if(sectionX+w>margin+width){sectionX=margin+48;sectionY-=27;}const chip={label,x:sectionX,y:sectionY,width:w};sectionX+=w+7;return chip;});
 const headerBottom=sectionY-(selectedSections?49:30);
 page.drawRectangle({x:0,y:headerBottom,width:595.28,height:height-headerBottom,color:ink});
 draw(date,margin,height-35,10,bold,yellow);
 const titleSize=Math.min(34,width/heading.widthOfTextAtSize('Rassegna stampa Juventus',1));
 draw('Rassegna stampa ',margin,height-81,titleSize,heading,rgb(1,1,1));
 draw('Juventus',margin+heading.widthOfTextAtSize('Rassegna stampa ',titleSize),height-81,titleSize,heading,rgb(.78,.78,.78));
 introLines.forEach((line,i)=>draw(line,margin,height-112-i*17,11.5,font,rgb(.92,.92,.92)));
 draw('Sezioni',margin,chips[0]?.y??sectionY,8,bold,rgb(.75,.75,.75));
 for(const chip of chips){
  page.drawRectangle({x:chip.x,y:chip.y-7,width:chip.width,height:23,borderColor:yellow,borderWidth:.6});
  draw(chip.label,chip.x+9,chip.y,8,font,rgb(.92,.92,.92));
 }
 if(selectedSections)draw('Grafico e punti chiave riferiti all’intera giornata',margin,sectionY-28,7,font,rgb(.75,.75,.75));
 let top=headerBottom-22;
 const a=analyseEdition(body);
 const logoMap={'La Repubblica':'repubblica','Corriere dello Sport Stadio':'corriere-sport','Corriere dello Sport':'corriere-sport','La Gazzetta dello Sport':'gazzetta','La Stampa':'stampa','Tuttosport':'tuttosport'};
 const rank=name=>/gazzetta dello sport/i.test(name)?0:/corriere dello sport/i.test(name)?1:/tuttosport/i.test(name)?2:3;
 const outlets=[...(a.outlets||[])].sort((a,b)=>rank(a)-rank(b)),rows=Math.ceil(outlets.length/3),coverHeight=48+rows*54;
 card(top,coverHeight);
 draw('Juventus in prima pagina',margin+(width-sectionFont.widthOfTextAtSize('Juventus in prima pagina',13))/2,top-25,13,sectionFont);

 for(const [i,outlet] of outlets.entries()){
  const x=margin+16+(i%3)*160,baseline=top-71-Math.floor(i/3)*54;

  if(logoMap[outlet]){const logo=await pdf.embedPng(await readFile(process.cwd()+'/public/testate/pdf/'+logoMap[outlet]+'.png'));const factor=Math.min(115/logo.width,22/logo.height);page.drawImage(logo,{x:x+(150-logo.width*factor)/2,y:baseline+12-logo.height*factor/2,width:logo.width*factor,height:logo.height*factor});}
  else wrap(outlet,8,145).forEach((line,j)=>draw(line,x+(150-bold.widthOfTextAtSize(line,8))/2,baseline+8-j*10,8,bold));
 }
 top-=coverHeight+20;
 const signals=groupKeyPoints(body.keyPoints||[]).flatMap(g=>g.points.map((p,i)=>({...p,kind:g.kind,groupLabel:i===0?g.label:null})));
 const colors=themeColors.map(hex=>rgb(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)));
 const pointX=margin+220,pointWidth=width-238,descriptionSize=8.5;
 const pointRows=signals.map(p=>{const parts=splitKeyPoint(p.text);return {title:parts.title?wrap(parts.title,10,pointWidth,bold):[],detail:wrap(parts.detail,descriptionSize,pointWidth)};});
 const pointsHeight=pointRows.reduce((n,p,i)=>n+(p.title.length+p.detail.length)*12+13+(signals[i].groupLabel?30:0),0);
 const fullHeight=Math.max(280,87+pointsHeight);
 const separatePoints=top-fullHeight<54;
 const analysisHeight=separatePoints?280:fullHeight;
 if(top-analysisHeight<54){page=pdf.addPage([595.28,height]);top=height-42;}
 card(top,analysisHeight);
 draw('LETTURA DELLA RASSEGNA',margin+18,top-22,7,bold,grey);
 draw('I temi della giornata',margin+18,top-48,14,sectionFont);
 page.drawLine({start:{x:margin+194,y:top-35},end:{x:margin+194,y:top-analysisHeight+18},thickness:.6,color:border});
 const cx=margin+94,cy=top-110,r=37;
 a.themes.forEach((t,i)=>{const start=(t.start*3.6-90)*Math.PI/180,end=(t.end*3.6-90)*Math.PI/180;page.drawSvgPath('M 0 0 L '+r*Math.cos(start)+' '+r*Math.sin(start)+' A '+r+' '+r+' 0 '+(t.end-t.start>50?1:0)+' 1 '+r*Math.cos(end)+' '+r*Math.sin(end)+' Z',{x:cx,y:cy,color:colors[i%colors.length]});});
 page.drawCircle({x:cx,y:cy,size:30,color:rgb(1,1,1)});draw(a.selected,cx-bold.widthOfTextAtSize(String(a.selected),19)/2,cy-3,19,bold);draw('articoli',cx-font.widthOfTextAtSize('articoli',7)/2,cy-15,7,font,grey);
 a.themes.forEach((t,i)=>{const yy=top-171-i*18;page.drawCircle({x:margin+22,y:yy+3,size:2.5,color:colors[i%colors.length]});draw(t.label,margin+31,yy,8,font,grey);draw(t.count,margin+166,yy,8,bold);});
 draw('La giornata in sintesi',pointX,top-48,14,sectionFont);
 if(separatePoints){
  draw('I segnali seguono nella prossima pagina.',pointX,top-80,9,font,grey);
  page=pdf.addPage([595.28,height]);top=height-42;
  draw('La giornata in sintesi',margin,top,18,sectionFont);
 }
 let py=top-(separatePoints?35:78);
 const textX=separatePoints?margin:pointX,maxWidth=separatePoints?width:pointWidth;
 signals.forEach(signal=>{
  const parts=splitKeyPoint(signal.text);
  const paragraph=[...(parts.title?wrap(parts.title,10,maxWidth,bold).map(text=>({text,face:bold,size:10})):[]),...wrap(parts.detail,descriptionSize,maxWidth).map(text=>({text,face:font,size:descriptionSize}))];
  const label=signal.groupLabel,required=paragraph.length*12+13+(label?30:0);
  if(py-required<60){page=pdf.addPage([595.28,height]);py=height-60;}
  if(label){
   page.drawLine({start:{x:textX,y:py+5},end:{x:textX+maxWidth,y:py+5},thickness:.5,color:border});
   const positive=signal.kind==='positivo';
   if(positive)page.drawRectangle({x:textX,y:py-17,width:13,height:13,color:yellow});
   const arrowColor=positive?ink:rgb(.55,.22,.25),ax=textX+3,ay=py-13;
   page.drawLine({start:{x:ax,y:positive?ay:ay+6},end:{x:ax+6,y:positive?ay+6:ay},thickness:1.2,color:arrowColor});
   page.drawLine({start:{x:ax+6,y:positive?ay+6:ay},end:{x:ax+1,y:positive?ay+6:ay},thickness:1.2,color:arrowColor});
   page.drawLine({start:{x:ax+6,y:positive?ay+6:ay},end:{x:ax+6,y:positive?ay+1:ay+5},thickness:1.2,color:arrowColor});
   draw(label.toUpperCase(),textX+20,py-13,8,bold,ink);py-=30;
  }
  for(const line of paragraph){if(py<60){page=pdf.addPage([595.28,height]);py=height-60;}draw(line.text,textX,py,line.size,line.face,line.face===font?grey:ink);py-=12;}
  py-=13;
 });
}
