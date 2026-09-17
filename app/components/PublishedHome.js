'use client';
import {useEffect,useState} from 'react';
import EditionView from './EditionView';
export default function PublishedHome({result,legacy}){
 const [last,setLast]=useState(result.rows?.[0]||null);
 useEffect(()=>{if(!result.unavailable)setLast(result.rows?.[0]||null);},[result]);
 const row=result.unavailable?last:result.rows?.[0];
 if(result.unavailable&&!row)return <main><section className="ranking"><h1 style={{color:'#222',fontSize:32}}>Rassegna temporaneamente non disponibile</h1><p>Non è stato possibile leggere l’edizione pubblicata. Riprova tra poco.</p></section></main>;
 if(!row)return legacy;
 return <main>{result.unavailable&&<p role="alert" style={{background:'#fff4ce',padding:18}}>Aggiornamento non disponibile. Stai visualizzando l’ultima versione caricata.</p>}<EditionView body={row.body}/></main>;
}
