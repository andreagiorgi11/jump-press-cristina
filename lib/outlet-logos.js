// One resolver for site and PDF: outlet names arrive in many spellings from GPT
// ("il Giornale", "La Repubblica - Ed. Torino", "Corriere dello Sport Stadio - Ed. Campania").
// Files live in public/testate (site) and public/testate/pdf (PDF cover, PNG only).
const mastheads=[
 [/^(?:qn(?:\s*[-–]?\s*quotidiano nazionale)?|quotidiano nazionale)\b/,'quotidiano-nazionale.png','Quotidiano Nazionale'],
 [/^(il )?fatto quotidiano/,'fatto.png',"Il Fatto Quotidiano"],
 [/^(il )?messaggero/,'messaggero.png',"Il Messaggero"],
 [/^(il )?mattino/,'mattino.png',"Il Mattino"],
 [/^as$/,'as.png',"AS"],
 [/^bild/,'bild.png',"Bild"],
 [/^(die )?welt/,'welt.png',"Die Welt"],
 [/^el pais/,'elpais.png',"El País"],
 [/^financial times/,'ft.png',"Financial Times"],
 [/^handelsblatt/,'handelsblatt.png',"Handelsblatt"],
 [/^le monde/,'lemonde.png',"Le Monde"],
 [/^les echos/,'lesechos.png',"Les Echos"],
 [/^marca/,'marca.png',"Marca"],
 [/^mundo deportivo/,'mundo.png',"Mundo Deportivo"],
 [/^(the )?guardian/,'guardian.png',"The Guardian"],
 [/^(the )?new york times/,'nyt.png',"The New York Times"],
 [/^(the )?times$/,'times.png',"The Times"],
 [/^(il )?sole ?24 ?ore/,'sole-24-ore.png','Il Sole 24 Ore'],
 [/^(la )?repubblica/,'repubblica.png','La Repubblica'],
 [/^corriere dello sport( ?-? ?stadio)?/,'corriere-sport.svg','Corriere dello Sport'],
 [/^corriere della sera/,'corriere-sera.svg','Corriere della Sera'],
 // Corriere Torino is the local edition of the Corriere della Sera.
 [/^corriere (di )?torino/,'corriere-sera.svg','Corriere della Sera','Torino'],
 [/^(la )?gazzetta dello sport/,'gazzetta-wordmark.svg','La Gazzetta dello Sport'],
 [/^tuttosport/,'tuttosport.svg','Tuttosport'],
 [/^(la )?stampa/,'stampa.svg','La Stampa'],
 [/^(il )?giornale del piemonte( e della liguria)?/,'piemonte-liguria-readable.png','Il Giornale del Piemonte e della Liguria'],
 [/^(il )?giornale/,'giornale.svg','Il Giornale'],
 [/^(il )?biellese/,'biellese.png','Il Biellese'],
 [/^libero/,'libero.png','Libero'],
 [/^avvenire/,'avvenire.png','Avvenire'],
 [/^l ?espresso/,'espresso.png','L’Espresso'],
 [/^l ?equipe/,'equipe.png','L’Équipe'],
 [/^(torino )?cronaca ?qui/,'cronacaqui.png','CronacaQui'],
 [/^sport$/,'sport.svg','Sport'],
 [/^sport ?week/,'sportweek.png','SportWeek'],
 [/^domani/,'domani.png','Domani'],
 [/^der standard/,'standard.png','Der Standard'],
 [/^frankfurter allgemeine( zeitung)?/,'faz.png','Frankfurter Allgemeine']
];
// Keeps accents out, folds apostrophes/dashes, lowercases.
const fold=name=>String(name||'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[’'`]/g,' ').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();
// "Quotidiano", "Stadio" and similar are part of the masthead, not an edition.
const noise=/^(quotidiano|stadio)\b\s*/i;
export function outletLogo(name){
 const folded=fold(name);
 for(const [pattern,file,label,fixedEdition] of mastheads){
  const m=folded.match(pattern);if(!m)continue;
  // Recover the edition from the original text after the matched masthead prefix.
  const original=String(name).replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
  let rest=original.slice(m[0].length).replace(/^[\s\-,:·]+/,'').replace(noise,'').replace(/^[\s\-,:·]+/,'').trim();
  rest=rest.replace(/^(ed\.|edizione|cronaca( di)?)\s*/i,'').trim();
  return {file,key:file.replace(/\.(svg|png)$/,''),label,edition:fixedEdition||rest||''};
 }
 return null;
}
