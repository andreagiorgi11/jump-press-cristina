const sent=new Map();
export async function incident(code){
  console.error('[Jump Press]',code);
  const url=process.env.JUMP_ALERT_WEBHOOK_URL;
  if(!url || Date.now()-(sent.get(code)||0)<900000)return;
  sent.set(code,Date.now());
  try{await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project:'jump-press',code,at:new Date().toISOString()}),signal:AbortSignal.timeout(3000)});}catch{console.error('[Jump Press] alert_delivery_failed');}
}
export async function failure(error){
  const status=error.status || (error.name==='ZodError'?400:503);
  if(status>=500)await incident('editor_dependency_unavailable');
  return Response.json({error:status>=500?'Servizio temporaneamente non disponibile. I dati già salvati restano invariati.':error.message},{status,headers:{'Cache-Control':'no-store'}});
}
export function checked(result){
  if(result.error){
    const code=result.error.code;
    const status=code==='40001'?409:code==='42501'?403:code==='22023'?400:code==='P0002'?404:503;
    throw Object.assign(new Error(status===409?'La bozza è stata modificata da un altro editor. Ricaricala prima di salvare.':status===503?'Database non disponibile.':result.error.message),{status});
  }
  return result.data;
}
export function sameOrigin(request){
  const expected=new URL(request.url);
  // Next may use its internal hostname in request.url. Host is the browser's destination.
  if(request.headers.get('host'))expected.host=request.headers.get('host');
  if(request.headers.get('origin')!==expected.origin)throw Object.assign(new Error('Origine della richiesta non autorizzata.'),{status:403});
}
