# Jump Press — GitHub e Vercel

## Ritiro del vecchio sito Juventus — 23 settembre 2026

Il sito operativo è https://jump-press-approvazione.vercel.app. La cartella
`retired-juventus` produce un deployment Vercel statico di soli reindirizzamenti,
senza funzioni, accesso ai dati o dipendenze. Destinarla esclusivamente al progetto
`jumpress-juventus` (Root Directory `retired-juventus`, preset Other); non cambiare
il progetto News/Social né il progetto Approvazione. Build: `node build.mjs`.

Home, Summary, editor ed edizioni rimandano al nuovo sito; i vecchi collegamenti
archivio senza equivalenza verificata portano all'archivio nuovo. MCP, OAuth e API
ritirati restituiscono 410; richieste di scrittura non vengono inoltrate. Nessun
codice o token OAuth viene inoltrato: i parametri sensibili noti restituiscono 410;
i normali parametri di navigazione sono conservati da Vercel. Redirect inizialmente
307 con `no-store`, per consentire ripristino e verifica. Il deployment precedente
`6i4BjviXg844aKjX7JXkeNHeaEep` resta il riferimento di rollback; prima di riattivarlo
verificare che non riabiliti un secondo flusso editoriale. Non eliminare Blob o
repository contenuti condivisi con il nuovo sito.

Il progetto usa GitHub per i contenuti e Vercel per sito e PDF. Non richiede Supabase, SQL o un provider separato per gli account.

## Come lavorare

Leggere AGENTS.md prima delle modifiche. Le istruzioni correnti di Andrea prevalgono sui documenti precedenti. Questa versione riguarda il repository di Cristina. Non eseguire push o deploy sulla base della sola presenza di credenziali.

## Struttura

- **Codice:** repository esistente, due progetti Vercel.
- **Rassegna pubblica:** home, archivio e /edizioni/data; nessun link News.
- **Redazione:** /editor, login con nome utente e password, bozze e revisioni.
- **MCP:** /mcp, OAuth con consenso e modalità solo bozze o anche pubblicazione.
- **News:** secondo progetto Vercel, senza password e con noindex. Non contiene la redazione.
- **Dati:** repository GitHub PRIVATO dedicato, non collegato a deploy o Actions.
- **PDF:** un Vercel Blob PRIVATO collegato soltanto al progetto rassegna.

Noindex non limita l'accesso a chi conosce l'indirizzo News.

## Avvio locale

Node.js 22+. Eseguire npm ci, copiare .env.example in .env.local e compilare i valori reali. npm run dev apre il server rassegna su 127.0.0.1:3015; npm run dev:news usa 3016. Disponibili avvia-rassegna.bat e avvia-news.bat. Non compilare e avviare dev sulla stessa directory .next contemporaneamente.

Senza configurazione i contenuti storici restano consultabili e il login è disabilitato; non esistono utenti o bozze dimostrativi. Le nuove bozze online non sono simulate in locale.

### Locale collegato ai dati reali — 18 settembre 2026

La cartella Dropbox dispone di `.env.local`, escluso da Git, collegato al repository privato `andreagiorgi11/jump-press-contenuti` e al Blob privato della produzione. Avviare `avvia-rassegna.bat`, poi aprire http://127.0.0.1:3015/editor con il normale account redazione. I salvataggi agiscono sui contenuti reali. Il segreto di sessione è locale, quindi occorre effettuare il login anche in localhost. Per GitHub è usata la credenziale dell’account Andrea già autorizzato sul repository; per Blob il token esistente dello store. Non pubblicare né stampare il file di configurazione. Nei valori del file `.env.local` proteggere ogni `$` delle impronte scrypt con `\$`, altrimenti Next.js espande il testo e rende gli account non validi. Verificare la configurazione con `accounts()` di `lib/passwords.js`, non soltanto con JSON.parse. I segreti Vercel marcati Sensitive non sono riscaricabili con env pull: non sovrascrivere la configurazione locale con segnaposto.

## Configurazione una tantum

### Repository dei dati

