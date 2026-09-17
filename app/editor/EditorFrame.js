'use client';
import {usePathname} from 'next/navigation';
export default function EditorFrame({children}){return <div className={usePathname()==='/editor'?'editor-reader':'editor-shell'}>{children}</div>;}
