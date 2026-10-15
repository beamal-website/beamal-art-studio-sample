import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as contentUI from '../client/course-content-ui.js';

const source=readFileSync(new URL('../src.js',import.meta.url),'utf8'),start=source.indexOf('let courseContentDraft=null;'),end=source.indexOf('function discardCourseEditorNavigation(',start);
assert.ok(start>=0&&end>start);const production=source.slice(start,end);
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^\"]*)"/g)].map(m=>[m[1],m[2]]));
const decode=value=>value.replace(/&(amp|lt|gt|quot|#39);/g,(_m,k)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[k]));
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rawValues={descriptionZh:' 甲\n乙 ',descriptionEn:' A & B\nC ',minAgeYears:'2.50',maxAgeYears:'18.0'};
const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return {promise,resolve};};
function editor({role='admin',geometry,read=async()=>{},write=async()=>{throw new Error('offline');}}={}){
 let context,inputs=[],controls=[],body=null,form=null,renders=0;const writes=[],courses=[{id:'a',version:1,courseName:'Same name',content:{descriptionZh:'Course A'}},{id:'b',version:1,courseName:'Same name',content:{descriptionZh:'Course B',minAgeYears:2.5}}],opener={dataset:{action:'course-content-open',courseId:'b'},focus(){context.document.activeElement=this;}};
 const fieldNode=(at,tag)=>({id:at.id||'',name:at.name||'',type:at.type||'',tagName:tag,value:at.value||'',dataset:{action:at['data-action']},disabled:false,hidden:false,scrollTop:0,scrollLeft:0,selectionStart:0,selectionEnd:0,selectionDirection:'none',reveals:[],focus(options){this.focusOptions=options;context.document.activeElement=this;},setSelectionRange(a,b,direction){this.selectionStart=a;this.selectionEnd=b;this.selectionDirection=direction;},scrollIntoView(options){this.reveals.push(options);},closest(selector){if(selector==='#course-content-editor')return form;if(selector==='[data-course-content-field]')return this.wrapper||null;return null;}});
 function mount(){renders++;inputs=[];controls=[];body=null;form={id:'course-content-editor',setAttribute(){}};for(const m of context.modal.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>|<(input|button)\b([^>]*)>|<div\b([^>]*id="course-content-body"[^>]*)>|<p\b([^>]*id="course-content-(?:source-error|error)"[^>]*)>/g)){const at=attrs(m[1]||m[4]||m[5]||m[6]),node=fieldNode(at,m[1]?'TEXTAREA':m[3]?.toUpperCase()||(m[6]?'P':'DIV'));node.disabled=/\bdisabled\b/.test(m[1]||m[4]||m[5]||m[6]);node.hidden=/\bhidden\b/.test(m[1]||m[4]||m[5]||m[6]);if(m[1])node.value=decode(m[2]);if(node.id==='course-content-body'){body=node;if(geometry)body.getBoundingClientRect=()=>geometry.body;}if(node.name){inputs.push(node);if(geometry){node.getBoundingClientRect=()=>geometry.field;node.wrapper={reveals:[],getBoundingClientRect:()=>geometry.wrapper,scrollIntoView(options){this.reveals.push(options);}};}}controls.push(node);}}
 context=vm.createContext({...contentUI,sharedMode:true,authUser:{id:'manager',role,accessRevision:'one'},currentCourseId:'b',courseDetailTab:'general',route:'/account/courses/b',tab:'catalog',courseSaving:false,sharedCatalogError:'',modal:'',courseEditorReturnFocus:null,
  courseUiIdentity:()=>JSON.stringify(context.authUser),accountCourseId:()=>context.currentCourseId,courseSettingsFor:id=>courses.find(c=>c.id===id),scheduleEditorViewContext:()=>JSON.stringify([context.route,context.tab,context.currentCourseId,context.courseDetailTab]),rememberCourseEditorFocus(){context.courseEditorReturnFocus={element:context.document.activeElement,dataset:{...context.document.activeElement.dataset}};},renderModal(){if(context.modal)mount();},discardCourseEditorNavigation(){vm.runInContext('courseContentDraft=null',context);context.modal='';},refreshSharedCourses:read,sharedClient:Object.fromEntries(['saveCourse','updateCourseMetadata','saveFee'].map(name=>[name,(...args)=>writes.push({name,args})])),FormData:class{constructor(){return inputs.map(node=>[node.name,node.value]);}},t:(_zh,en)=>en,esc:escape,
  document:{activeElement:opener,querySelector(selector){if(selector==='#course-content-editor')return form;if(selector==='#course-content-body')return body;if(selector.startsWith('#course-content-editor [name='))return inputs.find(node=>node.name===selector.match(/name=([^\]]+)/)?.[1]);if(selector.startsWith('[data-action='))return controls.find(node=>node.dataset.action===selector.match(/data-action="([^\"]+)"/)?.[1]);return controls.find(node=>node.id===selector.slice(1))||null;},querySelectorAll:()=>controls.filter(node=>!node.disabled)},
 });Object.assign(context,{sharedGeneration:1,newOperationKey:()=> 'content-key',render(){if(context.modal)mount();},restoreCourseEditorFocus(){opener.focus();},toast:message=>writes.push({message}),sharedErrorText:error=>error.message,applySharedUser(user){context.authUser=user;},go:route=>{context.route=route;},refreshSharedSession:async()=>{}});context.applyCourseAcknowledgement=course=>{context.sharedGeneration++;const index=courses.findIndex(c=>c.id===course.id);if(index>=0&&courses[index].version<=course.version)courses[index]=course;};context.sharedClient.updateCourseMetadata=async(...args)=>{writes.push({name:'updateCourseMetadata',args});return write(...args);};vm.runInContext(production,context);context.openCourseContent('b',opener);
 return {context,courses,opener,writes,get inputs(){return inputs;},get body(){return body;},get form(){return form;},get renders(){return renders;},state:()=>vm.runInContext('courseContentDraft',context),type(values=rawValues){for(const[name,value]of Object.entries(values)){const node=inputs.find(node=>node.name===name);node.value=value;context.courseContentInput(node);}},review(){return context.reviewCourseContent(form);}};
}

