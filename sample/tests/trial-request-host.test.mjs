import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src.js',import.meta.url),'utf8'),block=source.slice(source.indexOf('function trialRequestIdentity()'),source.indexOf('function publicTrialContext()'));
const record={id:'request-2',personId:'person-2',reference:'TR-2',version:1,status:'pending',canReject:true,applicant:{displayName:'同名學生',email:'second@example.test'},slot:{id:'slot-2',courseId:'course-2',courseName:'Art',date:'2026-10-20',time:'13:00',duration:60},events:[]};
function fixture(overrides={}){
 const calls=[],user={id:'teacher-2',role:'teacher'},list={records:[record],total:1,page:1,pageSize:25,revision:'one'};
 const context=vm.createContext({sharedMode:true,authUser:user,tab:'teacher-home',modal:'',trialRequestOverlay:null,trialWorkCache:{identity:'',ready:false,revision:''},trialWorkRead:null,path:()=>'/account',accountPersonId:()=>'',accountCourseId:()=>'',isAccountPage:()=>true,sessionIdentityKey:user=>user?.id,t:(_z,e)=>e,esc:String,newOperationKey:()=> 'fixed-reject-key',trialRequestsMarkup:()=>'',trialRequestDialogMarkup:()=>'',renderModal(){},render(){},document:{activeElement:null,querySelector:()=>null,querySelectorAll:()=>[]},window:{scrollY:72,scrollTo(){}},sharedClient:{trialApplications:async query=>{calls.push({list:query});return {...list,page:query.page};},trialApplication:async id=>{calls.push({get:id});return {application:structuredClone(record)};},trialWork:async()=>({requests:[],notifications:[],pendingTotal:0,revision:'w1'}),rejectTrialApplication:async(id,version,key)=>{calls.push({reject:{id,version,key}});return {application:{...record,id,version:version+1,status:'rejected',canReject:false}};},...overrides}});
 vm.runInContext(block,context);
 return {context,calls,run:code=>vm.runInContext(code,context),record,open:requestId=>context.openTrialRequests(requestId?{requestId}:{}),action:(command,extra={})=>context.handleTrialRequestAction('trial-request-command',{command,...extra})};
}
test('real request host reads exact target and retains request21 through explicit pagination',async()=>{
 const h=fixture();await h.open();assert.equal(h.context.trialRequestOverlay.records[0].id,'request-2');await h.context.handleTrialRequestAction('trial-requests-page',{page:'2'});assert.equal(h.calls.at(-1).list.page,2);
 await h.context.handleTrialRequestAction('trial-request-open',{requestId:'request-2'});assert.equal(h.calls.at(-1).get,'request-2');assert.equal(h.context.trialRequestOverlay.record.personId,'person-2');
});
test('navigation and revoked identity prevent delayed private reads from repopulating an overlay',async()=>{
 let finish;const h=fixture({trialApplication:()=>new Promise(resolve=>finish=resolve)}),pending=h.open('request-2');h.context.authUser={id:'other-teacher',role:'teacher'};finish({application:record});await pending;assert.equal(h.context.trialRequestOverlay.record,null);assert.equal(h.context.trialRequestOverlay.ready,false);
});
test('reject confirmation cancel makes no write; real rejection targets exact opened version and updates only its acknowledged request',async()=>{
 const h=fixture();await h.open('request-2');await h.action('review-rejection');assert.equal(h.context.trialRequestOverlay.step,'reject-review');await h.action('back');assert.equal(h.calls.filter(c=>c.reject).length,0);
 await h.action('review-rejection');await h.action('reject');assert.deepEqual(h.calls.find(c=>c.reject),{reject:{id:'request-2',version:1,key:'fixed-reject-key'}});assert.equal(h.context.trialRequestOverlay.record.status,'rejected');assert.equal(h.context.trialRequestOverlay.record.personId,'person-2');
});
test('lost rejection acknowledgement retries the same immutable operation without a fake local task-complete',async()=>{
 let attempt=0;const sent=[];const h=fixture({rejectTrialApplication:async(id,version,key)=>{sent.push({id,version,key});if(++attempt===1)throw new Error('lost ACK');return {application:{...record,version:2,status:'rejected',canReject:false}};}});
 await h.open('request-2');await h.action('review-rejection');await h.action('reject');assert.equal(h.context.trialRequestOverlay.uncertain,true);assert.equal(h.context.trialRequestOverlay.record.status,'pending');await h.action('back');assert.equal(h.context.trialRequestOverlay.step,'reject-review');await h.action('reject');assert.deepEqual(sent[0],sent[1]);assert.equal(h.context.trialRequestOverlay.record.status,'rejected');
});
test('forbidden source reload clears private contacts instead of presenting stale data as actionable',async()=>{
 let deny=false;const h=fixture({trialApplication:async()=>{if(deny)throw Object.assign(new Error('revoked'),{status:404});return {application:record};}});await h.open('request-2');deny=true;await h.context.readTrialRequests();assert.equal(h.context.trialRequestOverlay.record,null);assert.equal(h.context.trialRequestOverlay.ready,false);assert.ok(h.context.trialRequestOverlay.error);
});
test('wrong-person detail and malformed rejection receipts never show success or replace the opened record',async()=>{
 const h=fixture({rejectTrialApplication:async()=>({application:{...record,id:'request-1',personId:'person-1',version:2,status:'rejected'}})});await h.open('request-2');await h.action('review-rejection');await h.action('reject');assert.equal(h.context.trialRequestOverlay.record.id,'request-2');assert.equal(h.context.trialRequestOverlay.record.status,'pending');assert.equal(h.context.trialRequestOverlay.uncertain,true);
});
test('unreadable JSON on a successful rejection keeps the original version and key for retry',async()=>{
 let attempt=0;const sent=[];const h=fixture({rejectTrialApplication:async(id,version,key)=>{sent.push({id,version,key});if(++attempt===1)throw Object.assign(new Error('unreadable JSON'),{status:200,code:'service_unavailable'});return {application:{...record,version:2,status:'rejected',canReject:false}};}});
 await h.open('request-2');await h.action('review-rejection');await h.action('reject');assert.equal(h.context.trialRequestOverlay.uncertain,true);assert.equal(h.context.trialRequestOverlay.stale,false);await h.action('reject');assert.deepEqual(sent[0],sent[1]);assert.equal(h.context.trialRequestOverlay.record.status,'rejected');
});
test('malformed work sources remain unknown and cannot render a fabricated count or broken person card',async()=>{
 const h=fixture({trialWork:async()=>({revision:'bad',pendingTotal:1,requests:[{id:'broken'}],notifications:[]})});await h.context.refreshTrialWork({paint:false});assert.equal(h.context.trialWorkCache.ready,false);assert.equal(h.context.trialWorkCache.pendingTotal,null);assert.deepEqual(h.context.trialWorkCache.requests.length,0);
});
test('opening a request starts at its summary and returning restores the same list page scroll and row focus',async()=>{
 const h=fixture(),body={scrollTop:438},row={dataset:{action:'trial-request-open',requestId:'request-2'},focus(){h.context.document.activeElement=this;}};
 h.context.document.querySelector=selector=>selector==='#trial-request-body'?body:null;h.context.document.querySelectorAll=()=>[row];
 await h.open();h.context.trialRequestOverlay.page=2;h.context.document.activeElement=row;body.scrollTop=438;
 await h.context.handleTrialRequestAction('trial-request-open',{requestId:'request-2'});assert.equal(body.scrollTop,0);
 body.scrollTop=87;h.context.document.activeElement=null;await h.action('list');assert.equal(h.context.trialRequestOverlay.page,2);assert.equal(body.scrollTop,438);assert.equal(h.context.document.activeElement,row);
});
test('unchanged background reads preserve native controls and do not temporarily disable a known request',async()=>{
 let finish,reads=0,writes=0;const h=fixture({trialApplication:async()=>++reads===1?{application:structuredClone(record)}:new Promise(resolve=>finish=resolve)});
 h.context.trialRequestDialogMarkup=state=>JSON.stringify({ready:state.ready,loading:state.loading,record:state.record,step:state.step});h.context.renderModal=()=>writes++;
 await h.open('request-2');const before=writes,pending=h.context.readTrialRequests({poll:true});assert.equal(h.context.trialRequestOverlay.loading,false);assert.equal(writes,before);
 finish({application:structuredClone(record)});await pending;assert.equal(writes,before);
});
test('a delayed background read cannot overwrite an acknowledged rejection with the older pending state',async()=>{
 let finish,reads=0;const h=fixture({trialApplication:async()=>++reads===1?{application:structuredClone(record)}:new Promise(resolve=>finish=resolve)});
 await h.open('request-2');const pending=h.context.readTrialRequests({poll:true});await h.action('review-rejection');await h.action('reject');assert.equal(h.context.trialRequestOverlay.record.status,'rejected');finish({application:structuredClone(record)});await pending;assert.equal(h.context.trialRequestOverlay.record.status,'rejected');
});
test('an unchanged work poll does not repaint the page or close an unrelated native account menu',async()=>{
 let count=0,paints=0;const h=fixture({trialWork:async()=>++count===1?{requests:[],notifications:[],pendingTotal:0,revision:'work-one'}:{unchanged:true,pendingTotal:0,revision:'work-one'}});h.context.render=()=>paints++;
 await h.context.refreshTrialWork();assert.equal(paints,1);await h.context.refreshTrialWork();assert.equal(paints,1);
});
test('work updates cannot repaint a course screen where only the independent request-list entry is shown',async()=>{
 let paints=0;const h=fixture();h.context.tab='catalog';h.context.render=()=>paints++;await h.context.refreshTrialWork();assert.equal(paints,0);
});
