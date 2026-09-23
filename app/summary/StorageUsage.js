'use client';
import {useEffect,useState} from 'react';
const bytes=value=>new Intl.NumberFormat('it-IT',{maximumFractionDigits:1}).format(value/1024/1024)+' MB';
export default function StorageUsage({open,onLevel}){
 const [allowed,setAllowed]=useState(false),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/auth/session',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(s=>{if(active)setAllowed(s.authenticated&&['editor','publisher'].includes(s.role));}).catch(()=>{});return()=>{active=false;};},[]);
 useEffect(()=>{
  if(!allowed)return;let active=true;setLoading(true);
  fetch('/api/editor/storage',{cache:'no-store'}).then(async r=>{const result=await r.json();if(!r.ok)throw Error(result.error||'Spazio non disponibile.');return result;}).then(result=>{if(active){setData(result);setError(result.error||'');onLevel(result.stale?'unknown':result.level);}}).catch(e=>{if(active){setError(e.message);onLevel('unknown');}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[allowed,open,onLevel]);
 if(!allowed)return null;
 const parts=[['originals','PDF originali'],['articlePdfs','Ritagli e PDF caricati'],['other','Testi e altri file']];
 return <section className="storage-usage" aria-labelledby="storage-title">
  <div className="storage-heading"><h3 id="storage-title">Spazio per PDF e ritagli</h3><span>SOLO EDITOR</span></div>
  <p className="storage-scope">Archivio complessivo · tutte le rassegne</p>
  {loading&&!data&&<p role="status">Calcolo dello spazio…</p>}
  {error&&<p className="storage-warning" role="alert">{error}{data&&!data.stale?' Ultima misurazione conservata.':''}</p>}
  {data&&<><div className="storage-total"><strong>{bytes(data.totalBytes)}</strong><span>{data.limitBytes?'di '+bytes(data.limitBytes):'occupati'}</span></div>
   {data.limitBytes?<><progress aria-label="Spazio occupato" max={data.limitBytes} value={data.totalBytes}/><p>{bytes(data.remainingBytes)} disponibili rispetto al limite configurato.</p></>:<div className="storage-composition" aria-hidden="true">{parts.map(([key])=><span key={key} className={'storage-'+key} style={{width:(data.totalBytes?100*data.totals[key]/data.totalBytes:0)+'%'}}/>)}</div>}
   <dl>{parts.map(([key,label])=><div key={key}><dt><i className={'storage-'+key}/>{label}<small>{data.counts[key]} file</small></dt><dd>{bytes(data.totals[key])}</dd></div>)}</dl>
   {['warning','critical'].includes(data.level)&&<p className="storage-warning">{data.level==='critical'?'Spazio quasi esaurito':'Spazio in esaurimento'}: utilizzato almeno il {data.level==='critical'?'90':'80'}% del limite configurato.</p>}
   {!data.limitBytes&&<p className="storage-note">Limite dello storage non disponibile: non è possibile indicare spazio residuo o rischio di esaurimento. La barra mostra la ripartizione dei file.</p>}
   <p className="storage-note">Rilevato il {new Date(data.measuredAt).toLocaleString('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}{loading?' · Aggiornamento…':''}.</p>
  </>}
 </section>;
}
