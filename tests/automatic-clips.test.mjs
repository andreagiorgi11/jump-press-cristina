import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {MemoryStore} from './helpers.mjs';
import {saveDraft,publicBody} from '../lib/editor-service.js';
import {titleMatches} from '../lib/automatic-clips.js';
import {claimRun,updateRun} from '../lib/automation-runs.js';
const date='2026-09-22';
async function setup(){
 const store=new MemoryStore(),id=randomUUID(),importId=randomUUID(),pdf=await PDFDocument.create();
 for(let i=0;i<3;i++)pdf.addPage([200+i*10,300]);const bytes=await pdf.save(),uploads=new Map();let reads=0;
 const pages=[{page:1,text:'David: Alla Juve la punta è sempre la più criticata. Sono contento di essere qui a Madrid. Diritto di riscatto fissato a 25 milioni.'},{page:2,text:'Continuazione'},{page:3,text:'Altra notizia'}];
 const row={id:importId,status:'ready',date,pageCount:3,name:'PP_RAS_1626482_20260922_16377886.pdf',sha256:'a'.repeat(64),originalPath:'original',textPath:'text'};
 await store.commit({['imports/'+importId+'.json']:row},await store.begin());
 const ctx={store,role:'publisher',user:{id:'test'},blobs:{readText:async()=>({pages}),readOriginal:async()=>{reads++;return bytes;},write:async(p,b)=>uploads.set(p,b),exists:async p=>{if(!uploads.has(p))throw Error('missing');}}};
 const article={id:randomUUID(),title:'David: «Alla Juve la punta è sempre la più criticata»',category:'Prima squadra maschile',outlet:'Tuttosport',summary:'David è a Madrid, con diritto di riscatto a 25 milioni.',pages:[1,2],factCheck:{status:'verified',note:'Confrontati club attuale e contratto.',evidence:[{page:1,quote:'Sono contento di essere qui a Madrid'},{page:1,quote:'Diritto di riscatto fissato a 25 milioni'}]}};
 return {ctx,id,importId,uploads,reads:()=>reads,body:{sourceImportId:importId,date,title:'Rassegna',intro:'Introduzione',articles:[article]}};
}
test('title comparison tolerates line breaks and accents without matching unrelated content',()=>{
 assert(titleMatches('Spalletti si gode Bremer: in Europa nessuno come lui','Spallettisigode Bremer:In Europa nessunocomelui'));
 assert(!titleMatches('Spalletti si gode Bremer: in Europa nessuno come lui','Il mercato dei portieri'));
 assert(!titleMatches('Juve','Juve'));
});
test('one source read creates exact ordered pages and server-owned checks; repeats reuse clips',async()=>{
 const x=await setup();let d=await saveDraft(x.ctx,x.id,0,x.body);assert.equal(x.reads(),1);assert.equal(x.uploads.size,1);
 const a=d.body.articles[0];assert.equal(a.pdfCheck.status,'matched');assert.equal(a.synthesisCheck.status,'verified');
 const clip=d.assets.find(c=>c.id===a.clipId),output=await PDFDocument.load(x.uploads.get(clip.storage_path));assert.deepEqual(output.getPages().map(p=>p.getWidth()),[200,210]);
 d=await saveDraft(x.ctx,x.id,d.version,d.body);assert.equal(x.uploads.size,1);assert.equal(d.body.articles[0].clipId,a.clipId);
 const pub=publicBody(d.body);assert(!('factCheck' in pub.articles[0]));assert(!('pdfCheck' in pub.articles[0]));assert(!('sourceImportId' in pub));
});
test('wrong title and invalid pages save warnings; invented evidence never passes',async()=>{
 const x=await setup();x.body.articles[0].title='Notizia completamente diversa';x.body.articles[0].pages=[99];x.body.articles[0].pdfCheck={status:'matched',note:'forged'};
 const d=await saveDraft(x.ctx,x.id,0,x.body);assert.equal(d.body.articles[0].pdfCheck.status,'attention');assert.equal(d.body.articles[0].synthesisCheck.status,'attention');assert.equal(d.body.articles[0].clipId,null);assert.equal(x.ctx.store.files['index.json'].drafts.length,1);
});
test('changed summary invalidates unchanged verification and preserves the draft',async()=>{
 const x=await setup();let d=await saveDraft(x.ctx,x.id,0,x.body);d.body.articles[0].summary='David è ancora alla Juventus.';d=await saveDraft(x.ctx,x.id,d.version,d.body);
 assert.equal(d.body.articles[0].factCheck,null);assert.equal(d.body.articles[0].synthesisCheck.status,'attention');
});
test('source outage is explicit, draft survives and retry can prepare missing PDF',async()=>{
 const x=await setup(),read=x.ctx.blobs.readOriginal;x.ctx.blobs.readOriginal=async()=>{throw Error('outage');};let d=await saveDraft(x.ctx,x.id,0,x.body);
 assert.equal(d.body.articles[0].pdfCheck.status,'attention');assert.equal(d.automaticClips.status,'attention');x.ctx.blobs.readOriginal=read;
 d=await saveDraft(x.ctx,x.id,d.version,d.body);assert.equal(d.automaticClips.status,'complete');
});
test('concurrent edit is not overwritten by clip processing',async()=>{
 const x=await setup(),write=x.ctx.blobs.write;x.ctx.blobs.write=async(p,b)=>{await write(p,b);const store=x.ctx.store,h=await store.begin(),d=await store.read('drafts/'+x.id+'.json',h);d.version++;d.body.intro='Modifica concorrente';await store.commit({['drafts/'+x.id+'.json']:d},h);};
 await assert.rejects(saveDraft(x.ctx,x.id,0,x.body),e=>e.status===409);assert.equal(x.ctx.store.files['drafts/'+x.id+'.json'].body.intro,'Modifica concorrente');
});
test('automation completes with attention without visual clip checkpoints',async()=>{
 const x=await setup();const result=await claimRun(x.ctx,{date,url:'https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260922_16377886.pdf',requestId:randomUUID()});
 await updateRun(x.ctx,{run:result.run,phase:'reading',checkpoint:{importId:x.importId,nextPage:4}});x.body.articles[0].pages=[99];
 const d=await saveDraft({...x.ctx,automation:result.run},result.draftId,0,x.body);
 const done=await updateRun(x.ctx,{run:result.run,phase:'review',status:'completed',draftVersion:d.version});assert.equal(done.status,'completed');assert(done.reviewWarnings.includes('PDF da verificare.'));assert(done.reviewWarnings.includes('Riscontro fonte incompleto.'));
});

