import {PDFName,PDFHexString} from 'pdf-lib';

// Standard PDF outline destinations: preserved in downloads and read by PDF.js.
export function addPdfOutline(pdf,entries){
 if(!entries.length)return;
 const ctx=pdf.context,root=ctx.obj({Type:'Outlines'}),rootRef=ctx.register(root);
 function siblings(items,parent){
  const nodes=items.map(item=>{const dict=ctx.obj({Title:PDFHexString.fromText(item.title),Parent:parent,Dest:[item.page.ref,'XYZ',null,item.y??item.page.getHeight(),null]});return {item,dict,ref:ctx.register(dict)};});
  nodes.forEach((node,i)=>{
   if(i)node.dict.set(PDFName.of('Prev'),nodes[i-1].ref);
   if(i+1<nodes.length)node.dict.set(PDFName.of('Next'),nodes[i+1].ref);
   if(node.item.children?.length){const children=siblings(node.item.children,node.ref);node.dict.set(PDFName.of('First'),children[0].ref);node.dict.set(PDFName.of('Last'),children.at(-1).ref);node.dict.set(PDFName.of('Count'),ctx.obj(-children.length));}
  });return nodes;
 }
 const nodes=siblings(entries,rootRef);root.set(PDFName.of('First'),nodes[0].ref);root.set(PDFName.of('Last'),nodes.at(-1).ref);root.set(PDFName.of('Count'),ctx.obj(nodes.length));pdf.catalog.set(PDFName.of('Outlines'),rootRef);
}
