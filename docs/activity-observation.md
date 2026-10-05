# Registro dell'automatismo

`/editor/attivita` mostra la cronologia privata per data e, facoltativamente, runId. L'API di esportazione è `/api/editor/activity?date=YYYY-MM-DD&runId=UUID`. Entrambe richiedono la stessa autenticazione della redazione. Non ci sono nuovi strumenti MCP, parametri, istruzioni o azioni richieste al modello.

## Dati raccolti

- Inizio/fine delle richieste MCP, strumenti chiamati, esiti e identificativi della fonte/bozza/esecuzione; fase letta dallo stato server.
- Conteggio UTF-16 dei caratteri delle risposte testuali MCP, byte UTF-8, testo originale restituito per pagina, immagini effettivamente restituite e loro byte decodificati. Il conteggio della risposta include la struttura JSON e i duplicati. Non è una misura di token, crediti o comprensione del modello.
- Pagine richieste, pagine servite e ripetizioni per importId/pagina; immagini ripetute per fonte o ritaglio/pagina. Non viene confrontato il contenuto visivo fra asset diversi.
- Chiamate GitHub e archivio privato, hit della cache GitHub, download/estrazione fonte, rendering immagini, creazione e riuso ritagli, verifiche dei riscontri, attese dei retry.
- Importazione e pulizia originali differite: tracce separate collegate al genitore, anche quando proseguono dopo la risposta MCP.

Non sono memorizzati testi, titoli, sintesi, citazioni, immagini, URL, intestazioni, credenziali, messaggi di errore liberi o identificativi personali. Il filtro ammette soltanto metadati con tipi e formati limitati. Gli identificativi UUID sono tecnici.

## Archivio e costi

Ogni traccia completa viene scritta una volta dopo la risposta, tramite `after()`, in `jump/activity/<namespace>/<date>/<traceId>.json` sul servizio privato `jump-press-files`. Il namespace deriva dal repository contenuti e dal branch. Le richieste non autenticate compaiono solo nei runtime log. Nessun commit nel branch delle bozze e nessun nuovo servizio o credenziale. La scrittura ha timeout di 3 secondi e non viene ritentata. Un errore del registro non converte in errore una chiamata editoriale riuscita; genera `activity_archive_unavailable` tramite il canale incidenti esistente e `persistence.failed` nei log.

Gli eventi sono anche emessi nei runtime log con prefisso `[Jump Press Activity]`. Il registro aggiunge serializzazione locale, volume di log, una scrittura privata per richiesta autenticata e per attività differita. Non aggiunge lavoro GPT. Il costo server non è zero; deve essere osservato nell'uso reale. Nessun riassunto AI viene creato dal registro.

Massimo 2.000 eventi per traccia: il superamento viene contato in `dropped` e rende la traccia esplicitamente incompleta. Il report non carica più di 2.000 file al giorno e legge al massimo quattro file contemporaneamente. Non è stata introdotta una cancellazione automatica: prima di una futura retention va concordata la durata da conservare.

## Interpretazione e limiti

Le durate delle operazioni interne sono inclusive: non sommarle fra loro. Il totale del tempo server è l'unione degli intervalli delle richieste e delle attività in background, per evitare doppio conteggio. I buchi fra intervalli si chiamano "non osservabili": non sappiamo se GPT stia ragionando, scrivendo, aspettando la piattaforma o se manchi un registro. Non sono misurati il tempo precedente alla prima traccia e quello successivo all'ultima.

Le chiamate alle istruzioni anteriori all'acquisizione della run, o senza run, rimangono non associate. Consultare anche la vista completa del giorno, senza attribuirle arbitrariamente a una particolare run. Gli errori MCP non sono risposte con zero pagine: restano chiamate fallite prive di metriche della fonte. Le risposte di errore, l'inizializzazione e l'elenco strumenti non sono inclusi nei conteggi del testo restituito dai tool riusciti.

Un timeout totale può impedire la scrittura finale: cercare la traccia iniziata nei runtime log. Un errore di persistenza può lasciare un buco nell'archivio; il report dichiara sempre `coverage=observed_only`, mai completezza assoluta. Anche l'inventario dell'archivio va trattato come osservazione dei file disponibili, non prova che tutte le richieste siano state registrate. Una lettura fallita del registro produce errore; l'interfaccia conserva l'ultimo report valido e segnala che non è aggiornato. Nessuna traccia disponibile non significa nessuna attività.

Non si ricostruiscono retroattivamente i 38 minuti del 29 settembre: i dati dettagliati esistono soltanto dalle richieste successive al rilascio.

## Verifica e incidente

Test isolati: risposte MCP identiche, conteggi di pagine/immagini effettive, assenza di contenuti privati, isolamento concorrente, contesto dei lavori differiti, autorizzazioni, guasti di scrittura/lettura e calcolo degli intervalli sovrapposti. Le prove non scrivono in produzione.

Se la pagina non carica: conservare l'ultimo report, verificare autenticazione e `JUMP_FILES_URL`/`JUMP_FILES_SECRET`, controllare `activity_archive_unavailable` nei runtime log e il ricevitore alert. Non ricreare tracce vuote e non modificare le bozze. Se necessario disattivare reversibilmente la sola misura impostando `JUMP_ACTIVITY_DISABLED=1` e ridistribuendo il sito. La riattivazione non recupera i buchi. Confermare il ripristino su una normale chiamata di lettura autenticata e sul successivo report; aprire un ticket al provider se il disservizio persiste.
