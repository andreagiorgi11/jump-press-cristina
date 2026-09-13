import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260913_16361909.pdf';
const KEY = 'd3e7c10b1a5f4e8796c24e3a8bd7f051';

async function fetchPdf() {
  const upstream = await fetch(SOURCE, { cache: 'no-store', redirect: 'follow' });
  if (!upstream.ok) throw new Error(`Upstream error ${upstream.status}`);
  return { bytes: Buffer.from(await upstream.arrayBuffer()), contentType: upstream.headers.get('content-type') || 'application/pdf' };
}

function pagesFromMarkedText(text) {
  const re = /<<<PAGE:(\d+)>>>\n?/g;
  const matches = [...text.matchAll(re)];
  const pages = [];
  for (let i = 0; i < matches.length; i++) {
    const n = Number(matches[i][1]);
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    pages[n] = text.slice(start, end).trim();
  }
  return pages;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== KEY) return new Response('Not found', { status: 404 });
  try {
    const { bytes, contentType } = await fetchPdf();
    const mode = searchParams.get('mode') || 'pdf';
    if (mode === 'pdf') {
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': 'inline; filename="rassegna-juventus-2026-09-13.pdf"',
          'Cache-Control': 'private, no-store, max-age=0'
        }
      });
    }

    let pageNo = 0;
    const pagerender = async (pageData) => {
      pageNo += 1;
      const tc = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
      let lastY;
      let out = `<<<PAGE:${pageNo}>>>\n`;
      for (const item of tc.items) {
        const y = item.transform?.[5];
        if (lastY !== undefined && y !== lastY) out += '\n';
        out += item.str + ' ';
        lastY = y;
      }
      return out + '\n';
    };
    const parsed = await pdfParse(bytes, { pagerender });
    const pages = pagesFromMarkedText(parsed.text);
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    if (mode === 'meta') {
      return Response.json({ numpages: parsed.numpages, numrender: parsed.numrender, info: parsed.info || null, metadata: parsed.metadata || null, bytes: bytes.length });
    }

    if (q) {
      const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || 25)));
      const hits = [];
      for (let i = 1; i < pages.length; i++) {
        if ((pages[i] || '').toLowerCase().includes(q)) {
          hits.push({ page: i, text: pages[i] });
          if (hits.length >= limit) break;
        }
      }
      return Response.json({ q, hits });
    }

    const start = Math.max(1, Number(searchParams.get('start') || 1));
    const end = Math.min(parsed.numpages, Number(searchParams.get('end') || Math.min(start + 9, parsed.numpages)));
    const selected = [];
    for (let i = start; i <= end; i++) selected.push({ page: i, text: pages[i] || '' });
    return Response.json({ numpages: parsed.numpages, start, end, pages: selected });
  } catch (error) {
    return Response.json({ error: String(error?.stack || error) }, { status: 500 });
  }
}