Creare nell'account di Cristina un repository **privato**, ad esempio jump-press-contenuti. Copiare content-template/index.json alla radice come index.json, con un primo commit sul branch main. Non collegare questo repository a Vercel: modificare contenuti non deve generare build.

Creare un fine-grained Personal Access Token GitHub limitato a questo repository con Contents read/write e Metadata read. Inserirlo solo su Vercel come JUMP_GITHUB_TOKEN. JUMP_CONTENT_REPO contiene proprietario/nome e JUMP_CONTENT_BRANCH il branch. Le operazioni rifiutano un repository pubblico o un indice mancante/corrotto. Alla scadenza del token bisogna sostituirlo e ridistribuire il sito.

### Nome utente e password

Il login usa credenziali dedicate. GitHub serve solo al server per leggere e salvare i contenuti. Gli endpoint GitHub di login/callback non vengono più utilizzati.

JUMP_EDITOR_USERS contiene un array JSON con id stabile, username minuscolo, role (publisher/editor/producer) e passwordHash. Le password non vengono salvate: scrypt N=131072, r=8, p=1, sale casuale di 16 byte, confronto costante. Lunghezza consentita per la creazione: 14–256 caratteri.

Per inizializzare il solo utente editor, eseguire node scripts/setup-passwords.mjs PERCORSO_ASSOLUTO_FUORI_DAL_REPOSITORY/editor-users.json e aprire http://127.0.0.1:3017. Andrea deve inserire e confermare personalmente la password; l'agente non deve farlo al suo posto. Il modulo salva soltanto le impronte in un file riservato fuori dal codice. Trasferire il JSON in JUMP_EDITOR_USERS come Secret Production su Vercel, poi ridistribuire il codice. Non copiare password o impronte in chat, PR, output o repository. Terminare il modulo locale dopo il trasferimento.

Il vecchio deployment resta attivo fino al completamento della configurazione. Il nuovo codice richiede JUMP_EDITOR_USERS e invalida le sessioni precedenti. Non pubblicare il cambio di autenticazione prima di aver configurato le nuove credenziali. Le variabili JUMP_GITHUB_CLIENT_ID, JUMP_GITHUB_CLIENT_SECRET e JUMP_GITHUB_MEMBERS non vengono più lette dal nuovo codice.

Le sessioni web durano 8 ore. Cambiare passwordHash invalida sessioni web e collegamenti MCP dopo il redeploy; rimuovere l'utente revoca l'accesso. Il ruolo è controllato a ogni richiesta. Ogni login, anche con utente inesistente, riserva atomicamente un tentativo nel repository privato: massimo 8 per nome e 60 complessivi in 15 minuti. In caso di conflitto o guasto il login non prosegue. Il file auth/login-limits.json contiene soltanto contatori e identificatori HMAC, nessun nome, IP o password. Un attacco può esaurire il limite globale: controllare i log e configurare il firewall del progetto se necessario.

Il consenso MCP reindirizza al medesimo modulo nome utente/password e poi torna alla richiesta del client. Restano attivi PKCE, permessi solo bozze e pubblicazione esplicita.

### Vercel

**Progetto esistente rassegna:** Next.js, Node 22, install npm ci, build npm run build, Output Directory gestita da Next. Configurare JUMP_SITE=press, JUMP_PUBLIC_URL con il dominio HTTPS, JUMP_EDITOR_USERS e le variabili dell’archivio e il segreto di sessione.

In Storage creare un Blob store **Private** e collegarlo a questo progetto. Usare BLOB_STORE_ID con le credenziali OIDC gestite da Vercel oppure BLOB_READ_WRITE_TOKEN fornito dalla connessione. Mai collegare uno store pubblico per gli originali. Per lo sviluppo locale scaricare le variabili tramite gli strumenti Vercel autorizzati, senza copiarle in chat o nel repository.

**Secondo progetto News:** importare lo stesso repository CODICE, JUMP_SITE=news, build npm run build:news, Node 22. Non aggiungere le variabili GitHub, OAuth o Blob. Conservare X_BEARER_TOKEN solo se già utilizzato. Noindex non significa accesso privato.

