import {requireEditor} from '../../../../lib/server-client';
import {readInstructions} from '../../../../lib/editorial-instructions';
import {failure,sameOrigin} from '../../../../lib/errors';
import {createHash} from 'node:crypto';
const revision=text=>createHash('sha256').update(text).digest('hex');
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request){try{const {db}=await requireEditor(request);return Response.json(await editableInstructions(db),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}

async function editableInstructions(db){const data=await readInstructions(db);return {...data,localEditable:process.env.NODE_ENV==='development'&&['editor','publisher'].includes(db.role),localRevision:revision(data.text)};}
export async function POST(request){
 try{
  if(process.env.NODE_ENV!=='development')return Response.json({error:'Modifica disponibile solo in locale.'},{status:404});
  sameOrigin(request);const {db}=await requireEditor(request);
  if(!['editor','publisher'].includes(db.role))return Response.json({error:'Accesso editor richiesto.'},{status:403});
  const input=await request.json(),current=await readInstructions(db);
  if(input.localRevision!==revision(current.text))return Response.json({error:'Il testo è cambiato. Conserva le modifiche prima di ricaricare.'},{status:409});
  if(typeof input.text!=='string'||input.text.trim().length<100||input.text.length>60000)return Response.json({error:'Testo richiesto: da 100 a 60.000 caratteri.'},{status:400});
  const {mkdir,writeFile,rename}=await import('node:fs/promises');
  const dir=process.cwd()+'/.local',file=dir+'/'+(current.editorialModel==='summary-v1'?'summary-editorial-instructions.json':'editorial-instructions.json');
  await mkdir(dir,{recursive:true});await writeFile(file+'.tmp',JSON.stringify({sourceVersion:current.version,text:input.text}));await rename(file+'.tmp',file);
  return Response.json(await editableInstructions(db),{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return failure(e);}
}
