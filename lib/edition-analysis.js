export const ratingCopy={
  5:['Notizia dominante','Tema guida della giornata: ha il peso editoriale più alto e orienta la lettura complessiva.'],
  4:['Molto rilevante','Notizia con forte impatto sulla Juventus o con elementi sostanziali per capire squadra, mercato o scenario.'],
  3:['Rilevante','Informazione importante e utile alla rassegna, ma non dominante rispetto ai temi principali.'],
  2:['Secondaria','Notizia utile per completezza e contesto, con peso editoriale inferiore.'],
  1:['Marginale','Contesto o notizia di servizio: entra solo quando aggiunge un elemento concreto.']
};
const palette=['#d7ff00','#111111','#737373','#ff8a00','#00a6a6','#7c3aed','#e11d48','#2563eb','#a16207','#0f766e'];
export function analyseEdition(body){
  const articles=body.articles||[],counts=new Map();
  for(const a of articles) counts.set(a.category,(counts.get(a.category)||0)+1);
  let cursor=0;
  const themes=[...counts].map(([label,count],i)=>{
    const start=cursor;cursor+=count/articles.length*100;
    return {label,count,percent:count/articles.length*100,color:palette[i%palette.length],start,end:cursor};
  });
  const pages=body.coverage?.frontPages??null;
  const sports=pages?.filter(p=>p.nationalSports)??null;
  return {selected:articles.length,examined:body.coverage?.examinedItems??null,
    frontPages:pages?.length??null,juventus:pages?.filter(p=>p.juventus).length??null,
    sports:sports?.length??null,sportsJuventus:sports?.filter(p=>p.juventus).length??null,
    outlets:pages===null?null:[...new Set(pages.filter(p=>p.juventus).map(p=>p.outlet))],themes,
    ratings:Object.fromEntries([5,4,3,2,1].map(n=>[n,articles.filter(a=>a.rating===n).length]))};
}