Per le Preview usare un repository dati e uno store di collaudo; l'OAuth App deve avere un callback corrispondente all'indirizzo di collaudo. Evitare che le prove scrivano nei dati reali. Il deploy automatico del codice dipende dall'integrazione Git Vercel già configurata; non è necessario aggiungere una GitHub Action.

### ChatGPT e MCP

Quando il sito è online, aggiungere una connessione MCP personalizzata nel ChatGPT dell'editor (se abilitata sul relativo account):
- URL: dominio rassegna seguito da /mcp.
- Autenticazione: OAuth.
- Registrazione client: dinamica, senza client secret da copiare in ChatGPT.

Il server pubblica la discovery, registra il client, richiede PKCE S256 e mostra il consenso dopo il login con nome utente e password. Scegliere **Autorizza solo bozze** per l'automatismo. Scegliere **Autorizza anche pubblicazione** soltanto per il ChatGPT usato per revisionare e pubblicare su richiesta esplicita. Il consenso alla pubblicazione non è una richiesta di pubblicare una rassegna.

Gli access token durano un'ora; i refresh token ruotano a ogni uso, entro 30 giorni dal collegamento. I codici sono monouso, legati a client, callback e PKCE. Il server applica i permessi del collegamento oltre al ruolo dell'utente: un collegamento solo bozze resta tale anche per Cristina.

Il client deve supportare registrazione dinamica di client pubblici con PKCE. Se il particolare account/client non la supporta, il collaudo lo deve rilevare: non è stato provato con le credenziali di Cristina.

## Flusso editoriale

### Recupero server tramite MCP (17 settembre 2026)

Il percorso ordinario ora usa `import_source_url(url,date)` dopo il controllo dei duplicati. Il server accetta esclusivamente gli endpoint HTTPS Ecostampa conosciuti e verifica anche ogni redirect. Scarica al massimo 200 MB in un file temporaneo eliminato sempre, controlla firma PDF, estrae il testo di ogni pagina con PDF.js e archivia originale e testo nel Blob privato. Nessun PDF passa nel repository GitHub. Nessuna bozza viene creata durante importazione o in caso di errore.

La chiamata MCP riserva un lavoro e risponde subito con `importId`; `after` prosegue sul server entro 300 secondi. `read_import_status` restituisce processing/ready/failed. Una chiamata ripetuta sul medesimo nome/data restituisce il lavoro esistente. Dopo un arresto della funzione può restare processing: trascorsi dieci minuti è possibile un retry esplicito, senza aggiornamenti forzati. Gli errori producono eventi incident, mai conteggi vuoti. L'estrazione è limitata a 1000 pagine, 8 milioni di caratteri e 180 secondi; nessun OCR implicito, le pagine con poco testo sono segnalate.

`read_source_text` restituisce fino a dieci pagine per chiamata. `read_source_page` restituisce una vera immagine MCP JPEG, senza download dal terminale del client. Dopo la creazione della bozza, `create_import_clip` estrae fino a venti pagine e registra sourceId/clipId/pages nel medesimo formato dei ritagli esistenti; `read_clip_page` permette il confronto visivo. Il testo automatico e i numeri di pagina non certificano un controllo editoriale. I conteggi delle voci e delle copertine devono essere verificati sul sommario/documento, non desunti dal numero di pagine.

Alla prima pubblicazione esplicita dell'editor viene registrata una scadenza a 24 ore per l'originale, con data di prima pubblicazione conservata anche dopo ritiro e ripubblicazione. La prima successiva lettura autenticata di `read_editorial_instructions` avvia la pulizia dei soli originali scaduti (massimo cinque a chiamata); con l'automatismo quotidiano la pulizia è giornaliera. Le 24 ore sono la soglia di scadenza, non un appuntamento di cancellazione: senza attività MCP la rimozione viene differita. Testi e ritagli restano, così come gli originali delle bozze non pubblicate; il ritiro per correzione sospende la pulizia finché non si ripubblica. Le scadenze già registrate non vengono migrate da questa modifica. Non servono nuove credenziali o un nuovo scheduler. Dopo la cancellazione non sono possibili nuovi ritagli da quella fonte. Gli import falliti e mai pubblicati vanno esaminati in caso di incidente; non vengono cancellati indiscriminatamente.

