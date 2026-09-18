import {readFile} from 'node:fs/promises';
import {rgb} from 'pdf-lib';
import {analyseEdition} from './edition-analysis.js';

export async function drawEditionCover({pdf,page,body,font,bold}){
 const margin=42,width=511.28,height=841.89;
 const ink=rgb(.08,.1,.08),grey=rgb(.35,.38,.34),lime=rgb(.84,1,0),paper=rgb(.96,.96,.94),border=rgb(.86,.88,.82),green=rgb(.38,.47,.28);
 const draw=(value,x,y,size=10,f=font,color=ink)=>page.drawText(String(value),{x,y,size,font:f,color});
 const wrap=(text,size,max)=>{const result=[];let line='';for(const word of String(text).split(/\s+/)){if(line&&font.widthOfTextAtSize(line+' '+word,size)>max){result.push(line);line=word;}else line=line?line+' '+word:word;}if(line)result.push(line);return result;};
 const card=(top,h,fill=rgb(1,1,1))=>page.drawRectangle({x:margin,y:top-h,width,height:h,color:fill,borderColor:border,borderWidth:.6});
 page.drawRectangle({x:0,y:height-144,width:595.28,height:144,color:ink});
 draw('JUMP PRESS',margin,height-34,11,bold,lime);draw(body.date,485,height-34,9,font,rgb(.8,.84,.76));
 draw('Rassegna stampa',margin,height-78,27,bold,rgb(1,1,1));draw('Juventus',margin,height-110,27,bold,lime);
 let top=height-163;
 const introLines=wrap(body.intro,11.5,width-48),introHeight=64+introLines.length*17;
 card(top,introHeight,paper);page.drawRectangle({x:margin,y:top-introHeight,width:4,height:introHeight,color:lime});
 draw('IL QUADRO DELLA GIORNATA',margin+(width-bold.widthOfTextAtSize('IL QUADRO DELLA GIORNATA',11))/2,top-28,11,bold,green);
 introLines.forEach((line,i)=>draw(line,margin+24,top-54-i*17,11.5));top-=introHeight+20;
 const a=analyseEdition(body);
 draw('I numeri dell’intera copertura',margin,top,11.5,bold);top-=15;
 [[a.examined,'Voci esaminate'],[a.selected,'Articoli selezionati'],[a.frontPages,'Prime pagine verificate']].forEach(([n,label],i)=>{const x=margin+i*174;page.drawRectangle({x,y:top-40,width:163,height:40,color:paper});draw(n??'—',x+12,top-19,17,bold);draw(label,x+12,top-32,7.5,font,grey);});top-=56;
 const logoMap={'Corriere dello Sport':'corriere-sport','La Gazzetta dello Sport':'gazzetta','La Stampa':'stampa','Tuttosport':'tuttosport'};
 const outlets=a.outlets||[],rows=Math.ceil(outlets.length/4),coverHeight=43+rows*31;
 card(top,coverHeight);
 draw('Juventus in prima pagina',margin+(width-bold.widthOfTextAtSize('Juventus in prima pagina',11))/2,top-22,11,bold);

 for(const [i,outlet] of outlets.entries()){
  const x=margin+16+(i%4)*121,baseline=top-52-Math.floor(i/4)*34;
  if(logoMap[outlet]){const logo=await pdf.embedPng(await readFile(process.cwd()+'/public/testate/pdf/'+logoMap[outlet]+'.png'));const factor=Math.min(90/logo.width,17/logo.height);page.drawImage(logo,{x:x+(105-logo.width*factor)/2,y:baseline-3,width:logo.width*factor,height:logo.height*factor});}
  else wrap(outlet,8,105).forEach((line,j)=>draw(line,x,baseline-j*10,8,bold));
 }
 top-=coverHeight+20;
 const colors=[lime,ink,rgb(.45,.45,.45),rgb(1,.54,0)],pointLines=(body.keyPoints||[]).map(p=>wrap(p,9.5,245));
 const analysisHeight=Math.max(224,67+pointLines.reduce((n,l)=>n+l.length*14+18,0));
 if(top-analysisHeight<54)throw Error('Prima pagina troppo lunga: rivedere sintesi e punti chiave.');
 card(top,analysisHeight);draw('I temi e i punti chiave',margin+18,top-27,15,bold);
 page.drawLine({start:{x:margin+207,y:top-47},end:{x:margin+207,y:top-analysisHeight+18},thickness:.6,color:border});
 const cx=margin+100,cy=top-96,r=37;
 a.themes.forEach((t,i)=>{const start=(t.start*3.6-90)*Math.PI/180,end=(t.end*3.6-90)*Math.PI/180;page.drawSvgPath('M 0 0 L '+r*Math.cos(start)+' '+r*Math.sin(start)+' A '+r+' '+r+' 0 '+(t.end-t.start>50?1:0)+' 1 '+r*Math.cos(end)+' '+r*Math.sin(end)+' Z',{x:cx,y:cy,color:colors[i%colors.length]});});
 page.drawCircle({x:cx,y:cy,size:27,color:rgb(1,1,1)});draw(a.selected,cx-12,cy-3,19,bold);draw('articoli',cx-13,cy-15,7,font,grey);
 a.themes.forEach((t,i)=>{const yy=top-153-i*16;page.drawCircle({x:margin+22,y:yy+3,size:2.5,color:colors[i%colors.length]});draw(t.label,margin+31,yy,8,font,grey);draw(t.count,margin+180,yy,8,bold);});
 let py=top-61;
 pointLines.forEach((paragraph,i)=>{draw(String(i+1).padStart(2,'0'),margin+224,py,10,bold,green);paragraph.forEach((line,j)=>draw(line,margin+246,py-j*14,9.5));py-=paragraph.length*14+18;});
}
