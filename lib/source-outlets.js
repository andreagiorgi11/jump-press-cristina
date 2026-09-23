import {outletKey} from './coverage-stats.js';
// Ecostampa's index lists every item, including front pages. Reject partial parsing.
export function extractSourceOutlets(pages){
 const index=pages.filter(p=>p.text.includes('Sommario Rassegna Stampa'));
 if(!index.length)return null;
 const outlets=new Map();
 for(const page of index){
  const dates=page.text.match(/\d{2}\/\d{2}\/\d{4}/g)||[];
  const rows=[...page.text.matchAll(/^[ \t]*[\d+/,.-]+[ \t]+([^\d\n][^\n]*?(?:\n(?!\d)[^\n]*?)?)[ \t\n]+\d{2}\/\d{2}\/\d{4}/gm)];
  if(!dates.length||rows.length!==dates.length)return null;
  for(const row of rows){const name=row[1].replace(/\s+/g,' ').trim();outlets.set(outletKey(name),name);}
 }
 return [...outlets.values()];
}
