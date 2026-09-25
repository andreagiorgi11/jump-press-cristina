# Jump Press — GitHub e Vercel

Il progetto usa GitHub privato per i contenuti JSON, Vercel per il sito e Hetzner per l’archivio PDF. Non richiede Supabase, SQL o un provider separato per gli account.

## Stato corrente — 25 settembre 2026

Produzione: https://jump-press-approvazione.vercel.app (team Vercel `andrea-giorgi`). Contenuti: repository privato `andreagiorgi11/jump-press-contenuti`. Codice di rilascio: branch `feature/juventus-summary` del remote `editor-fork`; il push di `upstream` resta disabilitato.

PDF e ritagli correnti risiedono su `https://jpfiles.agprojects.dev`, con `JUMP_FILES_URL` e `JUMP_FILES_SECRET`; configurazione in `services/jump-press-files/INSTALLAZIONE.md`. I file storici dal 17 al 24 settembre non sono stati migrati e restano indisponibili sul vecchio Blob. Le sezioni successive che descrivono Blob documentano la configurazione precedente.

Il locale corrente si avvia con `avvia-reale.bat` su http://127.0.0.1:3019 e usa dati reali. Le build vanno eseguite separatamente dalla directory del dev server. Prima del rilascio: test isolati, build Press e News, verifica del deployment e delle protezioni delle API. Un deploy del codice non pubblica le bozze e non aggiorna le istruzioni editoriali: queste si salvano separatamente con controllo versione e storico nel repository dei contenuti.

Versione precedente al rilascio Nazionale: commit `35f4816`, deployment `dpl_4cZa8JdmdhQMsiw52vRPvuM2AqbX`. Prima di un rollback verificare la compatibilità dei contenuti: questa versione precedente non accetta la nuova categoria Nazionale.

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

Nel layout Approvazione, aprire la home con una sessione web valida di editor/publisher reindirizza sul server a `/editor`, prima di leggere la rassegna pubblica. Una sessione assente, scaduta o revocata lascia la home pubblica; un errore di configurazione non viene mascherato da logout. L'Anteprima lettore resta dentro l'editor e non attraversa la home. Le edizioni storiche `/edizioni/data` restano consultabili: per gli editor collegati REDAZIONE contiene Apri editor e Istruzioni, mentre i comandi di pubblicazione compaiono soltanto nella bozza aperta. Esci resta nel fondo della barra; i lettori anonimi vedono Accesso editor.

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

La candidata locale e il testo iniziale sono riallineati: categoria Competizioni europee, checklist conclusiva unica, importazione e ritagli tramite MCP a gruppi. Nomi e lunghezze restano invariati in attesa delle sintesi del 13 settembre (l’archivio storico locale contiene solo titoli e ritagli). La scadenza degli originali indica idoneità alla rimozione; la route MCP programma la pulizia dopo la lettura autenticata delle istruzioni.

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

## Laboratorio Summary — ramo feature/juventus-summary
Worktree separato dal sito pubblicato, basato sul rilascio 4e0ae17. Avvio con avvia-summary.bat, porta 3018 su 127.0.0.1. Installazione indipendente delle dipendenze; nessun file .env o credenziale di produzione copiato. Il launcher rifiuta file env e rimuove le credenziali ereditate. In modalità laboratorio sono accessibili solo / e /summary, con API, OAuth e connettore disabilitati.

Il campione .local/summary-source.json contiene esclusivamente una copia dei testi pubblicati del 18 settembre, non PDF originali, account o dati privati. .local/summary-preview.json contiene la sintesi proposta, basata sui 22 articoli selezionati e non su una nuova lettura integrale del PDF. Entrambi sono esclusi da Git. La pagina segnala questa provenienza e la classificazione provvisoria di giovani/Next Gen nelle Varie. Modifiche dei campi solo nello stato della pagina, senza persistenza; esportazione tramite stampa del browser. Nessun invio o pubblicazione automatico. I PDF completi delle sezioni e il collegamento GPT restano da definire.

