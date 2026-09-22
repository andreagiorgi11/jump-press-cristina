import {parseKeyPoint} from './key-point-signals.js';

// An editorial balance of classified key points, not an article-level sentiment score.
export function dailySentiment(points=[]){
 const parsed=points.map(parseKeyPoint);
 if(!parsed.length||parsed.some(p=>p.kind==='neutro'||!p.text.trim()))return {value:null,label:'Da valutare'};
 const value=parsed.filter(p=>p.kind==='positivo').length/parsed.length;
 return {value,label:value===.5?'Equilibrato':value>.5?'Tendenza positiva':'Tendenza negativa'};
}
export const sentimentColors=['#C4A395','#D6D1C5','#99B1A0'];
