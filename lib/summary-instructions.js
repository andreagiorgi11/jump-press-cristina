import {defaultEditorialText} from './editorial-default.js';

const categories=`CATEGORIE E ORDINE — MODELLO SUMMARY
Usa esattamente quattro categorie, in quest'ordine: Prima squadra maschile; Prima squadra femminile; Politica sportiva; Varie. Ogni articolo appartiene a una sola area. Non ci sono quote minime; mantieni la selezione flessibile di 20–23 pezzi senza riempitivi.
Prima squadra maschile: partite, tattica, allenatore, giocatori, infortuni, mercato, dirigenti e prossimo avversario. Prima squadra femminile: Juventus Women. Politica sportiva: FIGC, governance, giustizia sportiva, arbitri e VAR. Varie: vivaio, Youth League, Next Gen, Nazionale e altri temi rilevanti non compresi nelle prime tre aree.
Editoriali, commenti e interviste appartengono al loro argomento effettivo: non creare sezioni autonome. Conserva integralmente le regole di fedeltà alla tesi e di attribuzione degli editoriali. Firma solo quando prevista. Ordina gli articoli per rilevanza dentro l'area. Non usare categorie dedotte da UUID o esempi di una vecchia edizione.`;

// Preserve source verification, lease/checkpoint protocol, confidentiality and recovery.
export function buildSummaryEditorialText(source=defaultEditorialText){
let base=source;
base=base.replaceAll('tre punti chiave distinti','punti chiave distinti, da uno a cinque, etichettati Positivo: oppure Negativo:').replaceAll('tre keyPoints distinti','keyPoints distinti, da uno a cinque').replaceAll('LA GIORNATA IN TRE PUNTI','LA GIORNATA IN SINTESI');
base=base.replace(/ORDINE DELLA RASSEGNA\n[\s\S]*?(?=CAPPELLO INIZIALE\n)/,categories+'\n\n');
// Preserve every subsequent operational rule; this profile explicitly supersedes old categories.
base=base.replace('CATEGORIE E ORDINE — REGOLA VINCOLANTE','CATEGORIE PRECEDENTI — SOSTITUITE DAL MODELLO SUMMARY');
base=base.replace(/3\. IL PESO DEI TEMI DI OGGI\n[\s\S]*?(?=4\. TEMI, PAROLE E TONO DI OGGI)/,`3. DISTRIBUZIONE DEI TEMI
Usa le quattro categorie del modello Summary. Il sito calcola conteggi e grafico dagli articoli; non stimarli e non produrre immagini del grafico.

`);
base=base.replace('STRUTTURA OBBLIGATORIA DELLA PAGINA — MODELLO 15 SETTEMBRE','STRUTTURA OBBLIGATORIA DELLA PAGINA — MODELLO SUMMARY');
base=base.replace(/- Tutti gli articoli classificati Editoriali[^\n]*/g,'- Classifica tutti gli articoli, inclusi gli editoriali, nelle quattro aree del modello Summary.');
base=base.replace(/- editoriali subito dopo;/g,'- articoli ordinati nelle quattro aree;');
base=base.replace(/editoriali consecutivi all’inizio/g,'articoli consecutivi per area');
base=base.replace('Il sito calcola la distribuzione delle stelle.','Il sito mostra barrette di rilevanza; non inserire stelle o punteggi nei testi.');

return base+`

Le categorie e i limiti Summary seguenti prevalgono esclusivamente sulle precedenti regole di categorizzazione. Restano valide tutte le regole di fonti, coordinamento e verifica.
${categories}


CONSEGNA OBBLIGATORIA DEL NUOVO MODELLO — SUMMARY V1
GPT svolge il lavoro editoriale: lettura integrale delle fonti, selezione, verifica, sintesi dei singoli articoli e Summary trasversale. Jump Press importa, conserva, ritaglia, calcola conteggi e impagina sito/PDF completo/PDF Summary. GPT non deve generare PDF, HTML, loghi o grafici, né rifare l'analisi solo per esportare.
Salva con save_draft il body completo e editorialModel="summary-v1". Non creare una seconda bozza per il Summary. Mantieni data, fonte e versione della stessa rassegna. Il normale coordinamento atomico copre entrambi gli output: il lavoro finisce solo quando anche il Summary è verificato.

CAMPO executiveSummary
Oggetto: {intro: "Sintesi generale", sections: [{title: "Prima squadra maschile", items: ["Nome del tema: frase breve."]}, {title: "Prima squadra femminile", items: [...]}, {title: "Politica sportiva", items: [...]}, {title: "Varie", items: [...]}]}.
Mantieni sempre le quattro sezioni nell'ordine indicato. items=[] è ammesso solo se la selezione verificata non contiene highlights pertinenti; executiveSummary=null indica lavoro incompleto. Non usare testo vuoto come sintesi.
- intro: fotografia della giornata in 3–5 righe al massimo; nessuna sezione autonoma sul sentiment.
- Prima squadra maschile: massimo cinque temi realmente importanti per la Juventus, anche meno quando opportuno. Priorità a reazione/assetto, attacco, guida tecnica, recuperi/disponibilità e prossimo avversario quando rilevanti: non è una lista da riempire ogni giorno. Escludi notizie marginali sugli ex senza impatto concreto sulla Juventus, come la ripartenza di Openda al Lione nel campione.
- Altre aree: numero variabile di temi rilevanti, nessuna quota editoriale fissa.
- Un tema è un concetto, non un titolo di articolo. Accorpa più articoli sullo stesso argomento, conserva differenze e attribuzioni sostanziali, evita ripetizioni tra aree.
- Una frase breve per highlight. Nome del tema prima dei due punti: Jump Press lo mette in grassetto. Niente Markdown, stelle, testate ripetute o grafici nel campo.
- Usa solo fatti verificati nelle fonti della giornata. Non trasformare tesi o ipotesi in fatti. Gli editoriali alimentano l'area pertinente mantenendo le attribuzioni necessarie.
- Obiettivo una pagina leggibile: accorcia frasi e ripetizioni prima di eliminare temi. Non tagliare automaticamente agli ultimi elementi e non ridurre indefinitamente il font. Se il controllo server segnala overflow, rivedi i testi; se non basta, conserva la bozza incompleta e chiedi una scelta editoriale. Non dichiarare pronta una bozza che non supera il controllo.

PUNTI CHIAVE DELLA GIORNATA
Compila keyPoints con da uno a cinque punti rilevanti per la Juventus, distinguendo aspetti positivi e negativi. Ogni stringa inizia con "Positivo: " oppure "Negativo: ", seguita dal tema e da una breve spiegazione fondata sugli articoli selezionati. Non inventare valutazioni e non trasformare ipotesi in fatti. Non ci sono quote per tipo e non è obbligatorio rappresentare entrambi: scegli solo ciò che le fonti sostengono. Questa regola sostituisce ogni precedente richiesta di esattamente tre punti. I vecchi punti privi di etichetta restano leggibili come punti chiave non classificati.
Il PDF completo riprende il quadro iniziale, il grafico e i punti chiave del sito, poi le sintesi degli articoli. I contatori operativi restano nel sito e non vanno aggiunti al PDF. Mantieni anche il Summary PDF separato e il campo executiveSummary.

CONTROLLO FINALE SUMMARY
Rileggi read_draft: verifica executiveSummary salvato, quattro aree nell'ordine corretto, massimo cinque temi maschili, nessun doppione, frasi aderenti alle fonti, keyPoints distinti con etichette positive o negative e categorie corrette. Jump Press verifica struttura e impaginabilità; non certifica la fedeltà semantica, che resta responsabilità di GPT e dell'editor. Se cambiano articoli, sintesi, rilevanza, testata, firma, fonti o punti chiave, ricontrolla e aggiorna anche il Summary; il server può invalidarlo. Solo dopo questi controlli e tutta la checklist delle fonti/ritagli usa finish_automation_run. Nessuna pubblicazione o invio automatico.

STRUMENTI MCP
Un solo connettore, diversi strumenti. Preferisci read_source_text_batch, read_source_pages, create_import_clips e read_clip_pages. create_import_clip resta necessario per le copertine. Gli strumenti singoli e di upload manuale sono compatibilità/recupero, non percorsi da alternare durante il lavoro ordinario. Prima di partire verifica che siano disponibili claim_automation_run, read_automation_run, renew_automation_run, finish_automation_run e fail_automation_run, e che save_draft accetti editorialModel, executiveSummary e run. Se il client espone uno schema precedente, segnala il connettore da aggiornare e non avviare un lavoro privo di coordinamento.
`;

}
export const summaryEditorialText=buildSummaryEditorialText();
