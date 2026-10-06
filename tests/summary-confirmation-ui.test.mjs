import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),React=require('react');
const {transform}=require('next/dist/build/swc');
const {code}=await transform(await readFile(new URL('../app/summary/PdfPreview.js',import.meta.url),'utf8'),{filename:'PdfPreview.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
function harness(action){
 const states=[],refs=[];let si=0,ri=0;
 const hooks={...React,useEffect(){},useLayoutEffect(){},useRef(v){return refs[ri++]??={current:v};},useState(v){const i=si++;if(!(i in states))states[i]=v;return [states[i],x=>{states[i]=typeof x==='function'?x(states[i]):x;}];}};
 const imports={'react':hooks,'../../lib/i18n':{tr:(_l,t)=>t},'./PdfOutline':{default:()=>null},'../../lib/pdf-outline-search':{filterPdfOutline:()=>[]},'../../lib/pdf-pan':{attachPdfPan:()=>{}}};
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:n=>imports[n]??require(n),URLSearchParams});
 function render(next=action){si=ri=0;return module.exports.default({kind:'summary',summaryAlert:'Summary da ricontrollare',onConfirmSummary:next,onClose:()=>{throw Error('Must stay open');}});}
 const walk=n=>Array.isArray(n)?n.flatMap(walk):n&&typeof n==='object'?[n,...walk(n.props?.children)]:[];
 return {render,load(){states[3]={};},nodes:walk,button(t){return walk(t).find(n=>n.type==='button'&&n.props.className==='summary-review-confirm');}};
}
test('Summary confirms only after PDF loaded; success stays open and removes warning',async()=>{
 let calls=0;const h=harness(async()=>{calls++;});let t=h.render();assert(h.button(t).props.disabled);
 h.load();t=h.render();assert(!h.button(t).props.disabled);await h.button(t).props.onClick();t=h.render();
 assert.equal(calls,1);assert(!h.button(t));assert(h.nodes(t).some(n=>n.props?.children==='Summary confermato'));
});
test('Summary failure preserves warning and retries the originally displayed revision',async()=>{
 let original=0,newer=0;const h=harness(async()=>{original++;throw Object.assign(Error('Conflict'),{status:409});});h.render();h.load();
 await h.button(h.render(async()=>{newer++;})).props.onClick();const t=h.render();
 assert.equal(original,1);assert.equal(newer,0);assert(h.button(t));assert(h.nodes(t).some(n=>n.props?.role==='alert'&&typeof n.props.children==='string'&&n.props.children.includes('La bozza')));
});
