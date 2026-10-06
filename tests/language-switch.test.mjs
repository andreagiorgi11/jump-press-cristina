import test from 'node:test';
import assert from 'node:assert/strict';
import {languagePath} from '../lib/i18n.js';
test('language switch preserves edition and archive, and explicitly overrides English home preference',()=>{
 assert.equal(languagePath('/en','it'),'/?it=1');
 assert.equal(languagePath('/','en'),'/en');
 assert.equal(languagePath('/editor','en'),'/en');
 assert.equal(languagePath('/en/archivio','it'),'/archivio');
 assert.equal(languagePath('/archivio','en'),'/en/archivio');
 assert.equal(languagePath('/en/edizioni/2026-10-06','it'),'/edizioni/2026-10-06');
 assert.equal(languagePath('/edizioni/2026-10-06','en'),'/en/edizioni/2026-10-06');
});
