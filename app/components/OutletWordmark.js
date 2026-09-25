import {outletLogo} from '../../lib/outlet-logos';
export default function OutletWordmark({name}){
 const logo=outletLogo(name);
 return <b className="outlet-wordmark">{logo?<><img src={'/testate/'+logo.file} alt={name} loading="lazy"/>{logo.edition&&<small>{logo.edition}</small>}</>:name}</b>;
}
