import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {passwordHash} from '../lib/passwords.js';
const destination=process.argv[2];if(!destination)throw Error('Indica un file fuori dal repository per la configurazione riservata.');
const output=resolve(destination),root=resolve('.');if(output===root||output.startsWith(root+'\\')||output.startsWith(root+'/'))throw Error('Il file deve restare fuori dal repository.');
const csrf=randomBytes(32).toString('hex'),origin='http://127.0.0.1:3017';let saved=false,busy=false;
const html='<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Credenziali Jump Press</title><style>body{font:17px system-ui;background:#f4f4f1;color:#202020;margin:32px auto;max-width:520px;padding:20px}label{display:block;margin:20px 0}input,button{box-sizing:border-box;width:100%;padding:14px;font:inherit}button{background:#141414;color:white;border:0;border-radius:8px}</style><h1>Accessi Jump Press</h1><p>Scegli una password da 14 a 256 caratteri. La password resta sul computer: verrà salvata solo la sua impronta protetta da trasferire nei segreti Vercel.</p><form method="post" action="/save"><input type="hidden" name="csrf" value="'+csrf+'"><h2>Utente editor</h2><label>Password<input type="password" name="password" autocomplete="new-password" minlength="14" maxlength="256" required></label><label>Ripeti password<input type="password" name="passwordConfirm" autocomplete="new-password" minlength="14" maxlength="256" required></label><button>Prepara accesso editor</button></form></html>';
const server=createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
 const reply=(status,text,type='text/plain; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type});res.end(text);};
 if(req.headers.host!=='127.0.0.1:3017')return reply(403,'Host non consentito.');
 if(req.method==='GET'&&req.url==='/')return reply(200,saved?'Configurazione salvata. Puoi chiudere questa scheda.':html,saved?'text/plain; charset=utf-8':'text/html; charset=utf-8');
 if(req.method!=='POST'||req.url!=='/save')return reply(404,'Non trovato.');
 if(req.headers.origin!==origin||saved||busy)return reply(403,'Operazione non disponibile.');
 busy=true;
 try{
 let body='';for await(const chunk of req){body+=chunk;if(body.length>6000){reply(413,'Richiesta troppo grande.');return;}}
 const fields=new URLSearchParams(body),supplied=Buffer.from(fields.get('csrf')||'');if(supplied.length!==csrf.length||!timingSafeEqual(supplied,Buffer.from(csrf)))return reply(403,'Richiesta non valida.');
 const password=fields.get('password');if(password!==fields.get('passwordConfirm'))return reply(400,'Le password devono corrispondere. Torna indietro e riprova.');
 const users=[{id:'editor',username:'editor',role:'publisher',passwordHash:await passwordHash(password)}];
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(users),{flag:'wx',mode:0o600});saved=true;reply(200,'Accessi preparati. Le password non sono state salvate. Codex può ora trasferire la configurazione protetta su Vercel.');
 }catch(e){reply(e.status===400?400:500,e.status===400?e.message:'Impossibile salvare. Nessuna password viene mostrata.');}finally{busy=false;}
});
server.listen(3017,'127.0.0.1',()=>console.log('Modulo riservato pronto: '+origin));
