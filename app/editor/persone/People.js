'use client';
import InterestDialog from '../../components/InterestDialog';
export default function People(){
 return <main className="editor-main narrow"><a className="editor-brand" href="/editor">JUMP <b>PRESS</b></a><p className="eyebrow">PRIORITÀ DELLA REDAZIONE</p><h1>Persone di interesse</h1><p className="editor-intro">Le firme e i protagonisti da seguire nelle prossime rassegne.</p><button onClick={()=>window.dispatchEvent(new CustomEvent('jump-open-interests'))}>Apri elenco</button><p><a className="editor-return" href="/editor">← Torna alla rassegna</a></p><InterestDialog openOnMount/></main>;
}
