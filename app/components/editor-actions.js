// Shared redaction actions; all permissions remain enforced by the API.
export function sharedEditorActions(onRecovered){
 return {
  onTrash:async()=>{const r=await fetch('/api/editor?view=trash',{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'Cestino non disponibile');return data.drafts;},
  onRecover:async row=>{const r=await fetch('/api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'recover',id:row.id,version:row.version})});const data=await r.json();if(!r.ok)throw Error(data.error||'Ripristino non riuscito');if(onRecovered)onRecovered(data);else location.assign('/editor?draft='+encodeURIComponent(data.id));},
  onLogout:async()=>{const r=await fetch('/api/auth/logout',{method:'POST'});if(!r.ok)throw Error('Uscita non riuscita');location.assign('/');}
 };
}