test('Single text edit reads extracted text only; unchanged clips and checks are reused',async()=>{
 const x=await setup();let d=await saveDraft(x.ctx,x.id,0,x.body);const id=d.body.articles[0].clipId;let textReads=0,exists=0;const read=x.ctx.blobs.readText;
 x.ctx.blobs.readText=async(...args)=>{textReads++;return read(...args);};x.ctx.blobs.readOriginal=async()=>{throw Error('PDF must not be downloaded for text edit');};x.ctx.blobs.exists=async()=>{exists++;throw Error('Must reuse trusted asset');};
 d.body.articles[0].summary='La sintesi è stata corretta dall’editor.';d=await saveDraft(x.ctx,x.id,d.version,d.body);
 assert.equal(textReads,1);assert.equal(exists,0);assert.equal(d.body.articles[0].clipId,id);assert.equal(d.body.articles[0].factCheck,null);assert.equal(d.body.articles[0].synthesisCheck.status,'attention');
});
test('Layout-only save needs no source reads and ignores forged client checks',async()=>{
 const x=await setup();let d=await saveDraft(x.ctx,x.id,0,x.body);const version=d.version,checks=structuredClone(d.body.articles[0].synthesisCheck);
 x.ctx.blobs.readText=async()=>{throw Error('no source work');};x.ctx.blobs.readOriginal=x.ctx.blobs.readText;
 d.body.intro='Introduzione aggiornata.';d.body.articles[0].synthesisCheck={status:'verified',note:'forged'};
 d=await saveDraft(x.ctx,x.id,d.version,d.body);assert.equal(d.version,version+1);assert.deepEqual(d.body.articles[0].synthesisCheck,checks);
});
test('Changing pages still generates a new PDF clip',async()=>{
 const x=await setup();let d=await saveDraft(x.ctx,x.id,0,x.body);const old=d.body.articles[0].clipId;d.body.articles[0].pages=[2];d=await saveDraft(x.ctx,x.id,d.version,d.body);
 assert.equal(x.reads(),2);assert.notEqual(d.body.articles[0].clipId,old);assert.equal(d.body.articles[0].pdfCheck.status,'attention');
});

