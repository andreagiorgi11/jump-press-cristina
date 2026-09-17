import test from 'node:test';import assert from 'node:assert/strict';import {PDFDocument} from 'pdf-lib';import {randomUUID} from 'node:crypto';
import {MemoryStore} from './helpers.mjs';
import {saveDraft,getDraft,listDrafts,registerSource,makeClip,publishDraft,restoreDraft,publicClip} from '../lib/editor-service.js';
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
