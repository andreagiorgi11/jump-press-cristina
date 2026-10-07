import test from 'node:test';
import assert from 'node:assert/strict';
import {instructionBlocks,instructionInline,instructionMatches} from '../lib/instructions-format.js';
test('presentation removes internal comments but preserves the people and semantic structure',()=>{
 const source='Indicazioni generali.\n\n<!-- jump-interest-list:start -->\n## Persone di interesse\n### Giornalisti\n- **Nome Cognome** — Giornalista\n<!-- jump-interest-list:end -->';
 const blocks=instructionBlocks(source);
 assert.deepEqual(blocks.map(block=>block.type),['paragraph','heading','heading','list']);
 assert.equal(blocks[3].items[0].text,'**Nome Cognome** — Giornalista');
 assert(!JSON.stringify(blocks).includes('jump-interest-list'));
 assert.equal(instructionInline(blocks[3].items[0].text).map(token=>token.text).join(''),'Nome Cognome — Giornalista');
 assert.equal(instructionInline(blocks[3].items[0].text)[0].style,'strong');
});
test('literal search is case-insensitive and matches formatted visible text',()=>{
 assert.deepEqual(instructionMatches('Versione [40]. versione [40].','[40].'),[{start:9,end:14},{start:24,end:29}]);
 assert.equal(instructionMatches('JUVENTUS Juventus','juventus').length,2);
 assert.equal(instructionMatches('test','  ').length,0);
 assert.equal(instructionMatches('test','assente').length,0);
});
test('HTML stays inert text and ordered lists preserve their numbering',()=>{
 const blocks=instructionBlocks('<img src=x onerror=alert(1)>\n\n3. Tre\n4. Quattro');
 assert.equal(blocks[0].text,'<img src=x onerror=alert(1)>');
 assert.deepEqual(blocks[1].items.map(item=>item.number),[3,4]);
 assert.equal(blocks[1].ordered,true);
});
