import {publicClient} from './server-client';
import {checked,incident} from './errors';
import {configured} from './config';
export async function publishedEditions(date){
 if(!configured())return {configured:false,rows:[],unavailable:false};
 try{
  let query=publicClient().from('jump_published').select('edition_date,version,body,published_at').order('edition_date',{ascending:false}).limit(366);
  if(date)query=query.eq('edition_date',date);
  return {configured:true,rows:checked(await query),unavailable:false};
 }catch{await incident('published_read_unavailable');return {configured:true,rows:null,unavailable:true};}
}
