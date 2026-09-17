import {z} from 'zod';
import {defaultEditorialText} from './editorial-default.js';
import {store,problem} from './github-store.js';

const path='settings/editorial-instructions.json';
const schema=z.object({version:z.number().int().positive(),text:z.string().trim().min(100).max(60000),updatedAt:z.string(),updatedBy:z.string()});
export const automationPrompt='Ogni giorno alle 7:45, fuso Europe/Rome, esegui la rassegna Juventus. Prima di iniziare leggi le istruzioni aggiornate con read_editorial_instructions tramite il collegamento MCP Jump Press e applicale. Recupera la mail Ecostampa e il PDF completo del giorno dalla casella già collegata indicata nelle istruzioni. Usa il nuovo MCP Jump Press per tutte le operazioni sull’app. Salva su Jump Press esclusivamente una bozza, senza duplicare rassegne della stessa data e senza sovrascrivere modifiche degli editor. Usa un collegamento MCP con soli permessi di bozza. Non pubblicare, non modificare le istruzioni e non fare deploy. Consegna il link alla bozza e il testo richiesto dalle istruzioni. Se una fonte, le istruzioni o uno strumento non sono accessibili, segnala il problema e fermati senza inventare contenuti. Aggiorna l’attività esistente «Rassegna stampa Juventus», se presente, evitando duplicati.';
const access=ctx=>{if(!['producer','editor','publisher'].includes(ctx?.role))throw problem(403,'Accesso editor richiesto.');};
async function at(repo,head){
 const saved=await repo.read(path,head);
 if(saved===null)return {version:1,text:defaultEditorialText,updatedAt:'2026-09-17',updatedBy:'Configurazione iniziale'};
 const result=schema.safeParse(saved);if(!result.success)throw problem(503,'Istruzioni non disponibili.');return result.data;
}
export async function readInstructions(ctx){access(ctx);const repo=ctx.store||store;return {...await at(repo,await repo.begin()),automationPrompt,scheduledPublicationAllowed:false};}
export async function saveInstructions(ctx,version,text){
 access(ctx);if(ctx.role==='producer')throw problem(403,'L’automatismo può leggere le istruzioni, non modificarle.');
 const repo=ctx.store||store,head=await repo.begin(),current=await at(repo,head);
 if(current.version!==version)throw problem(409,'Le istruzioni sono cambiate. Copia le tue modifiche, poi ricarica la versione corrente.');
 const next=schema.parse({version:version+1,text,updatedAt:new Date().toISOString(),updatedBy:ctx.user.id});
 if(next.text===current.text)return {...current,automationPrompt,scheduledPublicationAllowed:false};
 await repo.commit({[path]:next,['settings/editorial-history/'+next.version+'.json']:next},head,'Aggiornamento istruzioni rassegna');
 return {...next,automationPrompt,scheduledPublicationAllowed:false};
}
