// Jump Press private file store (Hetzner). Keeps originals, extracted text and clips on local disk
// and cuts pages next to the file, so the site never downloads a whole 100+ MB source to read one page.
// Every call needs the shared secret, except short-lived HMAC-signed links (clip viewing, client uploads).
import {createServer} from 'node:http';
import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {createReadStream,createWriteStream,existsSync} from 'node:fs';
import {mkdir,rename,rm,stat,readdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join,relative,sep} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pipeline} from 'node:stream/promises';

const run=promisify(execFile);
const ROOT=process.env.FILES_ROOT||'/opt/jump-press-files/data';
const SECRET=process.env.FILES_SECRET||'';
const PORT=Number(process.env.PORT||3320),HOST=process.env.HOST||'127.0.0.1';
const MAX_ORIGINAL=200*1024*1024,MAX_UPLOAD=50*1024*1024,MAX_TEXT=32*1024*1024;
if(SECRET.length<32)throw Error('FILES_SECRET mancante o troppo corto.');

const types={'.pdf':'application/pdf','.json':'application/json'};
const typeOf=path=>types[path.slice(path.lastIndexOf('.'))]||'application/octet-stream';
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
// Same path grammar as the site: jump/imports/<uuid>/original.pdf, jump/<draft>/<clip>.pdf ...
function resolvePath(path){
 if(typeof path!=='string'||!/^jump\/[A-Za-z0-9._\-/]{1,300}$/.test(path)||path.split('/').some(s=>!s||s==='.'||s==='..'))throw new HttpError(400,'Percorso non valido.');
 const full=join(ROOT,...path.split('/'));
 if(!full.startsWith(join(ROOT)+sep))throw new HttpError(400,'Percorso non valido.');
 return full;
}
const sign=(op,path,exp,max='')=>createHmac('sha256',SECRET).update([op,path,exp,max].join('\n')).digest('base64url');
function sameSecret(value){const a=Buffer.from(String(value||'')),b=Buffer.from(SECRET);return a.length===b.length&&timingSafeEqual(a,b);}
function checkSignature(op,path,url){
 const exp=url.searchParams.get('exp'),max=url.searchParams.get('max')||'',sig=url.searchParams.get('sig')||'';
 if(!/^\d{10,13}$/.test(exp||'')||Number(exp)<Date.now())throw new HttpError(403,'Link scaduto.');
 const expected=Buffer.from(sign(op,path,exp,max)),given=Buffer.from(sig);
 if(expected.length!==given.length||!timingSafeEqual(expected,given))throw new HttpError(403,'Link non valido.');
 return max?Number(max):null;
}

// Streams the body to a temporary file; the final name appears only when complete (no partial files).
async function receive(req,full,{limit,overwrite=false,pdf=false}){
 if(!overwrite&&existsSync(full))throw new HttpError(409,'File già presente.');
 const declared=Number(req.headers['content-length']||0);if(declared>limit)throw new HttpError(413,'File oltre il limite.');
 await mkdir(dirname(full),{recursive:true});
 const tmp=full+'.'+randomUUID()+'.part';let size=0;
 try{
  const counter=async function*(source){for await(const chunk of source){size+=chunk.length;if(size>limit)throw new HttpError(413,'File oltre il limite.');yield chunk;}};
  await pipeline(req,counter,createWriteStream(tmp,{flags:'wx'}));
  if(pdf){const head=Buffer.alloc(5);const fh=await import('node:fs/promises').then(m=>m.open(tmp));try{await fh.read(head,0,5,0);}finally{await fh.close();}if(head.toString()!=='%PDF-')throw new HttpError(400,'PDF non valido.');}
  if(!overwrite&&existsSync(full))throw new HttpError(409,'File già presente.');
  await rename(tmp,full);return size;
 }catch(e){await rm(tmp,{force:true});throw e;}
}
async function send(res,full,{download=false,name,cors=false}={}){
 const info=await stat(full).catch(()=>null);if(!info?.isFile())throw new HttpError(404,'File non trovato.');
 // Signed links are read by the in-page PDF viewer (fetch): the signature, not the origin, grants access.
 res.writeHead(200,{...(cors?{'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'Content-Length'}:{}),'Content-Type':typeOf(full),'Content-Length':info.size,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(name?{'Content-Disposition':(download?'attachment':'inline')+'; filename="'+name.replace(/[^\w.\- ]/g,'_')+'"'}:{})});
 await pipeline(createReadStream(full),res);
}

// Pages are cut with qpdf (streaming, low memory even on 180 MB sources); pdf-lib only if qpdf is absent.
let hasQpdf=null;
async function qpdfAvailable(){if(hasQpdf===null){try{await run('qpdf',['--version']);hasQpdf=true;}catch{hasQpdf=false;}}return hasQpdf;}
async function cutPages(source,pages,target){
 if(!Array.isArray(pages)||!pages.length||pages.length>100||pages.some(p=>!Number.isInteger(p)||p<1||p>5000))throw new HttpError(400,'Pagine non valide.');
 if(!existsSync(source))throw new HttpError(404,'Originale non trovato.');
 await mkdir(dirname(target),{recursive:true});const tmp=target+'.'+randomUUID()+'.part';
 try{
  if(await qpdfAvailable()){
   try{await run('qpdf',['--empty','--pages',source,pages.join(','),'--',tmp],{timeout:120000});}
   catch(e){if(e.code===3){/* warnings only: output is valid */}else throw new HttpError(/range|page/i.test(String(e.stderr))?400:500,'Estrazione pagine non riuscita.');}
  }else{
   const {PDFDocument}=await import('pdf-lib');const input=await PDFDocument.load(await readFile(source),{ignoreEncryption:true});
   if(pages.some(p=>p>input.getPageCount()))throw new HttpError(400,'Pagina fuori intervallo.');
   const out=await PDFDocument.create();for(const p of await out.copyPages(input,pages.map(p=>p-1)))out.addPage(p);await writeFile(tmp,await out.save());
  }
  return tmp;
 }catch(e){await rm(tmp,{force:true});throw e;}
}
async function inventory(){
 const files=[];
 async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true}).catch(()=>[])){if(entry.name.startsWith(".")){continue;}const full=join(dir,entry.name);if(entry.isDirectory())await walk(full);else if(!entry.name.endsWith('.part')){const info=await stat(full);files.push({pathname:relative(ROOT,full).split(sep).join('/'),size:info.size});}}}
 await walk(ROOT);return files;
}
async function json(req,limit=64*1024){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>limit)throw new HttpError(413,'Richiesta troppo grande.');chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new HttpError(400,'JSON non valido.');}}
const reply=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};

