import {dailySentiment,sentimentColors} from '../../lib/daily-sentiment';

export default function SentimentGauge({articles}){
 const {value,label,count}=dailySentiment(articles);
 const angle=value===null?null:Math.PI*(1-value);
 return <div className="daily-sentiment"><h4>Sentiment Juventus</h4><svg viewBox="0 0 200 110" role="img" aria-label={`Sentiment Juventus: ${label}. Valutazione del tono per la Juventus su tutti i ${count} articoli selezionati.`}>
  {sentimentColors.map((color,i)=>{const start=Math.PI-i*Math.PI/3,end=start-Math.PI/3;return <path key={color} d={`M ${100+66*Math.cos(start)} ${78-66*Math.sin(start)} A 66 66 0 0 1 ${100+66*Math.cos(end)} ${78-66*Math.sin(end)}`} fill="none" stroke={value===null?'#e1e4e5':color} strokeWidth="8"/>;})}
  <path d="M100 8V16" stroke="#939b9d" strokeWidth="1"/>
  {angle!==null&&<><line x1="100" y1="78" x2={100+53*Math.cos(angle)} y2={78-53*Math.sin(angle)} stroke="#34434a" strokeWidth="2.5" strokeLinecap="round"/><circle cx="100" cy="78" r="4" fill="#34434a"/></>}
  <text x="27" y="99" textAnchor="middle">Negativo</text><text x="100" y="34" textAnchor="middle">Neutro</text><text x="173" y="99" textAnchor="middle">Positivo</text>
 </svg><strong>{label}</strong><small>{value===null?'Valutazione degli articoli da completare':`Sui ${count} articoli selezionati`}</small></div>;
}