### Istruzioni della proposta Summary
Output: una pagina, sintesi generale breve e highlights accorpati nelle quattro aree richieste. Un tema non è un titolo di articolo; più pezzi sullo stesso argomento contribuiscono a un solo highlight. Nessuna sezione autonoma Editoriali o Sentiment: i commenti alimentano il tema pertinente, il tono può essere richiamato nel cappello. Giovani e Next Gen nelle Varie solo come ipotesi provvisoria. Non inventare temi né riempire aree prive di notizie. Revisione umana prima di qualsiasi invio; canale e composizione dei PDF dettagliati ancora da concordare. Queste regole del laboratorio non aggiornano le istruzioni del connettore di produzione.

## Revisione laboratorio: stessa pagina, quattro sezioni
La homepage del laboratorio riusa EditionView della rassegna originale. Conserva introduzione, quadro numerico, copertine, distribuzione dei temi, punti chiave, tono, stelle e articoli. Cambiano soltanto il raggruppamento e la navigazione: Prima squadra, Prima squadra femminile, Politica sportiva, Temi vari. La mappatura degli editoriali senza topic è stata verificata sul campione del 18; non è un classificatore automatico per nuove edizioni. Grafico e conteggi derivano dai gruppi visualizzati. I testi originali non vengono modificati. Sostituisce la precedente homepage executive del prototipo.

Il campione completo pubblico è in .local/summary-edition.json. I ritagli si aprono con il visualizzatore esistente attraverso un proxy GET limitato agli ID già presenti nel campione e al sito pubblico Jump Press. Nessuna credenziale, scrittura o accesso a originali privati. Restano bloccati editor, OAuth e MCP. Il pulsante Esporta PDF apre la stampa del browser: scegliere Salva come PDF. Esporta l'intera pagina su più pagine A4, compresi gli articoli nascosti da eventuali filtri; non è il precedente summary di una pagina.

### Esportazione PDF diretta
Il comando Esporta PDF ora scarica direttamente /summary/pdf, senza aprire la stampa del browser. Il documento A4 contiene introduzione, numeri, distribuzione dei temi, punti chiave, toni e tutti i 22 articoli nelle quattro sezioni. Il campione produce sei pagine; impaginazione dedicata alla lettura su carta. Endpoint solo locale; nessun invio. Verificati risposta PDF, tutti i titoli presenti ed esame visivo delle sei pagine.

## Card unica e anteprima PDF
La versione parallela usa la barra editor originale (menu Editor, Archivio locale, Anteprima lettore) con Esporta PDF. I comandi restano dimostrativi e isolati dalla produzione; nessuna conferma pubblicazione sul campione già pubblicato. Distribuzione dei temi e tre punti chiave sono riuniti in una card compatta con anello, legenda piccola e soli conteggi. Toni preservati nei dati ma non mostrati in questa variante. Il PDF riprende la nuova lettura senza percentuali e toni, con copertina scura, riquadri numerici, anello e gerarchia tipografica. Esporta PDF apre un dialogo PDF.js con pagine, zoom e download; nessun plugin PDF del browser richiesto.

### Summary separato di una pagina
Il pulsante Summary apre un'anteprima PDF dedicata con sintesi generale e highlights delle quattro aree, scaricabile separatamente. Usa la proposta locale .local/summary-preview.json e mantiene la dicitura da revisionare; non genera una nuova analisi GPT. Esporta PDF continua a mostrare la rassegna completa. Entrambi gli endpoint sono limitati al laboratorio locale. Verificati il Summary su una sola pagina A4, anteprima e download, e le build Press e News.

