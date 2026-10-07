import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './helpers.mjs';
import {searchArchive,draftPreviews,mapArchiveItems} from '../lib/archive-search.js';
const body=(text='Spalletti prepara la squadra')=>({date:'2026-10-06',intro:'Cappello della rassegna',articles:[{id:'article-1',title:text,summary:'Le parole di Giovanni Malagò sulla partita.',author:'Mario Rossi',outlet:'Testata',category:'Prima squadra'}]});
async function fixture(){const repo=new MemoryStore();await repo.commit({
 'index.json':{format:1,published:[{edition_date:'2026-10-06',draft_id:'published',version:1}],drafts:[{id:'published',version:1,body:{date:'2026-10-06'}},{id:'private',version:2,body:{date:'2026-10-07'}}],trash:[{id:'trashed'}]},
 'published/2026-10-06.json':{version:1,body:body()},
 'drafts/published.json':{version:1,body:body()},
 'drafts/private.json':{version:2,body:body('Spalletti, testo privato')},
 'drafts/trashed.json':{version:1,body:body('Spalletti nel cestino')}
},await repo.begin());return repo;}
test('search exposes only published articles to readers and includes authorised drafts without duplicate published copies',async()=>{
 const repo=await fixture(),read=repo.read.bind(repo),paths=[];repo.read=async(path,head)=>{paths.push(path);return read(path,head);};
 const publicResult=await searchArchive({query:'spalletti'},null,repo);
 assert.equal(publicResult.groups.length,1);assert.equal(publicResult.groups[0].status,'published');assert.equal(paths.some(p=>p.startsWith('drafts/')),false);
 const editor=await searchArchive({query:'SPALLETTI'},{role:'editor'},repo);
 assert.deepEqual(editor.groups.map(g=>g.status),['draft','published']);assert.match(editor.groups[0].articles[0].href,/editor\?draft=private#articolo-article-1/);
 assert.equal(paths.includes('drafts/trashed.json'),false);assert.equal(paths.includes('drafts/published.json'),false);
 await assert.rejects(searchArchive({query:'spalletti'},{role:'reader'},repo),e=>e.status===403);
 for(const query of ['malago','Mario Rossi'])assert.equal((await searchArchive({query},null,repo)).groups.length,1);
 assert.equal((await searchArchive({query:'Nobody'},null,repo)).groups.length,0);
});
test('newer drafts remain separate from published versions and previews reuse the authenticated snapshot',async()=>{
 const repo=await fixture(),head=await repo.begin(),index=await repo.read('index.json',head);index.drafts[0].version=2;
 await repo.commit({'index.json':index,'drafts/published.json':{version:2,body:body('Spalletti versione nuova')}},head);
 const result=await searchArchive({query:'Spalletti'},{role:'publisher'},repo);assert.equal(result.groups.length,3);
 const details=await draftPreviews(index.drafts,await repo.begin(),{role:'editor'},repo);
 assert.equal(details.private.intro,'Cappello della rassegna');assert.equal(details.private.articles,1);assert.deepEqual(details.private.sections,['Prima squadra']);
 await assert.rejects(draftPreviews(index.drafts,head,null,repo),e=>e.status===403);
 const missing=await draftPreviews([{id:'missing',version:1}],await repo.begin(),{role:'editor'},repo);assert.deepEqual(missing.missing,{unavailable:true});
});
test('search scans the full archive in bounded batches and rejects changed snapshots',async()=>{
 const repo=new MemoryStore(),published=Array.from({length:19},(_,i)=>({edition_date:'2026-09-'+String(i+1).padStart(2,'0'),draft_id:'p'+i,version:1}));
 await repo.commit({'index.json':{format:1,drafts:[],published},...Object.fromEntries(published.map(p=>['published/'+p.edition_date+'.json',{version:1,body:body()}]))},await repo.begin());
 let offset=0,revision,groups=[];do{const result=await searchArchive({query:'Spalletti',offset,revision},null,repo);assert.ok(result.groups.length<=8);groups.push(...result.groups);offset=result.nextOffset;revision=result.revision;}while(offset!==null);
 assert.equal(groups.length,19);assert.equal(new Set(groups.map(g=>g.key)).size,19);
 await repo.commit({'unrelated.json':{}},await repo.begin());await assert.rejects(searchArchive({query:'Spalletti',offset:8,revision},null,repo),e=>e.status===409);
 let active=0,peak=0;await mapArchiveItems(Array.from({length:20}),async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,1));active--;});assert.equal(peak,4);
});
test('read errors produce explicit partial results, not a false empty success',async()=>{
 const repo=await fixture(),read=repo.read.bind(repo);repo.read=async(path,head)=>{if(path.startsWith('drafts/'))throw Error('Offline');return read(path,head);};
 const result=await searchArchive({query:'Spalletti'},{role:'editor'},repo);assert.equal(result.unavailable,1);assert.equal(result.groups.length,1);
 repo.read=async()=>{throw Error('Offline');};await assert.rejects(searchArchive({query:'Spalletti'},null,repo),/Offline/);
});
test('English search uses the current translation and falls back explicitly when it cannot be read',async()=>{
 const repo=await fixture(),head=await repo.begin(),index=await repo.read('index.json',head);index.translations=[{lang:'en',edition_date:'2026-10-06',source_version:1}];
 await repo.commit({'index.json':index,'translations/en/2026-10-06.json':{source_version:1,source_draft_id:'published',content:{articles:[{id:'article-1',title:'English headline',summary:'A translated quote'}]}}},head);
 const english=await searchArchive({query:'translated',lang:'en'},null,repo);assert.equal(english.groups[0].language,'en');assert.match(english.groups[0].articles[0].href,/^\/en\/edizioni/);
 await repo.commit({'translations/en/2026-10-06.json':null},await repo.begin());const fallback=await searchArchive({query:'Malago',lang:'en'},null,repo);assert.equal(fallback.groups[0].language,'it');assert.equal(fallback.unavailable,1);
 for(const input of [{query:'x'},{query:'ok',offset:-1},{query:'ok',lang:'xx'}])await assert.rejects(searchArchive(input,null,repo),e=>e.status===400);
});

