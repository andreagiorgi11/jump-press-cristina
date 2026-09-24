import {z} from 'zod';
import {requireEditor} from '../../../lib/server-client';
import {failure,sameOrigin} from '../../../lib/errors';
import * as service from '../../../lib/editor-service';
export const dynamic='force-dynamic';
export const maxDuration=300;
const id=z.string().uuid();
export async function GET(request){try{
 const {db,role}=await requireEditor(request);
 if(new URL(request.url).searchParams.get('view')==='trash')return Response.json({drafts:await service.listTrash(db)},{headers:{'Cache-Control':'private, no-store'}});
 const draftId=new URL(request.url).searchParams.get('id'),openId=new URL(request.url).searchParams.get('open');
 // Editor start-up in one round trip: draft list and the draft to open (a given id, or the latest).
 if(openId){const drafts=await service.listDrafts(db),target=openId==='latest'?drafts[0]?.id:id.parse(openId);return Response.json({role,drafts,draft:target?await service.getDraft(db,target):null},{headers:{'Cache-Control':'private, no-store'}});}
 return Response.json(draftId?await service.getDraft(db,id.parse(draftId)):{role,drafts:await service.listDrafts(db)},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return failure(error);}}
export async function POST(request){try{
 sameOrigin(request);
 const {db}=await requireEditor(request);
 const raw=await request.text();if(raw.length>650000)throw Object.assign(new Error('Richiesta troppo grande.'),{status:413});
 const x=JSON.parse(raw);let result;
 const draftId=x.id?id.parse(x.id):null;
 switch(x.action){
 case 'withdraw':result=await service.withdrawDraft(db,id.parse(x.id),z.number().int().positive().parse(x.version),z.literal('RITIRA_E_MODIFICA').parse(x.confirmation));break;
 case 'delete':result=await service.deleteDraft(db,id.parse(x.id),z.number().int().positive().parse(x.version));break;
 case 'recover':result=await service.recoverDraft(db,id.parse(x.id),z.number().int().positive().parse(x.version));break;
 case 'save':result=await service.saveDraft(db,id.parse(x.id),z.number().int().nonnegative().parse(x.version),x.body,{summaryConfirmed:x.summaryConfirmed===true});break;
 case 'publish':result=await service.publishDraft(db,id.parse(x.id),z.number().int().positive().parse(x.version),z.literal('PUBBLICA').parse(x.confirmation));break;
 case 'restore':result=await service.restoreDraft(db,id.parse(x.id),z.number().int().positive().parse(x.version),z.number().int().positive().parse(x.revision));break;
 case 'upload':result=await service.registerSource(db,id.parse(draftId),z.string().min(1).max(200).parse(x.name));break;
 case 'clip':result=await service.makeClip(db,id.parse(x.sourceId),z.array(z.number().int().positive()).min(1).max(100).parse(x.pages));break;
 case 'asset':result=await service.assetLink(db,id.parse(x.assetId));break;
 default:throw Object.assign(new Error('Operazione non valida.'),{status:400});
 }
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(error){if(error instanceof SyntaxError)error.status=400;return failure(error);}}
