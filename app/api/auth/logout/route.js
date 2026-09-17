import {cookies} from 'next/headers';import {sameOrigin,failure} from '../../../../lib/errors.js';
export async function POST(request){try{sameOrigin(request);(await cookies()).delete('jump_session');return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
