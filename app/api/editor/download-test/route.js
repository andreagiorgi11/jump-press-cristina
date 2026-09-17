import {requireEditor} from '../../../../lib/server-client';
import {sameOrigin,failure} from '../../../../lib/errors';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {extractSourceText,renderSourcePage} from '../../../../lib/source-pdf.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
const run=promisify(execFile);
const url='https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260917_16377886.pdf';
const limit=150*1024*1024;
export async function POST(request){
 let dir,stage='auth';const started=Date.now();
 try{
  sameOrigin(request);const {role}=await requireEditor(request);
  if(role!=='publisher')throw Object.assign(Error('Accesso publisher richiesto.'),{status:403});
  if(Date.now()>Date.parse('2026-09-19T00:00:00Z'))throw Object.assign(Error('Prova diagnostica scaduta.'),{status:410});
  stage='download';
  let result={runtime:process.env.VERCEL?'vercel':'local',region:process.env.VERCEL_REGION||null,file:'PP_RAS_1626482_20260917_16377886.pdf'};
  dir=await mkdtemp(join(tmpdir(),'jump-download-test-'));const file=join(dir,'source.pdf');let bytes;
  try{
   const version=await run('curl',['--version'],{timeout:3000,maxBuffer:4000});result.method='curl';result.client=version.stdout.split('\n')[0];
  }catch(e){if(e.code!=='ENOENT')throw e;result.method='node-fetch';result.curlAvailable=false;}
  if(result.method==='curl'){
   try{
    const r=await run('curl',['-q','-L','--fail','--silent','--show-error','--proto','=https','--proto-redir','=https','--max-redirs','3','--connect-timeout','10','--max-time','40','--max-filesize',String(limit),'-o',file,'-w','%{http_code}',url],{timeout:43000,maxBuffer:8000});
    result.httpStatus=Number(r.stdout.trim());result.exitCode=0;
   }catch(e){result.httpStatus=Number((e.stdout||'').trim())||0;result.exitCode=typeof e.code==='number'?e.code:null;result.error=String(e.stderr||e.message).slice(0,1200);return Response.json({...result,ok:false,elapsedMs:Date.now()-started},{headers:{'Cache-Control':'no-store'}});}
   if((await stat(file)).size>limit)throw Error('PDF oltre il limite diagnostico');bytes=await readFile(file);
  }else{
   const signal=AbortSignal.timeout(40000);let target=url,response;
   for(let n=0;n<4;n++){
    response=await fetch(target,{redirect:'manual',signal,cache:'no-store'});
    if(![301,302,303,307,308].includes(response.status))break;
    const next=new URL(response.headers.get('location'),target);await response.body?.cancel();
    if(next.protocol!=='https:'||next.hostname!=='rassegna.dominiocliente.it'||next.port)throw Error('Redirect non consentito nella prova');target=next.href;
   }
   result.httpStatus=response.status;
   if(!response.ok){await response.body?.cancel();return Response.json({...result,ok:false,error:'Il server ha rifiutato la richiesta',elapsedMs:Date.now()-started},{headers:{'Cache-Control':'no-store'}});}
   const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw Error('PDF oltre il limite diagnostico');chunks.push(chunk);}bytes=Buffer.concat(chunks);
  }
  result.bytes=bytes.length;result.pdfSignature=bytes.subarray(0,5).toString()==='%PDF-';
  if(!result.pdfSignature)return Response.json({...result,ok:false,error:'La risposta non è un PDF'},{headers:{'Cache-Control':'no-store'}});
  stage='pdf-validation';result.sha256=createHash('sha256').update(bytes).digest('hex');result.pages=(await PDFDocument.load(bytes)).getPageCount();
  stage='text-extraction';
  const text=await extractSourceText(bytes);result.textPages=text.pages.length;result.extractedCharacters=text.totalCharacters;result.pagesWithLittleText=text.pagesWithLittleText;
  stage='page-render';const preview=await renderSourcePage(bytes,10);result.preview='data:'+preview.mimeType+';base64,'+preview.data;
  return Response.json({...result,ok:true,elapsedMs:Date.now()-started},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(stage==='auth')return failure(e);return Response.json({ok:false,stage,errorType:e.name,error:String(e.message).replace(/https?:\/\/\S+/g,'[URL]').slice(0,700)},{status:502,headers:{'Cache-Control':'no-store'}});}finally{if(dir)await rm(dir,{recursive:true,force:true});}
}
