export const editorialDeliveryText=`

STRUTTURA OBBLIGATORIA DELLA PAGINA — MODELLO 15 SETTEMBRE
La consegna quotidiana comprende tutte le sezioni seguenti, nello stesso ordine. Il sito costruisce la pagina dai dati salvati: non scrivere HTML, non modificare codice o avviare deploy. Non copiare numeri o analisi dalle edizioni precedenti. La nuvola di parole resta rimossa.

1. INTESTAZIONE E NUMERI INIZIALI
Compila date e intro. Analizza l'intero PDF e conta le voci editoriali effettivamente esaminate prima della selezione. Una voce è un articolo, editoriale o breve autonomo; una continuazione non è una nuova voce. Non confondere numero di pagine, citazioni, richiami e articoli. Salva il conteggio intero in coverage.examinedItems. Se non verificabile usa null, mai zero come segnaposto. Il numero di articoli selezionati viene calcolato dal sito da articles.length.

2. QUADRO GENERALE E PRIME PAGINE
Salva coverage come oggetto con examinedItems, sourceNote, frontPages e frontPageSummary.
- sourceNote: nome e data del PDF, pagine/indice esaminati e metodo del conteggio, compresi limiti o parti non lette; niente URL temporanei o credenziali.
- frontPages: elenco COMPLETO delle prime pagine verificate nel PDF, non soltanto quelle che citano Juventus. Ogni elemento contiene outlet (testata), page (pagina originale del PDF, da 1), juventus (true solo se il richiamo è verificato visivamente), nationalSports (true per quotidiano sportivo nazionale italiano). Non duplicare una pagina né inventare prime pagine assenti. Un elenco vuoto significa che è stata verificata l'assenza di prime pagine; null significa controllo non completato.
- frontPageSummary: breve lettura generale fedele delle copertine, distinguendo presenza della Juventus, stampa sportiva e altre testate. Non inventare interpretazioni o confronti con giorni non analizzati.
Il sito ricava da questo elenco i totali, le prime pagine con/senza Juventus, la quota percentuale, le sportive nazionali e le testate con richiamo. Le percentuali usano il denominatore verificato; nessuna percentuale su denominatore zero o sconosciuto. Non duplicare questi conteggi in metrics con valori discordanti; metrics resta disponibile per dati aggiuntivi delle vecchie bozze.

3. IL PESO DEI TEMI DI OGGI
Assegna a ciascun articolo una sola category principale coerente: Prima squadra, Mercato, Editoriali, Youth / Next Gen, Juventus Women, Politica sportiva, Intervista, Prossimo avversario, Europa League o Altri temi. Non creare varianti ortografiche per la stessa categoria. Il grafico conta gli articoli selezionati per category: non è la quota di tutte le pagine del PDF. Conteggi e percentuali sono calcolati dal sito, non stimati da GPT.

4. TEMI, PAROLE E TONO DI OGGI
Compila keyPoints con tre punti chiave distinti e fondati sugli articoli selezionati, ciascuno con tema e breve spiegazione. Compila tones con etichette concise dei toni prevalenti e toneSummary con la loro spiegazione, collegata a testate/articoli effettivamente letti. Descrivi il tono della copertura, non un tuo giudizio sui protagonisti. Non aggiungere nuvola di parole né frequenze inventate.

5. QUANTO PESA OGNI NOTIZIA
Assegna rating a ogni articolo: 5 dominante, 4 molto rilevante, 3 rilevante, 2 secondaria, 1 marginale. Indica il peso editoriale rispetto alla giornata Juventus, non affidabilità della testata o positività della notizia. Il sito calcola la distribuzione delle stelle. Le stelle non devono comparire nel testo pulito per WhatsApp.

6. RASSEGNA SELEZIONATA E RITAGLI
Mantieni l'ordine editoriale già stabilito: cappello, editoriali, notizie Juventus e mercato, Next Gen, Women, politica sportiva e altre notizie rilevanti. Ogni articolo conserva titolo verificato, testata, autore solo quando previsto, sintesi fedele, categoria, rating e associazione sourceId/clipId/pages. Carica solo i ritagli necessari secondo il percorso già descritto.

CONTROLLO DI COMPLETEZZA
Prima di dichiarare completa la rassegna rileggi con read_draft: controlla intro, coverage con conteggio e provenienza, inventario completo delle prime pagine e lettura generale, tre keyPoints, tones e toneSummary, categorie, rating, articoli e ritagli. Se un elemento non è verificabile, salva comunque il lavoro come bozza incompleta e indica precisamente cosa manca; non inventarlo per riempire una sezione e non dichiarare completata la verifica. Per riprendere una bozza esistente serve la richiesta dell'editor come già previsto dal controllo anti-duplicazione. L'automatismo non pubblica mai.
`;
