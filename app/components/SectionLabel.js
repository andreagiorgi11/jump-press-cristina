import {shortSectionLabel} from '../../lib/summary-sections';
import {tr} from '../../lib/i18n';
// Full name on larger screens, short name on phones; screen readers always get the full name.
export default function SectionLabel({category,lang='it'}){
 const short=tr(lang,shortSectionLabel(category)),full=tr(lang,category);
 if(short===full)return full;
 return <><span className="section-label-full">{full}</span><span className="section-label-short" aria-hidden="true">{short}</span></>;
}
