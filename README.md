# Jump Press — rassegna, redazione e News

Un repository, due deployment indipendenti. La redazione e MCP usano lo stesso database e le stesse autorizzazioni.

| Modalità | Percorsi | Accesso |
| --- | --- | --- |
| `JUMP_SITE=press` | `/`, `/archivio`, `/edizioni/data` | Lettori, solo edizioni pubblicate |
| `JUMP_SITE=press` | `/editor`, `/editor/consent`, `/mcp` | Account abilitati e OAuth per MCP |
| `JUMP_SITE=news` | `/news`, `/social` (home reindirizzata) | Senza password, noindex, indirizzo separato |

News non contiene collegamenti alla redazione; nel sito rassegna le route News e le relative API rispondono 404. Nel sito News rassegna, archivio, editor, MCP e PDF sono esclusi anche tramite accesso diretto. Noindex non è una protezione di accesso: chi conosce il link News può aprirlo.

## Avvio

Node.js 22 o successivo. `npm ci`, quindi `npm run dev` (127.0.0.1:3015) oppure `npm run dev:news` (127.0.0.1:3016). Disponibili anche i due file `avvia-*.bat`. Le directory `.next` e `.next-news` sono distinte. Non eseguire build e dev della stessa modalità contemporaneamente.

Copia `.env.example` in `.env.local` e configura i valori reali. Senza Supabase la rassegna storica resta consultabile e il login segnala chiaramente che la configurazione è da completare; non esiste un accesso dimostrativo.

`npm test` verifica routing, schema, protocollo MCP e autorizzazioni SQL con Postgres/PGlite isolato. `npm run build` e `npm run build:news` compilano le due modalità. `npm audit` verifica le dipendenze.

## Dati e pubblicazione

La migrazione `supabase/migrations/202609170001_editor.sql` va applicata UNA VOLTA a un progetto Supabase dedicato. Non eseguirla su un database che contiene già queste tabelle. Non occorre una chiave service-role: tutte le operazioni usano la sessione dell'utente e RLS.

Ruoli in `jump_members`: `producer` per l'automatismo (bozze, nessuna pubblicazione), `editor` per revisione, `publisher` per Cristina e gli altri editor abilitati a pubblicare. Gli account vengono creati e abilitati dall'amministratore; il sito non offre registrazione libera.

Ogni salvataggio genera una revisione. Il numero di versione impedisce di sovrascrivere il lavoro concorrente. Ripristinare crea una nuova bozza. Pubblicare salva uno snapshot atomico distinto; ulteriori modifiche restano private. Un retry della stessa pubblicazione non ripristina accidentalmente una versione vecchia. Una rassegna già pubblicata conserva la sua data.

PDF originali e ritagli in bozza sono nel bucket privato `jump-files` (massimo 50 MB per PDF). Solo i ritagli associati alla versione pubblica possono essere letti anonimamente. Gli oggetti non sono sovrascrivibili. Le pagine dei ritagli sono pagine intere del PDF, numerate da 1: verificare che non contengano altro materiale prima di pubblicare. Le vecchie edizioni restano nel codice; non sono migrate automaticamente in bozze modificabili.

I 18 ritagli del 13/09 sono inclusi nel repository, recuperati dal sito già pubblicato. La build non dipende più dal download di quel vecchio PDF remoto. Gli endpoint legacy che esponevano PDF completi sono esclusi. Le fonti esterne degli altri ritagli storici restano dipendenze del fornitore originale.

## MCP

Endpoint HTTPS `/mcp`, protocollo Streamable HTTP stateless, OAuth tramite Supabase. Discovery `/.well-known/oauth-protected-resource`; consenso `/editor/consent`. Strumenti: `list_drafts`, `read_draft`, `save_draft`, `restore_revision`, `prepare_pdf_upload`, `read_source`, `create_clip`, `publish_edition` (solo publisher).

Per scrivere: leggere la versione, modificare il corpo completo, salvare con quella versione. In caso di conflitto rileggere e applicare di nuovo le sole modifiche richieste. L'upload dei PDF avviene direttamente su Storage con l'URL firmato temporaneo restituito dal tool, evitando i limiti del corpo delle funzioni Vercel. Il client IA deve poter inviare i byte via HTTP PUT; se non dispone di questa capacità, caricare il PDF da `/editor`. Non incollare il PDF in base64 nel tool.

La verifica dell'intenzione «pubblica» appartiene al client IA e alle sue conferme; il backend applica ruolo, revisione esatta e conferma esplicita. Un account `producer` non può pubblicare nemmeno chiamando direttamente il database. Usare quell'account per il lavoro programmato e l'account personale publisher per la revisione umana.

## Configurazione online

Seguire `CONFIGURAZIONE-CRISTINA.md`. Codice e prove locali non sostituiscono il collaudo dell'account Supabase e della connessione dal ChatGPT effettivamente utilizzato. Non sono incluse credenziali e non è stato eseguito alcun deploy di produzione.

## Incidenti

1. Non ripubblicare e non sostituire letture fallite con dati vuoti. Conservare le modifiche nel modulo; controllare versione e ultima pubblicazione senza modificarle.
2. Verificare Supabase Auth, database e Storage, poi log Vercel e stato dei provider. Un semplice HTTP 200 della home non verifica login o scrittura.
3. Ripristino reversibile: per contenuti errati ripristinare una revisione nella redazione, verificarla e pubblicare esplicitamente. Per un errore di codice ripristinare il precedente deployment. Non eliminare tabelle o Storage per recuperare un servizio.
4. Confermare il percorso completo: login reale, lettura bozza, modifica/salvataggio di un'edizione di collaudo, controllo ritaglio e verifica anonima della sola edizione pubblicata.
5. Se il provider continua a fallire, aprire ticket con codice errore, orario e request ID, senza documenti o credenziali.

`JUMP_ALERT_WEBHOOK_URL` invia al ricevitore AG Studio soltanto progetto, codice evento e ora. Cooldown locale di 15 minuti per istanza: il ricevitore deve deduplicare globalmente con lo stesso intervallo e inoltrare l'alert. Configurare un monitor autenticato del percorso editor in un ambiente di collaudo e un monitor anonimo delle pubblicazioni. Senza webhook/monitor esterni, i messaggi restano nei log e nell'interfaccia.
