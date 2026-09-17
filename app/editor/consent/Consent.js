'use client';
import {useState} from 'react';
export default function Consent({requestToken,name,destination,canPublish}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function decide(decision){setBusy(true);setError('');try{const r=await fetch('/api/oauth/consent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request:requestToken,decision})});const data=await r.json();if(!r.ok)throw Error(data.error||'Collegamento non riuscito.');location.assign(data.url);}catch(e){setError(e.message);setBusy(false);}}
 return <main className="editor-main narrow"><p className="eyebrow">JUMP PRESS · COLLEGAMENTO IA</p><h1>Autorizza {name}</h1><section className="editor-card"><p>Il client potrà leggere PDF e bozze e modificarli con il tuo account. Il collegamento torna a <b>{destination}</b>.</p><p>Per l’automatismo del mattino scegli solo bozze. La pubblicazione va autorizzata soltanto per il ChatGPT usato per la revisione.</p>{error&&<p role="alert">{error}</p>}<div className="editor-actions"><button disabled={busy} onClick={()=>decide('drafts')}>Autorizza solo bozze</button>{canPublish&&<button disabled={busy} onClick={()=>decide('publish')}>Autorizza anche pubblicazione</button>}<button className="secondary" disabled={busy} onClick={()=>decide('deny')}>Nega</button></div></section></main>;
}
