const logos={
 'Corriere dello Sport':'corriere-sport.svg',
 'Corriere dello Sport Stadio':'corriere-sport.svg',
 'Il Giornale':'giornale.svg',
 'La Gazzetta dello Sport':'gazzetta.svg',
 'Tuttosport':'tuttosport.svg',
 'Corriere della Sera':'corriere-sera.svg',
 'Il Biellese':'biellese.png',
 'La Stampa':'stampa.svg',
 'Il Giornale del Piemonte e della Liguria':'piemonte-liguria.png'
};
export default function OutletWordmark({name}){
 const localStampa=name.startsWith('La Stampa ');
 const logo=logos[name]||(localStampa?logos['La Stampa']:null);
 return <b className="outlet-wordmark">{logo?<><img src={'/testate/'+logo} alt={name} loading="lazy"/>{localStampa&&<small>{name.replace(/^La Stampa\s*[–—-]?\s*/, '')}</small>}</>:name}</b>;
}
