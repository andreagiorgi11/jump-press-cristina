import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {PDFDocument,StandardFonts} from 'pdf-lib';

const SECRET='test-secret-'+'x'.repeat(40);
async function samplePdf(pages){const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);for(let i=1;i<=pages;i++)doc.addPage([300,400]).drawText('Pagina '+i,{x:40,y:200,size:20,font});return doc.save();}
async function withServer(fn){
 const root=await mkdtemp(join(tmpdir(),'jp-files-')),port=33000+Math.floor(Math.random()*2000);
 const child=spawn(process.execPath,['services/jump-press-files/server.mjs'],{env:{...process.env,FILES_ROOT:root,FILES_SECRET:SECRET,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('exit',code=>reject(Error('server exit '+code)));});
 const saved={url:process.env.JUMP_FILES_URL,secret:process.env.JUMP_FILES_SECRET};
 process.env.JUMP_FILES_URL='http://127.0.0.1:'+port;process.env.JUMP_FILES_SECRET=SECRET;
 try{return await fn('http://127.0.0.1:'+port);}
 finally{child.kill();process.env.JUMP_FILES_URL=saved.url??'';process.env.JUMP_FILES_SECRET=saved.secret??'';if(!saved.url)delete process.env.JUMP_FILES_URL;if(!saved.secret)delete process.env.JUMP_FILES_SECRET;await rm(root,{recursive:true,force:true});}
}

test('file server stores privately, cuts only requested pages and serves signed links',async()=>{
 await withServer(async base=>{
  assert.equal((await fetch(base+'/notify-source',{method:'POST',body:'{}'})).status,401);
  const {blobs,usesFileServer,readSourcePages}=await import('../lib/blob-store.js');assert(usesFileServer());
  const id=randomUUID(),original='jump/imports/'+id+'/original.pdf',source=await samplePdf(12);
  await blobs.writeOriginal(original,source);
  await assert.rejects(blobs.writeOriginal(original,source),e=>e.status===409);
  await blobs.writeText('jump/imports/'+id+'/text.json',{pages:[{page:1,text:'ciao'}]});
  assert.deepEqual(await blobs.readText('jump/imports/'+id+'/text.json'),{pages:[{page:1,text:'ciao'}]});
  // Only the requested pages travel, in the requested order.
  const cut=await PDFDocument.load(await readSourcePages(blobs,original,[7,3]));assert.equal(cut.getPageCount(),2);
  await assert.rejects(readSourcePages(blobs,original,[13]),e=>e.status===400);
  // Clips are cut server side and never overwrite.
  const dest='jump/'+randomUUID()+'/'+randomUUID()+'.pdf';
  const clip=await blobs.clip(original,[4,5,6],dest);assert(clip.size>0&&clip.size<source.length);
  await blobs.exists(dest);assert.equal((await PDFDocument.load(await blobs.read(dest))).getPageCount(),3);
  await assert.rejects(blobs.clip(original,[1],dest),e=>e.status===409);
  // Without the secret nothing is readable; a signed link works until it expires and only for its path.
  assert.equal((await fetch(base+'/o/'+dest)).status,401);
  assert.equal((await fetch(base+'/o/'+dest,{headers:{Authorization:'Bearer wrong'}})).status,401);
  const link=await blobs.link(dest,60);const ok=await fetch(link);assert.equal(ok.status,200);assert.equal(ok.headers.get('content-type'),'application/pdf');
  assert.equal((await fetch(link.replace(dest,original))).status,403);
  assert.equal((await fetch(link.replace(/exp=\d+/,'exp='+(Date.now()-1000)))).status,403);
  assert.notEqual((await fetch(base+'/s/../../etc/passwd?exp=9999999999999&sig=x')).status,200);
  assert.equal((await fetch(base+'/s/jump/..%2F..%2Fetc%2Fpasswd?exp=9999999999999&sig=x')).status,400);
  // Large originals support byte seeking, including suffix/open-ended ranges, without weakening signatures.
  const originalLink=await blobs.link(original,60);
  for(const [range,start,end] of [['bytes=0-63',0,63],['bytes=100-',100,source.length-1],['bytes=-32',source.length-32,source.length-1],['bytes=0-999999',0,source.length-1]]){
   const part=await fetch(originalLink,{headers:{Range:range}});assert.equal(part.status,206);
   assert.equal(part.headers.get('content-range'),`bytes ${start}-${end}/${source.length}`);
   assert.equal(Number(part.headers.get('content-length')),end-start+1);
   assert.equal(part.headers.get('accept-ranges'),'bytes');
   assert.match(part.headers.get('access-control-expose-headers'),/Content-Range/);
   assert.deepEqual(new Uint8Array(await part.arrayBuffer()),source.slice(start,end+1));
  }
  for(const range of ['bytes=999999-','bytes=50-10','bytes=-0']){
   const part=await fetch(originalLink,{headers:{Range:range}});assert.equal(part.status,416);assert.equal(part.headers.get('content-range'),'bytes */'+source.length);assert.equal((await part.arrayBuffer()).byteLength,0);
  }
  for(const range of ['bytes=0-1,4-5','bad=0-10','bytes=wat'])assert.equal((await fetch(originalLink,{headers:{Range:range}})).status,200);
  const head=await fetch(originalLink,{method:'HEAD',headers:{Range:'bytes=0-63'}});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),source.length);assert.equal((await head.arrayBuffer()).byteLength,0);
  assert.equal((await fetch(originalLink.replace(/exp=\d+/,'exp='+(Date.now()-1000)),{headers:{Range:'bytes=0-63'}})).status,403);
  assert.equal((await fetch(base+'/o/'+original,{headers:{Range:'bytes=0-63'}})).status,401);
  assert.equal((await fetch(originalLink.replace(original,dest),{method:'HEAD'})).status,403);
  const preflight=await fetch(originalLink,{method:'OPTIONS'});assert.match(preflight.headers.get('access-control-allow-headers'),/Range/);
  // Signed client uploads accept only a PDF within the limit, once.
  const upload=await blobs.uploadLink('jump/'+randomUUID()+'/upload.pdf');
  assert.equal((await fetch(upload,{method:'PUT',body:'not a pdf'})).status,400);
  const uploaded=await fetch(upload,{method:'PUT',body:await samplePdf(1)});assert.equal(uploaded.status,200);assert.equal(uploaded.headers.get('access-control-allow-origin'),'*');
  assert.equal((await fetch(upload,{method:'PUT',body:await samplePdf(1)})).status,409);
  // Inventory for the storage indicator; deleting the original keeps the clip.
  const listed=(await blobs.list()).blobs.map(b=>b.pathname);assert(listed.includes(original)&&listed.includes(dest));
  await blobs.removeOriginal(original);await assert.rejects(blobs.readOriginal(original),e=>e.status===404);await blobs.exists(dest);
 });
});