test('period is inclusive, supports either bound and returns the whole summary',async()=>{
 const repo=await fixture(),head=await repo.begin(),row=await repo.read('published/2026-10-06.json',head);
 row.body.articles[0].summary='Spalletti '+('Testo completo. '.repeat(100))+'Fine della sintesi.';
 await repo.commit({'published/2026-10-06.json':row},head);
 const result=await searchArchive({query:'Spalletti',from:'2026-10-06',to:'2026-10-06'},{role:'editor'},repo);
 assert.equal(result.total,1);assert.equal(result.groups[0].articles[0].summary,row.body.articles[0].summary);
 assert.equal((await searchArchive({query:'Spalletti',from:'2026-10-07'},{role:'editor'},repo)).groups[0].status,'draft');
 assert.equal((await searchArchive({query:'Spalletti',to:'2026-10-05'},{role:'editor'},repo)).total,0);
 for(const period of [{from:'2026-10-08',to:'2026-10-06'},{from:'2026-02-30'},{to:'invalid'}])await assert.rejects(searchArchive({query:'Spalletti',...period},null,repo),e=>e.status===400);
});

test('titles-only excludes summary and author matches and combines with dates',async()=>{
 const repo=await fixture();
 for(const query of ['Malago','Mario Rossi']){
  assert.equal((await searchArchive({query},null,repo)).groups.length,1);
  assert.equal((await searchArchive({query,titleOnly:true},null,repo)).groups.length,0);
 }
 const result=await searchArchive({query:'SPALLETTI',titleOnly:true,from:'2026-10-07',to:'2026-10-07'},{role:'editor'},repo);
 assert.equal(result.groups.length,1);assert.equal(result.groups[0].status,'draft');
 assert.equal(result.groups[0].articles[0].summary,body().articles[0].summary);
});
