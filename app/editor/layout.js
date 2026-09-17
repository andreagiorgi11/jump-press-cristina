import './editor.css';
import EditorFrame from './EditorFrame';
export const metadata={title:'Editor | Jump Press',robots:{index:false,follow:false}};
export default function EditorLayout({children}){return <EditorFrame>{children}</EditorFrame>;}
