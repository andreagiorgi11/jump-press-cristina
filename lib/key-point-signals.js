// Classify only explicit editorial labels, never infer sentiment from the text.
export function parseKeyPoint(value){
 const match=String(value).match(/^\s*(Positivo|Negativo)\s*:\s*([\s\S]*)$/i);
 return match?{kind:match[1].toLowerCase(),text:match[2]}:{kind:'neutro',text:String(value)};
}
export function formatKeyPoint(kind,text){return kind==='neutro'?text:`${kind==='positivo'?'Positivo':'Negativo'}: ${text}`;}
export function groupKeyPoints(points){
 const parsed=points.map(parseKeyPoint);
 return [['positivo','Segnali positivi'],['negativo','Criticità'],['neutro','Da seguire']].map(([kind,label])=>({kind,label,points:parsed.filter(p=>p.kind===kind)})).filter(g=>g.points.length);
}
export function splitKeyPoint(text){
 const match=text.match(/^([^:]{1,90}):\s+([\s\S]+)$/);
 return match?{title:match[1],detail:match[2]}:{title:null,detail:text};
}
export const themeColors=['#191919','#DFFF2F','#888888','#D6D6D6'];
