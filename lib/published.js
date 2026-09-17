import {store,readIndex,problem} from './github-store.js';
import {incident} from './errors.js';
import {contentConfigured} from './config.js';
export async function publishedEditions(date){
 if(!contentConfigured())return {configured:false,rows:[],unavailable:false};
 try{const head=await store.begin(),index=await readIndex(store,head);const rows=date?index.published.filter(x=>x.edition_date===date):index.published;
  if(rows.length){const first=await store.read('published/'+rows[0].edition_date+'.json',head);if(!first)throw problem(503,'Edizione pubblicata non disponibile.');rows[0]=first;}
  return {configured:true,rows,unavailable:false};
 }catch{await incident('published_read_unavailable');return {configured:true,rows:null,unavailable:true};}
}
