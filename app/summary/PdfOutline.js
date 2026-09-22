'use client';
export default function PdfOutline({items,onSelect,expanded=false}){
 return <ul>{items.map((item,i)=><li key={item.title+i}><button type="button" onClick={()=>onSelect(item)}>{item.title}</button>{item.items?.length>0&&<details key={String(expanded)} open={expanded||undefined}><summary>Articoli ({item.items.length})</summary><PdfOutline items={item.items} onSelect={onSelect} expanded={expanded}/></details>}</li>)}</ul>;
}
