import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {sessionIdentityKey} from '../client/session-identity.js';
import {resolveStudentLessonOrderOrigin,studentLessonOrderMatches,studentLessonOrderSourceKey} from '../client/student-lesson-order-origin.js';

const source=readFileSync(new URL('../src.js',import.meta.url),'utf8');
function actual(start,end){const from=source.indexOf(start),to=source.indexOf(end,from);assert.ok(from>=0&&to>from);return source.slice(from,to);}
const production=actual('function closeEnrollmentOverlay(', 'async function openEnrollmentOrder(')+actual('async function refreshStudentTimetable(', 'function ensureEnrollmentView(')+actual('function enrollmentKeyboard(', '\nasync function refreshLessonStudents(');
const clone=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const lesson=(id,sequence)=>({id,studentId:'child',orderId:'same-paid-order',courseId:'course',scheduleId:'series',sequence,date:'2026-10-23',time:'14:00',duration:60,teachers:[{id:'teacher'}],rooms:[{id:'room'}]});
const paid=()=>({id:'same-paid-order',studentId:'child',paymentStatus:'paid',items:[{courseId:'course',lessons:[{scheduleId:'series',sequence:1,date:'2026-09-01'},{scheduleId:'series',sequence:2,date:'2026-09-08'}]}]});
function fixture(orderRead=async()=>({order:paid()})){
 let context,cards=[],draws=0,scroll=null;const messages=[];const data={students:[{id:'child'}],lessons:[lesson('first-session',1),lesson('second-session',2)]};
 const node=dataset=>({dataset,isConnected:true,disabled:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},focus(options){this.focusOptions=options;context.document.activeElement=this;}});
 const close=node({action:'orders-close'}),body={tagName:'BODY'};
 context=vm.createContext({sessionIdentityKey,resolveStudentLessonOrderOrigin,studentLessonOrderMatches,studentLessonOrderSourceKey,
  sharedMode:true,authUser:{id:'parent',role:'student',accessRevision:'one'},tab:'courses',route:'/account',path:()=>context.route,studentTimetableWindow:()=>({key:'classes',from:'2026-10-16',to:'2027-10-16'}),studentTimetableCache:{...clone(data),key:'classes',ready:true,error:'',revision:'one'},studentTimetableGeneration:1,studentTimetableRead:null,
  enrollmentBusy:false,enrollmentGeneration:1,enrollmentOpeningSerial:0,enrollmentOverlay:null,enrollmentJob:null,selectedTimetableLesson:null,courseLessonReturn:null,modal:'',interfacePreview:null,sharedViewDirty:false,
  sharedClient:{order:orderRead,studentTimetable:async()=>({...clone(data),revision:'next'})},drawEnrollmentOverlay(){draws++;context.modal='real order details';},render(){},renderModal(){},paintSharedUpdates(){},isAccountPage:()=>true,toast(message){messages.push(message);},t:(_zh,en)=>en,enrollmentError:()=> 'Could not load order',applySharedUser(user){context.authUser=user;context.enrollmentGeneration++;},go(route){context.route=route;},
  document:{body,activeElement:body,querySelector:()=>close,querySelectorAll:()=>cards},window:{scrollX:7,scrollY:521,scrollTo(left,top){scroll={left,top};}},
 });
 vm.runInContext(production,context);
 function remount(){cards.forEach(card=>{card.isConnected=false;});cards=data.lessons.map(row=>node({action:'orders-open-student-class',sessionId:row.id,studentId:row.studentId,orderId:row.orderId}));return cards;}
 remount();return {context,data,body,close,messages,remount,get cards(){return cards;},get draws(){return draws;},get scroll(){return scroll;},pending:()=>vm.runInContext('studentLessonOrderPending',context),start(index=1){const opener=cards[index];opener.focus();return {opener,promise:context.openStudentLessonOrder(opener.dataset,opener)};},key(key,extra={}){context.enrollmentKeyboard({key,preventDefault(){},...extra});}};
}

