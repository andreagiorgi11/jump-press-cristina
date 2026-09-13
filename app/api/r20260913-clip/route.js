import { PDFDocument } from 'pdf-lib';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260913_16361324.pdf';
const KEY = 'b918f471e2c7469ba0f0c328d6460041';

function parsePages(value='') {
  const out = [];
  for (const part of value.split(',').map(x=>x.trim()).filter(Boolean)) {
    if (part.includes('-')) {
      const [a,b] = part.split('-').map(Number);
      if (Number.isInteger(a) && Number.isInteger(b)) {
        for (let p=Math.min(a,b); p<=Math.max(a,b); p++) out.push(p);
      }
    } else {
      const p = Number(part);
      if (Number.isInteger(p)) out.push(p);
    }
  }
  return [...new Set(out)].filter(p=>p>=1 && p<=409).slice(0,12);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== KEY) return new Response('Not found', { status: 404 });
  const pages = parsePages(searchParams.get('pages') || '');
  if (!pages.length) return new Response('Missing pages', { status: 400 });
  try {
    const upstream = await fetch(SOURCE, { cache: 'no-store', redirect: 'follow' });
    if (!upstream.ok) throw new Error(`Upstream error ${upstream.status}`);
    const src = await PDFDocument.load(await upstream.arrayBuffer(), { ignoreEncryption: true });
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, pages.map(p=>p-1));
    copied.forEach(p=>out.addPage(p));
    const bytes = await out.save();
    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="juventus-2026-09-13-p${pages.join('-')}.pdf"`,
        'cache-control': 'private, no-store, max-age=0'
      }
    });
  } catch (e) {
    return Response.json({ error: String(e?.stack || e) }, { status: 500 });
  }
}
