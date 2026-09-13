export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KEY = 'b918f471e2c7469ba0f0c328d6460041';
const CLIPS = {
  milik: 'https://rassegna.dominiocliente.it/imm3pdf/Image.aspx?&imgatt=NBC1PQ&imganno=2026&imgkey=B1ZF06MEYZ8K0&rsdoc=2&tiplink=4&bb=3'
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== KEY) return new Response('Not found', { status: 404 });
  const name = searchParams.get('name') || 'milik';
  const source = CLIPS[name];
  if (!source) return new Response('Unknown clip', { status: 404 });
  try {
    const r = await fetch(source, { cache: 'no-store', redirect: 'follow' });
    const buf = Buffer.from(await r.arrayBuffer());
    return new Response(buf, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'text/plain; charset=utf-8', 'cache-control':'private, no-store' } });
  } catch (e) {
    return Response.json({ error: String(e?.stack || e) }, { status: 500 });
  }
}
