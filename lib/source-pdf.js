import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {problem} from './github-store.js';
const require=createRequire(join(process.cwd(),'package.json'));
async function open(bytes){
 const canvas=await import('@napi-rs/canvas');
 for(const key of ['DOMMatrix','ImageData','Path2D'])if(!globalThis[key])globalThis[key]=canvas[key];
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const root=dirname(require.resolve('pdfjs-dist/package.json'));
 const task=pdfjs.getDocument({verbosity:0,data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,standardFontDataUrl:join(root,'standard_fonts').replaceAll('\\','/')+'/',cMapUrl:join(root,'cmaps').replaceAll('\\','/')+'/',cMapPacked:true,wasmUrl:join(root,'wasm').replaceAll('\\','/')+'/'}); const doc=await task.promise;
 if(doc.numPages>1000){await task.destroy();throw problem(413,'PDF oltre 1000 pagine.');}
 return {doc,canvas,task};
}
export async function extractSourceText(bytes){
 const {doc,task}=await open(bytes);
 try{
  const pages=[];let totalCharacters=0;const started=Date.now();
  for(let number=1;number<=doc.numPages;number++){
   if(Date.now()-started>180000)throw problem(422,'Estrazione troppo lunga: fonte non preparata completamente, nessuna bozza creata.');
   const page=await doc.getPage(number),content=await page.getTextContent();
   const text=content.items.map(x=>(x.str||'')+(x.hasEOL?'\n':' ')).join('').replace(/\x00/g,'').trim();
   totalCharacters+=text.length;
   if(totalCharacters>8_000_000)throw problem(413,'Testo estratto oltre il limite di elaborazione.');
   pages.push({page:number,text,characters:text.length,needsVisualCheck:text.length<40});page.cleanup();
  }
  return {pageCount:doc.numPages,totalCharacters,pagesWithLittleText:pages.filter(p=>p.needsVisualCheck).map(p=>p.page),pages};
 }finally{await task.destroy();}
}
export async function renderSourcePage(bytes,number){
 const {doc,canvas,task}=await open(bytes);
 try{
  if(!Number.isInteger(number)||number<1||number>doc.numPages)throw problem(400,'Pagina fuori intervallo.');
  const page=await doc.getPage(number),base=page.getViewport({scale:1}),scale=Math.min(2.5,2200/Math.max(base.width,base.height)),viewport=page.getViewport({scale});
  const surface=canvas.createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  await page.render({canvasContext:surface.getContext('2d'),viewport}).promise;
  return {page:number,mimeType:'image/jpeg',data:surface.toBuffer('image/jpeg',85).toString('base64')};
 }finally{await task.destroy();}
}