### Temi del Summary: numero variabile
Sezioni del Summary: Prima squadra maschile, Prima squadra femminile, Politica sportiva, Varie. Prima squadra maschile: massimo cinque temi, selezionati per rilevanza diretta per la Juventus; dare priorità a risultato e assetto, protagonisti, guida tecnica, disponibilità e prossimo avversario quando presenti. Escludere notizie marginali sugli ex (come Openda al Lione) salvo impatto concreto sulla Juventus. Non riempire fino a cinque se i temi rilevanti sono meno. Le altre aree non hanno quote fisse. Non usare il numero degli articoli come numero degli highlights. Leggere l'intera selezione, accorpare gli articoli sullo stesso argomento e riportare ogni tema rilevante distinto una sola volta nell'area pertinente. Le aree possono avere numeri di temi diversi; non aggiungere temi per riempirle. Ordinare per rilevanza e scrivere una frase breve per highlight, integrando i commenti editoriali nel tema.
Obiettivo: una pagina A4 leggibile. Prima ridurre ripetizioni e lunghezza delle frasi senza perdere i temi; non troncare liste né eliminare automaticamente gli ultimi highlights, non rimpicciolire indefinitamente il testo. Se non basta, richiedere una scelta editoriale tra selezione degli highlights principali e più pagine. L'esportazione segnala il superamento della pagina e non produce un PDF tagliato.
Il campione locale del 18 contiene cinque temi prima squadra e due per ciascuna altra area. Il nome di ogni highlight, prima dei due punti, è in grassetto; la spiegazione rimane in tondo. Il limite di cinque è validato senza troncamenti automatici: la selezione deve avvenire editorialmente, prima della generazione del PDF. Istruzioni del laboratorio; il connettore GPT di produzione non è stato modificato.

### Rilevanza e PDF completo nel laboratorio
La variante locale rimuove la legenda Peso delle notizie e sostituisce le stelle con cinque barrette verdi per articolo, con etichetta accessibile Rilevanza N su 5. Valori editoriali e comportamento della versione originale invariati. Il PDF completo usa titoli serif, testata e autore distinti, indicatori di rilevanza, separatori sottili e apertura di ogni area su pagina nuova. Il campione contiene tutti i 22 articoli in otto pagine; verificati rendering e anteprima. Il Summary di una pagina resta separato.

### Prima pagina PDF allineata al sito
Il PDF completo usa Arial normale e grassetto incorporati, con gli stessi caratteri del sito; la vecchia scelta serif è superata. Nel laboratorio i file arial.ttf e arialbd.ttf sono copie dei font Windows in .local, esclusi da Git: necessari per generare il PDF, non distribuiti nel repository. Prima di un eventuale deploy definire una distribuzione dei font compatibile con la licenza. Copertina con card Quadro della giornata, metriche compatte, loghi delle copertine e card unica temi/punti chiave. PNG dei loghi derivati dagli SVG già presenti, con La Stampa scura come nel sito. Verificati otto pagine, tutti i 22 titoli, anteprima e build Press/News.

### Apertura ritagli nel laboratorio
Visualizzatore più ampio e zoom flottante semitrasparente in basso. Precaricamento su passaggio/focus del link pubblico (massimo due richieste contemporanee), cache in memoria limitata a tre PDF da massimo 8 MB per 60 secondi, riuso del worker PDF.js. I ritagli privati non vengono precaricati e mantengono la verifica di accesso ad ogni apertura. Richieste annullate allo smontaggio. Verificati apertura reale, zoom 125%, chiusura e riapertura dalla cache; nessuna modifica al contenuto dei PDF.

### Modello editoriale Summary v1 e audit MCP
Profilo separato selezionato da JUMP_EDITORIAL_MODEL=summary-v1 (o sandbox locale), senza modificare le istruzioni online v12. Le istruzioni di lib/summary-instructions.js mantengono recupero, controlli e coordinamento e sostituiscono l'ordine precedente con quattro aree. GPT produce i contenuti, Jump Press esporta entrambi i PDF. Il campo executiveSummary (intro e quattro sezioni ordinate) viene salvato da save_draft con editorialModel=summary-v1, senza nuovo tool. È ammesso null nelle bozze incomplete. Limite cinque temi maschili, tre keyPoints, categorie valide e impaginabilità in una pagina obbligatori prima di completamento/pubblicazione. Modifiche ai testi o alla selezione invalidano un Summary invariato; associare ritagli non lo invalida. Il campione locale usa ora lo stesso campo. Nessuna attivazione del nuovo automatismo online.

