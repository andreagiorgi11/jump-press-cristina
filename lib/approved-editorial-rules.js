// Editorial changes explicitly reviewed with Andrea on 22 September 2026.
// Applies to Summary only; source handling and automation rules stay unchanged.
export function applyApprovedEditorialRules(text){
 let result=text;
 result=result.replace(/SELEZIONE\n[\s\S]*?(?=FONTE E FEDELTÀ\n)/,`SELEZIONE
Normalmente devi arrivare a una selezione di circa 20–23 articoli. Puoi superare questo numero se ci sono realmente più contenuti importanti. Non devi invece riempire la rassegna con pezzi poco significativi solo per raggiungere un numero prestabilito.
La priorità assoluta è la Juventus. Cerca con particolare attenzione editoriali firmati, prima squadra, allenatore, giocatori, dirigenza, mercato, interviste e dichiarazioni, infortuni, formazione, convocazioni e indisponibilità, Next Gen, Primavera e Juventus Women. Controlla anche i temi societari, economici e istituzionali con un collegamento reale alla Juventus.
Presta attenzione agli editoriali firmati da Paolo Condò, Guido Vaciago, Ivan Zazzaroni, Giuseppe Savelli e dagli altri editorialisti rilevanti presenti nel PDF; il nome non sostituisce la verifica della rilevanza del pezzo.
Cerca notizie sulla Nazionale quando riguardano direttamente giocatori o temi Juventus.
Non inserire automaticamente risultati o normali notizie delle altre squadre. Gli articoli extra-Juventus vanno selezionati soltanto quando il fatto è particolarmente importante per il calcio italiano; riguarda politica sportiva, FIGC, arbitri, VAR o sistema calcio; ha un collegamento diretto o molto vicino alla Juventus; oppure si tratta di un episodio realmente clamoroso o di grande rilevanza nazionale. Evita riempitivi e sovrapposizioni.

`);
 result=result.replace(/EDITORIALI – MASSIMA IMPORTANZA\n[\s\S]*?(?=FORMATO EDITORIALI\n)/,`EDITORIALI – MASSIMA IMPORTANZA
Gli editoriali devono essere trattati con maggiore profondità rispetto alle normali notizie.
Per ciascun editoriale riporta il titolo originale e la testata corretta; riassumilo normalmente in circa 4 righe. Individua la vera tesi dell’autore, ricostruisci il percorso logico e mantieni le sfumature importanti. Non ridurlo a una frase generica e non attribuire all’autore opinioni che non compaiono nell’articolo. Conserva i giudizi, gli esempi e i concetti caratterizzanti necessari a comprenderlo, inclusa la parte positiva quando l’autore bilancia critiche e aspetti positivi. Non cambiare il fuoco del pezzo.

`);
 result=result.replace(/FORMATO EDITORIALI\n[\s\S]*?(?=PRIORITÀ JUVENTUS\n)/,`FORMATO EDITORIALI E FIRME
Titolo originale – Testata (Nome autore).
Verifica sempre la testata e la firma sulla fonte. L’autore va evidenziato soprattutto per gli editoriali. Per le normali notizie non è necessario riportare sistematicamente il nome del giornalista, salvo quando abbia particolare importanza. Non inventare una firma assente. La presenza di una firma da sola non rende un articolo editoriale.
Identifica chiaramente gli editoriali come “EDITORIALE – Nome autore” nella presentazione editoriale; mantieni il titolo originale e il campo autore senza etichette aggiunte.

NOTIZIE NORMALI
Per gli altri articoli scrivi un riassunto normalmente di 2–3 righe, sintetico ma sufficientemente completo, concentrato soprattutto sulla parte che riguarda la Juventus. Niente riempitivi e niente informazioni aggiunte dall’esterno.
Se un articolo parla di più squadre o di molti argomenti, riassumi soltanto ciò che riguarda la Juventus, a meno che il contesto generale sia indispensabile per comprendere la notizia. Restano valide le eccezioni di selezione per le notizie extra-Juventus realmente importanti.

LUNGHEZZA INDICATIVA DEI RIASSUNTI
Come riferimento indicativo, le sintesi delle notizie normali sono mediamente di 45–65 parole e quelle degli editoriali di 70–90 parole. Mantieni sempre flessibilità in funzione del contenuto: non sono minimi o massimi obbligatori. Non aggiungere riempitivi e non sacrificare informazioni essenziali per rientrare negli intervalli. Le brevi possono essere più corte quando la notizia è completa.
Questa precisazione si aggiunge alle indicazioni in righe di Cristina e riguarda soltanto le sintesi dei singoli articoli: non modifica cappello iniziale, punti chiave o Summary PDF.

`);
 result=result.replace(/DUPLICATI\n[\s\S]*?(?=TITOLI\n)/,`DUPLICATI
Non inserire più volte la stessa notizia se viene ripetuta nell’indice, in un box, in una breve, nella stessa pagina o in una versione quasi identica dello stesso articolo.
Se due quotidiani trattano la stessa notizia ma con informazioni, impostazioni o dichiarazioni realmente differenti, possono essere mantenuti entrambi. Evita una rassegna piena di pezzi sostanzialmente identici.
Non creare titoli autonomi per box o brevi che fanno parte dello stesso articolo e non sdoppiare artificialmente un articolo. Verifica sulla pagina originale se il pezzo ha effettiva autonomia: l’indice da solo non basta. Un box che aggiunge soltanto un dettaglio al pezzo principale non deve diventare una seconda notizia.

`);
 result=result.replace('Mantieni il titolo originale oppure una versione estremamente fedele.','Riporta il titolo realmente stampato sull’articolo, senza adattamenti, abbreviazioni o parafrasi.');
 result=result.replaceAll('titolo originale o minimamente adattato','titolo originale verificato sulla pagina');
 result=result.replace('Il titolo di ogni voce deve essere il TITOLO REALE dell’articolo presente nel PDF oppure una versione soltanto minimamente adattata, se necessario per renderlo leggibile.','Il titolo di ogni voce deve essere il TITOLO REALE stampato sull’articolo presente nel PDF. Non adattarlo, abbreviarlo o parafrasarlo. Correggi soltanto gli errori OCR per ripristinare il titolo stampato. Prima della consegna ricontrolla uno per uno tutti i titoli sulle relative pagine originali.');
 result=result.replace('Crea una voce separata SOLO se esiste un titolo autonomo chiaramente visibile sulla pagina oppure il pezzo compare come articolo autonomo nell’indice della rassegna.','Crea una voce separata SOLO se la pagina originale conferma che si tratta di un pezzo effettivamente autonomo con un proprio titolo; l’indice da solo non basta.');
 result=result.replace('nome dell’autore soltanto per editoriali, commenti e analisi firmate. Per le normali notizie usa la stringa vuota, mai null.','firma verificata per editoriali, commenti e analisi firmate; nelle normali notizie riportala soltanto quando abbia particolare importanza. Se assente o non necessaria usa la stringa vuota, mai null.');
 result=result.replaceAll('autore solo quando previsto','autore secondo le regole sulle firme');
 result=result.replaceAll('- nome giornalista solo negli editoriali;','- firma verificata negli editoriali; nelle normali notizie solo quando particolarmente importante;');
 result=result.replaceAll('- editoriali massimo circa 4 righe;','- editoriali normalmente circa 4 righe, con riferimento flessibile a 70–90 parole;');
 result=result.replaceAll('- notizie circa 2-3 righe;','- notizie normalmente 2–3 righe, con riferimento flessibile a 45–65 parole;');
 result=result.replaceAll('- titoli fedeli;','- titoli originali verificati sulle pagine, senza adattamenti;');
 result=result.replaceAll('- articoli ordinati nelle quattro aree;','- articoli ordinati nelle quattro aree, con gli editoriali prima delle normali notizie in ciascuna area;');
 result=result.replaceAll('intro in un unico paragrafo, articoli consecutivi per area,','intro in un unico paragrafo, articoli consecutivi per area ed editoriali prima delle normali notizie nella propria area,');
 // Remove the superseded eight-category instructions, not operational sections.
 result=result.replace(/CATEGORIE PRECEDENTI — SOSTITUITE DAL MODELLO SUMMARY\n[\s\S]*?Non riscrivere rassegne storiche senza richiesta dell’editor\./,'Non riscrivere rassegne storiche senza richiesta dell’editor.');
 return result;
}
