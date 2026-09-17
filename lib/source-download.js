import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {problem} from './github-store.js';
export const MAX_SOURCE_BYTES=200*1024*1024;
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
export async function downloadSource(value,date){
 const original=sourceUrl(value,date),dir=await mkdtemp(join(tmpdir(),'jump-source-'));
 try{
  const file=join(dir,'source.pdf'),headers=join(dir,'headers.txt');
  for(let attempt=0;attempt<2;attempt++){
   let target=original.url;
   try{
    for(let hop=0;hop<4;hop++){
     const {stdout}=await run(process.platform==='win32'?'curl.exe':'curl',['-q','--silent','--show-error','--proto','=https','--connect-timeout','10','--max-time','55','--max-filesize',String(MAX_SOURCE_BYTES),'-D',headers,'-o',file,'-w','%{http_code}',target],{timeout:58000,maxBuffer:4000});
     const status=Number(stdout.trim());
     if([301,302,303,307,308].includes(status)){
      const locations=[...(await readFile(headers,'utf8')).matchAll(/^location:\s*(.+)$/gim)];
      if(!locations.length)throw problem(502,'Redirect Ecostampa senza destinazione.');
      target=sourceUrl(new URL(locations.at(-1)[1].trim(),target).href,date).url;continue;
     }
     if(status!==200)throw problem(status>=500?503:422,'Download Ecostampa non riuscito (HTTP '+status+').');
     if((await stat(file)).size>MAX_SOURCE_BYTES)throw problem(413,'Originale oltre 200 MB.');
     const bytes=await readFile(file);
     if(bytes.subarray(0,5).toString()!=='%PDF-')throw problem(422,'Ecostampa ha restituito una pagina o un file diverso da un PDF.');
     return {bytes,name:original.name};
    }
    throw problem(422,'Troppi redirect Ecostampa.');
   }catch(error){
    if(attempt===0&&([6,7,28].includes(error.code)||error.status===503)){await new Promise(r=>setTimeout(r,3000));continue;}
    if(error.status)throw error;
    throw problem(502,'Download non riuscito: '+(error.code===6?'DNS non disponibile':error.code===28?'tempo scaduto':error.code===63?'file oltre 200 MB':'errore di rete o del downloader')+'. Nessuna bozza creata.');
   }
  }
 }finally{await rm(dir,{recursive:true,force:true});}
}
