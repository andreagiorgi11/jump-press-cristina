import {verify,roleFor} from './auth.js';

// Reopening the site must restore the editor workspace, not a mixed reader/editor home.
export async function homeEditorDestination(token){
 if(!token)return null;
 try{
  const session=await verify(token,'web-session');
  const role=roleFor(session.sub,session.credentialVersion);
  return ['editor','publisher'].includes(role)?'/editor':null;
 }catch(error){
  if([401,403].includes(error.status))return null;
  throw error;
 }
}
