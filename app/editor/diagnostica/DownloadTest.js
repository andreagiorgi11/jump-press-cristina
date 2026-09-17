 'use client';
import {useState} from 'react';
export default function DownloadTest(){const [busy,setBusy]=useState(false),[result,setResult]=useState(null);
async function run(){setBusy(true);setResult(null);try{const r=await fetch('/api/editor/download-test',{method:'POST'});setResult(await r.json());}catch{setResult({error:'Risposta non ricevuta. Verificare i log prima di ripetere.'});}finally{setBusy(false);}}
return <main className="editor-main narrow"><h1>Prova download Ecostampa</h1><p>PDF del 17 settembre. Download temporaneo sul server, nessuna modifica a bozze o pubblicazioni.</p><button disabled={busy} onClick={run}>{busy?'Verifica in corso…':'Avvia prova sul server'}</button>{result&&<pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(result,null,2)}</pre>}</main>;}