test('Course content binds the current exact same-name course and clones its canonical data',()=>{
 const e=editor();assert.equal(e.state().courseId,'b');assert.equal(e.inputs.find(n=>n.name==='descriptionZh').value,'Course B');e.type();assert.equal(e.courses[1].content.descriptionZh,'Course B');assert.equal(e.courses[0].content.descriptionZh,'Course A');assert.deepEqual(JSON.parse(JSON.stringify(e.state().view.dataset)),e.opener.dataset);
});
test('Teacher and wrong-course forged open cannot obtain an Admin content draft',()=>{
 const teacher=editor({role:'teacher'});assert.equal(teacher.state(),null);teacher.context.openCourseContent('a',teacher.opener);assert.equal(teacher.state(),null);const admin=editor();admin.context.closeCourseContent();admin.context.openCourseContent('a',admin.opener);assert.equal(admin.state(),null);assert.deepEqual(teacher.writes,[]);
});
test('Native form values are read at Review and Back retains raw bilingual strings and fractional ages',()=>{
 const e=editor();for(const[name,value]of Object.entries(rawValues))e.inputs.find(n=>n.name===name).value=value;e.review();assert.equal(e.state().step,'review');assert.deepEqual(e.state().values,rawValues);e.context.backCourseContent();assert.deepEqual(Object.fromEntries(e.inputs.map(n=>[n.name,n.value])),rawValues);assert.deepEqual(e.writes,[]);
});
test('Review and Back restore editing textarea selection direction and its own scroll as well as body position',()=>{
 const e=editor();e.type();const field=e.inputs.find(n=>n.name==='descriptionEn');field.selectionStart=3;field.selectionEnd=11;field.selectionDirection='backward';field.scrollTop=67;field.scrollLeft=5;e.body.scrollTop=316;e.context.courseContentInput(field);e.review();assert.equal(e.body.scrollTop,0);e.context.backCourseContent();const next=e.inputs.find(n=>n.name==='descriptionEn');assert.equal(e.context.document.activeElement,next);assert.equal(next.selectionStart,3);assert.equal(next.selectionEnd,11);assert.equal(next.selectionDirection,'backward');assert.equal(next.scrollTop,67);assert.equal(next.scrollLeft,5);assert.equal(e.body.scrollTop,316);
});
test('Unchanged source-only polling preserves native raw draft DOM focus and reading scroll',()=>{
 const e=editor(),field=e.inputs[0];field.value='Native draft not yet dispatched';field.focus();field.selectionStart=4;e.body.scrollTop=231;const renders=e.renders;e.context.refreshCourseContentReadState();assert.equal(e.renders,renders);assert.equal(e.context.document.activeElement,field);assert.equal(field.value,'Native draft not yet dispatched');assert.equal(field.selectionStart,4);assert.equal(e.body.scrollTop,231);
});
test('Version drift stays latched through reversion and cannot be reviewed or written',()=>{
 const e=editor();e.type();e.courses[1].version=2;e.context.refreshCourseContentReadState();assert.equal(e.state().stale,true);e.courses[1].version=1;e.context.refreshCourseContentReadState();e.review();assert.equal(e.state().step,'edit');assert.ok(e.state().sourceError);assert.deepEqual(e.state().values,rawValues);assert.deepEqual(e.writes,[]);
});
test('Validation reveals an adjacent explanation even when its invalid input alone is already visible',()=>{
 const e=editor({geometry:{body:{top:100,bottom:600},field:{top:500,bottom:548},wrapper:{top:480,bottom:680}}});e.type({...rawValues,minAgeYears:'6',maxAgeYears:'2.5'});e.review();const field=e.inputs.find(n=>n.name==='maxAgeYears');assert.equal(e.context.document.activeElement,field);assert.equal(field.reveals.length,0);assert.equal(field.wrapper.reveals.length,1);assert.equal(field.wrapper.reveals[0].block,'nearest');
});
test('Validation leaves an already visible input and explanation without an extra reveal scroll',()=>{
 const e=editor({geometry:{body:{top:100,bottom:600},field:{top:500,bottom:548},wrapper:{top:480,bottom:580}}});e.type({...rawValues,minAgeYears:'6',maxAgeYears:'2.5'});e.review();const field=e.inputs.find(n=>n.name==='maxAgeYears');assert.equal(field.reveals.length,0);assert.equal(field.wrapper.reveals.length,0);
});
test('A closed owner cannot be resurrected by its late reload and final Review never sends a business write',async()=>{
 const gate=deferred(),e=editor({read:()=>gate.promise});e.type();e.review();assert.equal(e.state().step,'review');e.review();assert.deepEqual(e.writes,[]);const pending=e.context.reloadCourseContent();e.context.closeCourseContent();gate.resolve();await pending;assert.equal(e.state(),null);assert.equal(e.context.modal,'');assert.deepEqual(e.writes,[]);
});
test('Content keyboard preserves IME Escape then normal Escape closes the exact draft',()=>{
 const e=editor();let prevented=0;e.context.courseContentKeyboard({key:'Escape',isComposing:true,keyCode:229,preventDefault(){prevented++;}});assert.ok(e.state());assert.equal(prevented,0);e.context.courseContentKeyboard({key:'Escape',preventDefault(){prevented++;}});assert.equal(e.state(),null);assert.equal(prevented,1);
});

