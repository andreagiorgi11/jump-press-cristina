import test from 'node:test';import assert from 'node:assert/strict';import {PDFDocument} from 'pdf-lib';import {randomUUID} from 'node:crypto';
import {MemoryStore} from './helpers.mjs';
import {withdrawDraft,deleteDraft,registerClipUpload,readSource,saveDraft,getDraft,listDrafts,registerSource,makeClip,publishDraft,restoreDraft,publicClip} from '../lib/editor-service.js';
import {GithubStore,readIndex} from '../lib/github-store.js';
import {newEdition} from '../lib/schema.js';
test('GitHub snapshots: permissions, PDF extraction, atomic publication, stale writes and revisions',async()=>{
 const store=new MemoryStore(),files=new Map(),blobs={uploadLink:async p=>'https://upload.invalid/'+p,link:async p=>'https://read.invalid/'+p,read:async p=>files.get(p),write:async(p,b)=>{assert(!files.has(p));files.set(p,b);},exists:async p=>{if(!files.has(p))throw Error('Missing PDF');}};
 const ctx={store,blobs,role:'publisher',user:{id:'1'}},id=randomUUID();const draft=await saveDraft(ctx,id,0,newEdition('2026-09-17'));
 assert.equal(draft.version,1);await assert.rejects(listDrafts({...ctx,role:'guest'}),/Accesso/);
 const original=await PDFDocument.create();original.addPage();original.addPage();const uploaded=await registerSource(ctx,id,'originale.pdf');files.set(uploaded.asset.storage_path,await original.save());
 const clip=await makeClip(ctx,uploaded.asset.id,[2]);assert.equal((await PDFDocument.load(files.get(clip.storage_path))).getPageCount(),1);
 await assert.rejects(makeClip(ctx,uploaded.asset.id,[3]),/Pagine/);
 const body={...draft.body,intro:'Sintesi verificata',articles:[{id:randomUUID(),category:'Juventus',title:'Titolo verificato',summary:'Testo della sintesi',outlet:'Fonte del test',author:'',rating:3,sourceId:uploaded.asset.id,clipId:clip.id,pages:[2]}]};
 await saveDraft(ctx,id,1,body);
 assert.equal(await publicClip(clip.id,store,blobs),null);
 for(const role of ['producer','editor'])await assert.rejects(publishDraft({...ctx,role},id,2,'PUBBLICA'),e=>e.status===403);
 assert.equal(store.files['published/2026-09-17.json'],undefined);
 await assert.rejects(publishDraft(ctx,id,2,'procedi'),/Conferma/);
 await publishDraft(ctx,id,2,'PUBBLICA');
 assert((await publicClip(clip.id,store,blobs)).startsWith('https://read.invalid/'));
 assert.equal(await publicClip(uploaded.asset.id,store,blobs),null);
 assert.equal(store.files['published/2026-09-17.json'].body.articles[0].sourceId,undefined);
 await saveDraft(ctx,id,2,{...body,intro:'Ancora privata'});
 assert.equal(store.files['published/2026-09-17.json'].body.intro,body.intro);
 await assert.rejects(saveDraft(ctx,id,2,body),/modificata/);
 assert.equal((await publishDraft(ctx,id,2,'PUBBLICA')).alreadyPublished,true);
 await assert.rejects(saveDraft(ctx,id,3,{...body,date:'2026-09-18'}),/data/);
 await restoreDraft(ctx,id,3,2);assert.equal((await getDraft(ctx,id)).body.intro,body.intro);
 // A corrected revision remains private until explicit publication, even after source expiry.
 const correction=await getDraft(ctx,id);files.delete(uploaded.asset.storage_path);
 await assert.rejects(publishDraft({...ctx,role:'editor'},id,correction.version,'PUBBLICA'),e=>e.status===403);
 await publishDraft(ctx,id,correction.version,'PUBBLICA');
 assert.equal(store.files['published/2026-09-17.json'].version,correction.version);
 assert(store.files['revisions/'+id+'/2.json']);
 // Withdrawal is explicit, version-checked, atomic and reversible by republishing.
 await assert.rejects(withdrawDraft({...ctx,role:'producer'},id,correction.version,'RITIRA_E_MODIFICA'),e=>e.status===403);
 await assert.rejects(withdrawDraft(ctx,id,correction.version,'ok'),e=>e.status===400);
 await assert.rejects(withdrawDraft(ctx,id,correction.version-1,'RITIRA_E_MODIFICA'),e=>e.status===409);
 assert.equal(store.files['index.json'].published.length,1);
 const withdrawn=await withdrawDraft(ctx,id,correction.version,'RITIRA_E_MODIFICA');
 assert.equal(withdrawn.version,correction.version+1);assert(withdrawn.withdrawnAt);
 assert.equal(store.files['index.json'].published.length,0);
 assert.equal(await publicClip(clip.id,store,blobs),null);
 assert.equal(store.files['published/2026-09-17.json'].version,correction.version);
 await assert.rejects(withdrawDraft(ctx,id,withdrawn.version,'RITIRA_E_MODIFICA'),e=>e.status===409);
 await publishDraft(ctx,id,withdrawn.version,'PUBBLICA');
 assert.equal((await getDraft(ctx,id)).withdrawnAt,undefined);
 assert(await publicClip(clip.id,store,blobs));
 const again=await withdrawDraft(ctx,id,withdrawn.version,'RITIRA_E_MODIFICA');
 await deleteDraft(ctx,id,again.version);
 assert.equal(store.files['index.json'].trash.length,1);

 const twin=randomUUID();await saveDraft(ctx,twin,0,newEdition('2026-09-18'));
 const misplaced=structuredClone(body);misplaced.date='2026-09-18';await saveDraft(ctx,twin,1,misplaced);
 await assert.rejects(publishDraft(ctx,twin,2,'PUBBLICA'),/coerenti/);
});
test('two concurrent commits cannot both replace a draft',async()=>{
 const store=new MemoryStore(),ctx={store,role:'editor',user:{id:'1'}},id=randomUUID();
 await saveDraft(ctx,id,0,newEdition());
 const results=await Promise.allSettled([saveDraft(ctx,id,1,{...newEdition(),intro:'A'}),saveDraft(ctx,id,1,{...newEdition(),intro:'B'})]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.find(x=>x.status==='rejected').reason.status,409);
});
test('GitHub refuses public repos and does not turn outages or malformed JSON into empty lists',async()=>{
 const r=new GithubStore({repo:'owner/private',token:'isolated',fetcher:async()=>Response.json({private:false})});await assert.rejects(r.begin(),/privato/);
 const down=new GithubStore({repo:'owner/private',token:'isolated',fetcher:async()=>new Response('',{status:503})});await assert.rejects(down.read('index.json',{sha:'a'}),/non disponibile/);
 const malformed=new GithubStore({repo:'owner/private',token:'isolated',fetcher:async()=>Response.json({encoding:'base64',size:8,content:Buffer.from('not JSON').toString('base64')})});await assert.rejects(malformed.read('index.json',{sha:'a'}),/non valido/);
 const missing=new MemoryStore();delete missing.snapshots[0]['index.json'];await assert.rejects(readIndex(missing,await missing.begin()),/non inizializzato/);
});
test('Git tree write includes all files and uses non-forced compare-and-swap',async()=>{
 const calls=[];const r=new GithubStore({repo:'owner/private',token:'isolated',fetcher:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return calls.length<3?Response.json({sha:'new-'+calls.length}):new Response('',{status:422});}});
 await assert.rejects(r.commit({'drafts/a.json':{version:2},'published/2026-09-17.json':{version:2}},{sha:'old',tree:'base'},'test'),e=>e.status===409);
 assert.equal(calls[0].body.tree.length,2);assert.deepEqual(calls[1].body.parents,['old']);assert.equal(calls[2].body.force,false);
});

