const site = process.env.JUMP_SITE || 'press';
if (!['press', 'news'].includes(site)) throw new Error('JUMP_SITE must be press or news');
export default {
  ...(process.env.JUMP_SUMMARY_SANDBOX === '1' ? {devIndicators:false} : {}),
  serverExternalPackages:['pdfjs-dist','@napi-rs/canvas'],
  outputFileTracingIncludes:{'/*':['./node_modules/pdfjs-dist/package.json','./node_modules/pdfjs-dist/legacy/build/**','./node_modules/pdfjs-dist/standard_fonts/**','./node_modules/pdfjs-dist/cmaps/**','./node_modules/pdfjs-dist/wasm/**','./node_modules/@napi-rs/canvas*/**','./public/brand/**','./public/testate/**']},
  distDir: process.env.JUMP_SUMMARY_SANDBOX === '1' ? '.next-summary' : site === 'news' && !process.env.VERCEL ? '.next-news' : '.next',
  env: { NEXT_PUBLIC_JUMP_SITE: site, NEXT_PUBLIC_JUMP_APPROVAL_LIVE: process.env.JUMP_APPROVAL_LIVE||'0' },
};