Audit 18 settembre: server publisher 26 strumenti; producer 24. Flusso ordinario (16): cinque automation_run; read_editorial_instructions; import_source_url; read_import_status; read_source_text_batch; read_source_pages; create_import_clips; create_import_clip per le copertine; read_clip_pages; list_drafts; read_draft; save_draft. Recupero/compatibilità (8): read_source_text, read_source_page, read_clip_page, prepare_clip_upload, prepare_pdf_upload, read_source, create_clip, restore_revision. Gestione (2): save_editorial_instructions e publish_edition, non disponibili al producer. Preferire i batch; nessuno strumento eliminato senza verifica dei client esistenti.
Il collegamento esposto alla sessione mostra 20 strumenti: non espone i cinque automation_run né save_editorial_instructions e il suo schema save_draft è precedente (mancano anche campi già presenti sul server). Questo è un disallineamento del catalogo client, non prova di assenza dei tool sul server. Prima del collaudo programmato aggiornare/riconnettere il client e verificare tools/list, campi editorialModel/executiveSummary/run e completamento protetto. I 60 test locali passano; il collaudo dell'automatismo reale e la pubblicazione dell'anteprima online sono ancora separati da questa verifica.

### Anteprima online separata per Cristina
Pubblicata il 18 settembre su https://jump-press-approvazione.vercel.app, progetto Vercel jump-press-approvazione nel team andrea-giorgi. Sorgenti autonomi in ../jump-press-approval: solo pagina statica Next, PDF pregenerati e 22 ritagli gia pubblici copiati. Nessun MCP, editor API, credenziale o accesso in scrittura alla produzione; senza password su richiesta di Andrea. Non sostituisce il sito ufficiale e non attiva il nuovo automatismo. Rimozione al termine della revisione su indicazione di Andrea. Aggiornamento del collegamento ChatGPT lasciato ad Andrea su sua richiesta; nessuna disconnessione eseguita.


## Stato attuale e passaggio al sito principale � 18 settembre 2026
Questa sezione prevale sulle descrizioni storiche del laboratorio sopra. Le prime versioni con stampa browser, sei pagine, campi temporanei e selezione di due temi sono superate.

- Locale: http://127.0.0.1:3018, ramo feature/juventus-summary. Pagina originale con quattro aree; bande numerate scure e lime sugli articoli; Summary di una pagina e PDF completo di otto pagine sul campione. Anteprima prima del download.
- Dati di prova: .local/summary-edition.json, copia della rassegna pubblicata con executiveSummary curato per la proposta. Non � una nuova analisi integrale automatica delle fonti.
- GPT: summary-v1 definisce le quattro categorie canoniche, massimo cinque temi maschili, nessuna quota minima nelle altre aree, tre keyPoints per il sito. Istruzioni e schema sono nel codice del ramo; non sono attivi sul server principale.
- Sicurezza del Summary: variazioni di contenuto, rilevanza, attribuzione o fonte invalidano una sintesi rimasta identica. Client che omettono il campo non lo cancellano quando i contenuti restano invariati. L'associazione di un ritaglio non invalida la sintesi. Bozze incomplete non possono essere dichiarate pronte nel nuovo modello.
- PDF: entrambi i generatori accettano font forniti dal chiamante. Senza font esterni usano Helvetica standard e funzionano senza i file Windows; il laboratorio passa Arial esplicitamente, mantenendo l'aspetto approvato. Prima del rilascio con Arial, predisporre font distribuibili con licenza verificata; non copiare i file Windows sul server. Convalidare l'impaginazione usando gli stessi font impiegati nell'esportazione finale.
- L'anteprima pubblica jump-press-approvazione � statica, con PDF pregenerati. Le ultime modifiche locali non sono automaticamente pubblicate. Non ha autenticazione editor o MCP.

