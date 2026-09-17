## 2026-09-17 — accesso con nome utente e password

Sostituito il login GitHub con credenziali dedicate e hash scrypt in Vercel. Protezione dai tentativi concorrenti tramite contatori atomici condivisi; cambio password e rimozione account revocano sessioni web e MCP. Nuovo modulo locale per la scelta riservata delle password. Il passaggio Production richiede prima la configurazione di JUMP_EDITOR_USERS.

# 17 settembre 2026 — semplificazione

- Rimossi Supabase, migrazione SQL e relative dipendenze.
- Bozze, revisioni e snapshot pubblicati salvati in un repository GitHub privato dedicato.
- Salvataggi/publicazioni atomici con Git trees e aggiornamento non forzato del branch.
- PDF spostati su Vercel Blob privato con upload diretto firmato e oggetti immutabili.
- Accesso editor tramite account GitHub esistenti e lista di ID autorizzati.
- MCP OAuth autonomo: consenso solo bozze/pubblicazione, PKCE S256, codici monouso, refresh token ruotati.
- Aggiornate documentazione e prove isolate. Configurazione GitHub/Vercel e collaudo reale ancora da eseguire.

# Versione precedente

Separate rassegna/archivio/editor e News in due deployment; rimossa la nuvola di parole; conservate edizioni storiche e recuperati 18 ritagli del 13 settembre. Aggiornate dipendenze vulnerabili.

Nessun deploy o push online eseguito nelle consegne locali.


### 17 settembre 2026 — pagina completa e istruzioni di consegna
- Nuove edizioni ed editor condividono quadro generale, prime pagine, grafico dei temi, punti chiave/tono e guida ai rating; nuvola esclusa.
- Schema compatibile con bozze vecchie, inventario prime pagine e provenienza dei conteggi; dati non verificati distinti da zero.
- Istruzioni dettagliate preparate, da integrare online solo dopo il rilascio del relativo schema MCP.
