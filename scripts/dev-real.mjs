import {spawn} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
// Local site on REAL data, configured like the jump-press-approvazione production project.
// Credentials are read in place (never copied into this repository): JUMP_REAL_ENV_FILE or the
// Dropbox copy below. Everything saved or confirmed here is saved or published for real.
const envFile=process.env.JUMP_REAL_ENV_FILE||'C:/Users/Andrea/Dropbox/Andrea/AG Studio/Clienti e collaborazioni/Cristina Guerri/Progetti/CG creator/jump-press-rassegna-stampa/.env.local';
if(!existsSync(envFile))throw Error('Credenziali reali non trovate: impostare JUMP_REAL_ENV_FILE.');
for(const file of ['.env','.env.local','.env.development','.env.development.local'])if(existsSync(file))throw Error('Rimuovere '+file+': la configurazione reale si legge soltanto da JUMP_REAL_ENV_FILE.');
const bs=String.fromCharCode(92),env={...process.env};
for(const line of readFileSync(envFile,'utf8').split(/\r?\n/)){
 const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(!m)continue;
 let v=m[2].trim();
 // dotenv syntax: single quotes are literal apart from the escaped dollar; double quotes are JSON-like.
 if(v.startsWith("'")&&v.endsWith("'"))v=v.slice(1,-1).split(bs+'$').join('$');
 else if(v.startsWith('"')&&v.endsWith('"'))v=JSON.parse(v);
 env[m[1]]=v;
}
// Same switches as production: approval layout and summary-v1 instructions profile.
Object.assign(env,{JUMP_SITE:'press',JUMP_PUBLIC_URL:'http://127.0.0.1:3019',JUMP_APPROVAL_LIVE:'1',NEXT_PUBLIC_JUMP_APPROVAL_LIVE:'1',JUMP_EDITORIAL_MODEL:'summary-v1'});
for(const key of ['JUMP_SUMMARY_SANDBOX','JUMP_LOCAL_INSTRUCTIONS_PREVIEW'])delete env[key];
console.log('Jump Press locale su DATI REALI: http://127.0.0.1:3019 (salvataggi e pubblicazioni sono reali)');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3019'],{stdio:'inherit',env});
child.on('exit',code=>process.exit(code??1));
