// Each selected article contributes equally. Missing reviews never become neutral.
export function dailySentiment(articles=[]){
 const unknown={value:null,label:'Da valutare',count:articles.length};
 if(!articles.length||articles.some(a=>!a?.juventusSentiment?.reason?.trim()||!['positivo','negativo','neutro','misto'].includes(a.juventusSentiment.tone)))return unknown;
 const scores={positivo:1,negativo:0,neutro:.5,misto:.5};
 const value=articles.reduce((n,a)=>n+scores[a.juventusSentiment.tone],0)/articles.length;
 return {value,label:value>.55?'Tendenza positiva':value<.45?'Tendenza negativa':'Equilibrato',count:articles.length};
}
export const sentimentColors=['#C4A395','#D6D1C5','#99B1A0'];