test('direct clips preserve private provenance and require uploaded matching pages before publication',async()=>{
 const store=new MemoryStore(),files=new Map(),blobs={uploadLink:async()=> 'https://upload.invalid',link:async p=>'https://read.invalid/'+p,read:async p=>{if(!files.has(p))throw Error('missing');return files.get(p);},exists:async p=>{if(!files.has(p))throw Error('missing');}};
 const ctx={store,blobs,role:'editor',user:{id:'editor'}},id=randomUUID();
 await saveDraft(ctx,id,0,newEdition('2026-09-17'));
 const input={name:'ritaglio.pdf',sourceName:'Ecostampa.pdf',sourceDate:'2026-09-17',sourceSha256:'a'.repeat(64),sourcePageCount:335,pages:[20,22]};
 await assert.rejects(registerClipUpload({...ctx,role:'guest'},id,input));
 await assert.rejects(registerClipUpload(ctx,id,{...input,pages:[20,20]}));
 await assert.rejects(registerClipUpload(ctx,id,{...input,pages:[336]}));
 await assert.rejects(registerClipUpload(ctx,id,{...input,sourceDate:'2026-09-16'}));
 const result=await registerClipUpload(ctx,id,input),clip=result.asset;
 const body={...newEdition('2026-09-17'),intro:'Sintesi',articles:[{id:randomUUID(),title:'Titolo',outlet:'Fonte',category:'Juventus',summary:'Testo',sourceId:result.sourceId,clipId:clip.id,pages:[20,22]}]};
 await saveDraft(ctx,id,1,body);
 const publisher={...ctx,role:'publisher'};
 await assert.rejects(publishDraft(publisher,id,2,'PUBBLICA'),/missing/);
 const pdf=await PDFDocument.create();pdf.addPage();files.set(clip.storage_path,await pdf.save());
 await assert.rejects(readSource(ctx,clip.id),e=>e.status===400);
 await assert.rejects(publishDraft(publisher,id,2,'PUBBLICA'),e=>e.status===400);
 pdf.addPage();files.set(clip.storage_path,await pdf.save());
 assert.equal((await readSource(ctx,clip.id)).pageCount,2);
 assert.equal(await publicClip(clip.id,store,blobs),null);
 await assert.rejects(publishDraft(ctx,id,2,'PUBBLICA'),e=>e.status===403);
 await publishDraft(publisher,id,2,'PUBBLICA');
 assert(await publicClip(clip.id,store,blobs));
 const published=JSON.stringify(store.files['published/2026-09-17.json']);
 assert(!published.includes('sourceName'));assert(!published.includes(input.sourceSha256));assert(!published.includes(result.sourceId));
});