test('Student order closes to the exact remounted session card when two cards share one paid order',async()=>{
 const e=fixture(),opening=e.start();await opening.promise;assert.equal(e.context.enrollmentOverlay.returnToStudentLesson.lesson.id,'second-session');assert.equal(e.context.enrollmentOverlay.order.items[0].lessons[1].date,'2026-09-08','As-placed dates do not replace current source matching');const fresh=e.remount();e.context.closeEnrollmentOverlay();assert.equal(e.context.document.activeElement,fresh[1]);assert.notEqual(e.context.document.activeElement,fresh[0]);assert.equal(fresh[1].focusOptions.preventScroll,true);assert.deepEqual(e.scroll,{left:7,top:521});assert.equal(e.context.enrollmentOverlay,null);
});
test('Student card source rejects a fetched order for another child unpaid state or duplicate matching pair before painting',async()=>{
 for(const change of [order=>({...order,studentId:'other-child'}),order=>({...order,paymentStatus:'awaiting-payment'}),order=>({...order,items:[...order.items,...order.items]})]){const e=fixture(async()=>({order:change(paid())}));await e.start().promise;assert.equal(e.draws,0);assert.equal(e.context.enrollmentOverlay,null);assert.equal(e.pending(),null);}
});
test('Student source removal or source error consumes a pending read even when the exact source later returns',async()=>{
 for(const mode of ['removed','error']){const gate=deferred(),e=fixture(()=>gate.promise),opening=e.start();assert.ok(e.pending());if(mode==='removed')e.data.lessons.splice(1,1);else e.context.sharedClient.studentTimetable=async()=>{throw Object.assign(new Error('Unavailable'),{status:503});};await e.context.refreshStudentTimetable({paint:false});assert.equal(e.pending(),null);e.data.lessons=[lesson('first-session',1),lesson('second-session',2)];e.context.sharedClient.studentTimetable=async()=>({...clone(e.data),revision:'recovered'});await e.context.refreshStudentTimetable({paint:false});gate.resolve({order:paid()});await opening.promise;assert.equal(e.draws,0);assert.equal(e.context.enrollmentOverlay,null);assert.equal(opening.opener.disabled,false);}
});
test('An unchanged source poll keeps a valid pending card read and its exact busy owner until completion',async()=>{
 const gate=deferred(),e=fixture(()=>gate.promise),opening=e.start();e.context.sharedClient.studentTimetable=async()=>({unchanged:true});await e.context.refreshStudentTimetable({paint:false});assert.ok(e.pending());assert.equal(opening.opener.disabled,true);gate.resolve({order:paid()});await opening.promise;assert.equal(e.draws,1);assert.equal(opening.opener.disabled,false);assert.equal(e.context.document.activeElement,e.close);
});
test('A superseded card reply cannot replace the newer session order or steal its modal focus',async()=>{
 const gates=[deferred(),deferred()];let reads=0;const e=fixture(()=>gates[reads++].promise),first=e.start(0),second=e.start(1);gates[1].resolve({order:paid()});await second.promise;gates[0].resolve({order:paid()});await first.promise;assert.equal(e.draws,1);assert.equal(e.context.enrollmentOverlay.returnToStudentLesson.lesson.id,'second-session');assert.equal(e.context.document.activeElement,e.close);
});
test('Identity or route changes prevent an old card read from opening an order',async()=>{
 for(const change of [e=>{e.context.authUser={id:'other-parent',role:'student',accessRevision:'two'};},e=>{e.context.route='/about';}]){const gate=deferred(),e=fixture(()=>gate.promise),opening=e.start();change(e);gate.resolve({order:paid()});await opening.promise;assert.equal(e.draws,0);assert.equal(e.context.enrollmentOverlay,null);}
});
test('Cancelling a pending card read restores its exact opener only when native focus fell back to the body',async()=>{
 for(const chosenOtherControl of [false,true]){const gate=deferred(),e=fixture(()=>gate.promise),opening=e.start();e.context.document.activeElement=chosenOtherControl?e.cards[0]:e.body;e.key('Escape');assert.equal(e.pending(),null);assert.equal(opening.opener.disabled,false);assert.equal(e.context.document.activeElement,chosenOtherControl?e.cards[0]:opening.opener);gate.resolve({order:paid()});await opening.promise;assert.equal(e.draws,0);}
});
test('A failed card read restores the exact fresh opener without overriding a deliberate focus or another modal',async()=>{
 for(const mode of ['body','other-control','other-modal']){const gate=deferred(),e=fixture(()=>gate.promise),opening=e.start(),fresh=e.remount();e.context.document.activeElement=mode==='other-control'?fresh[0]:e.body;if(mode==='other-modal')e.context.modal='another dialog';gate.reject(Object.assign(new Error('Unavailable'),{status:503}));await opening.promise;assert.equal(e.context.document.activeElement,mode==='body'?fresh[1]:mode==='other-control'?fresh[0]:e.body);if(mode==='body')assert.equal(fresh[1].focusOptions.preventScroll,true);assert.equal(e.scroll,null);assert.equal(e.draws,0);}
});
test('A missing card order is reported as an unavailable read rather than a failed save',async()=>{
 const e=fixture(async()=>{throw Object.assign(new Error('Not found'),{status:404});}),opening=e.start();e.context.document.activeElement=e.body;await opening.promise;assert.equal(e.draws,0);assert.match(e.messages.join(' '),/no longer available/);assert.doesNotMatch(e.messages.join(' '),/could not save/i);assert.equal(e.context.document.activeElement,opening.opener);
});
