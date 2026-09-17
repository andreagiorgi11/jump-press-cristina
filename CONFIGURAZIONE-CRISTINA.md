# Attivare la divisione di Jump Press

Il codice è pronto per due progetti Vercel collegati allo stesso repository GitHub. Il sito esistente mantiene rassegna e archivio e aggiunge `/editor`; un secondo progetto serve solo News. Per salvare online servono anche database, login e archivio PDF: questa consegna usa un progetto Supabase dedicato.

## 1. Preparare Supabase

Cristina o l'amministratore crea un progetto Supabase dedicato a Jump Press. Non riutilizzare il database di altri clienti.

1. In SQL Editor eseguire una sola volta il file `supabase/migrations/202609170001_editor.sql` incluso nel codice. Crea tabelle, funzioni, RLS e bucket privato.
2. In Authentication creare gli utenti con email/password: Cristina, gli editor ed eventualmente un utente separato per l'automatismo. Disabilitare le nuove iscrizioni pubbliche. Le password vanno inserite personalmente nel servizio, non inviate in chat.
3. Copiare l'UUID dell'utente Cristina dalla schermata utenti. Eseguire la query seguente sostituendo il segnaposto con quell'UUID:

```sql
insert into public.jump_members(user_id, role)
values ('UUID-UTENTE-CRISTINA', 'publisher');
```

Per altri utenti usare `editor` (modifiche senza pubblicazione) oppure `producer` (automatismo senza pubblicazione). L'applicazione non consente agli utenti di assegnarsi un ruolo. Per revocare l'accesso, rimuovere la riga dell'utente da `jump_members` e revocare le sessioni in Auth.

4. Recuperare Project URL e Publishable key dalle impostazioni API. La chiave publishable è destinata al client; non usare la secret key o service-role.

## 2. Progetto Vercel esistente: rassegna + editor

Nell'account di Cristina aprire il progetto che serve `jumpress-juventus.vercel.app` (progetto individuato: `jumpress-juventus`).

- Settings → Git: verificare che il repository sia `guerricristina-creator/jump-press-rassegna-stampa` e annotare il Production Branch effettivo.
- Settings → Build and Deployment: preset Next.js, Node.js 22, install `npm ci`, build `npm run build`, Root Directory alla radice del repository, Output Directory gestita dal preset Next.js.
- Settings → Environment Variables: aggiungere i valori della tabella a Production. Per le Preview usare un progetto Supabase di collaudo e l'indirizzo stabile della preview quando si collauda OAuth.

| Variabile | Valore |
| --- | --- |
| `JUMP_SITE` | `press` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del progetto Supabase dedicato |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key dello stesso progetto |
| `JUMP_PUBLIC_URL` | `https://jumpress-juventus.vercel.app` oppure il dominio canonico effettivo, senza `/editor` |
| `JUMP_ALERT_WEBHOOK_URL` | Ricevitore alert AG Studio; da configurare per gli avvisi proattivi |

Le variabili `NEXT_PUBLIC_*` richiedono una nuova build. Non definire manualmente `NEXT_PUBLIC_JUMP_SITE`: viene derivata da `JUMP_SITE`.

La pubblicazione del codice va effettuata dopo un collaudo Preview. Collegare il branch che contiene questa consegna e poi integrarlo nel Production Branch concordato. Il deploy automatico dipende dall'integrazione Git o dal workflow già configurato: non presumere che esista una GitHub Action. Se l'integrazione rifiuta l'autore del commit, Cristina deve eseguire il deploy/merge con il proprio account; non serve condividere la password.

## 3. Secondo progetto Vercel: solo News

Dal Vercel di Cristina: Add New → Project → importare lo STESSO repository. Nome suggerito `jump-press-news`; l'URL definitivo sarà quello assegnato da Vercel.

- Preset Next.js, Node.js 22, install `npm ci`, build `npm run build:news`, Root Directory radice. Lasciare Output Directory al preset: Next usa `.next-news` dalla configurazione.
- Variabile `JUMP_SITE=news` in Production e Preview.
- Non copiare le variabili Supabase nel progetto News.
- Se già utilizzato, configurare `X_BEARER_TOKEN` soltanto qui per la fonte X ufficiale. Senza token, i comportamenti delle fonti social preesistenti dipendono dai servizi pubblici disponibili.
- Scegliere l'indirizzo definitivo e comunicarlo soltanto alle persone interessate. Il sito News ha noindex e robots, senza password come richiesto. Chi riceve o scopre l'URL può comunque consultarlo.

