import {spawn} from 'node:child_process';
const site=process.argv[2]||'press';
const port=site==='news'?'3016':'3015';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',port],{stdio:'inherit',env:{...process.env,JUMP_SITE:site}});
child.on('exit',code=>process.exit(code||0));
