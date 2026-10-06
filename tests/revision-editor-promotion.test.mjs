import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {promoteReserve,parkArticle,allDraftArticles} from '../lib/reserve-articles.js';
import * as position from '../lib/article-position.js';
import * as sections from '../lib/summary-sections.js';
import * as author from '../lib/article-author.js';
import * as signals from '../lib/key-point-signals.js';
const require=createRequire(import.meta.url);
const React=require('react');
const {transform}=require('next/dist/build/swc');
const source=await readFile(new URL('../app/components/RevisionEditor.js',import.meta.url),'utf8');
const {code}=await transform(source,{filename:'RevisionEditor.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
function harness(){
 const states=[],refs=[];let si=0,ri=0,resolve,reject,saved=null,closed=false,payload;
 const pending=new Promise((yes,no)=>{resolve=yes;reject=no;});
 const modal={showModal(){},close(){closed=true;},querySelector(){return {reportValidity:()=>true};}};
 const hooks={...React,useState(initial){const i=si++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef(initial){const i=ri++;return refs[i]??=( {current:initial===null?modal:initial});},useEffect(){},useId(){return 'test-editor';}};
 const imports={'react':hooks,'../../lib/reserve-articles':{promoteReserve,parkArticle,allDraftArticles},'../../lib/save-recovery':{saveWithRecovery:async(d,b)=>{payload=b;return pending;}},'./ArticleSourcePreview':{default:()=>null},'../../lib/article-author':author,'../../lib/summary-sections':sections,'../../lib/outlet-options':{outletOptions:()=>['Testata']},'../../lib/article-position':position,'../../lib/key-point-signals':signals};
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,require:n=>imports[n]??require(n),process,structuredClone,console});
 const article=(id)=>({id,title:'Titolo '+id,summary:'Sintesi',outlet:'Testata',category:'Prima squadra',pages:[1]});
 const draft={id:'draft',version:1,assets:[],body:{date:'2026-10-06',editorialModel:'summary-v1',articles:[article('main')],reserveArticles:[article('reserve')],tones:[],keyPoints:[]}};
 function render(){si=ri=0;return module.exports.default({draft,selection:{reserved:true,section:'article',articleId:'reserve'},onSaved:d=>{saved=d;},onClose:()=>{closed=true;}});}
 const walk=(n,found=[])=>{if(Array.isArray(n))n.forEach(x=>walk(x,found));else if(n&&typeof n==='object'){found.push(n);walk(n.props?.children,found);}return found;};
 const button=(tree,name)=>{const b=walk(tree).find(n=>n.type==='button'&&n.props.children===name);assert.ok(b,'button '+name);return b;};
 function choose(mode){let tree=render();button(tree,mode==='add'?'Salva e aggiungi':'Salva e sostituisci').props.onClick();tree=render();const select=walk(tree).find(n=>n.type==='select'&&n.props.autoFocus);select.props.onChange({target:{value:mode==='add'?'1':'main'}});tree=render();button(tree,mode==='add'?'Conferma e aggiungi':'Conferma e sostituisci').props.onClick();}
 return {render,choose,button,resolve,reject,get payload(){return payload;},get saved(){return saved;},get closed(){return closed;},draft};
}
for(const mode of ['add','replace']){
 test('reserve '+mode+' keeps dialog renderable while saving and closes on success',async()=>{
 const h=harness();h.choose(mode);
 assert.ok(h.payload.articles.some(a=>a.id==='reserve'));assert.equal(h.payload.reserveArticles.some(a=>a.id==='reserve'),false);
 if(mode==='replace')assert.ok(h.payload.reserveArticles.some(a=>a.id==='main'));
 assert.doesNotThrow(()=>h.render());assert.equal(h.button(h.render(),'Salvataggio…').props.disabled,true);
 const result={...h.draft,version:2,body:h.payload};h.resolve({saved:true,draft:result});await new Promise(r=>setImmediate(r));assert.equal(h.saved,result);assert.equal(h.closed,true);
 });
 test('reserve '+mode+' keeps editable candidate after failed save',async()=>{
 const h=harness();h.choose(mode);h.reject(new Error('Offline'));await new Promise(r=>setImmediate(r));assert.doesNotThrow(()=>h.render());assert.equal(h.closed,false);assert.ok(h.button(h.render(),mode==='add'?'Conferma e aggiungi':'Conferma e sostituisci'));assert.equal(h.saved,null);
 });
}
test('recovery result after promotion does not render missing reserve article',async()=>{
 const h=harness();h.choose('add');h.resolve({saved:false,conflicts:[],draft:h.draft,body:h.payload});await new Promise(r=>setImmediate(r));assert.doesNotThrow(()=>h.render());assert.equal(h.closed,false);
});
