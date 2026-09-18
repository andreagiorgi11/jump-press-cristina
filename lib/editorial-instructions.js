import {z} from 'zod';
import {defaultEditorialText} from './editorial-default.js';
import {store,problem} from './github-store.js';

const path='settings/editorial-instructions.json';
const schema=z.object({version:z.number().int().positive(),text:z.string().trim().min(100).max(60000),updatedAt:z.string(),updatedBy:z.string()});
export const automationPrompt='Collegati a Jump Press, leggi le istruzioni aggiornate tramite read_editorial_instructions ed esegui la procedura prevista per la rassegna di oggi.';

const access=ctx=>{if(!['producer','editor','publisher'].includes(ctx?.role))throw problem(403,'Accesso editor richiesto.');};
async function at(repo,head){
 const saved=await repo.read(path,head);
 if(saved===null)return {version:1,text:defaultEditorialText,updatedAt:'2026-09-17',updatedBy:'Configurazione iniziale'};
 const result=schema.safeParse(saved);if(!result.success)throw problem(503,'Istruzioni non disponibili.');return result.data;
}
async function localPreview(ctx,current){
 if(process.env.NODE_ENV!=='development'||ctx.store)return current;
 const {readFile}=await import('node:fs/promises');
 let raw;try{raw=await readFile(process.cwd()+'/.local/editorial-instructions.json','utf8');}catch(e){if(e.code==='ENOENT')return current;throw problem(503,'Anteprima locale delle istruzioni non disponibile.');}
 let preview;try{preview=z.object({sourceVersion:z.number().int().positive(),text:schema.shape.text}).parse(JSON.parse(raw));}catch{throw problem(503,'Anteprima locale delle istruzioni non valida.');}
 if(preview.sourceVersion!==current.version)throw problem(409,'Le istruzioni online sono cambiate: riallineare l’anteprima locale prima di usarla.');
 return {...current,text:preview.text,localPreview:true,sourceVersion:current.version};
}
export async function readInstructions(ctx){access(ctx);const repo=ctx.store||store;const current=await localPreview(ctx,await at(repo,await repo.begin()));return {...current,automationPrompt,scheduledPublicationAllowed:false};}
export async function saveInstructions(ctx,version,text){
 access(ctx);if(ctx.role==='producer')throw problem(403,'L’automatismo può leggere le istruzioni, non modificarle.');
 const repo=ctx.store||store,head=await repo.begin(),current=await at(repo,head);
 if((await localPreview(ctx,current)).localPreview)throw problem(409,'Anteprima locale attiva: salvataggio online delle istruzioni disabilitato in questo ambiente.');
 if(current.version!==version)throw problem(409,'Le istruzioni sono cambiate. Copia le tue modifiche, poi ricarica la versione corrente.');
 const next=schema.parse({version:version+1,text,updatedAt:new Date().toISOString(),updatedBy:ctx.user.id});
 if(next.text===current.text)return {...current,automationPrompt,scheduledPublicationAllowed:false};
 await repo.commit({[path]:next,['settings/editorial-history/'+next.version+'.json']:next},head,'Aggiornamento istruzioni rassegna');
 return {...next,automationPrompt,scheduledPublicationAllowed:false};
}