test('front-page clips require the exact page and become public only in the published snapshot',async()=>{
 const store=new MemoryStore(),files=new Map(),blobs={uploadLink:async()=>'',link:async p=>'https://read.invalid/'+p,read:async p=>files.get(p),write:async(p,b)=>files.set(p,b),exists:async p=>{assert(files.has(p));}};
 const ctx={store,blobs,role:'publisher',user:{id:'1'}},id=randomUUID();
 let d=await saveDraft(ctx,id,0,newEdition('2026-09-18'));
 const pdf=await PDFDocument.create();pdf.addPage();pdf.addPage();
 const {asset}=await registerSource(ctx,id,'source.pdf');files.set(asset.storage_path,await pdf.save());
 const article=await makeClip(ctx,asset.id,[2]),cover=await makeClip(ctx,asset.id,[1]);
 const body={...d.body,intro:'Intro',articles:[{id:randomUUID(),title:'Article',category:'Juventus',outlet:'Test',summary:'Summary',sourceId:asset.id,clipId:article.id,pages:[2]}],coverage:{examinedItems:1,sourceNote:'test',frontPages:[{outlet:'Test',page:1,juventus:true,nationalSports:true,sourceId:asset.id,clipId:article.id}]}};
 d=await saveDraft(ctx,id,d.version,body);
 await assert.rejects(publishDraft(ctx,id,d.version,'PUBBLICA'),e=>e.status===400);
 body.coverage.frontPages[0].clipId=cover.id;d=await saveDraft(ctx,id,d.version,body);
 assert.equal(await publicClip(cover.id,store,blobs),null);
 await publishDraft(ctx,id,d.version,'PUBBLICA');assert(await publicClip(cover.id,store,blobs));assert.equal(await publicClip(asset.id,store,blobs),null);
 assert.equal(store.files['published/2026-09-18.json'].body.coverage.frontPages[0].sourceId,undefined);
 const privateCover=await makeClip(ctx,asset.id,[1]);body.coverage.frontPages[0].clipId=privateCover.id;
 await saveDraft(ctx,id,d.version,body);assert.equal(await publicClip(privateCover.id,store,blobs),null);assert(await publicClip(cover.id,store,blobs));
});
