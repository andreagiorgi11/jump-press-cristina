import {shortSectionLabel} from '../../lib/summary-sections';
// Full name on larger screens, short name on phones; screen readers always get the full name.
export default function SectionLabel({category}){
 const short=shortSectionLabel(category);
 if(short===category)return category;
 return <><span className="section-label-full">{category}</span><span className="section-label-short" aria-hidden="true">{short}</span></>;
}
