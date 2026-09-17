const site = process.env.JUMP_SITE || 'press';
if (!['press', 'news'].includes(site)) throw new Error('JUMP_SITE must be press or news');
export default {
  distDir: site === 'news' ? '.next-news' : '.next',
  env: { NEXT_PUBLIC_JUMP_SITE: site },
};
