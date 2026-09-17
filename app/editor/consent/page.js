import {redirect} from 'next/navigation';
import Consent from './Consent';import {verify} from '../../../lib/auth.js';import {requireEditor} from '../../../lib/server-client.js';
export default async function ConsentPage({searchParams}){
 const {request}=await searchParams;let flow;
 try{flow=await verify(request,'oauth-request');await verify(flow.clientId,'oauth-client');}catch{return <main className="editor-main narrow"><h1>Richiesta scaduta</h1><p>Ricollega Jump Press dal client IA.</p></main>;}
 let identity;try{identity=await requireEditor();}catch(e){if(e.status===401)redirect('/editor?returnTo='+encodeURIComponent('/editor/consent?request='+encodeURIComponent(request)));return <main className="editor-main narrow"><h1>Accesso non disponibile</h1><p>Controlla che il tuo account sia abilitato alla redazione.</p></main>;}
 return <Consent requestToken={request} name={flow.name} destination={new URL(flow.redirectUri).hostname} canPublish={identity.role==='publisher'&&flow.scope.split(' ').includes('publish')}/>;
}
