'use client';
import {useEffect,useState} from 'react';
import {browserClient} from '../../../lib/browser-client';
export default function Consent({ready,authorizationId}){
 const [details,setDetails]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!ready||!authorizationId)return;let alive=true;
 (async()=>{try{
  const auth=await fetch('/api/editor',{cache:'no-store'});
  if(auth.status===401){location.replace('/editor?returnTo='+encodeURIComponent('/editor/consent?authorization_id='+encodeURIComponent(authorizationId)));return;}
  if(!auth.ok)throw new Error('Account editor non autorizzato o servizio non disponibile.');
  const {data,error}=await browserClient().auth.oauth.getAuthorizationDetails(authorizationId);
  if(error)throw error;
  if(data.redirect_url){location.assign(data.redirect_url);return;}
  if(alive)setDetails(data);
 }catch(e){if(alive)setError(e.message);}})();return()=>{alive=false;};},[ready,authorizationId]);
 async function decide(approve){setBusy(true);try{
  const sdk=browserClient();const {data,error}=await (approve?sdk.auth.oauth.approveAuthorization(authorizationId,{skipBrowserRedirect:true}):sdk.auth.oauth.denyAuthorization(authorizationId,{skipBrowserRedirect:true}));
  if(error)throw error;if(data?.redirect_url)location.assign(data.redirect_url);
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <main className="editor-main narrow"><p className="eyebrow">JUMP PRESS · COLLEGAMENTO IA</p><h1>Autorizza il collegamento</h1>
 {!ready?<p role="status">Collegamento non ancora configurato.</p>:error?<p role="alert">{error}</p>:!details?<p>Verifica della richiesta…</p>:<section className="editor-card"><h2>{details.client?.name||'Applicazione IA'}</h2><p>L’applicazione potrà leggere fonti e bozze e modificarle con i tuoi permessi. Se puoi pubblicare, potrà farlo su tua richiesta esplicita.</p><p>Permessi OAuth richiesti: {details.scope||'Accesso editor'}</p><p>Destinazione: {details.redirect_uri}</p><div className="editor-actions"><button disabled={busy} onClick={()=>decide(true)}>Autorizza</button><button className="secondary" disabled={busy} onClick={()=>decide(false)}>Nega</button></div></section>}</main>;
}
