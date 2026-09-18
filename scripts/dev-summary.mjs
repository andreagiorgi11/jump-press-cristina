import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
// This sandbox must never inherit production credentials or env files.
for(const file of ['.env','.env.local','.env.development','.env.development.local'])if(existsSync(file))throw Error('Summary: rimuovere la configurazione esterna '+file+' prima di avviare.');
const env={...process.env,JUMP_SUMMARY_SANDBOX:'1',JUMP_SITE:'press'};
for(const key of Object.keys(env))if(/^(JUMP_(?!SUMMARY_SANDBOX|SITE)|BLOB_|VERCEL_|GITHUB_|GH_TOKEN)/.test(key))delete env[key];
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3018'],{stdio:'inherit',env});
child.on('exit',code=>process.exit(code??1));
