import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './helpers.mjs';
import {editionExport} from '../lib/edition-export.js';
import {readInstructions,saveInstructions} from '../lib/editorial-instructions.js';

async function fixture(){
 const repo=new MemoryStore();
 await repo.commit({
  'index.json':{format:1,drafts:[],published:[{edition_date:'2026-09-22',draft_id:'a'}]},
  'published/2026-09-22.json':{draft_id:'a',body:{date:'2026-09-22',title:'Published',articles:[{clipId:'published'}]}},
  'drafts/a.json':{id:'a',version:3,body:{date:'2026-09-22',title:'Private changes',articles:[{clipId:'private'}]}},
  'assets/published.json':{kind:'clip',draft_id:'a',storage_path:'published.pdf'},
  'assets/private.json':{kind:'clip',draft_id:'a',storage_path:'private.pdf'},
 },await repo.begin(),'fixture');
 return repo;
}
test('Public PDF uses published snapshot and cannot include private draft clips',async()=>{
 const repo=await fixture(),source=await editionExport({date:'2026-09-22',repo,storage:{read:p=>p}});
 assert.equal(source.body.title,'Published');
 assert.equal(await source.loadClip('published'),'published.pdf');
 await assert.rejects(source.loadClip('private'),e=>e.status===404);
 await assert.rejects(editionExport({date:'2026-09-23',repo}),e=>e.status===404);
});
test('Draft export requires role and exact revision, rejects trash',async()=>{
 const repo=await fixture();
 await assert.rejects(editionExport({draftId:'a',version:3,repo}),e=>e.status===403);
 await assert.rejects(editionExport({draftId:'a',version:2,ctx:{role:'editor'},repo}),e=>e.status===409);
 const source=await editionExport({draftId:'a',version:3,ctx:{role:'editor'},repo});
 assert.equal(source.body.title,'Private changes');
 const d=await repo.read('drafts/a.json',await repo.begin());d.deletedAt='now';
 await repo.commit({'drafts/a.json':d},await repo.begin(),'trash');
 await assert.rejects(editionExport({draftId:'a',version:3,ctx:{role:'editor'},repo}),e=>e.status===404);
});
test('Revoked publication and backend failure are not downloadable empty editions',async()=>{
 const repo=await fixture();await repo.commit({'index.json':{format:1,drafts:[],published:[]}},await repo.begin(),'withdraw');
 await assert.rejects(editionExport({date:'2026-09-22',repo}),e=>e.status===404);
 await assert.rejects(editionExport({date:'2026-09-22',repo:{begin(){throw Error('provider unavailable');}}}),/provider unavailable/);
});
test('Summary profile preserves operational rules and versions independently from old site',async()=>{
 const store=new MemoryStore(),ctx={store,role:'editor',user:{id:'test'}};
 const initial=await readInstructions(ctx);
 const base=await saveInstructions(ctx,initial.version,initial.text+'\nUse the primary morning edition, never subsequent updates.');
 const next=await readInstructions({...ctx,editorialModel:'summary-v1'});
 assert(next.text.includes('Use the primary morning edition'));
 assert(next.text.includes('CAMPO executiveSummary'));
 await saveInstructions({...ctx,editorialModel:'summary-v1'},next.version,next.text+'\nReviewed profile.');
 assert.equal((await readInstructions(ctx)).text,base.text);
 assert((await readInstructions({...ctx,editorialModel:'summary-v1'})).text.endsWith('Reviewed profile.'));
 await assert.rejects(saveInstructions({...ctx,editorialModel:'summary-v1',role:'producer'},next.version,'x'.repeat(120)),e=>e.status===403);
});