`tests/source-import.test.mjs` collauda il flusso completo su archivio e Blob simulati, inclusi concorrenza, SSRF, errori e conservazione.

Le istruzioni v7 vanno attivate nel repository contenuti **solo dopo il deploy e la verifica del nuovo MCP**. La sezione `lib/editorial-source-workflow.js` sostituisce il precedente percorso curl nel client. I metodi di upload seguenti rimangono disponibili per compatibilità, non sono richiesti dal percorso ordinario.

1. L'automatismo legge email e PDF come già previsto; usa MCP per creare una bozza.
2. prepare_pdf_upload restituisce un URL firmato per il caricamento diretto HTTP PUT del PDF. Il client deve poter inviare i byte: in alternativa si usa il caricamento da /editor. Un MCP da solo non garantisce questa capacità del client.
3. read_source verifica il PDF; create_clip estrae pagine intere numerate da 1. Verificare che le pagine non contengano altro materiale prima della pubblicazione.
4. save_draft salva titolo, sintesi, statistiche e articoli con versione esatta. I file PDF rimangono privati.
5. L'editor richiede modifiche dal sito o dal proprio ChatGPT.
6. Solo una richiesta esplicita di pubblicazione usa publish_edition con conferma e versione corrente. L'automatismo va collegato con permesso solo bozze.

Gli editor non devono modificare manualmente i JSON per il normale lavoro. Un salvataggio aggiorna bozza, revisione e indice nello stesso commit. La pubblicazione aggiorna snapshot pubblico, indice e registro della bozza nello stesso commit. GitHub rifiuta aggiornamenti concorrenti al branch; l'interfaccia conserva il testo e invita a ricaricare. Nessun force-push e nessuna sovrascrittura automatica dopo un conflitto.

Gli originali e i ritagli usano nomi immutabili. Solo i ritagli presenti nello snapshot pubblicato ottengono un link di lettura anonimo, temporaneo. I file completi non vengono serviti ai lettori. I salvataggi successivi non cambiano lo snapshot pubblico; ripristinare una revisione crea una bozza. Le edizioni storiche nel codice rimangono consultabili, non migrate automaticamente in bozze.

## Cartelle

- lib/github-store.js: commit atomici e controllo repository privato.
- lib/editor-service.js: bozze, revisioni, PDF e pubblicazione.
- lib/blob-store.js: upload/lettura Blob con link temporanei.
- lib/auth.js, app/api/auth, app/oauth: identità GitHub e OAuth MCP.
- content-template: unico file iniziale del repository dati.
- tests: prove isolate, senza dati di produzione.

Il repository dati contiene index.json, drafts, revisions, published, assets e oauth/grants. Non memorizza PDF o token GitHub. I file grant contengono identificativi di sessione e hash dei refresh token, non password né token bearer riutilizzabili.

## Verifiche e limiti

Eseguire npm test, npm run build, npm run build:news e npm audit. Le prove isolate verificano conflitti di commit, errori GitHub, privacy degli originali, estrazione PDF, pubblicazione, OAuth/PKCE e refresh token.

Da collaudare con i servizi reali: login con password, scrittura nel repository privato, upload e download Blob privato, OAuth dal ChatGPT effettivo, modifica simultanea, pubblicazione e verifica anonima. Nessuna credenziale reale è stata configurata in questa consegna.

Questa soluzione è pensata per una piccola redazione. GitHub impone limiti API: in caso di indisponibilità o limite raggiunto mostriamo l'errore senza trasformarlo in zero dati. Ogni documento JSON è limitato a 900 KB; il file indice cresce nel tempo. Le ultime 50 revisioni sono elencate nel pannello, tutte le revisioni restano nel repository. Non usare GitHub come archivio PDF o database ad alta frequenza.

## Incidenti

Non cancellare file o rigenerare l'indice se una lettura fallisce. Controllare prima token GitHub, permessi, visibilità privata, branch, stato provider e collegamento Blob. Conservare le modifiche non salvate nel modulo.

