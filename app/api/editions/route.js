import {requireEditor} from '../../../lib/server-client';
import {store,readIndex} from '../../../lib/github-store';
import {contentConfigured} from '../../../lib/config';
import {legacyEditionDates} from '../../../lib/archive-dates';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
// Lightweight list for the date menu: one head read plus the index. Editors also get unpublished drafts.
export async function GET(request){
 if(!contentConfigured())return Response.json({error:'Archivio non configurato.'},{status:503,headers});
 try{
  const index=await readIndex(store,await store.begin());
  let editor=false;try{const identity=await requireEditor(request);editor=['producer','editor','publisher'].includes(identity.role);}catch{}
  const published=new Map(index.published.map(p=>[p.edition_date,p]));
  const rows=new Map();
  for(const [date,p] of published)rows.set(date,{date,status:'published',href:editor?'/editor?draft='+encodeURIComponent(p.draft_id):'/edizioni/'+date});
  if(editor)for(const d of index.drafts)if(!published.has(d.body.date))rows.set(d.body.date,{date:d.body.date,status:'draft',href:'/editor?draft='+encodeURIComponent(d.id)});
  for(const date of legacyEditionDates)if(!rows.has(date))rows.set(date,{date,status:'published',href:'/archivio/'+date});
  return Response.json({editions:[...rows.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,40)},{headers});
 }catch{return Response.json({error:'Elenco non disponibile.'},{status:503,headers});}
}
