# Preparazione e seconda revisione

La prima esecuzione continua a leggere tutta la fonte, selezionare e scrivere. Il lavoro ripetitivo di compilazione `factCheck.evidence` e confronto letterale è rimosso; non era una certificazione semantica. Gli estratti e i controlli storici restano negli archivi ma non vengono riproposti al modello. Le note concrete diventano `editorialNote`, visibili solo alla redazione. Le istruzioni salvate non vengono riscritte: l’adattamento operativo del profilo Summary è nel codice, `workflowRevision=editorial-review-v1`.

`finish_automation_run` registra nello stesso commit la conclusione e `editorial-reviews/<draftId>.json`. Quindi chiama il servizio privato `/notify-ready`. Il servizio SMTP usa ricevute persistenti e Message-ID deterministico, una mail per draftId; l'esito incerto non viene reinviato automaticamente. La versione e data iniziali sono metadati della notifica, non un ordine di sovrascrivere la bozza.

Il monitoraggio Work usa il mittente già configurato e l’oggetto `[Jump Press] Bozza pronta — GG/MM/AAAA — revisione editoriale`, soltanto nuove email. Legge il draftId, prenota `claim_editorial_review`, segue le istruzioni restituite e rilegge la versione attuale. Passa `review` alle letture per mantenere il lavoro attivo. Il controllo confronta tutte le sintesi con le fonti, corregge scrittura, fatti, firme, editoriali e citazioni; confronta indice e selezione e può aggiungere al massimo due riserve utili. Riallinea cappello, Summary e punti chiave, poi conclude con `finish_editorial_review`.

## Garanzie del salvataggio

- Correzioni parziali con versione corrente e `operationId`: dopo risposta persa, leggere stato e bozza prima di ripetere.
- Selezione principale e ordine restano invariati; nessuna riserva esistente viene rimossa o spostata. Limite due aggiunte sull'intera revisione, non per chiamata.
- Ogni modifica umana durante l’attesa o la revisione protegge i singoli campi. Un conflitto richiede rilettura, mai sovrascrittura.
- Pubblicazione o eliminazione interrompono le scritture del revisore. Nessuna chiamata di revisione pubblica la rassegna.
- Scadenza visibile dopo 20 minuti senza attività; nuova prenotazione consentita fino a tre esecuzioni. Il token precedente non può più scrivere dopo una ripresa.
- Il banner conserva l’ultimo stato valido se il servizio è indisponibile. Ricarica i testi aggiornati quando nessun editor è aperto; non cancella un modulo in compilazione.

## Verifica e incidente

Controllare lo stato reale tramite `read_editorial_review`, la bozza corrente e la ricevuta SMTP sul server. Un errore di lettura non è uno stato assente. La notifica fallita genera un alert deduplicato; il banner espone consegna incerta o fallita. Per un invio SMTP incerto verificare prima la ricezione in Gmail: non cancellare ricevute per forzare un reinvio.

Per riprendere una revisione interrotta usare `claim_editorial_review` e rileggere la bozza; non riavviare la preparazione. Se i tentativi sono esauriti o la fonte è indisponibile, completare manualmente e segnalare il guasto ad AG Studio. Conservare le ultime versioni valide, verificare GitHub e il servizio file, recuperare reversibilmente e confermare la lettura da redazione. In caso di incidente esterno persistente aprire un ticket al provider.

Rilascio: prima aggiornare `server.mjs` e `source-mail.mjs` nel servizio `jump-press-files` con backup dei file precedenti e verifica sintattica; poi push su main del codice, verifica deployment Git Vercel e aggiornamento catalogo del connettore ChatGPT. Gli stati vengono creati solo per le nuove chiusure: non si rielaborano automaticamente bozze già corrette o pubblicate.
