import {readFile} from 'node:fs/promises';
import {pdfTheme as theme} from './pdf-theme.js';
import {rgb} from 'pdf-lib';
import {analyseEdition} from './edition-analysis.js';
import {groupKeyPoints,splitKeyPoint,themeColors} from './key-point-signals.js';
import {summarySections} from './summary-sections.js';
import {dailySentiment,sentimentColors} from './daily-sentiment.js';

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
 const outlets=[...(a.outlets||[])].sort((a,b)=>rank(a)-rank(b)),rows=Math.ceil(outlets.length/3),coverHeight=48+rows*54;
 card(top,coverHeight);
 draw('La Juventus sulle prime pagine',margin+18,top-25,13,bold);

 for(const [i,outlet] of outlets.entries()){
  const x=margin+16+(i%3)*160,baseline=top-71-Math.floor(i/3)*54;

  if(logoMap[outlet]){const logo=await pdf.embedPng(await readFile(process.cwd()+'/public/testate/pdf/'+logoMap[outlet]+'.png'));const factor=Math.min(115/logo.width,22/logo.height);page.drawImage(logo,{x:x+(150-logo.width*factor)/2,y:baseline+12-logo.height*factor/2,width:logo.width*factor,height:logo.height*factor});}
  else wrap(outlet,8,145).forEach((line,j)=>draw(line,x+(150-bold.widthOfTextAtSize(line,8))/2,baseline+8-j*10,8,bold));
 }
 top-=coverHeight+20;
 const signals=groupKeyPoints(body.keyPoints||[]).flatMap(g=>g.points.map((p,i)=>({...p,groupLabel:i===0?g.label:null})));
 const colors=themeColors.map(hex=>rgb(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255))),pointLines=signals.map(p=>{const parts=splitKeyPoint(p.text);return [...(parts.title?wrap(parts.title,9.5,245):[]),...wrap(parts.detail,9.5,245)];});
 const fullHeight=Math.max(356,80+pointLines.reduce((n,l,i)=>n+l.length*12+10+(signals[i].groupLabel?20:0),0));
 const separatePoints=top-fullHeight<54;
 const analysisHeight=separatePoints?356:fullHeight;
 if(top-analysisHeight<54){page=pdf.addPage([595.28,height]);top=height-42;}
 card(top,analysisHeight);draw('I temi e i punti chiave',margin+18,top-27,19,heading);
 page.drawLine({start:{x:margin+207,y:top-47},end:{x:margin+207,y:top-analysisHeight+18},thickness:.6,color:border});
 const cx=margin+100,cy=top-96,r=37;
 a.themes.forEach((t,i)=>{const start=(t.start*3.6-90)*Math.PI/180,end=(t.end*3.6-90)*Math.PI/180;page.drawSvgPath('M 0 0 L '+r*Math.cos(start)+' '+r*Math.sin(start)+' A '+r+' '+r+' 0 '+(t.end-t.start>50?1:0)+' 1 '+r*Math.cos(end)+' '+r*Math.sin(end)+' Z',{x:cx,y:cy,color:colors[i%colors.length]});});
 page.drawCircle({x:cx,y:cy,size:31,color:rgb(1,1,1)});draw(a.selected,cx-12,cy-3,19,bold);draw('articoli',cx-13,cy-15,7,font,grey);
 a.themes.forEach((t,i)=>{const yy=top-153-i*16;page.drawCircle({x:margin+22,y:yy+3,size:2.5,color:colors[i%colors.length]});draw(t.label,margin+31,yy,8,font,grey);draw(t.count,margin+180,yy,8,bold);});
 const sentiment=dailySentiment(body.articles),gx=margin+100,gy=top-291;
 const centerText=(text,y,size=8,face=font,color=grey)=>draw(text,gx-face.widthOfTextAtSize(text,size)/2,y,size,face,color);
 page.drawLine({start:{x:margin+20,y:top-220},end:{x:margin+187,y:top-220},thickness:.5,color:border});
 centerText('Sentiment Juventus',top-238,9,bold);
 for(let i=0;i<36;i++){
  const a=Math.PI-i*Math.PI/36,b=a-Math.PI/36;
  const hex=sentimentColors[Math.floor(i/12)],color=sentiment.value===null?border:rgb(...[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255));
  page.drawLine({start:{x:gx+39*Math.cos(a),y:gy+39*Math.sin(a)},end:{x:gx+39*Math.cos(b),y:gy+39*Math.sin(b)},thickness:5,color});
 }
 if(sentiment.value!==null){const angle=Math.PI*(1-sentiment.value);page.drawLine({start:{x:gx,y:gy},end:{x:gx+32*Math.cos(angle),y:gy+32*Math.sin(angle)},thickness:1.5,color:ink});page.drawCircle({x:gx,y:gy,size:2.5,color:ink});}
 draw('Negativo',gx-59,gy-13,7,font,grey);draw('Positivo',gx+29,gy-13,7,font,grey);centerText('Neutro',gy+23,6.5);
 centerText(sentiment.label,gy-29,8,bold,ink);centerText(sentiment.value===null?'Valutazione da completare':`Sui ${sentiment.count} articoli selezionati`,gy-42,6.5);
 if(separatePoints){
  draw('La giornata in sintesi',margin+224,top-65,12,bold);
  draw('I punti chiave seguono nella prossima pagina.',margin+224,top-86,9,font,grey);
  page=pdf.addPage([595.28,height]);top=height-42;
  draw('La giornata in sintesi',margin,top,24,heading);
 }
 if(!separatePoints)draw('La giornata in sintesi',margin+224,top-55,11,bold);
 let py=top-(separatePoints?38:80);
 const pointX=separatePoints?margin:margin+224,textX=pointX+22;
 signals.forEach((signal,i)=>{
  const parts=splitKeyPoint(signal.text),size=separatePoints?10.5:9.5,maxWidth=separatePoints?width-22:245;
  const paragraph=[...(parts.title?wrap(parts.title,size,maxWidth).map(text=>({text,face:bold})):[]),...wrap(parts.detail,size,maxWidth).map(text=>({text,face:font}))];
  const label=signal.groupLabel;
  if(py<95){page=pdf.addPage([595.28,height]);py=height-60;}
  if(label){draw(label,pointX,py,10,bold,ink);py-=20;}
  draw(String(i+1).padStart(2,'0'),pointX,py,9,bold,grey);
  for(const line of paragraph){
   if(py<60){page=pdf.addPage([595.28,height]);py=height-60;}
   draw(line.text,textX,py,size,line.face);py-=12;
  }
  py-=10;
 });
}