test('Review saves only the exact course content/version and returns to the original entry after acknowledgement',async()=>{
 const e=editor({write:async(id,fields)=>({course:{id,version:2,courseName:'Same name',content:fields.content}})});e.type();e.review();await e.context.saveCourseContent();
 assert.equal(e.writes[0].name,'updateCourseMetadata');assert.equal(e.writes[0].args[0],'b');assert.deepEqual(JSON.parse(JSON.stringify(e.writes[0].args[1])),{content:rawValues,version:1});assert.equal(e.writes[0].args[2],'content-key');assert.equal(e.state(),null);assert.deepEqual(JSON.parse(JSON.stringify(e.courses[1].content)),rawValues);assert.equal(e.courses[0].content.descriptionZh,'Course A');assert.equal(e.context.document.activeElement,e.opener);assert.equal(e.context.modal,'');
});
test('A pending save blocks duplicate submits, Back and Escape until its true result is known',async()=>{
 const gate=deferred(),e=editor({write:()=>gate.promise});e.type();e.review();const pending=e.context.saveCourseContent();assert.equal(e.state().saving,true);await e.context.saveCourseContent();e.context.backCourseContent();e.context.closeCourseContent();e.context.courseContentKeyboard({key:'Escape',preventDefault(){}});assert.equal(e.state().step,'review');assert.equal(e.writes.length,1);gate.resolve({course:{id:'b',version:2,content:rawValues}});await pending;assert.equal(e.state(),null);
});
test('Failed save retains the exact draft and operation key and a retry can recover a lost acknowledgement',async()=>{
 let calls=0;const e=editor({write:async(id,fields)=>{if(++calls===1)throw new Error('offline');return {course:{id,version:2,content:fields.content}};}});e.type();e.review();await e.context.saveCourseContent();assert.equal(e.state().saving,false);assert.deepEqual(e.state().values,rawValues);assert.match(e.state().error,/offline/);await e.context.saveCourseContent();assert.equal(e.writes.filter(w=>w.name==='updateCourseMetadata').length,2);assert.equal(e.writes[0].args[2],e.writes[1].args[2]);assert.equal(e.state(),null);
});
test('Version conflicts retain raw entries and prevent retrying an obsolete version',async()=>{
 const e=editor({write:async()=>{throw Object.assign(new Error('conflict'),{status:409});}});e.type();e.review();await e.context.saveCourseContent();assert.equal(e.state().stale,true);assert.deepEqual(e.state().values,rawValues);await e.context.saveCourseContent();assert.equal(e.writes.filter(w=>w.name==='updateCourseMetadata').length,1);
});
test('A late save reply cannot alter a different identity or route, or accept a mismatched acknowledgement',async()=>{
 const gate=deferred(),e=editor({write:()=>gate.promise});e.type();e.review();const pending=e.context.saveCourseContent();e.context.route='/account';gate.resolve({course:{id:'b',version:2,content:rawValues}});await pending;assert.equal(e.courses[1].version,1);assert.equal(e.writes.filter(w=>w.message).length,0);
 const bad=editor({write:async()=>({course:{id:'a',version:2,content:rawValues}})});bad.type();bad.review();await bad.context.saveCourseContent();assert.equal(bad.courses[0].version,1);assert.equal(bad.state().saving,false);assert.ok(bad.state().error);
});


