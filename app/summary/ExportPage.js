'use client';
import {useRef,useState} from 'react';
import EditorActions from '../components/EditorActions';
import PdfPreview from './PdfPreview';
export default function ExportPage(){
 const [pdf,setPdf]=useState(false),[reader,setReader]=useState(false);const archive=useRef(null);
 return <>{reader?<div className="appcontrols reader-preview-controls"><span>Anteprima lettore</span><button onClick={()=>setReader(false)}>Torna all’editor</button></div>:<div className="appcontrols editorial-toolbar summary-toolbar" aria-label="Comandi editor"><EditorActions demo onLogout={()=>setReader(true)}/><div className="editorial-toolbar-links"><button onClick={()=>archive.current.showModal()}>Archivio</button><button onClick={()=>setReader(true)}>Anteprima lettore</button><button className="summary-pdf-button" onClick={()=>setPdf(true)}>Esporta PDF</button></div></div>}
 <dialog ref={archive} className="publish-dialog" aria-label="Archivio locale"><p className="publish-dialog-label">PROGETTO PARALLELO · ARCHIVIO LOCALE</p><h2>Rassegne</h2><p>18 settembre 2026 · Copia della rassegna pubblicata</p><p>In questa prova è disponibile soltanto il campione del 18. L’archivio online resta separato.</p><div className="publish-dialog-actions"><button onClick={()=>archive.current.close()}>Torna alla rassegna</button></div></dialog>{pdf&&<PdfPreview onClose={()=>setPdf(false)}/>}</>;
}