JUMP_ALERT_WEBHOOK_URL può ricevere soltanto progetto, codice evento e orario. Cooldown locale 15 minuti; il ricevitore AG Studio deve deduplicare globalmente e inoltrare l'alert. Senza ricevitore configurato, gli errori rimangono nei log/interfaccia. Configurare il monitor del percorso reale: login, lettura bozza e download di una fonte di collaudo, non solo home HTTP 200.

Per un errore di contenuto ripristinare una revisione nell'editor e pubblicarla solo dopo verifica. Per errori di codice tornare al deployment precedente. Non ripristinare l'intero repository dati: riattiverebbe anche vecchie sessioni OAuth. Dopo il recupero verificare lettore anonimo, editor e MCP; se il provider continua a fallire aprire un ticket con ora e request ID, senza documenti o credenziali.

Vedere CHANGELOG.md per le modifiche.

Fonti tecniche: [GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [GitHub Git data](https://docs.github.com/en/rest/git), [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [OAuth per ChatGPT](https://developers.openai.com/plugins/build/auth).


## Istruzioni editoriali centralizzate

La pagina riservata `/editor/istruzioni` contiene le istruzioni complete e il comando breve per l’attività ChatGPT quotidiana (07:45 Europe/Rome). Il testo iniziale deriva dal documento di Andrea, aggiornato al flusso bozza automatica e pubblicazione esplicita. Gli editor possono aggiornarlo solo tramite il connettore MCP: `settings/editorial-instructions.json` e lo storico sono salvati nel repository privato con controllo di versione e commit atomico. Una lettura non riuscita non usa il testo iniziale come ripiego.

Il tool MCP `read_editorial_instructions` restituisce sempre la versione corrente; producer può leggerla ma non modificarla. `save_editorial_instructions` consente la modifica a editor/publisher con versione corrente e conferma esplicita `SALVA_ISTRUZIONI`; producer resta in sola lettura. Nel sito il testo è consultabile e copiabile, senza salvataggio; la rotta web rifiuta PUT (405). L’automatismo non deve modificare le istruzioni. Le attività programmate devono usare un consenso senza pubblicazione. La pagina non crea o attiva attività sul ChatGPT di Cristina: usare la Gmail già collegata e collegare il nuovo MCP, provare manualmente e aggiornare l’attività esistente.


## Pagina completa delle nuove edizioni

`EditionView` è condiviso fra pubblico ed editor. `EditionAnalysis` riproduce quadro generale, prime pagine, distribuzione tematica, punti chiave/tono e guida alle stelle del 15 settembre, senza nuvola. I vecchi documenti restano leggibili: `coverage` assente vale null e non genera conteggi inventati. `coverage.examinedItems` è il conteggio prima della selezione; `sourceNote` documenta origine e metodo; `frontPages` è l'inventario verificato (testata, pagina originale, richiamo Juventus, sportiva nazionale), null se non verificato e [] solo se nessuna copertina è presente dopo verifica. `frontPageSummary` e `toneSummary` contengono le letture editoriali. Distribuzione tematica e stelle sono ricavate dagli articoli salvati.

Le istruzioni da integrare sono in `lib/editorial-delivery.js`; sono già incluse nel testo iniziale per installazioni nuove. Il repository contenuti esistente mantiene la propria versione 4: non viene sovrascritto da un cambio di codice. Al rilascio, PRIMA distribuire il codice/MCP che accetta i nuovi campi, POI leggere la versione corrente delle istruzioni e aggiungere il testo di consegna tramite il salvataggio editoriale con controllo di versione. Non attivare le nuove istruzioni contro il vecchio schema MCP. Nessun cambio all'attività programmata è necessario se già legge `read_editorial_instructions` a ogni esecuzione.

Verifiche: `tests/edition-analysis.test.mjs` controlla sconosciuto/zero, inventario, conteggi e salvataggio compatibile con le bozze precedenti. La bozza di prova del 17 resta incompleta: non popolare le sezioni copiando i numeri del 15.

### Lettura e ritagli in gruppi (MCP 1.7)

Gli strumenti singoli restano disponibili. `read_source_text_batch` restituisce fino a 40 pagine intere e 120 KB: continuare dal `nextPage` restituito, senza saltare pagine. `read_source_pages` e `read_clip_pages` restituiscono fino a 4 immagini e 3 MB codificati: richiedere gli elementi rimasti. Le immagini originali vengono renderizzate aprendo il PDF una sola volta per gruppo.

`create_import_clips` accetta fino a 5 coppie articolo/pagine e la versione corrente della bozza. Apre l’originale una sola volta, conserva ogni ritaglio riuscito e associa il gruppo con una nuova revisione. Le scritture Git sono seriali per evitare conflitti tra ritagli dello stesso gruppo. Nessuna pubblicazione automatica. Se il risultato è parziale, rileggere la bozza e ripresentare il gruppo ancora da associare: i ritagli identici già salvati sono riutilizzati. Se cambia la versione, fermarsi e conservare le modifiche dell’editor. Non rilanciare gruppi contemporanei sulla stessa bozza. I test usano solo repository e Blob in memoria, senza dati di produzione.

### Visualizzatore ritagli
Il riquadro dei ritagli usa PDF.js 6.3.289, distribuito con licenza in public/pdfjs, caricato soltanto all'apertura di un PDF. Mostra una pagina alla volta con navigazione e zoom; chiudendolo libera il documento e ripristina il focus. Per aggiornare PDF.js riallineare questi asset alla versione di pdfjs-dist installata. Il filtro modifica soltanto la visibilità degli articoli, non i conteggi della rassegna.

## Cestino delle bozze
La barra editor raccoglie Archivio, Aggiorna, Conferma bozza e il menu con Istruzioni, Cestino, Elimina bozza ed Esci. Il server permette eliminazione e ripristino solo a editor/publisher, controllando versione e commit concorrenti. L'eliminazione conserva contenuto, revisioni e asset privati, rimuove la voce dall'indice attivo e imposta deletedAt. Le scritture MCP su una bozza cestinata vengono rifiutate; il ripristino incrementa la versione e rifiuta date già occupate. Le rassegne già pubblicate non sono eliminabili da questo comando. Il cestino non elimina fisicamente i PDF.

Per la prova grafica isolata aprire /anteprima-locale con npm run dev: i comandi di conferma, eliminazione e ripristino usano esclusivamente lo stato della pagina dimostrativa e non chiamano le API di produzione. La pagina è indisponibile in produzione. L'editor reale continua a usare il normale login e le API autorizzate.

### Metriche e legenda nelle nuove edizioni
Le quattro tessere iniziali duplicate sono rimosse; le metriche restano nel quadro generale. La guida al peso editoriale è una nota compatta. Gli sportivi italiani sono riconosciuti per testata (Gazzetta, Corriere dello Sport/Stadio, Tuttosport), senza usare il flag nationalSports che può includere testate estere. Le percentuali intere della legenda usano i maggiori resti e sommano 100 per ogni edizione non vuota; il grafico mantiene le proporzioni esatte. Le pagine storiche statiche non vengono riscritte.
Il popup PDF adatta inizialmente la pagina a larghezza e altezza disponibili; zoom 50–400% e Adatta consentono la lettura dei dettagli.


## Automatismo coordinato — MCP 1.9, preparato in locale

Prima di cambiare gli orari: distribuire il codice, verificare la discovery MCP e usare il prompt breve `automationPrompt` di `lib/editorial-instructions.js` e salvare la procedura centralizzata tramite connettore. Non creare un heartbeat Codex al posto dell’attività ChatGPT. Questa modifica locale non aggiorna il calendario né le istruzioni editoriali salvate nel repository privato. La fascia dei controlli ogni cinque minuti va concordata prima dell’attivazione (esempi iniziali: 07:35, 07:40, 07:45 Europe/Rome; per recuperi dopo le 07:45 servono controlli successivi).

- Mail assente: uscita senza prenotazione. Errore di Gmail/archivio: errore esplicito, mai «nessuna mail».
- `claim_automation_run`: chiave unica per data e controllo della fonte Ecostampa. Prenotazione con commit atomico; solo una esecuzione vince. UUID diverso per esecuzione, stesso UUID solo per rileggere l’esito di una richiesta incerta. Una bozza/pubblicazione/cestino preesistente non riconosciuta dal lavoro richiede revisione.
- Con `acquired=true` usare `run` in TUTTE le chiamate di lavoro. Scadenza a dieci minuti; `renew_automation_run` ogni due minuti e fra gruppi. `read_automation_run` espone stato, fonte, bozza assegnata e avanzamento. I lavori occupati/completati si saltano senza notifiche ripetitive.
- Recupero esplicito `resume=true` dopo scadenza o fallimento transitorio; al massimo tre tentativi totali. Preserva draftId, importId, cursore e pagine dei ritagli già verificate. La nuova generazione invalida i vecchi salvataggi; il controllo usa lo stesso snapshot Git del commit. Finché il lavoro è riservato, anche modifiche editoriali concorrenti a quella data sono respinte. Un lavoro interrotto non va sbloccato cancellando JSON: rileggere stato e riprendere tramite connettore. Se i tentativi sono esauriti serve diagnosi e intervento, non retry ciechi.
- `finish_automation_run` richiede versione corrente, testo interamente letto (`nextPage=pageCount+1`), copertine valorizzate, associazioni dei ritagli coerenti e checkpoint per ciascuna pagina verificata. Questi checkpoint sono attestazioni dell’agente, non una prova automatica di qualità editoriale. Chiude come pronto per revisione, senza pubblicare. Un `run` non può pubblicare o cambiare istruzioni.
- Il collegamento condiviso resta utilizzabile interattivamente. Il server non può riconoscere l’intenzione di un client che omette deliberatamente `run`: prima di attivare controlli ripetuti devono usare tutti il nuovo protocollo. Non mantenere attività vecchie in parallelo. La protezione impedisce prenotazioni concorrenti e salvataggi obsoleti; non può interrompere fisicamente il ragionamento di un client remoto o un PDF già in elaborazione. Eventuali file immutabili senza associazione dopo un arresto non vanno cancellati indiscriminatamente.
- Tempi: importazione espone download, estrazione e storage; i log MCP riportano solo nome tool e durata, senza argomenti o contenuti; i lavori salvano tempi trascorsi per fase. Le pause non rinnovate dopo un arresto non sono contabilizzate come lavoro misurato. `fail_automation_run` emette l’incidente deduplicato esistente; l’inoltro richiede `JUMP_ALERT_WEBHOOK_URL`, non configurato automaticamente.
- Ritagli: `read_clip_pages` carica e apre ogni PDF una volta per gruppo, preserva ordine e immagini, limita la risposta a 3 MB e restituisce gli elementi ancora da leggere. Nessuna riduzione di risoluzione o dei controlli editoriali.

Collaudo con archivi in memoria: avvii simultanei, risposta persa, rinnovo/scadenza, recupero, vecchie scritture, guasto/corruzione archivio, unicità data, limite tentativi, completamento incompleto e divieto di pubblicazione con run. Rollback: prima fermare i controlli ripetuti e attendere/verificare i lavori in corso; non tornare a codice senza coordinamento lasciando attivi più avvii. Nessun test scrive contenuti reali.

Misura locale del 18 settembre, in sola lettura su due pagine dello stesso ritaglio reale: chiamate singole 6.630/3.791 ms, gruppo 2.916/2.656 ms (due prove alternate, immagini identiche byte per byte). Include GitHub, Blob e rendering; esclude trasporto MCP e ragionamento del modello. Il rendering isolato non mostra un vantaggio: il beneficio misurato deriva dalle richieste raggruppate. Campione piccolo, non è una previsione del tempo totale della rassegna. Verifica finale: 51 test e build press/news riusciti.

### Revisione locale delle istruzioni
In sviluppo, `.local/editorial-instructions.json` (escluso da Git) contiene il testo candidato completo e sourceVersion della versione online da cui deriva. La pagina e il MCP locali restituiscono questa anteprima, chiaramente etichettata, solo dopo aver letto con successo la versione reale. Se questa cambia, la lettura richiede riallineamento. Il salvataggio online da questo ambiente è bloccato mentre esiste l’anteprima. In produzione il file è ignorato. Per attivare il testo occorre distribuirne prima i tool richiesti e salvarlo tramite il connettore con controllo di versione. Il prompt resta un rimando stabile a read_editorial_instructions.

La candidata locale e il testo iniziale sono riallineati: categoria Competizioni europee, checklist conclusiva unica, importazione e ritagli tramite MCP a gruppi. Nomi e lunghezze restano invariati in attesa delle sintesi del 13 settembre (l’archivio storico locale contiene solo titoli e ritagli). La scadenza degli originali indica idoneità alla rimozione: la route MCP programma la pulizia dopo la lettura autenticata di read_editorial_instructions, come descritto nel flusso editoriale.

### Copertine cliccabili
Ogni frontPages con juventus=true richiede sourceId e clipId di un ritaglio della sola page originale. GPT lo crea con create_import_clip, verifica la pagina locale 1 e salva la relazione; non crea articoli fittizi. Pubblicazione e completamento automatico verificano i collegamenti; il pubblico accede soltanto ai ritagli nello snapshot pubblicato. sourceId resta privato. Le edizioni preesistenti senza clipId mostrano il marchio senza link e senza avvisi di associazione mancante. Nessun recupero o modifica dei contenuti online eseguiti per questa modifica locale.

### Correzioni dopo la pubblicazione
Nell’archivio, solo per editor, PUBBLICATA compare accanto alla data; matita e cestino occupano lo stesso spazio a destra. La matita richiede conferma esplicita prima di ritirare la pubblicazione e aprire la bozza originale. Il ritiro è atomico, conserva lo storico e disabilita le letture pubbliche e dei ritagli; eventuali link temporanei già emessi scadono entro 60 secondi. Il modulo permette correzioni ai testi e al peso editoriale; salva una nuova revisione privata. La rassegna resta nascosta fino alla ripubblicazione. Solo publisher può confermare Pubblica correzioni, sulla versione corrente. Conflitti e guasti lasciano i testi nel modulo. Un avviso protegge l’uscita con modifiche non salvate. Invii e copie esterni non vengono richiamati. Fonti, ritagli e copertine si correggono tramite MCP. Le vecchie copertine prive di associazione restano tollerate soltanto se già presenti senza ritaglio nello snapshot pubblico; le nuove restano obbligatorie.

### Correzioni rapide nelle sezioni (locale)
La normale pagina della bozza mostra matite riservate a editor/publisher su introduzione, punti chiave, toni e ogni articolo. Ogni matita apre solo i relativi campi in un dialogo, con Annulla/Salva in bozza; nessun modulo globale. Il salvataggio conserva gli altri campi e usa la versione catturata all’apertura: un conflitto mantiene il testo nel dialogo senza sovrascrivere il lavoro GPT. Le modifiche estese e le fonti restano tramite connettore. Conteggi e grafici derivati si aggiornano dai dati degli articoli.

### Categorie editoriali fisse (anteprima locale)
Il catalogo in lib/editorial-topics.js ordina i blocchi e conserva l’ordine interno degli articoli. Editoriali resta il primo blocco; topic contiene il tema, mostrato accanto e conservato nella proiezione pubblica. Le istruzioni locali prescrivono categorie canoniche, interviste assegnate al proprio argomento e nessuna quota minima per sezione. La classificazione delle vecchie rassegne non viene riscritta: etichette ambigue non riconosciute confluiscono nella visualizzazione Altri temi finché un editor non le riclassifica; il modulo mostra il valore originale da riclassificare. Nessun argomento storico viene inventato.

### Accorpamento dei temi
Otto blocchi: Editoriali, Prima squadra, Prossimo avversario, Settore giovanile, Next Gen, Juventus Women, Politica sportiva, Altri temi. La presentazione accorpa anche i vecchi valori senza riscrivere i dati: Mercato e Società e dirigenza in Prima squadra; Arbitri e VAR in Politica sportiva; Nazionale e Competizioni europee in Altri temi. Istruzioni locali allineate; schema compatibile con gli argomenti editoriali precedenti.
