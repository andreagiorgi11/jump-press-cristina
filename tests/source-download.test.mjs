import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {downloadSource,checkPage} from '../lib/source-download.js';
const url='https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260917_16377886.pdf';
const pdf=Buffer.from('%PDF-1.7 test');
// Real page returned by Ecostampa on 24 Sep 2026 for an expired link.
const expired=await readFile(new URL('./fixtures/ecostampa-file-non-presente.html',import.meta.url));
const pending=Buffer.from(expired.toString('utf8').replace('Il file non è più presente.','Il file è in preparazione, riprova tra qualche minuto.'));
const clock=()=>{let t=0;return {now:()=>t,sleep:async ms=>{t+=ms;}};};
const seq=responses=>{const calls=[];return {calls,fetchOnce:async target=>{calls.push(target);const r=responses.shift();if(r instanceof Error)throw r;return r;}};};
test('riconosce la pagina reale "file non più presente"',()=>{
 const page=checkPage(expired.toString('utf8'));
 assert.equal(page.known,true);assert.equal(page.gone,true);assert.equal(page.message,'Il file non è più presente.');assert.equal(page.link,null);
});
test('attende il PDF in preparazione e lo scarica appena pronto',async()=>{
 const c=clock(),s=seq([{status:200,bytes:pending},{status:200,bytes:pending},{status:302,location:'/rasimg/pdf_rs/clienti/PP_RAS_1626482_20260917_16377886.pdf'},{status:200,bytes:pdf}]);
 const r=await downloadSource(url,'2026-09-17',{...c,fetchOnce:s.fetchOnce});
 assert.equal(r.bytes.toString(),pdf.toString());assert.equal(s.calls.length,4);assert.equal(c.now(),30000);
});
test('dopo il tempo massimo restituisce un errore chiaro con il messaggio Ecostampa',async()=>{
 const c=clock(),s=seq(Array.from({length:20},()=>({status:200,bytes:pending})));
 await assert.rejects(downloadSource(url,'2026-09-17',{...c,fetchOnce:s.fetchOnce}),e=>e.status===422&&/non ancora disponibile/.test(e.message)&&/in preparazione/.test(e.message)&&/retry/.test(e.message));
 assert.ok(c.now()<=120000);assert.equal(s.calls.length,9);
});
test('link scaduto: errore immediato, nessuna attesa',async()=>{
 const c=clock(),s=seq([{status:200,bytes:expired}]);
 await assert.rejects(downloadSource(url,'2026-09-17',{...c,fetchOnce:s.fetchOnce}),e=>e.status===410&&/non è più presente/.test(e.message));
 assert.equal(c.now(),0);
});
test('pagina sconosciuta (es. blocco firewall): errore con estratto, nessuna attesa',async()=>{
 const c=clock(),s=seq([{status:200,bytes:Buffer.from('<html><title>Access denied</title><body>blocked</body></html>')}]);
 await assert.rejects(downloadSource(url,'2026-09-17',{...c,fetchOnce:s.fetchOnce}),e=>e.status===422&&/Access denied/.test(e.message));
 assert.equal(c.now(),0);
});
test('segue il link PDF incorporato nella pagina di controllo, solo sul dominio consentito',async()=>{
 const withLink=Buffer.from(pending.toString('utf8').replace('</form>','<a href="/rasimg/pdf_rs/clienti/PP_RAS_1626482_20260917_16377886.pdf">PDF</a></form>'));
 const s=seq([{status:200,bytes:withLink},{status:200,bytes:pdf}]);
 const r=await downloadSource(url,'2026-09-17',{...clock(),fetchOnce:s.fetchOnce});
 assert.equal(r.bytes.toString(),pdf.toString());assert.equal(s.calls[1],'https://rassegna.dominiocliente.it/rasimg/pdf_rs/clienti/PP_RAS_1626482_20260917_16377886.pdf');
 const other=seq([{status:302,location:'https://evil.example/PP_RAS_1626482_20260917_16377886.pdf'}]);
 await assert.rejects(downloadSource(url,'2026-09-17',{...clock(),fetchOnce:other.fetchOnce}),e=>e.status===400);
});
test('un errore di rete viene ritentato una volta',async()=>{
 const s=seq([Object.assign(Error('dns'),{code:6}),{status:200,bytes:pdf}]);
 const r=await downloadSource(url,'2026-09-17',{...clock(),fetchOnce:s.fetchOnce});
 assert.equal(r.bytes.toString(),pdf.toString());
});
