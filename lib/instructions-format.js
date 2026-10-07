// Small, read-only Markdown presentation. Never evaluate HTML from stored documents.
export function instructionBlocks(source=''){
 const lines=source.replace(/<!--[\s\S]*?-->/g,'').replace(/\r\n/g,'\n').split('\n');
 const blocks=[];let paragraph=[];
 const flush=()=>{if(paragraph.length){blocks.push({type:'paragraph',text:paragraph.join(' ')});paragraph=[];}};
 for(const raw of lines){
  const line=raw.trim();
  if(!line){flush();continue;}
  const heading=line.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
  if(heading){flush();blocks.push({type:'heading',level:Math.min(heading[1].length+2,6),text:heading[2]});continue;}
  if(/^([-*_])(?:\s*\1){2,}$/.test(line)){flush();blocks.push({type:'rule'});continue;}
  const item=line.match(/^(?:([-+*])|([0-9]+)[.)])\s+(.+)$/);
  if(item){
   flush();const ordered=Boolean(item[2]);let list=blocks.at(-1);
   if(list?.type!=='list'||list.ordered!==ordered){list={type:'list',ordered,items:[]};blocks.push(list);}
   list.items.push({text:item[3],number:ordered?Number(item[2]):undefined});continue;
  }
  paragraph.push(line);
 }
 flush();return blocks;
}
export function instructionInline(text){
 const tokens=[];const pattern=/\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*\n]+)\*/g;
 let start=0,match;
 while((match=pattern.exec(text))){
  if(match.index>start)tokens.push({text:text.slice(start,match.index)});
  tokens.push({text:match[1]??match[2]??match[3]??match[4],style:match[1]||match[2]?'strong':match[3]?'code':'em'});
  start=pattern.lastIndex;
 }
 if(start<text.length)tokens.push({text:text.slice(start)});
 return tokens;
}
export function instructionMatches(text,query){
 const needle=query.trim();if(!needle)return [];
 // Escaped regex preserves original offsets even for Unicode case folding.
 const pattern=new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'giu');
 return [...text.matchAll(pattern)].map(match=>({start:match.index,end:match.index+match[0].length}));
}
