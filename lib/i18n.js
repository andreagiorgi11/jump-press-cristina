// Reader-facing language of the site (Italian by default, English since 06/10/2026).
// Texts stay written in Italian in the components; tr() returns the English version when the page is in English.
// A missing entry falls back to Italian instead of breaking the page. Editor-only areas stay Italian.
export const languages=['it','en'];
const EN={
 // Sidebar and navigation
 'LEGGI':'READ','Rassegna di oggi':'Today’s review','Copertura odierna':'Today’s coverage','Scarica PDF':'Download PDF','Archivio':'Archive',
 'Aggiorna rassegna':'Refresh','Apri menu':'Open menu','Chiudi menu':'Close menu','Accesso editor':'Editor login','Navigazione rassegna':'Review navigation',
 'Disponibile aprendo una rassegna':'Available when a review is open','Juventus, rassegna di oggi':'Juventus, today’s review','Jump × Juventus — rassegna di oggi':'Jump × Juventus — today’s review',
 'Powered by AG Studio — apri il sito in una nuova scheda':'Powered by AG Studio — opens in a new tab',
 // Coverage dialog
 'Pagine analizzate':'Pages analysed','Prime pagine controllate':'Front pages checked','Prime pagine con la Juventus':'Front pages featuring Juventus','Articoli selezionati':'Articles selected',
 'testata':'newspaper','testate':'newspapers','da':'from','Non disponibile':'Not available','Chiudi statistiche':'Close statistics',
 'Le edizioni locali della stessa testata sono conteggiate una sola volta.':'Local editions of the same newspaper are counted once.',
 // Edition page
 'Rassegna stampa':'Press review','Rassegna stampa Juventus':'Juventus press review','Sezioni':'Sections','Vai agli articoli per tema':'Go to articles by topic','Navigazione rapida della rassegna':'Quick review navigation',
 'Juventus in prima pagina':'Juventus on the front pages','Apri prima pagina di ':'Open front page of ','Prime pagine da verificare.':'Front pages to be checked.','Nessun richiamo Juventus nelle prime pagine verificate.':'No Juventus headlines on the front pages checked.',
 'I temi della giornata':'Today’s themes','La giornata in sintesi':'The day at a glance','articoli':'articles','articolo':'article','articoli divisi per sezione':'articles by section',
 'Segnali positivi':'Positive signals','Segnali di criticità':'Critical signals','Da seguire':'To watch','Punti chiave da completare.':'Key points to be completed.',
 'Editoriale':'Editorial','di':'by','Torna su':'Back to top','Torna all’inizio della rassegna':'Back to the top of the review','Apri il ritaglio originale':'Open the original clipping',
 'Titolo originale':'Original title','Filtra':'Filter','Tutti':'All',
 // Sections
 'Prima squadra':'First team','Next Gen e Primavera':'Next Gen & Primavera','Juventus Women':'Juventus Women','Politica sportiva':'Football politics','Nazionale':'National team','Altri temi':'Other topics',
 'Squadra':'First team','Next Gen':'Next Gen','Women':'Women','Politica':'Politics',
 // Date menu and archive
 'Scegli un\'altra rassegna':'Choose another review','Altre rassegne':'Other reviews','Rassegne':'Reviews','Caricamento…':'Loading…','Tutto l\'archivio →':'Full archive →','Elenco non disponibile.':'List unavailable.',
 'JUVENTUS · ARCHIVIO':'JUVENTUS · ARCHIVE','rassegne':'reviews','edizione':'edition','edizioni':'editions','Leggi la rassegna':'Read the review','Nessuna edizione presente.':'No editions yet.',
 'Edizioni':'Editions','Elenco non disponibile: riprova quando il servizio sarà ripristinato.':'List unavailable: please try again later.',
 // PDF download
 'Cosa vuoi scaricare?':'What would you like to download?','Summary':'Summary','Rassegna completa':'Full review','Sezioni e ritagli':'Sections and clippings',
 'La giornata in sintesi, raccolta in un unico PDF.':'The day at a glance, in a single PDF.','Il Summary non è disponibile per questa edizione.':'The Summary is not available for this edition.',
 'Annulla':'Cancel','Apri PDF':'Open PDF','Sezioni incluse':'Sections included','Tutta la rassegna':'Whole review','Includi i ritagli dei giornali':'Include newspaper clippings',
 'Aggiunge in fondo al PDF gli originali degli articoli delle sezioni scelte. Il file sarà più grande.':'Adds the original articles of the chosen sections at the end of the PDF. The file will be larger.',
 'Seleziona almeno una sezione.':'Select at least one section.','Personalizza rassegna completa':'Customise full review','Chiudi scelta sezioni':'Close section choice','Formato PDF':'PDF format','Informazioni sui ritagli':'About clippings',
 // PDF preview
 'Anteprima PDF':'PDF preview','Anteprima Summary':'Summary preview','Anteprima PDF della rassegna':'Review PDF preview','Summary · una pagina':'Summary · one page','Sezioni selezionate':'Selected sections',
 ' · Con ritagli originali':' · With original clippings','Rassegna Juventus':'Juventus press review','Scarica Summary':'Download Summary','Indice':'Contents','Cerca per titolo o testata':'Search by title or newspaper',
 'Nessun risultato per questa ricerca.':'No results for this search.','Preparazione del PDF…':'Preparing the PDF…','Pagina ':'Page ','Adatta':'Fit','PDF non disponibile. Chiudi e riprova.':'PDF not available. Close and try again.',
 'Impossibile preparare il PDF con tutti i ritagli richiesti. Riprova oppure disattiva l’opzione ritagli.':'Could not prepare the PDF with all the requested clippings. Try again or turn off clippings.',
 'Impossibile raggiungere la voce dell’indice.':'Could not reach this contents entry.','Chiudi anteprima PDF':'Close PDF preview','Chiudi indice':'Close contents','Indice del PDF':'PDF contents','Ingrandisci PDF':'Zoom in','Riduci PDF':'Zoom out',
 'Adatta PDF alla larghezza':'Fit PDF to width','Navigazione PDF':'PDF navigation','Numero pagina PDF':'PDF page number','Pagina PDF precedente':'Previous PDF page','Pagina PDF successiva':'Next PDF page','Pagine PDF a scorrimento':'Scrolling PDF pages','Es. Gazzetta, Spalletti…':'E.g. Gazzetta, Spalletti…',
 'Apri ritaglio originale':'Open original clipping',
 // Clipping viewer
 'Chiudi ×':'Close ×','Chiudi ritaglio':'Close clipping','Apertura ritaglio…':'Opening clipping…','Ritaglio completo':'Full clipping','Prima pagina':'Front page',
 'Il ritaglio originale di questo articolo non è più disponibile. La sintesi resta consultabile nella rassegna.':'The original clipping of this article is no longer available. The summary is still in the review.',
 'Ritaglio non disponibile. Chiudi e riprova tra poco.':'Clipping not available. Close and try again shortly.',
};
export const tr=(lang,text)=>lang==='en'?(EN[text]??text):text;
export const locale=lang=>lang==='en'?'en-GB':'it-IT';
export function formatDate(lang,date,options={day:'numeric',month:'long',year:'numeric'}){
 return new Intl.DateTimeFormat(locale(lang),{...options,timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
}
// Same page in the other language: home, archive and editions have an English address under /en.
export function languagePath(pathname,lang){
 const base=pathname.replace(/^\/en(?=\/|$)/,'')||'/';
 if(lang==='it')return base;
 if(base==='/')return '/en';
 if(base==='/archivio'||/^\/edizioni\/\d{4}-\d{2}-\d{2}$/.test(base))return '/en'+base;
 return '/en';
}
export const LANG_COOKIE='jp_lang';
