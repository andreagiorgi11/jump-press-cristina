// A dedicated section inside the existing preferences document keeps the MCP contract unchanged.
export const INTEREST_START='<!-- jump-interest-list:start -->';
export const INTEREST_END='<!-- jump-interest-list:end -->';
export const INTEREST_RULE='Per i giornalisti cerca con particolare attenzione gli editoriali firmati da loro. Per le persone e organizzazioni cerca notizie, interviste, dichiarazioni e approfondimenti che le riguardano, anche nelle pagine non dedicate alla Juventus. Il nome completo e il ruolo identificano il soggetto: quando compare soltanto un cognome, verifica l’identità dal contesto. Il ruolo non limita l’interesse ai soli articoli sull’incarico indicato. Valuta questi candidati prima di chiudere la selezione; una semplice menzione non basta e restano valide pertinenza, priorità Juventus e regole sui doppioni.';
const fail=()=>{throw Object.assign(Error('La sezione Persone di interesse non è leggibile. Il testo salvato è conservato: controlla le preferenze della redazione.'),{status:503});};
export function splitInterestList(text){
 const starts=text.split(INTEREST_START).length-1,ends=text.split(INTEREST_END).length-1;
 if(!starts&&!ends)return {general:text,entries:[],section:null};
 if(starts!==1||ends!==1)fail();
 const start=text.indexOf(INTEREST_START),end=text.indexOf(INTEREST_END);if(end<start)fail();
 const section=text.slice(start,end+INTEREST_END.length),entries=[];let kind;
 for(const line of section.split(/\r?\n/)){
  if(line==='### Giornalisti')kind='journalist';
  else if(line==='### Persone e organizzazioni')kind='subject';
  else if(line.startsWith('- ')){const parts=line.slice(2).split(' — ');if(!kind||parts.length!==2||!parts[0].trim()||!parts[1].trim())fail();entries.push({kind,name:parts[0],role:parts[1]});}
 }
 return {general:(text.slice(0,start)+text.slice(end+INTEREST_END.length)).trim(),entries,section};
}
export function interestSection(entries){
 const lines=[INTEREST_START,'## PERSONE DI INTERESSE',INTEREST_RULE];
 for(const [kind,label] of [['journalist','Giornalisti'],['subject','Persone e organizzazioni']]){
  lines.push('','### '+label);for(const entry of entries.filter(e=>e.kind===kind))lines.push('- '+entry.name+' — '+entry.role);
 }
 lines.push(INTEREST_END);return lines.join('\n');
}
export function mergeInterestList(text,entries){const {general}=splitInterestList(text);return [general,interestSection(entries)].filter(Boolean).join('\n\n');}
export function mergeGeneralPreferences(general,original){
 if(general.includes(INTEREST_START)||general.includes(INTEREST_END))throw Object.assign(Error('Modifica l’elenco dalla pagina Persone di interesse.'),{status:422});
 const {section}=splitInterestList(original);return [general.trim(),section].filter(Boolean).join('\n\n');
}
