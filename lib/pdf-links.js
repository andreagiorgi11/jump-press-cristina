import {PDFName,PDFHexString} from 'pdf-lib';
export function addInternalPdfLink(pdf,page,rect,target,label){
 const annotation=pdf.context.obj({Type:'Annot',Subtype:'Link',Rect:rect,Border:[0,0,0],Contents:PDFHexString.fromText(label),Dest:[target.page.ref,'XYZ',null,target.y??target.page.getHeight(),null]});
 page.node.addAnnot(pdf.context.register(annotation));
}
