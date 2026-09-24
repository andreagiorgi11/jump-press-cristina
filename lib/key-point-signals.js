// Classify only explicit editorial labels, never infer sentiment from the text.
export function parseKeyPoint(value){
 const match=String(value).match(/^\s*(Positivo|Negativo)\s*:\s*([\s\S]*)$/i);
 return match?{kind:match[1].toLowerCase(),text:match[2]}:{kind:'neutro',text:String(value)};
}
export function formatKeyPoint(kind,text){return kind==='neutro'?text:`${kind==='positivo'?'Positivo':'Negativo'}: ${text}`;}
export function groupKeyPoints(points){
 const parsed=points.map(parseKeyPoint);
 return [['positivo','Segnali positivi'],['negativo','Segnali di criticità'],['neutro','Da seguire']].map(([kind,label])=>({kind,label,points:parsed.filter(p=>p.kind===kind)})).filter(g=>g.points.length);
}
export function splitKeyPoint(text){
 const match=text.match(/^([^:]{1,90}):\s+([\s\S]+)$/);
 return match?{title:match[1],detail:match[2]}:{title:null,detail:text};
}
// One fixed colour per editorial area, shared by page, charts and PDF. Lime and red are reserved
// for positive/critical signals, so the charts stay in the black-and-white scale of the site.
export const areaColors={'Prima squadra':'#111111','Next Gen e Primavera':'#4d4d4d','Juventus Women':'#858585','Politica sportiva':'#b3b3b3','Altri temi':'#dadada'};
export const themeColors=['#111111','#4d4d4d','#858585','#b3b3b3','#dadada'];
export const areaColor=(label,i=0)=>areaColors[label]||themeColors[i%themeColors.length];
