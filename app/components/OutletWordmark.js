import {outletLogo} from '../../lib/outlet-logos';
import {outletLogoSize} from '../../lib/outlet-logo-sizes';
export default function OutletWordmark({name}){
 const logo=outletLogo(name),size=logo&&outletLogoSize(logo.key);
 return <b className="outlet-wordmark" style={size?{'--logo-width':size.width+'px','--logo-height':size.height+'px'}:undefined}>{logo?<><img src={size?.src||'/testate/'+logo.file} className={size?'outlet-logo-calibrated':undefined} alt={name} loading="lazy"/>{logo.edition&&<small>{logo.edition}</small>}</>:name}</b>;
}
