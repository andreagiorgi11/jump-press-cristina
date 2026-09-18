export default function SectionEditButton({onEdit,section,label,articleId}){
 if(!onEdit)return null;
 return <button type="button" className="section-edit-button" aria-label={'Modifica '+label} title={'Modifica '+label} onClick={()=>onEdit({section,articleId,label})}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M13 6l5 5"/></svg></button>;
}
