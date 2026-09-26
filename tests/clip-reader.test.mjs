import test from 'node:test';
import assert from 'node:assert/strict';
import {continuousClipReader} from '../lib/continuous-clip-reader.js';

test('reader loads nearby pages only, preserves page geometry and releases offscreen canvases',async t=>{
 const originals={document:globalThis.document,IntersectionObserver:globalThis.IntersectionObserver,ResizeObserver:globalThis.ResizeObserver,devicePixelRatio:globalThis.devicePixelRatio};
 t.after(()=>{for(const [k,v] of Object.entries(originals)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}});
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.style={};this.clientWidth=400;this.offsetHeight=600;this.scrollTop=0;this.classList={toggle(){}};}
  append(child){this.children.push(child);}
  replaceChildren(...children){this.children=children;}
  setAttribute(){} addEventListener(){} removeEventListener(){}
  getBoundingClientRect(){return {top:0};}
  querySelector(tag){return this.children.find(x=>x.tag===tag);}
  getContext(){return {};}
 }
 let intersection,resize,disconnected=false;const calls=[];
 globalThis.document={createElement:tag=>new Element(tag)};globalThis.devicePixelRatio=2;
 globalThis.IntersectionObserver=class{constructor(cb){intersection=cb;}observe(){}disconnect(){disconnected=true;}};
 globalThis.ResizeObserver=class{constructor(cb){resize=cb;}observe(){}disconnect(){}};
 const state={page:1,zoom:1,closed:false,doc:{numPages:6,getPage:async n=>{calls.push(n);return {getViewport:({scale})=>({width:(n===6?800:400)*scale,height:600*scale}),render:()=>({promise:Promise.resolve(),cancel(){}})};}}};
 const area=new Element(),buttons=Object.fromEntries(['previous','next','minus','plus','fit','counter','zoomLabel'].map(k=>[k,new Element('button')]));let painted=0;
 await continuousClipReader({state,area,title:'PDF',...buttons,onFirstPaint:()=>painted++});
 const sheets=area.children[0].children;assert.equal(sheets.length,6);assert.deepEqual(calls,[1]);
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 intersection([{target:sheets[0],isIntersecting:true}]);await flush();assert.equal(painted,1);assert.equal(sheets[0].querySelector('canvas').width,800);
 const count=calls.length;resize();await flush();assert.equal(calls.length,count,'unchanged size does not render twice');
 intersection([{target:sheets[0],isIntersecting:false},{target:sheets[5],isIntersecting:true}]);await flush();assert.equal(sheets[0].children.length,0);assert.equal(sheets[5].style.aspectRatio,'800 / 600');assert.equal(calls.includes(2),false);
 state.disposeReader();assert.equal(disconnected,true);const last=calls.length;intersection([{target:sheets[0],isIntersecting:true}]);await flush();assert.equal(calls.length,last);
});
