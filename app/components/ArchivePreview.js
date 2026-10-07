import {tr} from '../../lib/i18n';
// Suspense streams these optional details after the date/link cards are already usable.
export default async function ArchivePreview({previews,date,lang='it'}){
 const p=(await previews)[date];if(!p)return null;
 if(p.unavailable)return <span className="archive-card-intro">{lang==='en'?'Preview temporarily unavailable.':'Anteprima temporaneamente non disponibile.'}</span>;
 return <>{p.intro&&<span className="archive-card-intro">{p.intro}</span>}<span className="archive-card-tags"><span className="archive-card-count">{p.articles} {tr(lang,'articoli')}</span>{p.sections.map(section=><span key={section}>{tr(lang,section)}</span>)}</span></>;
}