### Passaggi ancora necessari dopo l'approvazione
1. Integrare la vista nuova e i comandi PDF nelle pagine reali (home, edizione, bozza editor); oggi /summary e /summary/pdf restano esclusivamente laboratorio. Non promuovere la copia statica come backend principale.
2. Esportare dallo snapshot reale selezionato: pubblicato per il lettore, bozza con sessione editor e controllo autorizzazioni per l'editor. Nessuna lettura del campione .local in produzione; no cache pubblica per bozze. Summary assente nelle vecchie edizioni: non inventarlo n� obbligare a rigenerarlo.
3. Distribuire font/licenze e asset necessari; collaudare entrambi i PDF nell'ambiente server finale.
4. Su un ambiente autenticato separato, aggiornare il catalogo del connettore: verificare i cinque tool automation_run e lo schema save_draft. Non rinominare o rimuovere gli strumenti di compatibilit� durante la migrazione.
5. Collaudo GPT con copia di una fonte storica e archivio dati isolato: due partenze concorrenti, una sola prenotazione; seconda partenza dopo completamento salta; ripresa da checkpoint dopo interruzione; Summary valido e bozza integra. Non nascondere n� ritirare una rassegna pubblicata per testare.
6. Verificare nel sistema che programma GPT orari, stato attivo e motivo della pausa precedente. Il lock server impedisce duplicazioni, ma non garantisce che il pianificatore esterno esegua o riprenda un'attivit�.
7. Solo con approvazione e collaudo riuscito: deploy del ramo completo e attivazione esplicita JUMP_EDITORIAL_MODEL=summary-v1. Conservare deployment precedente e snapshot dati. Nessuna riscrittura automatica dello storico. Un rollback del codice non deve eliminare campi o dati nuovi.

Nessun deploy principale, refresh/disconnessione del connettore o modifica alle automazioni � stato eseguito durante questa preparazione.

Il pacchetto locale ../jump-press-approval è stato allineato agli ultimi PDF e alle bande numerate, pronto per un futuro aggiornamento dell'anteprima. Nessun deploy eseguito. Verifica preparatoria: 62 test locali e build Press/News riusciti; home e due endpoint PDF rispondono 200 sul laboratorio.

Aggiornamento anteprima autorizzato e pubblicato: deployment dpl_E7nsenJkw2SuCGV2MQwGtv3xLhCg, alias https://jump-press-approvazione.vercel.app. Include ultimo Summary, bande numerate nel sito e PDF completo e spazio tra bande. Verificati accesso anonimo 200, 22 bande e PDF online identici ai file locali; API editor e MCP restano 404. Sito principale e automatismo invariati.


### Allineamento conservazione — 19 settembre 2026
Originali a 24 ore dalla prima pubblicazione esplicita dell’editor: codice, istruzioni GPT ereditate dal modello Summary e menu Istruzioni dell’anteprima allineati. Ritiro sospende pulizia, ripubblicazione conserva il conteggio. Testi e ritagli restano. Scadenze esistenti non migrate. Regola candidata, non attivata sul sito principale; ottimizzazione ritagli ancora solo sperimentale.

19 settembre 2026: la conservazione a 24 ore è stata rilasciata sul sito operativo con PR #24 (merge cd4d26b), istruzioni online v13. Il modello Summary resta separato e in approvazione; nessuna attivazione del profilo sul sito principale. L’avviso dell’anteprima è allineato a questa distinzione.

## Passaggio operativo ad Approvazione — 22 settembre 2026

Andrea ha richiesto di rendere `jump-press-approvazione.vercel.app` la piattaforma operativa. Questa sezione sostituisce le precedenti indicazioni di sola anteprima statica; `/summary` rimane un laboratorio esclusivamente locale.

La modalità `JUMP_APPROVAL_LIVE=1` integra la grafica approvata nella home, nelle edizioni pubblicate e nelle bozze della redazione. `JUMP_EDITORIAL_MODEL=summary-v1` attiva quattro categorie e il Summary strutturato. Il repository dati e lo store Blob privati sono gli stessi del servizio precedente: nessuna copia, pubblicazione o riscrittura dello storico. L'ultima edizione pubblicata può essere diversa dall'anteprima dimostrativa.

`/api/edition-pdf` legge lo snapshot pubblicato della data richiesta oppure una bozza autenticata con versione esatta. I ritagli devono appartenere alla medesima edizione; originali e altre bozze non sono esportabili. Il PDF completo viene validato prima della risposta in streaming. Una vecchia edizione senza Summary mantiene il PDF rassegna; non viene inventato un Summary. I font provengono dagli asset distribuiti, senza dipendenze da Windows o `.local`.

