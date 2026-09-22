import {readFile} from 'node:fs/promises';
import {pdfTheme as theme} from './pdf-theme.js';
import {rgb} from 'pdf-lib';
import {analyseEdition} from './edition-analysis.js';
import {parseKeyPoint} from './key-point-signals.js';
import {summarySections} from './summary-sections.js';

export async function drawEditionCover({pdf,page,body,font,bold,heading=bold,selectedSections=null}){
 const margin=42,width=511.28,height=841.89;
 const {ink,grey,red:accent,paper,border,yellow}=theme;
 const draw=(value,x,y,size=10,f=font,color=ink)=>page.drawText(String(value),{x,y,size,font:f,color});
 const wrap=(text,size,max)=>{const result=[];let line='';for(const word of String(text).split(/\s+/)){if(line&&font.widthOfTextAtSize(line+' '+word,size)>max){result.push(line);line=word;}else line=line?line+' '+word:word;}if(line)result.push(line);return result;};
 const card=(top,h,fill=rgb(1,1,1))=>page.drawRectangle({x:margin,y:top-h,width,height:h,color:fill,borderColor:border,borderWidth:.6});
 const date=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(body.date+'T12:00:00Z')).toUpperCase();
 const introLines=wrap(body.intro,11.5,width);
 const sections=summarySections.filter(s=>(!selectedSections||selectedSections.includes(s))&&body.articles.some(a=>a.category===s));
 let sectionY=height-121-introLines.length*17,sectionX=margin+48;
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
 const outlets=[...(a.outlets||[])].sort((a,b)=>rank(a)-rank(b)),rows=Math.ceil(outlets.length/3),coverHeight=43+rows*31;
 card(top,coverHeight);
 draw('Dove la Juventus è in prima pagina',margin+(width-bold.widthOfTextAtSize('Dove la Juventus è in prima pagina',11))/2,top-22,11,bold);

 for(const [i,outlet] of outlets.entries()){
  const x=margin+16+(i%3)*160,baseline=top-52-Math.floor(i/3)*34;
  if(logoMap[outlet]){const logo=await pdf.embedPng(await readFile(process.cwd()+'/public/testate/pdf/'+logoMap[outlet]+'.png'));const factor=Math.min(90/logo.width,17/logo.height);page.drawImage(logo,{x:x+(145-logo.width*factor)/2,y:baseline-3,width:logo.width*factor,height:logo.height*factor});}
  else wrap(outlet,8,145).forEach((line,j)=>draw(line,x,baseline-j*10,8,bold));
 }
 top-=coverHeight+20;
 const signals=(body.keyPoints||[]).map(parseKeyPoint);
 const colors=[ink,rgb(119/255,119/255,119/255),accent,yellow],pointLines=signals.map(p=>wrap(p.text,9.5,245));
 const fullHeight=Math.max(224,67+pointLines.reduce((n,l,i)=>n+l.length*14+18+(signals[i].kind==='neutro'?0:15),0));
 const separatePoints=top-fullHeight<54;
 const analysisHeight=separatePoints?224:fullHeight;
 if(top-analysisHeight<54){page=pdf.addPage([595.28,height]);top=height-42;}
 card(top,analysisHeight);draw('I temi e i punti chiave',margin+18,top-27,19,heading);
 page.drawLine({start:{x:margin+207,y:top-47},end:{x:margin+207,y:top-analysisHeight+18},thickness:.6,color:border});
 const cx=margin+100,cy=top-96,r=37;
 a.themes.forEach((t,i)=>{const start=(t.start*3.6-90)*Math.PI/180,end=(t.end*3.6-90)*Math.PI/180;page.drawSvgPath('M 0 0 L '+r*Math.cos(start)+' '+r*Math.sin(start)+' A '+r+' '+r+' 0 '+(t.end-t.start>50?1:0)+' 1 '+r*Math.cos(end)+' '+r*Math.sin(end)+' Z',{x:cx,y:cy,color:colors[i%colors.length]});});
 page.drawCircle({x:cx,y:cy,size:27,color:rgb(1,1,1)});draw(a.selected,cx-12,cy-3,19,bold);draw('articoli',cx-13,cy-15,7,font,grey);
 a.themes.forEach((t,i)=>{const yy=top-153-i*16;page.drawCircle({x:margin+22,y:yy+3,size:2.5,color:colors[i%colors.length]});draw(t.label,margin+31,yy,8,font,grey);draw(t.count,margin+180,yy,8,bold);});
 if(separatePoints){
  draw('La giornata in sintesi',margin+224,top-65,12,bold);
  draw('I punti chiave seguono nella prossima pagina.',margin+224,top-86,9,font,grey);
  page=pdf.addPage([595.28,height]);top=height-42;
  draw('La giornata in sintesi',margin,top,24,heading);
 }
 let py=top-(separatePoints?38:61);
 const pointX=separatePoints?margin:margin+224,textX=pointX+22;
 signals.forEach((signal,i)=>{
  const paragraph=separatePoints?wrap(signal.text,10.5,width-22):pointLines[i];
  const label=signal.kind==='neutro'?null:signal.kind==='positivo'?'Positivo':'Negativo';
  if(py<95){page=pdf.addPage([595.28,height]);py=height-60;}
  draw(String(i+1).padStart(2,'0'),pointX,py,10,bold);
  if(label){draw(label,textX,py,10,bold,signal.kind==='negativo'?accent:ink);py-=15;}
  for(const line of paragraph){
   if(py<60){page=pdf.addPage([595.28,height]);py=height-60;}
   draw(line,textX,py,separatePoints?10.5:9.5);py-=14;
  }
  py-=18;
 });
}
