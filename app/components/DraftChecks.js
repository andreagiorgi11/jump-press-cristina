export default function DraftChecks({body}){
 if(!body.sourceImportId)return null;
 const pdf=body.articles.filter(a=>a.pdfCheck?.status!=='matched').length;
 const synth=body.articles.filter(a=>a.synthesisCheck?.status!=='verified').length;
 const covers=(body.coverage?.frontPages||[]).filter(p=>p.juventus&&!p.clipId).length;
 const missingSummary=body.editorialModel==='summary-v1'&&!body.executiveSummary;
 if(!pdf&&!synth&&!covers&&!missingSummary)return null;
 return <aside className="article-checks" aria-label="Attenzioni sulla bozza"><p><strong>Bozza salvata con elementi da verificare.</strong> {pdf>0&&`${pdf} articoli: PDF da verificare. `}{synth>0&&`${synth} articoli: sintesi da verificare. `}{covers>0&&`${covers} copertine: PDF da verificare. `}{missingSummary&&'Summary da completare. '}I dettagli sono sotto i singoli articoli.</p></aside>;
}
