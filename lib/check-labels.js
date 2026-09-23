// Legacy checks remain visible without claiming a semantic error.
export function synthesisLabels(check){
 if(check?.status==='pending')return ['Verifica della fonte in attesa'];
 if(!check?.editorialStatus)return check?.status==='verified'?[]:['Verifica della sintesi non documentata'];
 const labels=[];
 if(check.editorialStatus==='attention')labels.push('Sintesi da verificare');
 if(check.editorialStatus==='undocumented')labels.push('Verifica editoriale non documentata');
 if(check.sourceStatus!=='matched')labels.push('Riscontro fonte incompleto');
 return labels;
}
