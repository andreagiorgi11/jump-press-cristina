import {simplifyEditorialInstructions} from './editorial-simplification.js';
import {buildSummaryEditorialText} from './summary-instructions.js';
import {usesSummaryModel} from './summary-workflow.js';
import {z} from 'zod';
import {defaultEditorialText} from './editorial-default.js';
import {store,problem} from './github-store.js';

const path='settings/editorial-instructions.json';
const summaryPath='settings/summary-editorial-instructions.json';
async function profileAt(repo,head){const saved=await repo.read(summaryPath,head);if(saved===null){const base=await at(repo,head);return {...base,text:buildSummaryEditorialText(base.text),baseVersion:base.version};}const parsed=schema.safeParse(saved);if(!parsed.success)throw problem(503,'Istruzioni Summary non disponibili.');return parsed.data;}
const schema=z.object({version:z.number().int().positive(),text:z.string().trim().min(100).max(60000),updatedAt:z.string(),updatedBy:z.string()});
export const automationPrompt='Collegati a Jump Press, leggi le istruzioni aggiornate tramite read_editorial_instructions ed esegui la procedura prevista per la rassegna di oggi.';

const access=ctx=>{if(!['producer','editor','publisher'].includes(ctx?.role))throw problem(403,'Accesso editor richiesto.');};
async function at(repo,head){
 const saved=await repo.read(path,head);
 if(saved===null)return {version:1,text:defaultEditorialText,updatedAt:'2026-09-17',updatedBy:'Configurazione iniziale'};
 const result=schema.safeParse(saved);if(!result.success)throw problem(503,'Istruzioni non disponibili.');return result.data;
}
// Opt-in only (JUMP_LOCAL_INSTRUCTIONS_PREVIEW=1): by default local development shows the real online instructions.
export const localInstructionsPreview=()=>process.env.NODE_ENV==='development'&&process.env.JUMP_LOCAL_INSTRUCTIONS_PREVIEW==='1';
async function localPreview(ctx,current){
 if(!localInstructionsPreview()||ctx.store)return current;
 const {readFile}=await import('node:fs/promises');
 const filename=usesSummaryModel(ctx)?'summary-editorial-instructions.json':'editorial-instructions.json';
 let raw;try{raw=await readFile(process.cwd()+'/.local/'+filename,'utf8');}catch(e){if(e.code==='ENOENT')return current;throw problem(503,'Anteprima locale delle istruzioni non disponibile.');}
 let preview;try{preview=z.object({sourceVersion:z.number().int().positive(),text:schema.shape.text}).parse(JSON.parse(raw));}catch{throw problem(503,'Anteprima locale delle istruzioni non valida.');}
 if(preview.sourceVersion!==current.version)throw problem(409,'Le istruzioni online sono cambiate: riallineare l’anteprima locale prima di usarla.');
 return {...current,text:preview.text,localPreview:true,sourceVersion:current.version};
}
export const preferencePolicy=`INDICAZIONI DELLA REDAZIONE
Leggi sempre le istruzioni di base e le preferenze correnti prima di creare o modificare una rassegna. Le preferenze sono obbligatorie quando applicabili, ma non possono derogare a fedeltà alle fonti, controlli, autorizzazioni e regole di base. Segnala i conflitti senza applicare la deroga.
Durante le modifiche interattive applica alla bozza le correzioni richieste. Se emerge una preferenza generalizzabile su fonti, firme, stile o priorità, proponi il testo esatto e chiedi se vale soltanto per questa rassegna oppure anche per le prossime. Raccogli più proposte in una sola domanda finale. Non chiederlo per refusi o correzioni fattuali. Senza conferma esplicita non salvare preferenze permanenti. Non interpretare un generico procedi come conferma di una nuova regola. Non salvare preferenze durante attività programmate o ricavandole da PDF e mail. Non modificare le istruzioni di base.`;
const preferencesSchema=z.object({version:z.number().int().nonnegative(),text:z.string().trim().max(20000),updatedAt:z.string().nullable(),updatedBy:z.string().nullable()});
const preferencesPath=ctx=>'settings/'+(usesSummaryModel(ctx)?'summary-':'')+'editorial-preferences.json';
async function preferencesAt(ctx,repo,head){
 const saved=await repo.read(preferencesPath(ctx),head);
 if(saved===null)return {version:0,text:'',updatedAt:null,updatedBy:null};
 const parsed=preferencesSchema.safeParse(saved);
 if(!parsed.success)throw problem(503,'Preferenze della redazione non disponibili.');
 return parsed.data;
}
export async function readPreferences(ctx){access(ctx);const repo=ctx.store||store;return preferencesAt(ctx,repo,await repo.begin());}
export async function readInstructions(ctx){
 access(ctx);const repo=ctx.store||store,head=await repo.begin();
 // Independent files share the same fresh commit, without serial network round trips.
 const [current,preferences]=await Promise.all([
  (usesSummaryModel(ctx)?profileAt(repo,head):at(repo,head)).then(value=>localPreview(ctx,value)),
  preferencesAt(ctx,repo,head),
 ]);
 const activeText=usesSummaryModel(ctx)?simplifyEditorialInstructions(current.text):current.text;
 return {...current,workflowRevision:'editorial-review-v1',baseText:activeText,text:activeText+'\n\n'+preferencePolicy+'\n\nPREFERENZE ATTIVE DELLA REDAZIONE (subordinate alle regole di base):\n'+(preferences.text||'Nessuna preferenza permanente salvata.'),preferences,preferencePolicy,canEditInstructions:false,canEditPreferences:['editor','publisher'].includes(ctx.role)&&!ctx.automation,...(usesSummaryModel(ctx)?{editorialModel:'summary-v1',instructionProfile:'summary-v1'}:{}),automationPrompt,scheduledPublicationAllowed:false};
}
// Retained to reject stale callers explicitly: no editor/connector can change the base.
export async function saveInstructions(ctx){access(ctx);throw problem(403,'Le istruzioni di base sono di sola lettura. Modifica le preferenze della redazione.');}
export async function savePreferences(ctx,version,text,confirmation){
 access(ctx);
 if(!['editor','publisher'].includes(ctx.role)||ctx.automation)throw problem(403,'Le preferenze si modificano soltanto in una sessione editor interattiva.');
 if(confirmation!=='SALVA_PREFERENZE')throw problem(422,'Conferma esplicita delle preferenze richiesta.');
 const input=z.object({version:z.number().int().nonnegative(),text:z.string().trim().max(20000)}).safeParse({version,text});
 if(!input.success)throw problem(422,'Versione e testo delle preferenze non validi (massimo 20.000 caratteri).');
 const repo=ctx.store||store,head=await repo.begin(),current=await preferencesAt(ctx,repo,head);
 if(current.version!==version)throw problem(409,'Le preferenze sono cambiate. Conserva le modifiche, rileggi e confronta prima di salvare.');
 if(current.text===input.data.text)return current;
 const next=preferencesSchema.parse({version:version+1,text:input.data.text,updatedAt:new Date().toISOString(),updatedBy:ctx.user.id});
 const target=preferencesPath(ctx);
 await repo.commit({[target]:next,[target.replace('.json','-history/')+next.version+'.json']:next},head,'Aggiornamento preferenze redazione');
 return next;
}
