import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MemoryStore} from './helpers.mjs';
import {romeNow,readerNotice,editorStatus,todayStatus} from '../lib/today-status.js';
import {claimRun,updateRun} from '../lib/automation-runs.js';
const at=iso=>Date.parse(iso);
test('Rome time decides the day and the 8:00 threshold, including DST and midnight',()=>{
 assert.deepEqual(romeNow(at('2026-09-23T22:30:00Z')),{date:'2026-09-24',hour:0});
 assert.deepEqual(romeNow(at('2026-12-24T06:59:00Z')),{date:'2026-12-24',hour:7});
 assert.equal(readerNotice('2026-09-23',at('2026-09-24T05:59:00Z')).state,'scheduled');
 assert.equal(readerNotice('2026-09-23',at('2026-09-24T06:00:00Z')).state,'preparing');
 assert.equal(readerNotice('2026-09-24',at('2026-09-24T09:00:00Z')),null);
 assert.deepEqual(readerNotice(null,at('2026-09-27T05:00:00Z')),{today:'2026-09-27',latestDate:null,state:'scheduled'});
});
test('status exposes only states, never document content',async()=>{
 const store=new MemoryStore(),ctx={role:'publisher',user:{id:'editor'},store};
 assert.equal((await todayStatus(ctx)).latestDate,null);
 const date='2026-09-18',url='https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260918_16377886.pdf';
 assert.equal((await editorStatus(ctx,date)).run.status,'not_started');
 const job=await claimRun(ctx,{date,url,requestId:randomUUID()});await updateRun(ctx,{run:job.run,phase:'reading',checkpoint:{nextPage:12}});
 const s=await editorStatus(ctx,date);
 assert.equal(s.run.status,'running');assert.equal(s.run.phase,'reading');assert.equal(s.run.nextPage,12);assert.equal(s.draft,null);
 assert.deepEqual(Object.keys(s.run).sort(),['attemptsRemaining','nextPage','phase','stalled','status','updatedAt','warnings']);
});