async function handle(req,res){
 const url=new URL(req.url,'http://files');const [,area,...rest]=url.pathname.split('/');const path=decodeURIComponent(rest.join('/'));
 if(req.method==='GET'&&url.pathname==='/health')return reply(res,200,{ok:true,qpdf:await qpdfAvailable()});
 // Signed links: no secret on the client, bound to operation, path, expiry (and size for uploads).
 if(area==='s'){
  const full=resolvePath(path);
  if(req.method==='GET'){checkSignature('get',path,url);return send(res,full,{name:path.split('/').pop(),cors:true});}
  if(req.method==='PUT'){const max=checkSignature('put',path,url);if(!path.endsWith('.pdf'))throw new HttpError(400,'Solo PDF.');const size=await receive(req,full,{limit:Math.min(max||MAX_UPLOAD,MAX_UPLOAD),pdf:true});return reply(res,200,{pathname:path,size});}
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'PUT, GET, HEAD','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'});return res.end();}
  throw new HttpError(405,'Metodo non consentito.');
 }
 if(!sameSecret((req.headers.authorization||'').replace(/^Bearer\s+/i,'')))throw new HttpError(401,'Non autorizzato.');
 if(area==='o'){
  const full=resolvePath(path);
  if(req.method==='GET')return send(res,full);
  if(req.method==='HEAD'){const info=await stat(full).catch(()=>null);if(!info?.isFile())throw new HttpError(404,'File non trovato.');res.writeHead(200,{'Content-Type':typeOf(full),'Content-Length':info.size});return res.end();}
  if(req.method==='PUT'){const original=/\/original\.pdf$/.test(path),text=path.endsWith('.json');const size=await receive(req,full,{limit:original?MAX_ORIGINAL:text?MAX_TEXT:MAX_UPLOAD,pdf:path.endsWith('.pdf')});return reply(res,200,{pathname:path,size});}
  if(req.method==='DELETE'){await rm(full,{force:true});return reply(res,200,{deleted:path});}
  throw new HttpError(405,'Metodo non consentito.');
 }
 if(req.method==='POST'&&url.pathname==='/pages'){
  const {path:src,pages}=await json(req),tmp=await cutPages(resolvePath(src),pages,join(ROOT,'.tmp','pages-'+randomUUID()+'.pdf'));
  try{const info=await stat(tmp);res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':info.size,'Cache-Control':'no-store'});await pipeline(createReadStream(tmp),res);}finally{await rm(tmp,{force:true});}
  return;
 }
 if(req.method==='POST'&&url.pathname==='/clip'){
  const {source,pages,dest}=await json(req),target=resolvePath(dest);
  if(!dest.endsWith('.pdf'))throw new HttpError(400,'Il ritaglio deve essere un PDF.');if(existsSync(target))throw new HttpError(409,'File già presente.');
  const tmp=await cutPages(resolvePath(source),pages,target),info=await stat(tmp);
  if(info.size>MAX_UPLOAD){await rm(tmp,{force:true});throw new HttpError(413,'Ritaglio oltre 50 MB: seleziona meno pagine.');}
  await rename(tmp,target);return reply(res,200,{pathname:dest,size:info.size});
 }
 if(req.method==='GET'&&url.pathname==='/list')return reply(res,200,{blobs:await inventory()});
 throw new HttpError(404,'Risorsa non trovata.');
}

createServer((req,res)=>{handle(req,res).catch(e=>{const status=e.status||500;if(status>=500)console.error('[jump-press-files]',req.method,req.url?.split('?')[0],e.message);if(!res.headersSent)reply(res,status,{error:status<500?e.message:'Errore interno.'});else res.destroy();});})
 .listen(PORT,HOST,()=>console.log('jump-press-files su '+HOST+':'+PORT+' root '+ROOT));
