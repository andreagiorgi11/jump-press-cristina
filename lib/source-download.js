import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {problem} from './github-store.js';
export const MAX_SOURCE_BYTES=200*1024*1024;
// The import runs inside the MCP function (maxDuration 300 s): waiting must leave time for download and extraction.
export const SOURCE_WAIT_MS=120000,SOURCE_POLL_MS=15000;
const run=promisify(execFile);
// Only the known Ecostampa document endpoints, never an arbitrary URL fetcher.
export function sourceUrl(value,date){
 if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date))throw problem(400,'Data della fonte non valida.');
 let u;try{u=new URL(value);}catch{throw problem(400,'URL Ecostampa non valido.');}
 if(u.protocol!=='https:'||u.hostname!=='rassegna.dominiocliente.it'||u.port||u.username||u.password||u.hash)throw problem(400,'Dominio o protocollo della fonte non consentito.');
 let name;
 if(u.pathname==='/Areas/Rassegna/Elab/CheckedDownload.aspx'&&[...u.searchParams.keys()].length===1)name=u.searchParams.get('nome_file');
 else if(u.pathname.startsWith('/rasimg/pdf_rs/clienti/')&&!u.search)name=u.pathname.slice('/rasimg/pdf_rs/clienti/'.length);
 if(!/^PP_RAS_\d+_\d{8}_\d+\.pdf$/.test(name||''))throw problem(400,'Percorso PDF Ecostampa non consentito.');
 if(date&&name.split('_')[3]!==date.replaceAll('-',''))throw problem(400,'La data nel nome del PDF non coincide con la data richiesta.');
 return {url:u.href,name};
}
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&egrave;/g,'è').replace(/&ugrave;/g,'ù').replace(/&agrave;/g,'à').replace(/&#39;|&rsquo;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
// CheckedDownload.aspx answers HTTP 200 with an HTML page ("Ricontrolla") while the PDF is not available.
// The page text is untrusted: only a short excerpt is kept for diagnostics.
export function checkPage(html){
 const label=html.match(/id="ctl00_body_lblMessaggio"[^>]*>([\s\S]*?)<\/span>/i);
 const message=label?plain(label[1]).slice(0,200):'';
 const known=Boolean(label)||/id="ctl00_body_divRiprova"/i.test(html);
 const gone=/pi[uù] presente|scadut|rimoss|eliminat/i.test(message);
 const link=html.match(/\/rasimg\/pdf_rs\/clienti\/PP_RAS_\d+_\d{8}_\d+\.pdf/)?.[0]||null;
 const title=plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 return {known,gone,message,link,excerpt:(message||title||plain(html)).slice(0,160)};
}
async function curlOnce(target,dir){
 const file=join(dir,'source.pdf'),headers=join(dir,'headers.txt');
 const {stdout}=await run(process.platform==='win32'?'curl.exe':'curl',['-q','--silent','--show-error','--proto','=https','--connect-timeout','10','--max-time','55','--max-filesize',String(MAX_SOURCE_BYTES),'-D',headers,'-o',file,'-w','%{http_code}',target],{timeout:58000,maxBuffer:4000});
 const status=Number(stdout.trim());
 if([301,302,303,307,308].includes(status)){const locations=[...(await readFile(headers,'utf8')).matchAll(/^location:\s*(.+)$/gim)];return {status,location:locations.length?locations.at(-1)[1].trim():null};}
 if(status!==200)return {status};
 if((await stat(file)).size>MAX_SOURCE_BYTES)throw problem(413,'Originale oltre 200 MB.');
 return {status,bytes:await readFile(file)};
}
// One request chain: follows HTTP redirects and a PDF link embedded in the check page, all revalidated.
async function fetchChain(url,date,dir,fetchOnce){
 let target=url;
 for(let hop=0;hop<4;hop++){
  const response=await fetchOnce(target,dir);
  if(response.location!==undefined){
   if(!response.location)throw problem(502,'Redirect Ecostampa senza destinazione.');
   target=sourceUrl(new URL(response.location,target).href,date).url;continue;
  }
  if(response.status!==200)throw problem(response.status>=500?503:422,'Download Ecostampa non riuscito (HTTP '+response.status+').');
  if(response.bytes.subarray(0,5).toString()==='%PDF-')return {bytes:response.bytes};
  const page=checkPage(response.bytes.subarray(0,200000).toString('utf8'));
  if(page.link&&!target.includes(page.link)){target=sourceUrl(new URL(page.link,target).href,date).url;continue;}
  return {page};
 }
 throw problem(422,'Troppi redirect Ecostampa.');
}
export async function downloadSource(value,date,{fetchOnce=curlOnce,sleep=ms=>new Promise(r=>setTimeout(r,ms)),waitMs=SOURCE_WAIT_MS,pollMs=SOURCE_POLL_MS,now=Date.now}={}){
 const original=sourceUrl(value,date),dir=await mkdtemp(join(tmpdir(),'jump-source-'));
 try{
  const deadline=now()+waitMs;let networkRetry=true,checks=0;
  for(;;){
   let result;
   try{result=await fetchChain(original.url,date,dir,fetchOnce);}
   catch(error){
    if(networkRetry&&([6,7,28].includes(error.code)||error.status===503)){networkRetry=false;await sleep(3000);continue;}
    if(error.status)throw error;
    throw problem(502,'Download non riuscito: '+(error.code===6?'DNS non disponibile':error.code===28?'tempo scaduto':error.code===63?'file oltre 200 MB':'errore di rete o del downloader')+'. Nessuna bozza creata.');
   }
   if(result.bytes)return {bytes:result.bytes,name:original.name};
   const page=result.page;checks++;
   if(!page.known)throw problem(422,'Ecostampa ha restituito una pagina diversa da un PDF e dalla pagina di controllo attesa (estratto: «'+page.excerpt+'»). Nessuna bozza creata.');
   if(page.gone)throw problem(410,'Ecostampa segnala: «'+page.message+'». Il link non è più valido: serve quello dell\'ultima mail. Nessuna bozza creata.');
   if(now()+pollMs>deadline)throw problem(422,'PDF Ecostampa non ancora disponibile dopo '+checks+' controlli in '+Math.round(waitMs/1000)+' secondi'+(page.message?' (messaggio Ecostampa: «'+page.message+'»)':'')+'. Probabilmente è ancora in preparazione: riprova l\'importazione con retry tra qualche minuto. Nessuna bozza creata.');
   await sleep(pollMs);
  }
 }finally{await rm(dir,{recursive:true,force:true});}
}
