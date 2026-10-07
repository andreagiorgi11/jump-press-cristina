import test from 'node:test';
import assert from 'node:assert/strict';
import {archivePeriod} from '../lib/archive-period.js';
test('relative archive periods include today in Rome and cross month/year boundaries',()=>{
 const now=new Date('2026-10-06T22:30:00Z');
 assert.deepEqual(archivePeriod('day',now),{from:'2026-10-07',to:'2026-10-07'});
 assert.deepEqual(archivePeriod('twoDays',now),{from:'2026-10-06',to:'2026-10-07'});
 assert.deepEqual(archivePeriod('week',now),{from:'2026-10-01',to:'2026-10-07'});
 assert.deepEqual(archivePeriod('month',now),{from:'2026-09-08',to:'2026-10-07'});
 assert.deepEqual(archivePeriod('twoDays',new Date('2026-01-01T12:00:00Z')),{from:'2025-12-31',to:'2026-01-01'});
 assert.equal(archivePeriod('custom',now),null);
});
