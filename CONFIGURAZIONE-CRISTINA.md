# Configurazione aggiornata: senza Supabase

Questa versione sostituisce la precedente. Non creare Supabase né eseguire migrazioni SQL.

1. **GitHub:** creare un repository PRIVATO per i dati, separato dal codice; copiarvi content-template/index.json alla radice come index.json.
2. **GitHub:** creare un token limitato al repository dati (Contents read/write) e una OAuth App per il login, con callback https://DOMINIO-RASSEGNA/api/auth/callback.
3. **Vercel rassegna:** impostare JUMP_SITE=press e le variabili di .env.example; abilitare Cristina tramite il suo ID numerico GitHub in JUMP_GITHUB_MEMBERS.
4. **Vercel Storage:** creare e collegare un Blob store PRIVATO al solo progetto rassegna.
5. **Vercel News:** secondo progetto collegato allo stesso repository codice, JUMP_SITE=news e build npm run build:news. Niente variabili private della redazione.
6. **Collaudo:** login GitHub, creazione bozza, upload PDF, modifica da ChatGPT via MCP, pubblicazione esplicita. Per l'automatismo scegliere il consenso “solo bozze”.

Le istruzioni complete, valori, esempi e gestione degli incidenti sono nel README.md del pacchetto. Per proseguire servono la configurazione di queste risorse nell'account di Cristina e un collaudo online. Non inviare password, token o client secret in chat.

Il codice è salvato in locale; questa consegna non modifica i progetti Vercel o i repository online.
