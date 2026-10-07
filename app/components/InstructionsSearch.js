'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {instructionBlocks,instructionInline,instructionMatches} from '../../lib/instructions-format';

export default function InstructionsSearch({data}){
 const [view,setView]=useState('instructions'),[query,setQuery]=useState(''),[active,setActive]=useState(0);
 const content=useRef(null);
 const sections=useMemo(()=>view==='instructions'?
  [{title:'Istruzioni',text:data.baseText}]:
  [{title:'Preferenze della redazione',text:data.preferences.text||'Nessuna preferenza permanente salvata.'},{title:'Gestione delle preferenze',text:data.preferencePolicy}],
 [data,view]);
 const result=useMemo(()=>{
  let count=0;
  function prepare(text){
   const tokens=instructionInline(text),plain=tokens.map(token=>token.text).join('');
   const matches=instructionMatches(plain,query).map(match=>({...match,id:count++}));
   let offset=0;
   return tokens.map(token=>{
    const start=offset,end=start+token.text.length;offset=end;let cursor=start;const parts=[];
    for(const match of matches){
     if(match.end<=start||match.start>=end)continue;
     const from=Math.max(start,match.start),to=Math.min(end,match.end);
     if(from>cursor)parts.push({text:plain.slice(cursor,from)});
     parts.push({text:plain.slice(from,to),match:match.id});cursor=to;
    }
    if(cursor<end)parts.push({text:plain.slice(cursor,end)});
    return {...token,parts};
   });
  }
  const groups=sections.map(section=>({...section,blocks:instructionBlocks(section.text).map(block=>block.type==='list'?{...block,items:block.items.map(item=>({...item,tokens:prepare(item.text)}))}:block.text?{...block,tokens:prepare(block.text)}:block)}));
  return {groups,count};
 },[sections,query]);
 useEffect(()=>{setActive(0);},[query,data,view]);
 useEffect(()=>{content.current?.querySelector('[data-current="true"]')?.scrollIntoView({block:'center'});},[active,result]);
 function move(step){if(result.count)setActive(value=>(value+step+result.count)%result.count);}
 function choose(next){setView(next);setQuery('');setActive(0);}
 function inline(tokens){return tokens.map((token,index)=>{
  const Tag=token.style||'span';
  return <Tag key={index}>{token.parts.map((part,i)=>part.match===undefined?part.text:<mark key={i} data-current={part.match===active}>{part.text}</mark>)}</Tag>;
 });}
 function block(item,index){
  if(item.type==='rule')return <hr key={index}/>;
  if(item.type==='list'){const Tag=item.ordered?'ol':'ul';return <Tag key={index}>{item.items.map((entry,i)=><li key={i} value={entry.number}>{inline(entry.tokens)}</li>)}</Tag>;}
  const Tag=item.type==='heading'?`h${item.level}`:'p';return <Tag key={index}>{inline(item.tokens)}</Tag>;
 }
 return <>
  <div className="instructions-views" role="group" aria-label="Scegli cosa leggere">
   <button type="button" aria-pressed={view==='instructions'} onClick={()=>choose('instructions')}><strong>Istruzioni</strong><span>Le regole della rassegna</span></button>
   <button type="button" aria-pressed={view==='preferences'} onClick={()=>choose('preferences')}><strong>Preferenze</strong><span>Le indicazioni della redazione</span></button>
  </div>
  <form className="instructions-search" role="search" onSubmit={event=>{event.preventDefault();move(1);}}>
   <label htmlFor="instructions-query">{view==='instructions'?'Cerca nelle istruzioni':'Cerca nelle preferenze'}</label>
   <div className="instructions-search-controls"><input id="instructions-query" type="search" value={query} placeholder="Parola o frase" onChange={event=>setQuery(event.target.value)}/><button type="submit" disabled={!result.count}>Cerca</button><button type="button" aria-label="Risultato precedente" disabled={!result.count} onClick={()=>move(-1)}>↑</button><button type="button" aria-label="Risultato successivo" disabled={!result.count} onClick={()=>move(1)}>↓</button></div>
   {query.trim()&&<span role="status">{result.count?`${active+1} di ${result.count} risultati`:'Nessun risultato'}</span>}
  </form>
  <div ref={content} className="instructions-document" aria-label={view==='instructions'?'Istruzioni':'Preferenze'}>{result.groups.map((section,index)=><section key={section.title}>
   {view==='preferences'&&<h3>{section.title}</h3>}
   {section.blocks.map(block)}
   {view==='preferences'&&index===0&&data.canEditPreferences&&<a className="editor-return" href="/editor/istruzioni">Modifica preferenze della redazione →</a>}
  </section>)}</div>
 </>;
}