Le istruzioni Summary derivano dalle istruzioni operative correnti e conservano selezione della mail primaria, controllo duplicati, lease e recupero. Eventuali modifiche al profilo vengono salvate separatamente in `settings/summary-editorial-instructions.json` con storico e controllo di versione; il testo operativo precedente non viene sovrascritto.

Distribuzione: usare questo worktree completo, collegato al progetto Vercel `jump-press-approvazione`, non il vecchio pacchetto statico `jump-press-approval`. `.vercelignore` esclude credenziali, campioni locali e build locali di tutte le modalità. Configurare `JUMP_PUBLIC_URL=https://jump-press-approvazione.vercel.app`, le credenziali server, `JUMP_SITE=press` e i due flag sopra. Il nuovo dominio usa una chiave di sessione distinta e richiede un collegamento OAuth proprio.

Rollback disponibile: precedente deployment statico `dpl_k9N7ZPqL4CQpCkbPdfJ7YPPEq2Yx`. Ripristinarlo ripristina solo l'anteprima, non un backend operativo. Il vecchio servizio Juventus rimane disponibile finché il collegamento nuovo e tutti e tre gli automatismi ChatGPT di Cristina non sono verificati. Nessun rollback deve eliminare dati o campi nuovi.

Verifiche locali: 66 test superati, build press e news, home reale e PDF nel browser; API privata senza sessione 401, data non pubblicata 404, Summary assente 422. Il passaggio dei tre automatismi va verificato nella loro UI: trigger Gmail Ecostampa, controllo 07:40 e controllo 07:45, senza alterare le correzioni operative del 22 settembre né avviare pubblicazioni automatiche.

### Esito del passaggio (22 settembre, pomeriggio)
- Deploy operativo: `dpl_9TfSewndyfwMTFDGtBYJtMQY8sUz`, alias `https://jump-press-approvazione.vercel.app`.
- Collegamento ChatGPT di Cristina: `Jump Press approvazione`, app `asdk_app_6ab2958c792c81919e12e2820e304406`. Catalogo caricato dopo aver sostituito lo schema tuple del Summary con array omogeneo compatibile, mantenendo tutti i controlli server su ordine e limiti.
- Rilettura reale da ChatGPT riuscita: istruzioni v14, `editorialModel=summary-v1`, sei bozze e run del 22 completato. Nessun run acquisito per il collaudo.
- Tre automatismi esistenti aggiornati senza ricrearli: Gmail `6ab0d7ba1c1881918937d3ec7d59f9ea`, 07:40 `6ab0d590d524819194d4d8c14a992363`, 07:45 `6aad1ec764908191a450c38b8431b219`. Prompt originale integralmente conservato, con destinazione esclusiva Approvazione aggiunta in apertura. Orari, trigger e stato attivo conservati e riletti.
- Andrea ha confermato esplicitamente di mantenere «Consenti tutte le azioni» sul nuovo collegamento. Il ruolo tecnico resta publisher; divieto di pubblicazione automatica invariato, con rifiuto server delle pubblicazioni che includono run.
- PDF pubblico con ritagli verificato in produzione: 47 pagine, 9.09 MB. I PDF delle bozze restano autenticati. Il sito vecchio e il vecchio collegamento non sono stati eliminati né nascosti in questa fase.

### Coerenza pagina e PDF della rassegna
Le modifiche approvate a titoli, gerarchia, segnali e grafici vanno applicate insieme a `CombinedAnalysis`, `EditionAnalysis` e `lib/summary-pdf-cover.js`. Verificare la copertina nelle esportazioni completa, per sezioni e con ritagli. Le descrizioni dei segnali provengono dagli stessi `keyPoints`; font Roboto regular/semibold/bold e colori dei temi sono condivisi. Il Summary separato usa `lib/executive-summary-pdf.js`: mantenerne la struttura finché non viene richiesta una revisione specifica.

