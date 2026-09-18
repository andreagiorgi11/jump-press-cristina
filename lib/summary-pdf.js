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
 const heading=s=>{space(60);y-=8;page.drawRectangle({x:margin,y:y-4,width:lineWidth,height:23,color:lime});text(s,{size:13,strong:true,after:12});};
 next();text('Rassegna stampa Juventus',{size:25,strong:true,after:15});text(body.intro,{size:12,after:20});
 const a=analyseEdition(body);
 heading('I numeri dell’intera copertura');
 text(`${a.examined??'Non verificato'} voci esaminate  |  ${a.selected} articoli selezionati  |  ${a.frontPages??'Non verificato'} prime pagine verificate`,{strong:true});
 text(`${a.juventus??'Non verificato'} prime pagine con Juventus; ${a.frontPages===null?'non verificato':a.frontPages-a.juventus} senza Juventus. Sportivi italiani: ${a.sportsJuventus??'?'} su ${a.sports??'?'}.`);
 text('Dove la Juventus è in prima pagina: '+(a.outlets?.join(', ')||'Nessun richiamo verificato.'),{after:17});
 heading('Il peso dei temi di oggi');
 for(const t of a.themes){space(42);text(`${t.label} - ${t.count} articoli (${t.displayPercent}%)`,{strong:true,after:0});page.drawRectangle({x:margin,y:y-3,width:lineWidth*t.percent/100,height:5,color:lime});y-=16;}
 heading('Temi, parole e tono di oggi');
 text('Punti chiave',{strong:true});for(const p of body.keyPoints||[])text('- '+p);
 text('Toni prevalenti: '+(body.tones||[]).join(' · '),{strong:true});text(body.toneSummary||'');
 text('Peso delle notizie: 5 dominante, 4 molto rilevante, 3 rilevante, 2 secondaria, 1 marginale. Misura la rilevanza nella rassegna, non la qualità della testata o il tono.',{size:9,color:grey});
 next();
 for(const category of summarySections){
  const articles=body.articles.filter(a=>a.category===category);if(!articles.length)continue;
  heading(category+' - '+articles.length+' articoli');
  for(const article of articles){
   const needed=lines(article.title,15,bold).length*22+lines(article.summary,10.5,font).length*15.3+75;space(Math.min(needed,650));
   text(article.outlet+'  |  Peso '+article.rating+'/5',{size:9,strong:true,color:grey,after:6});
   text(article.title,{size:15,strong:true,after:5});if(article.author)text('di '+article.author,{size:9,color:grey,after:5});
   text(article.summary,{size:10.5,after:18});
  }
 }
 pdf.getPages().forEach((p,i)=>{p.drawLine({start:{x:margin,y:38},end:{x:width-margin,y:38},thickness:.5,color:grey});p.drawText('JUMP PRESS · '+body.date,{x:margin,y:24,size:8,font,color:grey});p.drawText(`${i+1} / ${pdf.getPageCount()}`,{x:width-margin-28,y:24,size:8,font,color:grey});});
 return pdf.save();
}
