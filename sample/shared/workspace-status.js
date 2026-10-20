export const WORKSPACE_STATUS_CATEGORIES=Object.freeze(['rescheduling','trial','payment','other']);
export const WORKSPACE_STATUS_COLOURS=Object.freeze({red:'#f8d7da',green:'#d7ebdc',yellow:'#fff0bd','light-blue':'#d8eafa','dark-gray':'#59636b','light-gray':'#e8eaed'});
export function statusNameLength(name){return [...String(name).normalize('NFC')].reduce((sum,char)=>sum+(char.codePointAt(0)>127?2:1),0);}
export function validateStatusTags(tags){
 if(!Array.isArray(tags)||tags.length>30)throw new Error('INVALID_STATUS_TAGS');
 const ids=new Set(),names=new Set();
 return tags.map(tag=>{if(!tag||typeof tag.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(tag.id)||ids.has(tag.id)||typeof tag.name!=='string'||!Object.hasOwn(WORKSPACE_STATUS_COLOURS,tag.color))throw new Error('INVALID_STATUS_TAG');
 const name=tag.name.trim().normalize('NFC'),key=name.toLocaleLowerCase('en');if(!name||statusNameLength(name)>20||/[\x00-\x1f\x7f]/.test(name)||names.has(key))throw new Error('INVALID_STATUS_NAME');ids.add(tag.id);names.add(key);return {id:tag.id,name,color:tag.color};});
}
export const defaultStatusTags=()=>[{id:'not-started',name:'Not started',color:'light-gray'},{id:'in-progress',name:'In progress',color:'light-blue'},{id:'done',name:'Done',color:'green'}];
