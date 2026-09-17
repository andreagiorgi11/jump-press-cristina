import Consent from './Consent';
import {configured} from '../../../lib/config';
export default async function ConsentPage({searchParams}){const {authorization_id}=await searchParams;return <Consent ready={configured()} authorizationId={authorization_id||''}/>;}
