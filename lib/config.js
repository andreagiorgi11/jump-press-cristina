export const isNews = () => process.env.NEXT_PUBLIC_JUMP_SITE === 'news';
export const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export function settings() {
  if (!configured()) throw Object.assign(new Error('Area editor non ancora configurata. Servono database e autenticazione.'), {status:503});
  return {url:process.env.NEXT_PUBLIC_SUPABASE_URL, key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY};
}
export function siteUrl() {
  const value=process.env.JUMP_PUBLIC_URL;
  if (!value) throw Object.assign(new Error('Indirizzo pubblico MCP non configurato.'), {status:503});
  return new URL(value).origin;
}
