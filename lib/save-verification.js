import {isDeepStrictEqual} from 'node:util';
import {allDraftArticles} from './reserve-articles.js';
import {incident} from './errors.js';

// Verify persistence, not editorial accuracy. Compare the effective body after the
// existing schema defaults, inherited fields, summary cleanup and server checks.
// Never trim or otherwise normalise the read-back: that could hide lost content.
function differences(expected, actual, path='', out=[]){
 if(isDeepStrictEqual(expected,actual))return out;
 if(out.length>=100)return out;
 if(expected&&actual&&typeof expected==='object'&&typeof actual==='object'&&Array.isArray(expected)===Array.isArray(actual)){
  for(const key of new Set([...Object.keys(expected),...Object.keys(actual)])){
   differences(expected[key],actual[key],path?path+'.'+key:key,out);
   if(out.length>=100)break;
  }
 }else out.push(path);
 return out;
}
function warnings(draft){
 const result=[];
 for(const a of allDraftArticles(draft.body)){
  for(const [field,success] of [['pdfCheck','matched'],['synthesisCheck','verified'],['factCheck','verified']]){
   const check=a[field];
   if(check&&check.status!==success)result.push({articleId:a.id,type:field,status:check.status,note:String(check.note||'').slice(0,200)});
  }
  if(draft.body.sourceImportId&&!a.clipId)result.push({articleId:a.id,type:'missingClip'});
 }
 for(const page of draft.body.coverage?.frontPages||[])if(page.juventus&&!page.clipId)result.push({page:page.page,type:'missingFrontPageClip'});
 return result;
}
export async function verifySavedDraft(repo, expected){
 const base={status:'unavailable',expectedVersion:expected.version,observedVersion:null,contentMatches:null,differences:null,
  scope:'persisted_effective_body',editorialAccuracyVerified:false,checkedAt:new Date().toISOString()};
 try{
  const head=await repo.begin(),actual=await repo.read('drafts/'+expected.id+'.json',head);
  if(!actual){await incident('save_verification_missing');return {...base,status:'missing'};}
  if(actual.id!==expected.id||!actual.body){await incident('save_verification_invalid');return {...base,status:'invalid'};}
  if(actual.deletedAt||actual.version!==expected.version)return {...base,status:'version_conflict',observedVersion:actual.version??null};
  // JSON is the archive format: optional undefined properties are not persisted.
  const effective=JSON.parse(JSON.stringify(expected.body));
  const matches=isDeepStrictEqual(effective,actual.body);
  if(!matches)await incident('save_verification_mismatch');
  const changed=matches?[]:differences(effective,actual.body);
  return {...base,status:matches?'verified':'mismatch',observedVersion:actual.version,contentMatches:matches,differences:changed,differenceLimitReached:changed.length>=100};
 }catch{
  await incident('save_verification_unavailable');
  return base;
 }
}
export async function compactSavedDraft(repo, expected){
 const verification=await verifySavedDraft(repo,expected),verified=verification.status==='verified';
 return {id:expected.id,version:expected.version,saved:true,date:expected.body.date,
  articleCount:expected.body.articles.length,reserveCount:expected.body.reserveArticles?.length||0,
  executiveSummaryStale:!!expected.body.executiveSummaryStale,introStale:!!expected.body.introStale,
  automaticClips:expected.automaticClips||null,verification,
  // No reassuring empty list when the current archive cannot be verified.
  warnings:verified?warnings(expected):null,
  nextAction:verified?'Salvataggio verificato. Resta distinta la revisione editoriale; esamina gli eventuali avvisi.':
   'Il salvataggio ha risposto con successo, ma la verifica non è riuscita. Rileggi la bozza prima di qualsiasi altra modifica; non ripetere automaticamente save_draft.'};
}
