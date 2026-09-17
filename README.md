# Jump Press — GitHub e Vercel

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

La pagina riservata `/editor/istruzioni` contiene le istruzioni complete e il comando breve per l’attività ChatGPT quotidiana (07:45 Europe/Rome). Il testo iniziale deriva dal documento di Andrea, aggiornato al flusso bozza automatica e pubblicazione esplicita. Gli editor possono aggiornarlo: `settings/editorial-instructions.json` e lo storico sono salvati nel repository privato con controllo di versione e commit atomico. Una lettura non riuscita non usa il testo iniziale come ripiego.

Il tool MCP `read_editorial_instructions` restituisce sempre la versione corrente; producer può leggerla ma non modificarla. Nessuno strumento MCP modifica le istruzioni. Le attività programmate devono usare un consenso senza pubblicazione. La pagina non crea o attiva attività sul ChatGPT di Cristina: collegare Outlook e MCP, provare manualmente e aggiornare l’attività esistente.
