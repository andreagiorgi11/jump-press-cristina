// Classify only explicit editorial labels, never infer sentiment from the text.
export function parseKeyPoint(value){
 const match=String(value).match(/^\s*(Positivo|Negativo)\s*:\s*([\s\S]*)$/i);
 return match?{kind:match[1].toLowerCase(),text:match[2]}:{kind:'neutro',text:String(value)};
}
export function formatKeyPoint(kind,text){return kind==='neutro'?text:`${kind==='positivo'?'Positivo':'Negativo'}: ${text}`;}
