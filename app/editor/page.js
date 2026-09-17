import {configured} from '../../lib/config';
import EditorApp from './EditorApp';
export default function EditorPage(){return <EditorApp ready={configured()}/>;}
