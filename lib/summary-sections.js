export const summarySections=['Prima squadra','Prima squadra femminile','Politica sportiva','Temi vari'];
// Reviewed classification of the copied September 18 edition, never saved to production.
const overrides={
 'd831c7f9-b16e-4a9c-b565-fe9667e8c8e6':'Prima squadra',
 '4aa33452-15ff-49f6-8403-67a76a08573d':'Prima squadra',
 '63c2d10c-a314-46b6-ac7d-720c6f06694e':'Prima squadra',
 '56b082da-9113-43f6-8c25-625afa533338':'Prima squadra',
 'f8338ea6-0729-4a29-b135-147c722c090b':'Politica sportiva',
 'a82a514a-98ea-4051-9fa9-f612c7f8d904':'Temi vari',
 '3f66a2f9-6c25-4510-bcb7-f554de2f37b7':'Prima squadra',
};
export function summaryEdition(body){
 if(body.editorialModel==='summary-v1')return {...body,articles:body.articles.map(a=>({...a,category:({'Prima squadra maschile':'Prima squadra','Varie':'Temi vari'})[a.category]||a.category}))};
 const mapping={'Prima squadra':'Prima squadra','Prossimo avversario':'Prima squadra','Juventus Women':'Prima squadra femminile','Politica sportiva':'Politica sportiva'};
 return {...body,articles:body.articles.map(a=>({...a,category:overrides[a.id]||mapping[a.topic]||mapping[a.category]||'Temi vari'}))};
}
