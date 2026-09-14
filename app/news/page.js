import NewsRefresh from './NewsRefresh';

export const dynamic='force-dynamic';

const MONITORED_SOURCES=[
 'Tuttosport','La Gazzetta dello Sport','Corriere dello Sport','La Stampa','la Repubblica','Corriere della Sera','ANSA','Sky Sport','Sport Mediaset','Rai Sport','JuventusNews24','TuttoJuve','IlBianconero','Tifo Juventus','GianlucaDiMarzio.com','Alfredo Pedullà','Calciomercato.com','Tuttomercatoweb','Goal Italia','Football Italia','Romeo Agresti','Giovanni Albanese','Guido Vaciago','Nicolò Schira','Gianluca Di Marzio','Fabrizio Romano','Matteo Moretto','Mirko Di Natale','Nicola Balice','Giovanni Guardalà','Paolo Aghemo','Fabiana Della Valle','Filippo Cornacchia','Fabrizio Biasin','Marco Conterio','Andrea Longoni','Daniele Longo'
];
const NEWS_QUERIES=[
 'Juventus','Juventus calcio','Juventus ultime notizie','Juventus calciomercato','mercato Juventus','Juventus prima squadra','Juventus dirigenza','Juventus Next Gen','Juventus Women','Juventus Primavera',
 'Juventus Spalletti','Juventus Comolli','Juventus Chiellini','Juventus Yildiz','Juventus Kessie','Juventus Sorloth','Juventus Zirkzee','Juventus Mateta','Juventus David','Juventus Miretti','Juventus Bremer','Juventus Koopmeiners','Juventus Cambiaso',
 ...MONITORED_SOURCES.map(name=>`Juventus ${name}`)
];
const CALCIO_E_FINANZA_QUERIES=[
 'site:calcioefinanza.it Juventus',
 'site:calcioefinanza.it Juve'
];
const FEEDS=[
 ...NEWS_QUERIES.map(q=>`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=it&gl=IT&ceid=IT:it`),
 ...CALCIO_E_FINANZA_QUERIES.map(q=>`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=it&gl=IT&ceid=IT:it`)
];
function decodeXml(s=''){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));}
function xmlText(block,tag){const m=block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?decodeXml(m[1].trim()):'';}
function parseNewsFeed(xml){return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m=>{const b=m[1],date=xmlText(b,'pubDate');return {title:xmlText(b,'title'),link:xmlText(b,'link'),date,source:xmlText(b,'source'),ts:Date.parse(date)||0};}).filter(x=>x.title&&x.link);}
function normalizeTitle(s=''){return s.toLowerCase().replace(/\s+-\s+[^-]+$/,'').replace(/[“”"'’.,:;!?()[\]{}]/g,'').replace(/\s+/g,' ').trim();}
function dedupeNews(items=[]){const seen=new Set();return items.sort((a,b)=>b.ts-a.ts).filter(x=>{const key=normalizeTitle(x.title);if(!key||seen.has(key))return false;seen.add(key);return true;}).slice(0,220);}
function formatDate(value){try{return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)).replace(',',' ·');}catch{return ''}}
async function getNews(){const settled=await Promise.allSettled(FEEDS.map(async feed=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),5500);try{const r=await fetch(feed,{cache:'no-store',signal:c.signal,headers:{'User-Agent':'Mozilla/5.0','Accept':'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5'}});if(!r.ok)throw new Error(`feed ${r.status}`);return parseNewsFeed(await r.text());}finally{clearTimeout(t)}}));return dedupeNews(settled.flatMap(r=>r.status==='fulfilled'?r.value:[]));}
export default async function NewsPage(){const news=await getNews();return <main className="newspage"><NewsRefresh/><header className="newsheader"><div className="top"><div className="brand"><i>JUMP</i> PRESS</div><div className="edition">JUVENTUS · NEWS LIVE</div></div><small>NEWS</small><h1>Juventus <em>news</em></h1><p className="lead">Radar dedicato alla <b>Juventus</b>: web, mercato, squadra, dirigenza, Next Gen, Women e settore giovanile, con monitoraggio dedicato delle principali testate e firme.</p><div className="newstabs"><a className="active" href="/news">WEB</a><a href="/social">SOCIAL</a></div><div className="newsstatus"><span className="liveDot"/> Aggiornamento automatico · 2 min</div></header><section className="newslist">{news.length?news.map((n,i)=><a className="newscard" href={n.link} target="_blank" rel="noreferrer" key={`${n.link}-${i}`}><div className="newsmeta"><b>{n.source||'Notizia'}</b><span>{formatDate(n.date)||'Data e ora non disponibili'}</span></div><h2>{n.title}</h2><span className="newsopen">Apri notizia ↗</span></a>):<div className="newsempty"><b>Nessuna notizia disponibile in questo momento.</b><span>Premi Aggiorna: il feed viene interrogato senza cache.</span></div>}</section><footer><b>JUMP PRESS</b> · News Juventus · <span>refresh automatico ogni 2 minuti</span></footer></main>}
