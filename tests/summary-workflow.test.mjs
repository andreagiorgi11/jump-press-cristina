import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {editionSchema,executiveSummarySchema,summaryAreas} from '../lib/schema.js';
import {saveDraft,publicBody} from '../lib/editor-service.js';
import {validateSummaryReady} from '../lib/summary-workflow.js';
import {readInstructions} from '../lib/editorial-instructions.js';
import {MemoryStore} from './helpers.mjs';
const summary=()=>({intro:'La Juventus prepara la prossima gara.',sections:summaryAreas.map((title,i)=>({title,items:i===0?['Preparazione: la squadra lavora in vista della prossima gara.']:[]}))});
const body=()=>editionSchema.parse({editorialModel:'summary-v1',executiveSummary:summary(),date:'2026-09-18',title:'Rassegna',intro:'La giornata Juventus.',keyPoints:['Preparazione','Disponibilità','Avversario'],articles:[{id:randomUUID(),category:summaryAreas[0],title:'La preparazione',outlet:'Testata',summary:'La squadra si prepara.'}]});
test('Summary validates named areas, order and maximum five mens topics',()=>{
 const s=summary();assert(executiveSummarySchema.safeParse(s).success);s.sections[0].items=Array(6).fill('Tema: descrizione');assert(!executiveSummarySchema.safeParse(s).success);
 const reversed=summary();reversed.sections.reverse();assert(!executiveSummarySchema.safeParse(reversed).success);
});
test('Summary persists, survives asset attachment and is invalidated after editorial changes',async()=>{
 const ctx={role:'editor',user:{id:'test'},store:new MemoryStore(),editorialModel:'summary-v1'},id=randomUUID();
 let d=await saveDraft(ctx,id,0,body());assert.deepEqual(d.body.executiveSummary,summary());assert.deepEqual(publicBody(d.body).executiveSummary,summary());
 d.body.articles[0].clipId=randomUUID();d=await saveDraft(ctx,id,1,d.body);assert(d.body.executiveSummary);
 d.body.articles[0].summary='La squadra cambia preparazione.';d=await saveDraft(ctx,id,2,d.body);assert.equal(d.body.executiveSummary,null);await assert.rejects(validateSummaryReady(d.body),/Summary mancante/);
});
test('Readiness rejects empty, wrong categories and overflowing Summary; legacy is unaffected',async()=>{
 const b=body();await validateSummaryReady(b);const empty=body();empty.executiveSummary.sections.forEach(s=>s.items=[]);await assert.rejects(validateSummaryReady(empty),/highlights/);
 b.articles[0].category='Editoriali';await assert.rejects(validateSummaryReady(b),/quattro aree/);
 const long=body();long.executiveSummary.sections[1].items=Array(30).fill('Un tema lungo: '+ 'Testo verificato. '.repeat(20));await assert.rejects(validateSummaryReady(long),/supera una pagina/);
 await validateSummaryReady({articles:[]});
});
test('Summary instructions selected only for the new profile',async()=>{
 const ctx={role:'editor',user:{id:'test'},store:new MemoryStore()};
 const old=await readInstructions(ctx),next=await readInstructions({...ctx,editorialModel:'summary-v1'});
 assert.equal(old.editorialModel,undefined);assert.equal(next.editorialModel,'summary-v1');assert(next.text.includes('CAMPO executiveSummary'));assert(!next.text.includes('editoriali consecutivi all’inizio'));assert(next.text.includes('claim_automation_run'));
});

test('Summary survives older clients omitting it, but changed relevance or attribution invalidates it',async()=>{
 for(const patch of [{rating:5},{outlet:'Altra testata'},{author:'Firma verificata'},{sourceId:randomUUID()}]){
  const ctx={role:'editor',user:{id:'test'},store:new MemoryStore(),editorialModel:'summary-v1'},id=randomUUID();
  let d=await saveDraft(ctx,id,0,body());
  const omitted=structuredClone(d.body);delete omitted.executiveSummary;delete omitted.editorialModel;
  d=await saveDraft(ctx,id,d.version,omitted);assert.deepEqual(d.body.executiveSummary,summary());assert.equal(d.version,1);
  Object.assign(omitted.articles[0],patch);
  d=await saveDraft(ctx,id,d.version,omitted);assert.equal(d.body.executiveSummary,null);assert.equal(d.body.editorialModel,'summary-v1');
 }
});

test('Full PDF exports without workstation font files',async()=>{
 const {exportEditionPdf}=await import('../lib/summary-pdf.js');
 const {PDFDocument}=await import('pdf-lib');
 const bytes=await exportEditionPdf(body());
 const pdf=await PDFDocument.load(bytes);assert(pdf.getPageCount()>=2);
});

test('Key points support variable counts and preserve historical unlabelled text',async()=>{
 const {parseKeyPoint,formatKeyPoint}=await import('../lib/key-point-signals.js');
 assert.deepEqual(parseKeyPoint('Positivo: Recupero verificato'),{kind:'positivo',text:'Recupero verificato'});
 assert.deepEqual(parseKeyPoint('Negativo: Emergenza portiere'),{kind:'negativo',text:'Emergenza portiere'});
 assert.deepEqual(parseKeyPoint('Risultato negativo secondo il commentatore'),{kind:'neutro',text:'Risultato negativo secondo il commentatore'});
 assert.equal(formatKeyPoint('negativo','Tema'),'Negativo: Tema');
 for(const count of [1,2,4,5]){const b=body();b.keyPoints=Array(count).fill('Positivo: Recupero verificato');await validateSummaryReady(b);}
 const empty=body();empty.keyPoints=[];await assert.rejects(validateSummaryReady(empty),/uno a cinque/);
});

test('Full PDF omits operating counters, retains signals and paginates long points',async()=>{
 const {exportEditionPdf}=await import('../lib/summary-pdf.js');
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const b=body();b.keyPoints=['Positivo: Recupero verificato','Negativo: Emergenza portiere'];
 const read=async bytes=>{const loading=getDocument({data:bytes,useSystemFonts:true});const doc=await loading.promise;let text='';for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i);const content=await p.getTextContent();text+=content.items.map(x=>x.str).join(' ')+'\n';}const pages=doc.numPages;await loading.destroy();return {text,pages};};
 const regular=await read(await exportEditionPdf(b));
 assert(!/Voci esaminate|Prime pagine verificate|I numeri dell/.test(regular.text));
 assert.match(regular.text,/Segnali positivi/i);assert.match(regular.text,/Segnali di criticità/i);assert.match(regular.text,/La squadra si prepara/);
 assert.match(regular.text,/Juventus in prima pagina/);assert.match(regular.text,/I temi della giornata/);assert.match(regular.text,/La giornata in sintesi/);assert(!/Sentiment Juventus|I temi e i punti chiave|La Juventus sulle prime pagine/.test(regular.text));
 b.keyPoints=Array.from({length:5},(_,i)=>`Negativo: Tema ${i+1}. ${'Contenuto da verificare nelle fonti. '.repeat(24)} Fine punto ${i+1}.`);
 const long=await read(await exportEditionPdf(b));assert(long.pages>regular.pages);
 for(let i=1;i<=5;i++)assert.match(long.text,new RegExp(`Fine punto ${i}`));
});