test('Reordering preserves warning and clip identities without reading source again',async()=>{
 const x=await setup();x.body.articles[0].title='Titolo non corrispondente alla fonte';x.body.articles.push({...x.body.articles[0],id:randomUUID(),pages:[3]});
 let d=await saveDraft(x.ctx,x.id,0,x.body);assert.equal(d.automaticClips.status,'attention');
 const before=structuredClone(d.body.articles),v=d.version;d.body.articles.reverse();
 x.ctx.blobs.readText=async()=>{throw Error('no source reads for order');};x.ctx.blobs.readOriginal=x.ctx.blobs.readText;
 d=await saveDraft(x.ctx,x.id,d.version,d.body);assert.equal(d.version,v+1);assert.deepEqual(d.body.articles,before.reverse());
});


test('Text source outage preserves unchanged checks and clips without inventing article failures',async()=>{
 const x=await setup();x.body.articles.push({...x.body.articles[0],id:randomUUID()});
 let d=await saveDraft(x.ctx,x.id,0,x.body);const before=structuredClone(d.body.articles),read=x.ctx.blobs.readText;
 x.ctx.blobs.readText=async()=>{throw Error('access denied');};
 d.body.articles[1].summary='Sintesi modificata';
 d=await saveDraft(x.ctx,x.id,d.version,d.body);
 assert.deepEqual(d.body.articles[0],before[0]);
 assert.equal(d.body.articles[1].pdfCheck.status,'matched');
 assert.equal(d.body.articles[1].clipId,before[1].clipId);
 assert.equal(d.body.articles[1].synthesisCheck.status,'pending');
 assert.equal(d.automaticClips.sourceUnavailable,true);
 x.ctx.blobs.readText=read;d=await saveDraft(x.ctx,x.id,d.version,d.body);
 assert.equal(d.automaticClips.sourceUnavailable,false);
 assert.notEqual(d.body.articles[1].synthesisCheck.status,'pending');
});

test('New title remains pending when source cannot be read; old success cannot apply',async()=>{
 const x=await setup();let d=await saveDraft(x.ctx,x.id,0,x.body);
 x.ctx.blobs.readText=async()=>{throw Error('source down');};
 d.body.articles[0].title='Un titolo diverso';d=await saveDraft(x.ctx,x.id,d.version,d.body);
 assert.equal(d.body.articles[0].pdfCheck.status,'pending');assert.equal(d.automaticClips.sourceUnavailable,true);
 assert(d.body.articles[0].clipId);
});
test('headline missing from extracted text: quotes on the first page confirm the clip, no PDF warning',async()=>{
 const x=await setup();x.body.articles[0].title='«Voglio cambiare le regole»';
 const d=await saveDraft(x.ctx,x.id,0,x.body),a=d.body.articles[0];
 assert.equal(a.pdfCheck.status,'matched');assert.match(a.pdfCheck.note,/estratti/);assert.equal(d.automaticClips.status,'complete');
 x.body.articles[0].factCheck.evidence=[{page:1,quote:'frase che non compare da nessuna parte'}];
 const y=await saveDraft(x.ctx,x.id,d.version,{...d.body,articles:[{...d.body.articles[0],factCheck:x.body.articles[0].factCheck}]});
 assert.equal(y.body.articles[0].pdfCheck.status,'attention');
});
test('a transient source read error is retried instead of leaving "source unavailable" warnings',async()=>{
 const x=await setup(),read=x.ctx.blobs.readText;let calls=0;x.ctx.blobs.readText=async p=>{if(++calls===1)throw Object.assign(Error('Testo estratto non leggibile.'),{status:503});return read(p);};
 const d=await saveDraft(x.ctx,x.id,0,x.body);
 assert.equal(calls,2);assert.equal(d.automaticClips.sourceUnavailable,false);assert.equal(d.body.articles[0].synthesisCheck.status,'verified');
});
