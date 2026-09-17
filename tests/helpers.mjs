import {problem} from '../lib/github-store.js';
export class MemoryStore {
 constructor(){this.version=0;this.files={'index.json':{format:1,drafts:[],published:[]}};this.snapshots=[structuredClone(this.files)];}
 async begin(){return {sha:String(this.version),tree:'tree'};}
 async read(path,head){return structuredClone(this.snapshots[Number(head.sha)][path]??null);}
 async commit(files,head){if(head.sha!==String(this.version))throw problem(409,'Conflitto concorrente');Object.assign(this.files,structuredClone(files));this.snapshots.push(structuredClone(this.files));this.version++;}
}
