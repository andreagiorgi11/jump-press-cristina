import {editorRequest} from './save-recovery.js';
export async function publicationWithRecovery(action,draft,options){
 if(!['publish','withdraw'].includes(action))throw new Error('Operazione non valida.');
 try{
  const result=await editorRequest({action,id:draft.id,version:draft.version,confirmation:action==='publish'?'PUBBLICA':'RITIRA_E_MODIFICA'},options);
  return action==='withdraw'?result:{...draft,withdrawnAt:undefined,publishedVersions:[...new Set([...(draft.publishedVersions||[]),draft.version])],translationMail:result?.translationMail};
 }catch(error){
  if(error.status&&error.status!==409&&error.status<500)throw error;
  let state;
  try{state=await editorRequest(draft.id,{...options,readParameter:'publication',timeout:15000});}
  catch{throw new Error('Esito non verificabile: la connessione è stata interrotta. Ricarica la rassegna per controllarne lo stato prima di ripetere l’operazione.');}
  const latest=state.draft,row=state.publication;
  if(latest?.id!==draft.id||!Number.isInteger(latest.version)||latest.version<draft.version)throw new Error('Stato della rassegna non verificabile. Ricarica la pagina.');
  if(action==='publish'&&row?.draft_id===draft.id&&row.version===draft.version)return latest;
  if(action==='withdraw'&&row===null&&latest.withdrawnAt&&latest.version>draft.version)return latest;
  throw Object.assign(new Error('L’operazione non risulta confermata nello stato attuale. La rassegna potrebbe essere stata modificata nel frattempo: controlla la versione aggiornata prima di riprovare.'),{draft:latest});
 }
}
