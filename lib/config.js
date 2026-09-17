export const isNews=()=>process.env.NEXT_PUBLIC_JUMP_SITE==='news';
export const contentConfigured=()=>Boolean(process.env.JUMP_CONTENT_REPO&&process.env.JUMP_GITHUB_TOKEN);
export const configured=()=>Boolean(contentConfigured()&&process.env.JUMP_GITHUB_CLIENT_ID&&process.env.JUMP_GITHUB_CLIENT_SECRET&&process.env.JUMP_SESSION_SECRET&&process.env.JUMP_GITHUB_MEMBERS);
export function siteUrl(){
 const url=new URL(process.env.JUMP_PUBLIC_URL||'http://127.0.0.1:3015');
 if(process.env.VERCEL&&url.protocol!=='https:')throw Object.assign(new Error('Configura JUMP_PUBLIC_URL con il dominio HTTPS.'),{status:503});
 return url.origin;
}
