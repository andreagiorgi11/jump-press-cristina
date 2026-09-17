const site = process.env.JUMP_SITE || 'press';
if (!['press', 'news'].includes(site)) throw new Error('JUMP_SITE must be press or news');
export default {
  serverExternalPackages:['pdfjs-dist','@napi-rs/canvas'],
  outputFileTracingIncludes:{'/*':['./node_modules/pdfjs-dist/legacy/build/**','./node_modules/pdfjs-dist/standard_fonts/**','./node_modules/pdfjs-dist/cmaps/**','./node_modules/pdfjs-dist/wasm/**','./node_modules/@napi-rs/canvas*/**']},
  distDir: site === 'news' && !process.env.VERCEL ? '.next-news' : '.next',
  env: { NEXT_PUBLIC_JUMP_SITE: site },
};
