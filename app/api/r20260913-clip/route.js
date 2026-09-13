const KEY = 'b918f471e2c7469ba0f0c328d6460041';
const ALLOWED = new Set([
  '56-57',
  '50-51',
  '15-18',
  '34-37',
  '25-26',
  '42-44',
  '59',
  '29-30',
  '38-39',
  '58',
  '40',
  '41',
  '60',
  '78',
  '84',
  '389',
  '214',
  '89',
]);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== KEY) return new Response('Not found', { status: 404 });

  const pages = (searchParams.get('pages') || '').trim();
  if (!ALLOWED.has(pages)) return new Response('Not found', { status: 404 });

  const target = new URL(`/ritagli/2026-09-13/p${pages}.pdf`, request.url);
  return new Response(null, {
    status: 302,
    headers: {
      location: target.toString(),
      'cache-control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
    },
  });
}
