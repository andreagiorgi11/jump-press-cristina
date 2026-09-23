import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Standalone replacement for the retired Juventus project only.
// No credentials, data access, functions, or changes to the News deployment.
const output=path.join(path.dirname(fileURLToPath(import.meta.url)),'.vercel/output');
const destination='https://jump-press-approvazione.vercel.app';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex'};
const redirect=(src,suffix)=>({src,methods:['GET','HEAD'],status:307,headers:{...headers,Location:destination+suffix}});
const routes=[
 ...['code','token','access_token','refresh_token','id_token','client_secret','code_verifier','state'].map(key=>({src:'/.*',has:[{type:'query',key}],status:410,headers})),
 {src:'/(?:mcp|oauth|api|\\.well-known)(?:/.*)?',status:410,headers},
 {src:'/editor/consent/?',status:410,headers},
 redirect('/','/'),
 redirect('/(summary|archivio|editor)/?','/$1'),
 redirect('/editor/istruzioni/?','/editor/istruzioni'),
 redirect('/edizioni/([0-9]{4}-[0-9]{2}-[0-9]{2})/?','/edizioni/$1'),
 // Legacy static archives and assets require ID/date checks before mapping.
 redirect('/archivio/.*','/archivio'),
 redirect('/.*','/'),
 {src:'/.*',status:410,headers}
];
await mkdir(path.join(output,'static'),{recursive:true});
await writeFile(path.join(output,'config.json'),JSON.stringify({version:3,routes},null,2)+'\n');
console.log('Prepared static redirect deployment: '+output);