Risultato: sito pubblico → rassegna + archivio; `/editor` → redazione; secondo URL → News e Social. Il sito pubblico non contiene il link al secondo URL.

## 4. Attivare MCP dopo il primo deploy

In Supabase Authentication → URL Configuration impostare Site URL al dominio del sito rassegna. In Authentication → OAuth Server attivare OAuth 2.1 e impostare Authorization Path a `/editor/consent`. Abilitare Dynamic Client Registration per i client MCP compatibili oppure preregistrare il client con gli URI di callback esatti indicati da ChatGPT. Non usare callback inventati o wildcard.

Nel ChatGPT dell'editor, se piano e impostazioni dell'account consentono le app MCP personalizzate, creare una connessione con:

```text
Nome: Jump Press Redazione
URL MCP: https://jumpress-juventus.vercel.app/mcp
Autenticazione: OAuth
```

Usare il dominio canonico effettivo se diverso. Il browser mostrerà il login Jump Press e la schermata di consenso. L'editor accede con il proprio account; l'automatismo va collegato con l'account producer. Il server non usa FTP.

Documentazione dei provider: [Supabase MCP/OAuth](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication), [attivazione OAuth](https://supabase.com/docs/guides/auth/oauth-server/getting-started), [connessione a ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## 5. Collaudo online da fare insieme

Usare prima un ambiente Preview/database di collaudo:

1. Aprire rassegna e archivio senza login. Aprire News sull'altro indirizzo. `/editor` sul sito News e `/news` sul sito rassegna devono rispondere 404.
2. Accedere come editor, creare una bozza, caricare un PDF reale, creare un ritaglio e salvarlo. Verificare che originali e bozze non siano accessibili anonimamente.
3. Collegare ChatGPT via OAuth, leggere quella bozza, richiedere una modifica e controllarla anche nell'editor web.
4. Verificare con due sessioni che un salvataggio su una versione superata venga rifiutato senza perdere il testo nel modulo.
5. Con l'account producer verificare che la pubblicazione sia negata. Con il publisher chiedere esplicitamente «pubblica questa versione» e verificare il risultato anonimamente.
6. Modificare ancora la bozza: la versione pubblica deve restare invariata. Verificare ripristino revisione, disconnessione e revoca di un account di collaudo.

Solo dopo questo percorso attivare il nuovo flusso nell'automatismo esistente. Le prove locali della consegna non verificano credenziali, OAuth reale, upload su Storage reale o la capacità del particolare ChatGPT di eseguire l'upload HTTP.

## 6. Modifica necessaria all'automatismo esistente

Mantenere selezione email, elaborazione del PDF e regole editoriali già concordate. Sostituire la parte che modifica GitHub/pubblica Vercel con: crea/aggiorna una bozza via MCP, carica l'originale privato, crea i ritagli, salva tutto e comunica data/versione. Fermarsi alla bozza. Nessuna chiamata `publish_edition` nel lavoro programmato; il ruolo producer la blocca comunque.

`prepare_pdf_upload` restituisce un URL firmato: il client deve poter caricare i byte PDF con HTTP PUT. Questo requisito va verificato sul ChatGPT usato dall'automatismo; un MCP da solo non garantisce che il client possa trasferire un allegato email. Se il client non può farlo, serve un passaggio di caricamento tramite `/editor` oppure adattare l'automatismo con un esecutore che gestisca l'upload. Non dichiarare completato il caricamento senza aver letto e verificato il PDF con `read_source`.

## Cosa comunicare ad Andrea per proseguire

URL dei due progetti Vercel, conferma delle variabili inserite, URL del progetto Supabase e conferma di migrazione/account/OAuth configurati. Niente password, secret key o token in chat. Non occorre acquistare un team solo per consegnare il codice: Cristina può applicare queste impostazioni dal proprio account.
