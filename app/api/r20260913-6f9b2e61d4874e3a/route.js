export const dynamic = 'force-dynamic';
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== 'd3e7c10b1a5f4e8796c24e3a8bd7f051') {
    return new Response('Not found', { status: 404 });
  }
  const source = 'https://rassegna.dominiocliente.it/Areas/Rassegna/Elab/CheckedDownload.aspx?nome_file=PP_RAS_1626482_20260913_16361909.pdf';
  const upstream = await fetch(source, { cache: 'no-store', redirect: 'follow' });
  if (!upstream.ok) {
    return new Response(`Upstream error ${upstream.status}`, { status: 502 });
  }
  const bytes = await upstream.arrayBuffer();
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/pdf',
      'Content-Disposition': 'inline; filename="rassegna-juventus-2026-09-13.pdf"',
      'Cache-Control': 'private, no-store, max-age=0'
    }
  });
}
