// Labels derived from the literal source-quote check. Since 24/09/2026 they are computed and stored but not shown:
// too many false alarms. Only GPT's own declared doubt stays visible.
export const hiddenSourceLabels=new Set(['Verifica della fonte in attesa','Riscontro fonte incompleto','Verifica editoriale non documentata','Verifica della sintesi non documentata']);
export const visibleSynthesisLabels=check=>synthesisLabels(check).filter(label=>!hiddenSourceLabels.has(label));
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
