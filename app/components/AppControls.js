'use client';
import Link from 'next/link';
import EditorActions from './EditorActions';
import PublishConfirmation from './PublishConfirmation';
import {usePathname} from 'next/navigation';

export default function AppControls({onConfirm,confirmBusy=false,confirmDate,confirmVersion,isRevision=false,editorActions,onReaderPreview}){
 const pathname=usePathname();
 const inArchive=pathname.startsWith('/archivio')||pathname.startsWith('/edizioni/');
 const onArchiveIndex=pathname==='/archivio';
 const inNews=pathname.startsWith('/news');
 const inSocial=pathname.startsWith('/social');
 const refreshHome=()=>{if(editorActions||pathname==='/editor'||pathname==='/anteprima-locale'){window.location.reload();return;}window.location.replace('/?v='+Date.now())};
 const refreshNews=()=>{
  const url=new URL(window.location.href);
  url.searchParams.set('fresh',Date.now().toString());
  window.location.replace(url.pathname+'?'+url.searchParams.toString());
 };
 const refreshSocial=()=>{
  window.dispatchEvent(new CustomEvent('jump-social-refresh'));
 };

 if(onArchiveIndex&&!editorActions){
  return <div className="appcontrols"><Link className="backbutton" href="/">← <span>Indietro</span></Link></div>;
 }

 if(inArchive&&!editorActions){
  return <div className="appcontrols"><Link className="archivebutton" href="/archivio">Archivio</Link><Link className="backbutton" href="/">← <span>Indietro</span></Link></div>;
 }

 if(inSocial){
  return <div className="appcontrols"><button type="button" onClick={refreshSocial} aria-label="Aggiorna social">↻ <span>Aggiorna</span></button><Link className="backbutton" href="/">← <span>Indietro</span></Link></div>;
 }

 if(inNews){
  return <div className="appcontrols"><button type="button" onClick={refreshNews} aria-label="Aggiorna news">↻ <span>Aggiorna</span></button><Link className="backbutton" href="/">← <span>Indietro</span></Link></div>;
 }

 if(editorActions)return <div className="appcontrols editorial-toolbar" aria-label="Comandi editor"><EditorActions {...editorActions} showTrash={onArchiveIndex} date={confirmDate}/><div className="editorial-toolbar-links"><Link href="/archivio">Archivio</Link>{onReaderPreview&&<button type="button" onClick={onReaderPreview}>Anteprima lettore</button>}</div>{onConfirm&&<PublishConfirmation isRevision={isRevision} onConfirm={onConfirm} disabled={confirmBusy} date={confirmDate} version={confirmVersion}/>}</div>;
 return <div className="appcontrols homecontrols" aria-label="Navigazione rassegna"><Link className="archivebutton" href="/archivio">Archivio</Link><button type="button" onClick={refreshHome} aria-label="Aggiorna rassegna" title="Aggiorna rassegna">↻</button></div>;
}
