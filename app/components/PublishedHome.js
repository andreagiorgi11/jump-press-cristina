'use client';
import {useEffect,useState} from 'react';
import EditionView from './EditionView';
import ApprovalEdition from './ApprovalEdition';
export default function PublishedHome({result,today,legacy}){
 const [last,setLast]=useState(result.rows?.[0]||null);
 useEffect(()=>{if(!result.unavailable)setLast(result.rows?.[0]||null);},[result]);
 const row=result.unavailable?last:result.rows?.[0];
 if(result.unavailable&&!row)return <main><section className="ranking"><h1 style={{color:'#222',fontSize:32}}>Rassegna temporaneamente non disponibile</h1><p>Non è stato possibile leggere l’edizione pubblicata. Riprova tra poco.</p></section></main>;
 if(!row)return process.env.NEXT_PUBLIC_JUMP_APPROVAL_LIVE==='1'?<main><h1>Nessuna rassegna pubblicata</h1><p>La prossima rassegna sarà disponibile dopo la conferma della redazione.</p><a href='/editor'>Accesso redazione</a></main>:legacy;
 if(process.env.NEXT_PUBLIC_JUMP_APPROVAL_LIVE==='1')return <>{result.unavailable&&<p role='alert'>Aggiornamento non disponibile. Stai visualizzando l’ultima versione caricata.</p>}<ApprovalEdition body={row.body} today={today}/></>;
 return <main>{result.unavailable&&<p role="alert" style={{background:'#fff4ce',padding:18}}>Aggiornamento non disponibile. Stai visualizzando l’ultima versione caricata.</p>}<EditionView body={row.body}/></main>;
}