test('Lost ACK retry uses the identical request even after background polling observes the saved version',async()=>{
 let calls=0;const e=editor({write:async(id,fields)=>{if(++calls===1)throw new Error('offline');return {course:{id,version:2,content:fields.content}};}});e.type();e.review();await e.context.saveCourseContent();e.courses[1]={...e.courses[1],version:2,content:{...rawValues}};e.context.refreshCourseContentReadState();await e.context.saveCourseContent();assert.equal(e.state(),null);assert.equal(calls,2);assert.deepEqual(JSON.parse(JSON.stringify(e.writes[0].args)),JSON.parse(JSON.stringify(e.writes[1].args)));
});

test('Save cannot bypass Review, an identity change, or a source conflict known before submission',async()=>{
 const e=editor();await e.context.saveCourseContent();assert.deepEqual(e.writes,[]);e.type();e.review();e.courses[1].version=2;await e.context.saveCourseContent();assert.deepEqual(e.writes,[]);
 const changed=editor();changed.type();changed.review();changed.context.authUser={id:'different-manager',role:'admin'};await changed.context.saveCourseContent();assert.deepEqual(changed.writes,[]);
});


test('A truncated successful HTTP reply remains retryable with its original key after polling sees the committed course',async()=>{
 let calls=0;const e=editor({write:async(id,fields)=>{if(++calls===1)throw Object.assign(new Error('response truncated'),{status:200,code:'service_unavailable'});return {course:{id,version:2,content:fields.content}};}});e.type();e.review();await e.context.saveCourseContent();e.courses[1]={...e.courses[1],version:2,content:{...rawValues}};e.context.refreshCourseContentReadState();await e.context.saveCourseContent();assert.equal(calls,2);assert.equal(e.state(),null);
});


test('A source conflict discovered at Save focuses the visible source explanation instead of a hidden empty field error',async()=>{
 const e=editor();e.type();e.review();e.courses[1].version=2;await e.context.saveCourseContent();assert.equal(e.context.document.activeElement.id,'course-content-source-error');assert.equal(e.context.document.activeElement.hidden,false);assert.deepEqual(e.writes,[]);
});
