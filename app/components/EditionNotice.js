export default function EditionNotice({badge,title,children,lang='it'}){
 return <aside className="translation-notice" role="status" lang={lang}>
  <span className="translation-notice-icon" aria-hidden="true">{badge}</span>
  <div><strong>{title}</strong><p>{children}</p></div>
  <svg className="translation-notice-clock" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round"/></svg>
 </aside>;
}
