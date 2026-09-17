import test from 'node:test';
import assert from 'node:assert/strict';
import {routeAllowed} from '../lib/routing.js';
import {editionSchema,newEdition} from '../lib/schema.js';
test('two deployments isolate their routes, including direct API calls',()=>{
 for(const p of ['/news','/social','/api/social-feed','/api/social-search']){assert.equal(routeAllowed(p,'press'),false);assert.equal(routeAllowed(p,'news'),true);}
 for(const p of ['/editor','/editor/consent','/api/editor','/api/auth/login','/api/oauth/consent','/oauth/register','/oauth/authorize','/oauth/token','/.well-known/oauth-authorization-server','/mcp','/.well-known/oauth-protected-resource','/archivio','/edizioni/2026-09-17','/ritagli/a.pdf','/api/clips/123']){assert.equal(routeAllowed(p,'news'),false);assert.equal(routeAllowed(p,'press'),true);}
 for(const site of ['news','press'])assert.equal(routeAllowed('/api/social-debug',site),false);
});
test('draft validation rejects impossible dates and unrequested fields',()=>{
 assert(editionSchema.safeParse(newEdition('2026-09-17')).success);
 assert(!editionSchema.safeParse(newEdition('2026-02-31')).success);
 assert(!editionSchema.safeParse({...newEdition(),privateToken:'secret'}).success);
});
