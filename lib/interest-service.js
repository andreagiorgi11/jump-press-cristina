import {z} from 'zod';
import {readPreferences,savePreferences} from './editorial-instructions.js';
import {splitInterestList,mergeInterestList} from './interest-list.js';
const field=z.string().trim().min(1).max(160).refine(v=>!/[\r\n]| — |<!--|-->/.test(v),'Nome e ruolo devono essere su una sola riga, senza separatori.');
const inputSchema=z.object({version:z.number().int().nonnegative(),entries:z.array(z.object({name:field,role:field,kind:z.enum(['journalist','subject'])})).max(100)});
const result=(ctx,prefs)=>({version:prefs.version,entries:splitInterestList(prefs.text).entries,updatedAt:prefs.updatedAt,canEdit:['editor','publisher'].includes(ctx.role)&&!ctx.automation});
export async function readInterests(ctx){return result(ctx,await readPreferences(ctx));}
export async function saveInterests(ctx,input){
 if(!['editor','publisher'].includes(ctx.role)||ctx.automation)throw Object.assign(Error('La lista si modifica soltanto da una sessione editor.'),{status:403});
 const parsed=inputSchema.safeParse(input);if(!parsed.success)throw Object.assign(Error('Compila nome completo, ruolo e gruppo di ogni voce (massimo 100 voci).'),{status:422});
 const {version,entries}=parsed.data;
 const keys=entries.map(e=>e.kind+':'+e.name.normalize('NFC').toLocaleLowerCase('it-IT'));
 if(new Set(keys).size!==keys.length)throw Object.assign(Error('Lo stesso nome compare più volte nello stesso gruppo.'),{status:422});
 const current=await readPreferences(ctx);
 if(current.version!==version)throw Object.assign(Error('L’elenco o le preferenze sono cambiati. Le tue modifiche restano qui: copia il testo che vuoi conservare prima di ricaricare la versione salvata.'),{status:409});
 const saved=await savePreferences(ctx,version,mergeInterestList(current.text,entries),'SALVA_PREFERENZE');
 return result(ctx,saved);
}
