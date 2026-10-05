import {store,problem} from './github-store.js';
import {blobs} from './blob-store.js';
import {getManualSource} from './manual-source.js';
import {incident} from './errors.js';
export async function notifyManualSource(ctx,id){
 if(!['editor','publisher'].includes(ctx.role)||ctx.automation)throw problem(403,'Invio riservato alla redazione.');
 const r=ctx.store||store,row=await getManualSource(ctx,id);
 if(row.status!=='ready')throw problem(422,'Completa prima la preparazione dei PDF.');
 if(row.notification?.status==='sent')return {status:'sent',acceptedAt:row.notification.acceptedAt};
 const send=ctx.notifySource||(ctx.blobs||blobs).notifySource;
 if(!send)throw problem(422,'Invio email non configurato. I PDF restano conservati.');
 let result;
 try{result=await send({importId:id,date:row.date});if(result?.status!=='sent')throw problem(503,'Invio non confermato.');}
 catch(e){await incident('source_notification_failed');throw e.status?e:problem(503,'Invio non confermato. I PDF sono conservati; ricontrolla prima di riprovare.');}
 const h=await r.begin(),current=await r.read('imports/'+id+'.json',h);if(!current)throw problem(503,'Fonte non leggibile dopo invio.');current.notification={status:'sent',acceptedAt:result.acceptedAt};await r.commit({['imports/'+id+'.json']:current},h,'Notifica manuale accettata dal server SMTP');
 return {status:'sent',acceptedAt:current.notification.acceptedAt};
}