### Ritagli automatici e avvisi — 22 settembre, sera
Il nuovo flusso passa `sourceImportId` nel corpo di `save_draft`, insieme a `pages` per articolo (posizione nel PDF completo da 1). Il server salva prima i contenuti, poi apre una volta la fonte e prepara e associa i ritagli di articoli e copertine Juventus. Una revisione atomica registra associazioni, controlli e durata; i ritagli già associati vengono riutilizzati. In caso di conflitto nessun contenuto concorrente viene sovrascritto; se la funzione si interrompe resta la bozza con controlli pendenti. La preparazione si riprende salvando la versione corrente. Tempo di lavorazione limitato per preservare la risposta; i residui restano segnalati.

Titolo confrontato con testo della prima pagina; difformità e guasti diventano «PDF da verificare», senza impedire salvataggio o consegna dell’automatismo. `factCheck` contiene la verifica dichiarata da GPT e gli estratti con pagina; il server riscontra gli estratti ma non certifica la correttezza semantica. Verifica assente, dubbia o invalidata dalle modifiche: «Sintesi da verificare». I risultati server non sono accettati sulla fiducia dal client. Avvisi visibili soltanto in redazione, esclusi dallo snapshot pubblico. Il completamento con avvisi conserva `reviewWarnings` e non richiede più immagini/checkpoint dei ritagli nel nuovo flusso; il protocollo precedente rimane compatibile. Pubblicazione esplicita e controlli di integrità dei PDF invariati.

Le istruzioni chiedono selezione integrale, sintesi in piccoli gruppi e confronto fattuale separato prima della consegna; nessun controllo visivo sistematico dei ritagli, immagini originali solo per copertine o ambiguità del testo. Le barrette sono rimosse dalla vista Approvazione e dal PDF. Non confondere l’archivio di collaudo privato con l’archivio pubblico delle edizioni.

### Archivi di rilancio
read_draft MCP restituisce archived_for_relaunch solo per bozze eliminate con archivePurpose=relaunch, archivedAt e assenti dagli indici attivi/cestino/pubblicati. Non consente modifiche al vecchio ID: claim_automation_run resta autoritativo per i duplicati. Il cestino ordinario conserva HTTP 410.


### Rinnovo su attività e cursore di lettura del server (attivo dal 25/09/2026)
Sempre attivo, senza variabili. Ogni chiamata di lavoro con run, ogni lettura riuscita del testo della fonte e ogni commit di contenuti rinnova la prenotazione (scritture raggruppate: al massimo una ogni due minuti se la lettura non avanza). Il cursore nextPage è calcolato dal server dalle pagine di testo effettivamente consegnate (checkpoint.readRanges): un nextPage dichiarato dal modello è ignorato, mai un errore. Le letture senza run sono attribuite al lavoro in corso dello stesso utente se riguardano la fonte prenotata; la fonte della mail prenotata viene adottata anche se il modello non l’ha dichiarata.
Una prenotazione scaduta non ferma lo stesso worker finché un altro controllo non la riprende (nuovo runId/generazione). Il controllo successivo riprende da solo un lavoro scaduto o fallito con retryable=true, senza resume, fino a tre tentativi, ripartendo dal cursore del server. Gli errori MCP riportano stop=true soltanto per lavoro ripreso da altri o già chiuso; errori di fonte, data, bozza o versione sono 422 correggibili; i conflitti Git temporanei sono 503 con retry=true. Letture fallite e letture di stato non rinnovano.

### Indicatore spazio PDF (locale, settembre 2026)
La Copertura odierna mostra agli editor l’inventario del Blob privato (tutte le rassegne), senza scaricare PDF: originali importati, ritagli/PDF caricati e altri file. Lettura autenticata `/api/editor/storage`, cache server di cinque minuti, errori distinti da inventario vuoto e ultima misurazione conservata. Il totale non rappresenta il consumo mensile di trasferimento o fatturazione. `JUMP_STORAGE_LIMIT_BYTES` è opzionale: impostarlo solo con un limite in byte verificato per l’intero store. Senza limite verificato non vengono mostrati residuo o percentuale di capacità. Le soglie 80%/90% sono informative; questo riquadro non modifica né blocca bozze e ritagli.
