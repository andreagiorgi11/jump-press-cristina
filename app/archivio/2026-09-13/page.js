const items=[
['Editoriali','Libero Quotidiano','Allegri già al bivio a Napoli Spalletti cerca nuovi leader','56-57'],
['Editoriali','La Gazzetta dello Sport','IL MILAN ANCORA CONFUSO E MODRIC È UN PROBLEMA. NAPOLI E JUVE, VINCERE O...','50-51'],
['Juventus','La Gazzetta dello Sport','JUVE Spalletti ci prova con sette nuovi «Ma niente alibi»','15-18'],
['Juventus','Tuttosport','Spalletti non vuole alibi «Juve, vai oltre i ko!»','34-37'],
['Juventus','La Stampa','Juventus, la voglia matta di Kolo Muani','25-26'],
['Juventus','Corriere dello Sport Stadio','Sua altezza Woltemade','42-44'],
['Juventus','Tuttosport','Provaci ancora Koop. Sarà il faro di Spalletti','59'],
['Juventus','QN Sport','Spalletti deve reinventare la Signora Chance Sarr','29-30'],
['Intervista','Tuttosport','«Juve, serve tempo per vincere di nuovo»','38-39'],
['Juventus','Tuttosport','Straordinari per Conceição. Kolo ci riprova','58'],
['Mercato','Tuttosport','Milik-Juve: prove d’addio. Piace a due club sauditi','40'],
['Mercato','Tuttosport','Amore & altri rimedi. Juve, riecco Berardi','41'],
['Juventus Youth','Tuttosport','Juve ko con l’Albinoleffe','60'],
['Next Gen','Tuttosport','C’è l’Ospitaletto per la Next Gen «Miglioriamo»','78'],
['Juventus Women','Tuttosport','Women, l’inizio è perfetto','84'],
['Prossimo avversario','Tuttosport','Aquilani recupera Bakola e lancia Esposito titolare','389'],
['Europa League','La Gazzetta dello Sport','Il NEC si avvicina ai bianconeri con un ko pesante','214'],
['Politica sportiva','Corriere dello Sport Stadio','Procura Figc apre fascicolo su Lucarelli','89']
];
const key='b918f471e2c7469ba0f0c328d6460041';
export default function Page(){return <main><header><div className="top"><div className="brand"><i>JUMP</i> PRESS</div><div className="edition">JUVENTUS · ARCHIVIO</div></div><small>DOMENICA 13 SETTEMBRE 2026</small><h1>Rassegna stampa <em>Juventus</em></h1><p className="lead">Edizione archiviata del 13 settembre 2026: 18 pezzi selezionati su 409 pagine analizzate.</p></header><div className="sectiontitle"><small>RASSEGNA ARCHIVIATA</small><h2>I 18 pezzi del 13 settembre</h2></div><section className="articles">{items.map((a,i)=><article key={i}><div className="meta"><label><span>{a[0]}</span><b>{a[1]}</b></label></div><h2>{a[2]}</h2><a href={`/api/r20260913-clip?key=${key}&pages=${encodeURIComponent(a[3])}`} target="_blank" rel="noreferrer">Apri ritaglio completo <b>↗</b></a></article>)}</section><footer><b>JUMP PRESS</b> · Archivio Juventus · 13 settembre 2026</footer></main>}
