import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),React=require('react');
const {transform}=require('next/dist/build/swc');
const {code}=await transform(await readFile(new URL('../app/components/ApprovalEdition.js',import.meta.url),'utf8'),{filename:'ApprovalEdition.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const imports={'react':{...React,useEffect(){}},'../../lib/edition-analysis':{analyseEdition:()=>({})},'../../lib/summary-sections':{summaryEdition:x=>x,articleSections:[]}};
const module={exports:{}};
vm.runInNewContext(code,{module,exports:module.exports,require:n=>imports[n]??(n.startsWith('.')?{default:()=>null}:require(n))});
for(const published of [false,true])test('PDF review warning for published='+published,()=>{
 const tree=module.exports.default({body:{date:'2026-10-06',editorialModel:'summary-v1',executiveSummary:{},executiveSummaryStale:true},draftId:'draft',version:2,published});
 assert.equal(tree.props.children[0].props.summaryAlert,published?null:'Summary da ricontrollare');
});
