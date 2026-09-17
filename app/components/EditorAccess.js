 'use client';
import {usePathname} from 'next/navigation';
export default function EditorAccess(){const path=usePathname();if(path.startsWith('/editor')||process.env.NEXT_PUBLIC_JUMP_SITE==='news')return null;return <nav aria-label="Accesso redazione" style={{textAlign:'center',padding:'20px',background:'var(--paper)'}}><a href="/editor" style={{color:'#555',fontSize:12}}>Accesso editor</a></nav>;}
