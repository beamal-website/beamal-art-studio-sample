import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInterfacePreview} from '../client/interface-preview.js';
const t=(_zh,en)=>en;

function canonicalRosterPreview(options={}){
 const ticket={},returns=[],reads=[];
 let current={t,role:'admin',sharedMode:true,sharedIdentity:'actual-admin'},status='ready';
 const facts={identity:'actual-admin',contextKey:'actual-roster-context',student:{id:'actual-person',displayName:'林思晴 Serena Lam',attendance:'unmarked'},lesson:{id:'actual-session',scheduleId:'actual-schedule',sequence:7,sourceVersion:3,courseId:'actual-course',courseName:'陶藝研究 Ceramic Study',date:'2026-11-19',time:'16:20',duration:40,teacher:'Teaching artist',room:'Studio B'},capabilities:{review:true,save:false},availability:{ready:false,slots:[]}};
 const p=preview({context:()=>current,resolveSharedLesson:request=>{reads.push(request);return request.sessionId==='actual-session'&&(!request.returnTicket||request.returnTicket===ticket)?{status,facts,returnTicket:ticket}:{status:'unavailable'};},onCloseSharedLesson:(value,settings)=>returns.push({value,settings}),...options});
 return {...p,get html(){return p.html;},get modalWrites(){return p.modalWrites;},ticket,returns,reads,facts,setContext:value=>{current={...current,...value};},setStatus:value=>{status=value;}};
}

function pendingPreview(write){
 const calls=[];let p;p=canonicalRosterPreview({onSaveSharedPending:async(payload,options)=>{calls.push({payload,options});return write?write(payload,options):{arrangement:{sessionId:'actual-session',studentId:'actual-person',scheduleId:'actual-schedule',sequence:7,courseId:'actual-course',sourceVersion:3,sessionVersion:2,version:1,status:'pending'}};}});
 Object.assign(p.facts.lesson,{sessionVersion:2});p.facts.arrangement={version:0,status:null,createdAt:null,updatedAt:null};p.facts.capabilities.savePending=true;return {...p,calls,get html(){return p.html;},get modalWrites(){return p.modalWrites;}};
}

test('saving a pending arrangement sends only exact opened versions and only a matching ACK can display saved state',async()=>{
 const p=pendingPreview();p.ui.openSharedLesson('arrange',{sessionId:'actual-session'});p.ui.action({action:'ui-shared-lesson',uiCommand:'pending'});await p.ui.action({action:'ui-shared-lesson',uiCommand:'save-pending'});
 assert.equal(p.calls.length,1);assert.deepEqual(p.calls[0].payload,{sessionId:'actual-session',version:0,sessionVersion:2,sourceVersion:3});assert.ok(p.calls[0].options.operationKey);assert.equal(p.calls[0].options.returnTicket,p.ticket);assert.match(p.html,/id="slw-pending-saved"/);assert.doesNotMatch(p.html,/Arrangement confirmed|Paid Receipt/);p.ui.action({action:'ui-shared-lesson',uiCommand:'continue-arrange'});assert.doesNotMatch(p.html,/id="slw-pending-saved"/);p.ui.close();assert.equal(p.returns.at(-1).settings.restore,true);
});

test('pending uncertain retries retain the exact operation after a poll observes the server commit',async()=>{
 let attempts=0;const p=pendingPreview(async()=>{if(!attempts++)throw Object.assign(new Error('Lost reply'),{status:201,code:'service_unavailable'});return {arrangement:{sessionId:'actual-session',studentId:'actual-person',scheduleId:'actual-schedule',sequence:7,courseId:'actual-course',sourceVersion:3,sessionVersion:2,version:1,status:'pending'}};});
 p.ui.openSharedLesson('arrange',{sessionId:'actual-session'});p.ui.action({action:'ui-shared-lesson',uiCommand:'pending'});await p.ui.action({action:'ui-shared-lesson',uiCommand:'save-pending'});p.facts.arrangement={status:'pending',version:1};p.ui.refreshSharedLesson();p.ui.action({action:'ui-shared-lesson',uiCommand:'back'});await p.ui.action({action:'ui-shared-lesson',uiCommand:'save-pending'});
 assert.equal(p.calls.length,2);assert.deepEqual(p.calls[0].payload,p.calls[1].payload);assert.equal(p.calls[0].options.operationKey,p.calls[1].options.operationKey);assert.match(p.html,/id="slw-pending-saved"/);
});

test('late pending acknowledgements after identity changes cannot reopen a private dialog or show success',async()=>{
 let finish;const p=pendingPreview(()=>new Promise(resolve=>finish=resolve));p.ui.openSharedLesson('arrange',{sessionId:'actual-session'});p.ui.action({action:'ui-shared-lesson',uiCommand:'pending'});const pending=p.ui.action({action:'ui-shared-lesson',uiCommand:'save-pending'});assert.equal(p.calls.length,1);p.setContext({sharedIdentity:'different-user'});p.ui.refreshSharedLesson();finish({arrangement:{sessionId:'actual-session',studentId:'actual-person',scheduleId:'actual-schedule',sequence:7,courseId:'actual-course',sourceVersion:3,sessionVersion:2,version:1,status:'pending'}});await pending;assert.equal(p.ui.isOpen,false);assert.doesNotMatch(p.html,/slw-pending-saved/);
});

test('shared roster attendance and arrangements use only the resolved person and occurrence and never claim a preview save',()=>{
 const p=canonicalRosterPreview();
 assert.equal(typeof p.ui.openSharedLesson,'function');
 for(const view of ['attendance','arrange']){
  assert.equal(p.ui.openSharedLesson(view,{sessionId:'actual-session',student:{displayName:'Forged person'},lesson:{date:'1999-01-01'}}),true);
  assert.match(p.html,/Serena Lam/);assert.match(p.html,/Ceramic Study/);assert.match(p.html,/2026-11-19/);assert.match(p.html,/16:20/);
  assert.doesNotMatch(p.html,/Forged person|1999-01-01|Chloe|2026-10-16|Interface preview/);
  if(view==='attendance')p.ui.submit({id:'shared-lesson-workflow-form',dataset:{uiCommand:'review'},values:{attendance:'absent',remark:'Bring the portfolio',showRemark:'yes'}});
  else p.ui.action({action:'ui-shared-lesson',uiCommand:'pending'});
  for(const command of ['final-save','final-confirm','save-preview','confirm-preview','submit'])p.ui.action({action:'ui-shared-lesson',uiCommand:command});
  assert.doesNotMatch(p.html,/Preview complete|This preview has been updated|Saved successfully|Arrangement confirmed/);
  assert.match(p.html,/<button[^>]*disabled/);
  p.ui.close();
 }
 assert.ok(p.reads.every(request=>!request.student&&!request.lesson),'The resolver receives references, never caller-provided canonical facts');
});

test('shared roster launch rejects absent sessions, unrelated roles and the old public fixture entry',()=>{
 const p=canonicalRosterPreview();assert.equal(typeof p.ui.openSharedLesson,'function');
 for(const sessionId of ['',undefined,'different-session']){assert.equal(p.ui.openSharedLesson('attendance',{sessionId}),false);assert.equal(p.ui.isOpen,false);}
 for(const role of ['student','',undefined]){p.setContext({role});assert.equal(p.ui.openSharedLesson('attendance',{sessionId:'actual-session'}),false);}
 p.setContext({role:'teacher'});assert.equal(p.ui.openLesson('attendance',{shared:true,student:p.facts.student,lesson:p.facts.lesson}),false);
 p.ui.action({action:'ui-lesson',uiCommand:'launch',uiView:'attendance',uiId:'actual-session'});assert.match(p.html,/Serena Lam/);
});

test('closing a canonical roster workflow returns its exact ticket once while clear and identity changes never reopen the parent',()=>{
 const p=canonicalRosterPreview();assert.equal(typeof p.ui.openSharedLesson,'function');
 assert.equal(p.ui.openSharedLesson('attendance',{sessionId:'actual-session'}),true);p.ui.keyboard({key:'Escape',preventDefault(){}});
 assert.equal(p.ui.isOpen,false);assert.equal(p.returns.length,1);assert.equal(p.returns[0].value,p.ticket);assert.equal(p.returns[0].settings.restore,true);
 p.ui.close();assert.equal(p.returns.length,1);
 p.ui.openSharedLesson('attendance',{sessionId:'actual-session'});p.ui.clear();assert.equal(p.returns.at(-1).settings.restore,false);
 p.ui.openSharedLesson('attendance',{sessionId:'actual-session'});p.setContext({sharedIdentity:'different-admin'});p.ui.refreshSharedLesson();
 assert.equal(p.ui.isOpen,false);assert.equal(p.returns.at(-1).settings.restore,false);assert.equal(p.html,'');
});

test('canonical roster polls preserve native drafts and review-back restores the edit position',()=>{
 let p,focused=0;const body={scrollTop:318,scrollLeft:7},form={id:'shared-lesson-workflow-form',values:{attendance:'sick',remark:'Keep this private draft',showRemark:''}},input={name:'remark',tagName:'TEXTAREA',isConnected:true,selectionStart:5,selectionEnd:12,dataset:{},focus(){focused++;},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;},closest:selector=>selector.includes('form')?form:null};
 const dom={activeElement:input,querySelector:selector=>selector.includes('.slw-body')?body:selector.includes('shared-lesson-workflow-form')?form:null,querySelectorAll:()=>[input]};
 p=canonicalRosterPreview({dom});assert.equal(typeof p.ui.openSharedLesson,'function');p.ui.openSharedLesson('attendance',{sessionId:'actual-session'});
 const writes=p.modalWrites;p.ui.input({name:'remark',closest:()=>form});p.ui.refreshSharedLesson();assert.equal(p.modalWrites,writes,'An unchanged poll must not remount native fields');
 p.ui.submit({...form,dataset:{uiCommand:'review'}});assert.match(p.html,/Keep this private draft/);
 body.scrollTop=0;body.scrollLeft=0;p.ui.action({action:'ui-shared-lesson',uiCommand:'back'});
 assert.match(p.html,/Keep this private draft/);assert.equal(body.scrollTop,318);assert.equal(body.scrollLeft,7);assert.ok(focused);assert.equal(input.selectionStart,5);assert.equal(input.selectionEnd,12);
 p.setStatus('error');p.ui.refreshSharedLesson();assert.match(p.html,/Keep this private draft/);assert.doesNotMatch(p.html,/Chloe|Preview complete/);
 p.setStatus('ready');p.ui.refreshSharedLesson();assert.match(p.html,/Keep this private draft/);
});

test('the actual shared review button harvests the entire native form including the checked timetable remark',()=>{
 const form={id:'shared-lesson-workflow-form',values:{attendance:'absent',remark:'Portfolio discussion',showRemark:'yes'}},dom={activeElement:null,querySelector:selector=>selector.includes('shared-lesson-workflow-form')?form:null,querySelectorAll:()=>[]},p=canonicalRosterPreview({dom});
 p.ui.openSharedLesson('attendance',{sessionId:'actual-session'});
 // The real delegated button click is consumed before a native submit event.
 p.ui.action({action:'ui-shared-lesson',uiCommand:'review'});
 assert.match(p.html,/Portfolio discussion/);
 p.ui.action({action:'ui-shared-lesson',uiCommand:'back'});
 assert.match(p.html,/<input[^>]*name="showRemark"[^>]*value="yes"[^>]*checked/);
});

test('Escape while composing Chinese preserves the shared draft while normal Escape still returns to the lesson',()=>{
 const p=canonicalRosterPreview();
 p.ui.openSharedLesson('attendance',{sessionId:'actual-session'});
 for(const composition of [{isComposing:true},{keyCode:229}]){
  let prevented=false;
  assert.equal(p.ui.keyboard({key:'Escape',...composition,preventDefault(){prevented=true;}}),true);
  assert.equal(prevented,false);assert.equal(p.ui.isOpen,true);assert.equal(p.returns.length,0);
 }
 p.ui.keyboard({key:'Escape',preventDefault(){}});
 assert.equal(p.ui.isOpen,false);assert.equal(p.returns.length,1);assert.equal(p.returns[0].settings.restore,true);
});

test('the student-name launch shows readonly details of the exact selected session and returns its original ticket',()=>{
 const p=canonicalRosterPreview();
 p.facts.student.age={years:7,months:4,asOf:'2026-11-19'};
 p.facts.student.balance={unit:'minutes',remaining:360,total:720};
 assert.equal(p.ui.openSharedLesson('student',{sessionId:'actual-session',student:{displayName:'Forged name'}}),true);
 assert.match(p.html,/Serena Lam/);assert.match(p.html,/Ceramic Study/);assert.match(p.html,/2026-11-19/);assert.match(p.html,/Student lesson details/);
 assert.doesNotMatch(p.html,/<form|type="submit"|Forged name|Chloe|Preview complete/);
 const initial=p.html;
 for(const command of ['review','pending','final-save','final-confirm','submit'])p.ui.action({action:'ui-shared-lesson',uiCommand:command});
 assert.equal(p.html,initial);
 p.ui.action({action:'ui-shared-lesson',uiCommand:'close'});
 assert.equal(p.returns.length,1);assert.equal(p.returns[0].value,p.ticket);assert.equal(p.returns[0].settings.restore,true);
 p.ui.action({action:'ui-lesson',uiCommand:'launch',uiView:'student',uiId:'actual-session'});
 assert.match(p.html,/Student lesson details/);
});

test('student lesson details refresh from the same source and close when the selected person or identity changes',()=>{
 const p=canonicalRosterPreview();
 assert.equal(p.ui.openSharedLesson('student',{sessionId:'missing-session'}),false);
 p.setContext({role:'student'});assert.equal(p.ui.openSharedLesson('student',{sessionId:'actual-session'}),false);
 p.setContext({role:'teacher'});assert.equal(p.ui.openSharedLesson('student',{sessionId:'actual-session'}),true);
 p.facts.student.displayName='Updated same student';p.ui.refreshSharedLesson();assert.match(p.html,/Updated same student/);
 p.setStatus('error');p.ui.refreshSharedLesson();assert.match(p.html,/Could not update lesson details/);
 p.setStatus('ready');p.facts.student.id='a-different-child';p.ui.refreshSharedLesson();
 assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');assert.equal(p.returns.at(-1).settings.restore,false);
});

test('a background student-detail refresh preserves the expanded remark, summary focus and reading position',()=>{
 let p,rendered='',controls=[],note,summary;
 const body={scrollTop:175,scrollLeft:11};
 const node=tagName=>({tagName,isConnected:true,disabled:false,dataset:{},focus(){dom.activeElement=this;}});
 function mount(){
  if(rendered===p.html)return;
  for(const control of controls)control.isConnected=false;
  rendered=p.html;if(!rendered){controls=[];note=null;summary=null;return;}
  const header=node('BUTTON'),footer=node('BUTTON');summary=node('SUMMARY');
  const key=rendered.match(/<details[^>]*data-slw-note="([^"]+)"/)?.[1];
  note={tagName:'DETAILS',dataset:key?{slwNote:key}:{},open:false};controls=[header,summary,footer];
 }
 const dom={activeElement:null,querySelector:selector=>{mount();return selector.includes('.slw-body')?body:selector.includes('button:not(:disabled)')?controls[0]:null;},querySelectorAll:selector=>{mount();return selector.includes('details')?[note]:selector.includes('.slw-dialog')?controls.filter(control=>control.tagName!=='SUMMARY'||selector.includes('summary')):[];}};
 p=canonicalRosterPreview({dom});p.facts.student.remark='Long canonical lesson remark. '.repeat(20);
 p.ui.openSharedLesson('student',{sessionId:'actual-session'});note.open=true;summary.focus();
 p.setStatus('error');p.ui.refreshSharedLesson();
 assert.equal(note.open,true);assert.equal(dom.activeElement,summary);assert.equal(body.scrollTop,175);assert.equal(body.scrollLeft,11);
 p.setStatus('ready');p.ui.refreshSharedLesson();assert.equal(note.open,true);assert.equal(dom.activeElement,summary);
 p.ui.close();mount();p.ui.openSharedLesson('student',{sessionId:'actual-session'});assert.equal(note.open,false,'A new reading session must not inherit a closed view expansion');
});

test('shared People workflows use the loaded profile and never an unrelated lesson or family fixture',()=>{
 const person={id:'person-second',kind:'applicant',displayName:'另一位學生 Second Student',email:'second@example.test',phone:'23456789'};
 let current={t,role:'admin',sharedMode:true,sharedIdentity:'admin-A',peopleContext:{allowed:true,ready:true,personId:person.id,person}};
 const p=preview({context:()=>current});
 for(const view of ['applicant','family','convert']){
  assert.notEqual(p.ui.openLesson(view,{shared:true,sharedPerson:true,personId:person.id,student:{...person,displayName:'Stale name'},data:{students:[],slots:[],trialHistory:[]}}),false);
  assert.match(p.html,/另一位學生 Second Student/);
  assert.doesNotMatch(p.html,/Stale name|Chloe|Ethan|2026-10-10|2026-10-16|Creative Drawing|Interface preview/);
  assert.match(p.html,/not available yet|not connected yet/);
  p.ui.action({action:'ui-lesson',uiCommand:'confirm-preview'});
  assert.doesNotMatch(p.html,/Preview complete|This preview has been updated/);
  p.ui.close();
 }
 current={...current,peopleContext:{...current.peopleContext,person:{...person,kind:'student'}}};
 assert.equal(p.ui.openLesson('convert',{shared:true,sharedPerson:true,personId:person.id}),false);
 assert.equal(p.ui.isOpen,false);
});

test('shared People launch rejects a missing or different profile and closes on route or identity changes',()=>{
 const person={id:'person-second',kind:'student',displayName:'Same Name'};
 let current={t,role:'admin',sharedMode:true,sharedIdentity:'admin-A',peopleContext:{allowed:true,ready:true,personId:person.id,person}};
 const p=preview({context:()=>current});
 for(const personId of ['',undefined,'person-first']){
  assert.equal(p.ui.openLesson('family',{shared:true,sharedPerson:true,personId}),false);
  assert.equal(p.ui.isOpen,false);
 }
 const facts={shared:true,sharedPerson:true,personId:person.id};
 for(const change of [
  {sharedIdentity:'admin-B'},
  {role:'teacher'},
  {peopleContext:{...current.peopleContext,allowed:false}},
  {peopleContext:{...current.peopleContext,ready:false}},
  {peopleContext:{allowed:true,ready:true,personId:'person-first',person:{...person,id:'person-first'}}}
 ]){
  const baseline=current;
  assert.notEqual(p.ui.openLesson('family',facts),false);
  current={...current,...change};
  p.ui.action({action:'ui-lesson',uiCommand:'add-family'});
  assert.equal(p.ui.isOpen,false);
  assert.equal(p.html,'');
  current=baseline;
 }
});

test('a shared profile account view cannot retain another profile after navigation or run an unconnected activation',()=>{
 const person={id:'person-second',kind:'student',displayName:'Second Student',email:'contact@example.test'};
 let current={t,role:'admin',sharedMode:true,sharedIdentity:'admin-A',peopleContext:{allowed:true,ready:true,personId:person.id,person}};
 const p=preview({context:()=>current});
 assert.notEqual(p.ui.openAccount('activation',{shared:true,sharedPerson:true,personId:person.id,student:{...person,displayName:'Stale name'}}),false);
 assert.match(p.html,/Second Student/);
 assert.match(p.html,/Account status could not be confirmed/);
 assert.doesNotMatch(p.html,/Stale name|Not activated|Activated|Chloe/);
 p.ui.action({action:'ui-account-actions',uiCommand:'complete'});
 assert.doesNotMatch(p.html,/Preview complete|Activation complete/);
 current={...current,peopleContext:{allowed:true,ready:false,personId:null,person:null}};
 p.ui.action({action:'ui-account-actions',uiCommand:'next'});
 assert.equal(p.ui.isOpen,false);
 assert.equal(p.html,'');
});
test('unscoped shared People entries cannot borrow a fixture on directory loading or selected profiles',()=>{
 for(const role of ['admin','teacher'])for(const selected of [false,true]){
  const person={id:'exact-person',kind:'applicant',displayName:'Selected person'};
  const context=()=>({t,role,sharedMode:true,sharedIdentity:role+'-A',peopleContext:{allowed:role==='admin',ready:selected,personId:selected?person.id:null,person:selected?person:null}});
  const p=preview({context});
  for(const view of ['applicant','family','convert']){
   assert.equal(p.ui.openLesson(view),false,role+' '+view+' must require a selected profile contract');
   assert.equal(p.html,'');assert.equal(p.ui.isOpen,false);
   p.ui.action({action:'ui-lesson',uiCommand:'launch',uiView:view});
   assert.equal(p.html,'');assert.equal(p.ui.isOpen,false);
  }
  assert.equal(p.ui.openAccount('activation'),false);assert.equal(p.html,'');
  p.ui.action({action:'ui-account-actions',uiCommand:'launch',uiView:'activation'});
  assert.equal(p.html,'');assert.equal(p.ui.isOpen,false);
 }
 const student=preview({context:()=>({t,role:'student',sharedMode:true,sharedIdentity:'student-A',sharedReady:true,students:[{id:'own-child',displayName:'Own child'}]})});
 student.ui.openLesson('family');assert.match(student.html,/Own child/);assert.doesNotMatch(student.html,/Chloe|Ethan/);
});

test('keyboard use closes shared People dialogs after route identity or permission becomes invalid',()=>{
 const person={id:'exact-person',kind:'applicant',displayName:'Private profile'};
 for(const view of ['applicant','family','convert','activation'])for(const change of ['route','identity','denied','not-ready','role','missing-profile'])for(const key of ['Tab','Escape']){
  let current={t,role:'admin',sharedMode:true,sharedIdentity:'admin-A',peopleContext:{allowed:true,ready:true,personId:person.id,person}};
  const p=preview({context:()=>current}),facts={sharedPerson:true,personId:person.id};
  assert.notEqual(view==='activation'?p.ui.openAccount(view,facts):p.ui.openLesson(view,facts),false);
  if(change==='route')current.peopleContext={...current.peopleContext,personId:'other-id',person:{...person,id:'other-id'}};
  if(change==='identity')current.sharedIdentity='admin-B';
  if(change==='denied')current.peopleContext.allowed=false;
  if(change==='not-ready')current.peopleContext.ready=false;
  if(change==='role')current.role='teacher';
  if(change==='missing-profile')current.peopleContext.person=null;
  let prevented=false;assert.equal(p.ui.keyboard({key,preventDefault(){prevented=true;}}),true);
  assert.equal(prevented,true,view+' '+change+' '+key);assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
 }
});

test('shared People refresh updates visible facts without remounting unchanged dialogs or losing close focus and scroll',()=>{
 for(const view of ['applicant','family','activation']){
  const person={id:'exact-person',kind:'applicant',displayName:'Before profile',email:'before@example.test'};
  let current={t,role:'admin',sharedMode:true,sharedIdentity:'admin-A',peopleContext:{allowed:true,ready:true,personId:person.id,person}},p,writtenAt=0,focusCalls=0;
  const oldBody={scrollTop:104,scrollLeft:6},newBody={scrollTop:0,scrollLeft:0},dialog={};
  const control=()=>({tagName:'BUTTON',dataset:{action:view==='activation'?'ui-account-actions':'ui-lesson',uiCommand:'close'},disabled:false,closest:selector=>selector==='#modal-root .dialog'?dialog:null,focus(){focusCalls++;dom.activeElement=this;}});
  const oldControls=[control(),control()],newControls=[control(),control()];
  const dom={activeElement:null,querySelector:selector=>['#modal-root .lw-body','#modal-root .aa-body'].includes(selector)?p.modalWrites>writtenAt?newBody:oldBody:null,querySelectorAll:()=>p.modalWrites>writtenAt?newControls:oldControls};
  p=preview({context:()=>current,dom});const facts={sharedPerson:true,personId:person.id};
  view==='activation'?p.ui.openAccount(view,facts):p.ui.openLesson(view,facts);writtenAt=p.modalWrites;dom.activeElement=oldControls[1];
  assert.equal(typeof p.ui.refreshSharedPerson,'function');
  assert.equal(p.ui.refreshSharedPerson(),true);assert.equal(p.modalWrites,writtenAt);assert.equal(focusCalls,0);assert.equal(dom.activeElement,oldControls[1]);
  current.peopleContext.person={...person};p.ui.refreshSharedPerson();assert.equal(p.modalWrites,writtenAt);assert.equal(dom.activeElement,oldControls[1]);
  current.peopleContext.person={...person,email:'after@example.test'};
  assert.equal(p.ui.refreshSharedPerson(),true);assert.equal(p.modalWrites,writtenAt+1);assert.match(p.html,/after@example.test/);assert.doesNotMatch(p.html,/before@example.test/);
  assert.equal(dom.activeElement,newControls[1]);assert.equal(focusCalls,1);assert.equal(newBody.scrollTop,104);assert.equal(newBody.scrollLeft,6);assert.equal(p.paints,0);
  writtenAt=p.modalWrites;p.ui.refreshSharedPerson();assert.equal(p.modalWrites,writtenAt);assert.equal(focusCalls,1);
  current.peopleContext.person={...current.peopleContext.person,unrenderedInternalMetadata:'changed'};p.ui.refreshSharedPerson();assert.equal(p.modalWrites,writtenAt);
  current.sharedIdentity='admin-B';p.ui.refreshSharedPerson();assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
 }
 const standalone=preview();standalone.ui.openLesson('attendance');const html=standalone.html,writes=standalone.modalWrites;
 assert.equal(standalone.ui.refreshSharedPerson(),false);assert.equal(standalone.html,html);assert.equal(standalone.modalWrites,writes);
});

function preview(options={}){let html='',paints=0,modalWrites=0;const dom={activeElement:null,querySelector:()=>null,querySelectorAll:()=>[]};class Form{constructor(form){this.entries=Object.entries(form.values||{}).flatMap(([name,value])=>Array.isArray(value)?value.map(item=>[name,item]):[[name,value]]);}*[Symbol.iterator](){yield* this.entries;}getAll(name){return this.entries.filter(([key])=>key===name).map(([,value])=>value);}}const ui=createInterfacePreview({context:()=>({t,role:'teacher'}),showModal:value=>{html=value;modalWrites++;},repaint:()=>paints++,dom,Form,...options});return {ui,get html(){return html;},get paints(){return paints;},get modalWrites(){return modalWrites;}};}
test('administrator assignment action only forwards a course slot offered for that pending request',()=>{
 const assignments=[],request={id:'request-1',version:4,studentId:'student-1',studentName:'Student One',type:'reschedule',status:'pending',createdAt:'2026-10-16T09:00:00Z',lesson:{courseId:'course-1',courseName:'Art course',date:'2026-10-16',time:'13:00'},availableTimes:[{scheduleId:'schedule-1',sequence:3,courseId:'course-1',courseName:'Art course',date:'2026-10-30',time:'15:00',availableSeats:1}]};
 const p=preview({context:()=>({t,role:'admin',sharedMode:true,sharedIdentity:'admin-login'}),sharedSnapshot:()=>({user:{id:'admin-login',role:'admin'},ready:true,studentRequestsReady:true,studentRequests:[request]}),onAssignStudentRequest:input=>assignments.push(input)});
 p.ui.teacherPortal();p.ui.action({action:'ui-staff',uiCommand:'open-task',uiId:'request-1'});
 p.ui.action({action:'ui-staff',uiCommand:'assign-lesson-request',uiId:'request-1',uiScheduleId:'unoffered-schedule',uiSequence:'3'});
 assert.deepEqual(assignments,[]);
 p.ui.action({action:'ui-staff',uiCommand:'assign-lesson-request',uiId:'request-1',uiScheduleId:'schedule-1',uiSequence:'3'});
 assert.deepEqual(assignments,[{requestId:'request-1',version:4,scheduleId:'schedule-1',sequence:3}]);
});

function productPreview(){
 let p,cachedHtml,buttons=[];
 const dom={activeElement:null,querySelector:()=>modalButtons()[0]||null,querySelectorAll:selector=>selector.startsWith('#modal-root')?modalButtons():[listButton,...modalButtons()]};
 const node=(dataset,text='')=>({dataset,text,isConnected:true,focus(){dom.activeElement=this;}});
 let listButton=node({action:'ui-operations',uiCommand:'view-product',uiSection:'products',uiId:'product-2'});
 function modalButtons(){
  if(cachedHtml!==p.html){
   for(const button of buttons)button.isConnected=false;
   cachedHtml=p.html;buttons=[...p.html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([,attributes,text])=>{
    const dataset=Object.fromEntries([...attributes.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,name,value])=>[name.replace(/-([a-z])/g,(_all,letter)=>letter.toUpperCase()),value]));
    return node(dataset,text);
   });
  }
  return buttons;
 }
 p=preview({dom});
 const filters={query:'watercolour',status:'active',category:'materials'};
 p.ui.action({action:'ui-operations',uiCommand:'apply-filters',uiSection:'products'},{closest:()=>({querySelectorAll:()=>Object.entries(filters).map(([name,value])=>({name,value}))})});
 return {...p,get html(){return p.html;},dom,get listButton(){return listButton;},modalButtons,replaceListButton(){listButton.isConnected=false;listButton=node({...listButton.dataset});}};
}

test('product form Cancel X and Escape return to the same detail and its original action after validation errors',()=>{
 for(const command of ['edit-product','stock-product'])for(const method of ['cancel','x','escape']){
  const p=productPreview();
  p.dom.activeElement=p.listButton;p.ui.action(p.listButton.dataset,p.listButton);p.replaceListButton();
  const edit=p.modalButtons().find(button=>button.dataset.uiCommand===command&&button.dataset.uiId==='product-2');
  assert.ok(edit);p.ui.action(edit.dataset,edit);
  const values=command==='edit-product'?{formKind:command,recordId:'product-2',nameZh:'輸入草稿',nameEn:'Typed draft',sku:'ART-001',price:'0',stock:'0',threshold:'0'}:{formKind:command,recordId:'product-2',direction:'remove',quantity:'0',reason:'Typed reason'};
  p.ui.submit({id:'ui-operations-form',values});
  assert.match(p.html,/role="alert"[^>]*>[^<]+/);
  assert.match(p.html,command==='edit-product'?/value="Typed draft"/:/name="quantity"[^>]*value="0"/);
  if(method==='escape'){let prevented=false;p.ui.keyboard({key:'Escape',preventDefault(){prevented=true;}});assert.equal(prevented,true);}
  else {const cancel=p.modalButtons().find(button=>button.text===(method==='x'?'×':'Cancel'));assert.ok(cancel);p.ui.action(cancel.dataset,cancel);}
  assert.equal(p.ui.isOpen,true,command+' '+method);
  assert.match(p.html,/<h2 id="ops-dialog-title">Watercolour set<\/h2>/);
  assert.doesNotMatch(p.html,/id="ui-operations-form"|Typed draft|Typed reason/);
  assert.equal(p.dom.activeElement.dataset.uiCommand,command);
  assert.equal(p.dom.activeElement.dataset.uiId,'product-2');
  assert.equal(p.dom.activeElement.isConnected,true);
  const close=p.modalButtons().find(button=>button.dataset.uiCommand==='close');p.ui.action(close.dataset,close);
  assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');assert.equal(p.dom.activeElement,p.listButton);
  const page=p.ui.operations('products');assert.match(page,/value="watercolour"/);assert.match(page,/value="active" selected/);assert.match(page,/value="materials" selected/);assert.doesNotMatch(page,/Sketchbook A4|Typed draft/);
 }
});

test('product forms opened directly from the list return there for Cancel X and Escape',()=>{
 for(const command of ['create-product','edit-product','stock-product'])for(const method of ['cancel','x','escape']){
  const p=productPreview(),opener={dataset:{action:'ui-operations',uiCommand:command,uiSection:'products',uiId:command==='create-product'?'':'product-2'},isConnected:true,focus(){p.dom.activeElement=this;}};
  p.dom.activeElement=opener;p.ui.action(opener.dataset,opener);
  if(method==='escape')p.ui.keyboard({key:'Escape',preventDefault(){}});
  else {const cancel=p.modalButtons().find(button=>button.text===(method==='x'?'×':'Cancel'));p.ui.action(cancel.dataset,cancel);}
  assert.equal(p.ui.isOpen,false,command+' '+method);assert.equal(p.html,'');assert.equal(p.dom.activeElement,opener);
  assert.match(p.ui.operations('products'),/Watercolour set/);assert.doesNotMatch(p.ui.operations('products'),/Sketchbook A4/);
 }
});
test('the presentation host opens staff permissions and validates edits without a business client',()=>{
 const p=preview();assert.match(p.ui.directory(),/Maya Lam|Leo Chan/);
 p.ui.action({action:'ui-staff',uiCommand:'open-edit',uiId:'leo'});assert.match(p.html,/Edit staff profile/);assert.equal(p.ui.isOpen,true);
 assert.equal(p.ui.submit({id:'ui-staff-form',dataset:{uiForm:'edit'},values:{displayName:'',hourlyRate:'100'}}),true);assert.match(p.html,/Enter a display name/);
 p.ui.submit({id:'ui-staff-form',dataset:{uiForm:'edit'},values:{displayName:'Leo Preview',hourlyRate:'250'}});assert.match(p.ui.directory(),/Leo Preview/);assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
});
test('lesson previews keep the selected student and switch request kind without changing shared lessons',()=>{
 const p=preview();p.ui.openLesson('student-request',{student:{displayName:'<Chloe>'},lesson:{courseName:'Painting',date:'2026-10-16',time:'13:00'}});assert.match(p.html,/&lt;Chloe&gt;/);assert.doesNotMatch(p.html,/<Chloe>/);
 p.ui.action({action:'ui-lesson',uiCommand:'request-type',uiId:'sick'});assert.match(p.html,/Apply for Sick Leave/);
 p.ui.submit({id:'ui-lesson-form',dataset:{uiCommand:'review'},values:{requestType:'sick',reason:'Feeling unwell'}});assert.match(p.html,/Feeling unwell/);assert.match(p.html,/Review request/);
 p.ui.action({action:'ui-lesson',uiCommand:'confirm-preview'});assert.match(p.html,/This preview has been updated|This interface preview has been updated/);
 let prevented=false;p.ui.keyboard({key:'Escape',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(p.html,'');assert.equal(p.ui.isOpen,false);
});
test('import and export buttons open complete review flows without parsing or uploading a file',()=>{
 const p=preview();p.ui.action({action:'ui-data-tools',uiCommand:'launch',uiView:'import',uiSection:'courses'});assert.match(p.html,/Choose a CSV or Excel file/);
 p.ui.submit({id:'ui-data-tools-form',values:{duplicates:'skip'},querySelector:()=>({files:[{name:'Class examples.csv'}]})});assert.match(p.html,/Class examples.csv/);assert.match(p.html,/Mapped field/);
 p.ui.action({action:'ui-data-tools',uiCommand:'complete'});assert.match(p.html,/Preview complete/);
 p.ui.action({action:'ui-data-tools',uiCommand:'close'});assert.equal(p.html,'');
});
test('export review uses every selected field and preserves omitted fields when returning to options',()=>{
 const p=preview();p.ui.action({action:'ui-data-tools',uiCommand:'launch',uiView:'export',uiSection:'students'});
 p.ui.submit({id:'ui-data-tools-form',values:{format:'Excel',range:'page',column:['name','level']}});
 assert.match(p.html,/Excel/);assert.match(p.html,/<td>Name<\/td>/);assert.match(p.html,/<td>Level<\/td>/);assert.doesNotMatch(p.html,/<td>Email<\/td>/);
 p.ui.action({action:'ui-data-tools',uiCommand:'back'});assert.match(p.html,/value="name"[^>]*checked/);assert.doesNotMatch(p.html,/value="email"[^>]*checked/);
});
test('receipt template application reads the selected template and keeps the current recipient',()=>{
 const p=preview();p.ui.action({action:'ui-operations',uiCommand:'receipt-email',uiId:'invoice-1'});
 const form={values:{formKind:'receipt-email',recordId:'invoice-1',recipientEmail:'retained@example.test',templateId:'email-template-2',attachmentName:'current.pdf',subject:'Earlier subject',body:'Earlier body'}};
 p.ui.action({action:'ui-operations',uiCommand:'apply-email-template',uiId:'invoice-1'},{closest:()=>form});
 assert.match(p.html,/retained@example.test/);assert.match(p.html,/Beamal lesson reminder/);assert.doesNotMatch(p.html,/value="Earlier subject"/);assert.match(p.html,/current.pdf/);
});
test('teacher follow-up opens the task’s student and lesson rather than an unrelated default',()=>{
 const p=preview();p.ui.action({action:'ui-staff',uiCommand:'workflow',uiView:'arrange',uiId:'task-chloe'});
 assert.match(p.html,/Chloe Ho/);assert.match(p.html,/Make Up This Class/);assert.match(p.html,/2026-10-16/);
});
test('a selected family member sick-leave action retains that member and its specified lesson',()=>{
 const p=preview();p.ui.action({action:'ui-student',uiCommand:'select-student',uiId:'child-2'});
 p.ui.action({action:'ui-lesson',uiCommand:'launch',uiView:'student-request',uiRequestType:'sick',uiScheduleId:'example-schedule-2',uiSequence:'2',uiLessonDate:'2026-10-24',uiLessonTime:'10:30',uiCourseName:'Creative explorers'});
 assert.match(p.html,/Ethan Ho/);assert.match(p.html,/Apply for Sick Leave/);assert.match(p.html,/2026-10-24/);assert.match(p.html,/10:30/);assert.doesNotMatch(p.html,/Chloe Ho/);
});
test('family handoff keeps the new child details and direct enrollment choice',()=>{
 const p=preview();p.ui.openLesson('family');p.ui.action({action:'ui-lesson',uiCommand:'add-family'});
 p.ui.submit({id:'ui-lesson-form',dataset:{uiCommand:'review'},values:{displayName:'New child',dateOfBirth:'2020-06-08',route:'direct'}});
 p.ui.action({action:'ui-lesson',uiCommand:'confirm-preview'});assert.match(p.html,/Family member enrollment/);assert.match(p.html,/value="direct"[^>]*checked/);
 p.ui.submit({id:'ui-account-actions-form',dataset:{uiCommand:'next'},values:{route:'direct'}});
 p.ui.action({action:'ui-account-actions',uiCommand:'select-course',uiId:'example-drawing'});p.ui.action({action:'ui-account-actions',uiCommand:'select-slot',uiId:'example-slot-1'});
 p.ui.submit({id:'ui-account-actions-form',dataset:{uiCommand:'next'},values:{}});assert.match(p.html,/value="New child"/);assert.match(p.html,/value="2020-06-08"/);
});
test('order document previews use the current amount and version without contaminating accounting samples',()=>{
 const p=preview(),order={id:'OWN-ORDER-V7',studentId:'own-child',studentName:'Own family',amountCents:12345,version:7,paymentStatus:'awaiting-payment',updatedAt:'2026-10-15T08:00:00Z',items:[{courseName:'Own art course'}]},before=JSON.stringify(order);
 p.ui.openOrderDocument(order);assert.match(p.html,/Own family/);assert.match(p.html,/123\.45/);assert.match(p.html,/Order version 7/);assert.match(p.html,/Balance due/);assert.match(p.html,/PDF not generated/);
 assert.doesNotMatch(p.ui.operations('accounting'),/OWN-ORDER-V7|Own family/);
 p.ui.action({action:'ui-operations',uiCommand:'receipt-options',uiId:order.id});assert.match(p.html,/Send by Email/);
 p.ui.action({action:'ui-operations',uiCommand:'receipt-save',uiId:order.id});p.ui.submit({id:'ui-operations-form',values:{formKind:'receipt-save',recordId:order.id,filename:'own-preview.pdf',paperSize:'A4'}});assert.match(p.html,/has not been generated/);
 assert.equal(JSON.stringify(order),before);
});

function sharedStaffSnapshot(){return {ready:true,today:'2026-10-15',currentTime:'12:30',user:{id:'account-actual',role:'teacher',displayName:'Actual teacher',accessRevision:'access-1'},resources:[{id:'resource-actual',kind:'teacher',displayName:'Actual teacher'},{id:'actual-room',kind:'room',displayName:'Actual room'}],courses:[{id:'actual-course',courseName:'Actual art course'}],accounts:[],teacherLinks:[],occurrences:[{date:'2026-10-16',sequence:4,item:{id:'actual-schedule',course:'actual-course',time:'13:00',duration:60,capacity:10,teacherIds:['resource-actual'],roomIds:['actual-room']}}],rosters:new Map()};}

test('shared staff host refreshes the actual schedule and opens its stable occurrence through the business callback',()=>{
 let snapshot=sharedStaffSnapshot(),opened=null;const p=preview({sharedSnapshot:()=>snapshot,onOpenStaffLesson:lesson=>opened=lesson});
 let html=p.ui.teacherPortal();assert.match(html,/Actual teacher/);assert.match(html,/Actual art course/);assert.match(html,/Actual room/);assert.doesNotMatch(html,/Chloe Ho|Sophie|Leo Chan/);
 snapshot.occurrences[0].item.time='15:15';snapshot.resources[1].displayName='Updated room';html=p.ui.teacherPortal();assert.match(html,/15:15/);assert.match(html,/Updated room/);
 p.ui.action({action:'ui-staff',uiCommand:'open-class',uiId:'actual-schedule:4'});
 assert.deepEqual(opened,{scheduleId:'actual-schedule',sequence:4,date:'2026-10-16'});assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
 opened=null;snapshot.occurrences=[];p.ui.action({action:'ui-staff',uiCommand:'open-class',uiId:'actual-schedule:4'});assert.equal(opened,null);
});

test('shared staff edit and add actions use actual resource management and leave no independent profile copy',()=>{
 const snapshot=sharedStaffSnapshot(),edits=[],p=preview({sharedSnapshot:()=>snapshot,onEditStaff:record=>edits.push(record)});
 p.ui.action({action:'ui-staff',uiCommand:'open-edit',uiId:'resource-actual'});
 p.ui.action({action:'ui-staff',uiCommand:'open-edit',uiId:'new'});
 p.ui.action({action:'ui-staff',uiCommand:'open-edit',uiId:'unrelated-id'});
 assert.deepEqual(edits,[{resourceId:'resource-actual'},{resourceId:''}]);assert.equal(p.ui.isOpen,false);
 snapshot.resources[0].displayName='Teacher renamed in service';assert.match(p.ui.directory(),/Teacher renamed in service/);
});

test('shared loading never inherits fixtures while a null snapshot keeps the standalone preview',()=>{
 let snapshot={...sharedStaffSnapshot(),ready:false};const p=preview({sharedSnapshot:()=>snapshot});
 assert.match(p.ui.teacherPortal(),/Loading workspace/);assert.doesNotMatch(p.ui.directory(),/Maya Lam|Leo Chan|Chloe Ho/);
 snapshot=null;assert.match(p.ui.directory(),/Maya Lam/);
});

test('shared staff editing returns to the same person and tab with current service facts',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.resources.push({id:'second-teacher',kind:'teacher',displayName:'Second teacher'});
 let ticket;const current={t,role:'admin',staffViewKey:'/account:management'},p=preview({context:()=>current,sharedSnapshot:()=>snapshot,onEditStaff:(_record,back)=>ticket=back});
 p.ui.action({action:'ui-staff',uiCommand:'search',uiValue:'Second'});
 p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'second-teacher'});
 p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'second-teacher',uiTab:'teaching'});
 p.ui.action({action:'ui-staff',uiCommand:'open-edit',uiId:'second-teacher'});
 assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');assert.ok(ticket);
 snapshot.resources[2].displayName='Second teacher updated';
 assert.equal(p.ui.resumeStaffReturn(ticket),true);
 assert.match(p.html,/Second teacher updated/);assert.match(p.html,/data-ui-tab="teaching" aria-current="page"/);
 assert.doesNotMatch(p.html,/Actual teacher/);
 p.ui.action({action:'ui-staff',uiCommand:'close-dialog'});
 assert.match(p.ui.directory(),/value="Second"/);
 assert.equal(p.ui.resumeStaffReturn(ticket),false);
});

test('staff return tickets cannot restore a revoked, navigated or cleared profile',()=>{
 for(const change of ['identity','route','removed','clear','close']){
  const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';
  const current={t,role:'admin',staffViewKey:'staff'},tickets=[],p=preview({context:()=>current,sharedSnapshot:()=>snapshot,onEditStaff:(_record,ticket)=>tickets.push(ticket)});
  p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});
  p.ui.action({action:'ui-staff',uiCommand:'open-edit',uiId:'resource-actual'});
  if(change==='identity')snapshot.user.accessRevision='revoked';
  if(change==='route')current.staffViewKey='products';
  if(change==='removed')snapshot.resources=[];
  if(change==='clear')p.ui.clear();
  if(change==='close')p.ui.close();
  assert.equal(typeof p.ui.resumeStaffReturn,'function');
  assert.equal(p.ui.resumeStaffReturn(tickets[0]),false,change);assert.equal(p.ui.isOpen,false);
 }
});

test('shared staff retry calls the real reader and never creates a staff draft',()=>{
 let calls=0;const snapshot={...sharedStaffSnapshot(),ready:false,loading:false,error:'Unavailable'};
 const p=preview({sharedSnapshot:()=>snapshot,onRetryStaff:()=>calls++});
 assert.match(p.ui.directory(),/Retry/);p.ui.action({action:'ui-staff',uiCommand:'retry'});
 assert.equal(calls,1);assert.equal(p.ui.isOpen,false);assert.doesNotMatch(p.ui.directory(),/Actual teacher|No staff yet/);
 snapshot.loading=true;p.ui.action({action:'ui-staff',uiCommand:'retry'});assert.equal(calls,1);
});

test('administrator staff areas expose payroll and independent clock records with real unavailable states',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';const p=preview({sharedSnapshot:()=>snapshot});
 assert.match(p.ui.directory(),/data-ui-command="management-section"/);
 p.ui.action({action:'ui-staff',uiCommand:'management-section',uiTab:'payroll'});
 let html=p.ui.directory();assert.match(html,/type="month"/);assert.match(html,/Scheduled/);assert.match(html,/Actual/);assert.doesNotMatch(html,/Estimated total|HK\$0|pay-1/);
 p.ui.action({action:'ui-staff',uiCommand:'management-section',uiTab:'attendance'});
 html=p.ui.directory();assert.match(html,/Clock records/);assert.match(html,/data-ui-command="attendance-open-settings"/);assert.doesNotMatch(html,/In progress|Clock out<\/th>|4h 17m/);
});

test('salary settings review and cancel return to the chosen staff salary section without changing records',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.resources.push({id:'salary-second',kind:'teacher',displayName:'Second salary teacher'});
 const before=JSON.stringify(snapshot),p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot});
 p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'salary-second'});
 p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'salary-second',uiTab:'salary'});
 assert.match(p.html,/data-ui-command="payroll-open-salary"/);
 p.ui.action({action:'ui-payroll',uiCommand:'payroll-open-salary',uiId:'salary-second'});assert.match(p.html,/id="ui-payroll-form"/);assert.match(p.html,/Second salary teacher/);
 p.ui.submit({id:'ui-payroll-form',dataset:{uiCommand:'payroll-review-salary'},values:{salaryType:'monthly',monthlyBaseSalary:'18000',note:'Retain this exact draft'}});
 assert.match(p.html,/18,000/);assert.match(p.html,/disabled/);
 p.ui.action({action:'ui-payroll',uiCommand:'payroll-cancel'});assert.match(p.html,/value="18000"/);assert.match(p.html,/Retain this exact draft/);
 p.ui.keyboard({key:'Escape',preventDefault(){}});assert.match(p.html,/Second salary teacher/);assert.match(p.html,/data-ui-tab="salary" aria-current="page"/);
 assert.equal(JSON.stringify(snapshot),before);
});

test('an account or navigation change clears private payroll drafts and the old return context',()=>{
 for(const kind of ['identity','route']){
  const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';const current={t,role:'admin',staffViewKey:'staff'},p=preview({context:()=>current,sharedSnapshot:()=>snapshot});
  p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});
  p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'salary'});
  p.ui.action({action:'ui-payroll',uiCommand:'payroll-open-salary',uiId:'resource-actual'});
  p.ui.submit({id:'ui-payroll-form',dataset:{uiCommand:'payroll-review-salary'},values:{salaryType:'hourly',hourlyRate:'325',note:'Private salary draft'}});
  if(kind==='identity'){snapshot.user.accessRevision='new-access';snapshot.user.role='teacher';current.role='teacher';}else current.staffViewKey='products';
  p.ui.directory();assert.equal(p.ui.isOpen,false,kind);assert.equal(p.html,'');
  p.ui.action({action:'ui-payroll',uiCommand:'payroll-cancel'});assert.doesNotMatch(p.html,/Private salary draft|325/);
 }
});

test('detaching the shared staff source closes a private salary draft immediately',()=>{
 let snapshot=sharedStaffSnapshot();snapshot.user.role='admin';const p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot});
 p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});
 p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'salary'});
 p.ui.action({action:'ui-payroll',uiCommand:'payroll-open-salary',uiId:'resource-actual'});
 assert.match(p.html,/Salary settings/);snapshot=null;p.ui.directory();assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
});

test('an unrelated HR command cannot dismiss or replace the current staff profile',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';const p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot});
 p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});const before=p.html;
 p.ui.action({action:'ui-payroll',uiCommand:'payroll-save'});assert.equal(p.html,before);assert.equal(p.ui.isOpen,true);
});

test('native salary type input then change reveals the selected rate and keeps both salary drafts',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';const form={id:'ui-payroll-form',values:{salaryType:'hourly',hourlyRate:'330',note:'Keep note'}};
 const dom={activeElement:null,querySelector:selector=>selector==='#ui-payroll-form'?form:null,querySelectorAll:()=>[]};
 const p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot,dom});
 p.ui.action({action:'ui-payroll',uiCommand:'payroll-open-salary',uiId:'resource-actual'});
 const control={name:'salaryType',value:'hourly',dataset:{uiCommand:'payroll-salary-type'},closest:selector=>selector==='#ui-payroll-form'?form:null};
 p.ui.input(control);p.ui.change(control);assert.match(p.html,/name="hourlyRate"/);assert.match(p.html,/value="330"/);
 form.values={...form.values,salaryType:'monthly',monthlyBaseSalary:'18000'};control.value='monthly';p.ui.input(control);p.ui.change(control);
 assert.match(p.html,/name="monthlyBaseSalary"/);assert.match(p.html,/value="18000"/);assert.doesNotMatch(p.html,/name="hourlyRate"/);
 form.values={salaryType:'hourly',note:'Keep note'};control.value='hourly';p.ui.input(control);p.ui.change(control);assert.match(p.html,/value="330"/);assert.match(p.html,/Keep note/);
});

test('staff leave host exposes the administrator leave area without borrowing request fixtures or schedule totals',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';const before=JSON.stringify(snapshot),p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot});
 assert.match(p.ui.directory(),/data-ui-tab="leave"/);
 p.ui.action({action:'ui-staff',uiCommand:'management-section',uiTab:'leave'});
 const html=p.ui.directory();assert.match(html,/data-ui-command="leave-open-new"/);assert.match(html,/Leave records are not available yet/);assert.doesNotMatch(html,/Personal appointment|preview-leave|No leave records yet/);
 assert.equal(JSON.stringify(snapshot),before);
});

test('staff leave host returns a reviewed direct entry to the exact staff profile and preserves its draft',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.resources.push({id:'leave-second',kind:'teacher',displayName:'Second leave teacher'});
 const before=JSON.stringify(snapshot),p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot});
 p.ui.directory();p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'leave-second'});p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'leave-second',uiTab:'leave'});
 assert.match(p.html,/data-ui-command="leave-open-new"/);
 p.ui.action({action:'ui-leave',uiCommand:'leave-open-new',uiId:'leave-second'});assert.match(p.html,/id="ui-leave-form"/);assert.match(p.html,/Second leave teacher/);
 p.ui.submit({id:'ui-leave-form',dataset:{uiCommand:'leave-review-new'},values:{staffId:'leave-second',type:'compensation',from:'2026-10-23',to:'2026-10-24',startTime:'',endTime:'',reason:'Keep this exact leave draft'}});
 assert.match(p.html,/Keep this exact leave draft/);assert.match(p.html,/Second leave teacher/);assert.match(p.html,/data-ui-command="leave-register"[^>]*disabled/);
 p.ui.action({action:'ui-leave',uiCommand:'leave-cancel'});assert.match(p.html,/id="ui-leave-form"/);assert.match(p.html,/Keep this exact leave draft/);
 p.ui.keyboard({key:'Escape',preventDefault(){}});assert.match(p.html,/Second leave teacher/);assert.match(p.html,/data-ui-tab="leave" aria-current="page"/);assert.doesNotMatch(p.html,/Keep this exact leave draft/);
 assert.equal(JSON.stringify(snapshot),before);
});

test('staff leave host clears a private request on identity route or shared-source detachment',()=>{
 for(const reason of ['identity','route','detached']){
  let snapshot=sharedStaffSnapshot();snapshot.user.role='admin';const current={t,role:'admin',staffViewKey:'staff'},p=preview({context:()=>current,sharedSnapshot:()=>snapshot});
  p.ui.directory();p.ui.action({action:'ui-leave',uiCommand:'leave-open-new',uiId:'resource-actual'});assert.match(p.html,/id="ui-leave-form"/);
  p.ui.submit({id:'ui-leave-form',dataset:{uiCommand:'leave-review-new'},values:{staffId:'resource-actual',type:'sick',from:'2026-10-23',to:'2026-10-23',startTime:'',endTime:'',reason:'Private medical draft'}});assert.match(p.html,/Private medical draft/);
  if(reason==='identity')snapshot.user.accessRevision='changed-access';else if(reason==='route')current.staffViewKey='products';else snapshot=null;
  p.ui.directory();assert.equal(p.ui.isOpen,false,reason);assert.equal(p.html,'',reason);p.ui.action({action:'ui-leave',uiCommand:'leave-cancel'});assert.doesNotMatch(p.html,/Private medical draft/);
 }
});

test('staff work roster has an administrator area and explicit unknown source rather than teaching or fixture shifts',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';const before=JSON.stringify(snapshot),p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot});
 assert.match(p.ui.directory(),/data-ui-tab="roster"/);
 p.ui.action({action:'ui-staff',uiCommand:'management-section',uiTab:'roster'});
 p.ui.change({name:'teacherId',value:'resource-actual',dataset:{uiCommand:'roster-filter'},closest:()=>null});
 const html=p.ui.directory();assert.match(html,/name="teacherId"/);assert.match(html,/name="month"/);assert.match(html,/Roster.*not available|roster.*not available|Roster.*unavailable|roster.*unavailable/s);
 assert.doesNotMatch(html,/09:00.?20:00|4h 17m|No roster records/);assert.equal(JSON.stringify(snapshot),before);
});

test('staff profile work roster changes months without closing then returns a reviewed draft to the exact person and month',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.resources.push({id:'roster-second',kind:'teacher',displayName:'Second roster teacher'});
 const before=JSON.stringify(snapshot),p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot});
 p.ui.directory();p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'roster-second'});p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'roster-second',uiTab:'roster'});
 assert.match(p.html,/name="month"/);p.ui.change({name:'month',value:'2026-11',dataset:{uiCommand:'roster-filter'},closest:()=>null});assert.match(p.html,/value="2026-11"/);
 p.ui.action({action:'ui-roster',uiCommand:'roster-open-day',uiId:'2026-11-06'});assert.match(p.html,/Second roster teacher/);
 p.ui.action({action:'ui-roster',uiCommand:'roster-open-edit',uiId:'2026-11-06'});assert.match(p.html,/id="ui-roster-form"/);
 p.ui.submit({id:'ui-roster-form',dataset:{uiCommand:'roster-review'},values:{offDuty:'false',start1:'09:30',end1:'12:00',start2:'13:00',end2:'17:30',start3:'',end3:'',scope:'weekly',until:'2026-11-27',note:'Retain split shift draft'}});
 assert.match(p.html,/Retain split shift draft/);assert.match(p.html,/Second roster teacher/);assert.match(p.html,/disabled/);
 p.ui.action({action:'ui-roster',uiCommand:'roster-cancel'});assert.match(p.html,/Retain split shift draft/);assert.match(p.html,/value="09:30"/);
 p.ui.action({action:'ui-roster',uiCommand:'roster-cancel'});assert.match(p.html,/2026-11-06/);
 p.ui.keyboard({key:'Escape',preventDefault(){}});assert.match(p.html,/data-ui-tab="roster" aria-current="page"/);assert.match(p.html,/value="2026-11"/);assert.match(p.html,/Second roster teacher/);assert.equal(JSON.stringify(snapshot),before);
});

test('staff roster drafts close and cannot return after access revision route or source detachment',()=>{
 for(const reason of ['identity','route','detached']){
  let snapshot=sharedStaffSnapshot();snapshot.user.role='admin';const current={t,role:'admin',staffViewKey:'staff'},p=preview({context:()=>current,sharedSnapshot:()=>snapshot});
  p.ui.directory();p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'roster'});
  p.ui.action({action:'ui-roster',uiCommand:'roster-open-day',uiId:'2026-10-23'});p.ui.action({action:'ui-roster',uiCommand:'roster-open-edit',uiId:'2026-10-23'});assert.match(p.html,/id="ui-roster-form"/);
  p.ui.submit({id:'ui-roster-form',dataset:{uiCommand:'roster-review'},values:{offDuty:'true',scope:'day',note:'Private work roster draft'}});assert.match(p.html,/Private work roster draft/);
  if(reason==='identity')snapshot.user.accessRevision='changed-access';else if(reason==='route')current.staffViewKey='products';else snapshot=null;
  p.ui.directory();assert.equal(p.ui.isOpen,false,reason);assert.equal(p.html,'',reason);p.ui.action({action:'ui-roster',uiCommand:'roster-cancel'});assert.doesNotMatch(p.html,/Private work roster draft/);
 }
});

test('staff calendar sharing uses the fixed profile and honest unknown state then preserves review and cancel drafts',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.resources.push({id:'calendar-second',kind:'teacher',displayName:'Second calendar teacher'});
 const before=JSON.stringify(snapshot),p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot});p.ui.directory();
 p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'calendar-second'});p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'calendar-second',uiTab:'calendar-sharing'});
 assert.match(p.html,/Calendar sharing/);assert.match(p.html,/data-ui-command="calendar-sharing-open"/);assert.doesNotMatch(p.html,/https:\/\/.*calendar|Shared calendar is off/);
 p.ui.action({action:'ui-calendar-sharing',uiCommand:'calendar-sharing-open',uiId:'calendar-second'});assert.match(p.html,/id="ui-calendar-sharing-form"/);
 p.ui.submit({id:'ui-calendar-sharing-form',dataset:{uiCommand:'calendar-sharing-review'},values:{enabled:'true'}});assert.match(p.html,/Second calendar teacher/);assert.match(p.html,/disabled/);
 p.ui.action({action:'ui-calendar-sharing',uiCommand:'calendar-sharing-cancel'});assert.match(p.html,/<option value="true"[^>]*selected/);
 p.ui.keyboard({key:'Escape',preventDefault(){}});assert.match(p.html,/Second calendar teacher/);assert.match(p.html,/data-ui-tab="calendar-sharing" aria-current="page"/);assert.equal(JSON.stringify(snapshot),before);
});

test('staff calendar copying only uses the current canonical link and reports the actual callback result',async()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.calendarSharingReady=true;snapshot.calendarSharingRecords=[{staffId:'resource-actual',enabled:true,url:'https://calendar.example.test/current.ics'}];
 const copies=[],p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot,onCopyCalendarSharing:async details=>copies.push(details)});p.ui.directory();
 p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'calendar-sharing'});
 await p.ui.action({action:'ui-calendar-sharing',uiCommand:'calendar-sharing-copy',uiId:'wrong-person',uiUrl:'https://untrusted.example.test/forged'});
 assert.deepEqual(copies,[]);
 await p.ui.action({action:'ui-calendar-sharing',uiCommand:'calendar-sharing-copy',uiId:'resource-actual',uiUrl:'https://untrusted.example.test/forged'});
 assert.deepEqual(copies,[{staffId:'resource-actual',url:'https://calendar.example.test/current.ics'}]);assert.match(p.html,/copied/i);
 snapshot.calendarSharingRecords[0].enabled=false;await p.ui.action({action:'ui-calendar-sharing',uiCommand:'calendar-sharing-copy'});assert.equal(copies.length,1);
});

test('staff calendar copy completion cannot restore a message or private link after identity or profile navigation changed',async()=>{
 let finish;const wait=new Promise(resolve=>finish=resolve),snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.calendarSharingReady=true;snapshot.calendarSharingRecords=[{staffId:'resource-actual',enabled:true,url:'https://calendar.example.test/private.ics'}];
 const p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot,onCopyCalendarSharing:()=>wait});p.ui.directory();
 p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'calendar-sharing'});
 const pending=p.ui.action({action:'ui-calendar-sharing',uiCommand:'calendar-sharing-copy'});assert.doesNotMatch(p.html,/copied/i);
 snapshot.user.accessRevision='new-scope';p.ui.directory();finish();await pending;assert.equal(p.ui.isOpen,false);assert.doesNotMatch(p.html,/private\.ics|copied/i);
});

test('staff calendar copy completion remains cancelled after leaving and returning to the same profile or tab',async()=>{
 for(const navigation of ['tab','close']){
  let finish;const wait=new Promise(resolve=>finish=resolve),snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.calendarSharingReady=true;snapshot.calendarSharingRecords=[{staffId:'resource-actual',enabled:true,url:'https://calendar.example.test/current.ics'}];
  const p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot,onCopyCalendarSharing:()=>wait});p.ui.directory();p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'calendar-sharing'});
  const pending=p.ui.action({action:'ui-calendar-sharing',uiCommand:'calendar-sharing-copy'});
  if(navigation==='tab')p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'contact'});
  else {p.ui.close();p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});}
  p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'calendar-sharing'});finish();await pending;assert.doesNotMatch(p.html,/Link copied/);assert.match(p.html,/data-ui-tab="calendar-sharing" aria-current="page"/);
 }
});

test('staff calendar source changes invalidate pending copy even if its original link later returns',async()=>{
 let finish;const wait=new Promise(resolve=>finish=resolve),snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.calendarSharingReady=true;snapshot.calendarSharingRecords=[{staffId:'resource-actual',enabled:true,url:'https://calendar.example.test/original.ics'}];
 const p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot,onCopyCalendarSharing:()=>wait});p.ui.directory();p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'calendar-sharing'});
 const pending=p.ui.action({action:'ui-calendar-sharing',uiCommand:'calendar-sharing-copy'});
 snapshot.calendarSharingRecords[0].url='https://calendar.example.test/replacement.ics';p.ui.refreshSharedStaff();snapshot.calendarSharingRecords[0].url='https://calendar.example.test/original.ics';p.ui.refreshSharedStaff();finish();await pending;assert.doesNotMatch(p.html,/Link copied/);
});

test('staff personal details use a separate fixed-profile draft and preserve review back and cancel without writing scheduling or login records',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.resources.push({id:'personal-second',kind:'teacher',displayName:'Second personal teacher'});
 const before=JSON.stringify(snapshot),edited=[],p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot,onEditStaff:(...args)=>edited.push(args)});p.ui.directory();
 p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'personal-second'});
 assert.match(p.html,/data-ui-command="staff-profile-open"/);assert.match(p.html,/Personal details are not available yet/);assert.match(p.html,/Edit scheduling details/);
 p.ui.action({action:'ui-staff-profile',uiCommand:'staff-profile-open',uiId:'personal-second'});assert.match(p.html,/id="ui-staff-profile-form"/);
 p.ui.submit({id:'ui-staff-profile-form',dataset:{uiCommand:'staff-profile-review'},values:{fullName:'A second teacher',contactEmail:'second@example.test',phone:'55551234',gender:'unspecified',employment:'part-time',joined:'2026-10-12'}});
 assert.match(p.html,/Review personal details/);assert.match(p.html,/A second teacher/);assert.match(p.html,/not been saved/);
 p.ui.action({action:'ui-staff-profile',uiCommand:'staff-profile-cancel'});assert.match(p.html,/value="second@example.test"/);assert.match(p.html,/<option value="unspecified" selected/);
 p.ui.keyboard({key:'Escape',preventDefault(){}});assert.match(p.html,/Second personal teacher/);assert.match(p.html,/data-ui-tab="contact" aria-current="page"/);
 assert.doesNotMatch(p.html,/A second teacher|second@example\.test/);assert.deepEqual(edited,[]);assert.equal(JSON.stringify(snapshot),before);
});

test('staff personal sources stay separate from linked login email and a scope change removes an open private draft',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.staffProfileReady=true;snapshot.staffProfileRecords=[{staffId:'resource-actual',staffNumber:'002',contactEmail:'personal@example.test',fullName:'Canonical personal name'}];
 const p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot});p.ui.directory();p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});
 assert.match(p.html,/personal@example\.test/);assert.match(p.html,/Canonical personal name/);
 p.ui.action({action:'ui-staff-profile',uiCommand:'staff-profile-open',uiId:'resource-actual'});assert.match(p.html,/value="personal@example.test"/);assert.doesNotMatch(p.html,/name="staffNumber"/);
 snapshot.user.accessRevision='revoked-personal-access';p.ui.directory();assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
});

test('background staff loading and unrelated records leave the live personal form controls intact but a visible teacher update redraws',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';const p=preview({context:()=>({t,role:'admin',staffViewKey:'staff'}),sharedSnapshot:()=>snapshot});p.ui.directory();p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});p.ui.action({action:'ui-staff-profile',uiCommand:'staff-profile-open',uiId:'resource-actual'});
 const writes=p.modalWrites;snapshot.loading=true;assert.equal(p.ui.refreshSharedStaff(),true);assert.equal(p.modalWrites,writes,'A directory loading flag must not replace personal form input nodes');
 snapshot.loading=false;snapshot.resources[1].displayName='Unrelated room update';p.ui.refreshSharedStaff();assert.equal(p.modalWrites,writes);
 snapshot.resources[0].displayName='Updated selected teacher';p.ui.refreshSharedStaff();assert.equal(p.modalWrites,writes+1);assert.match(p.html,/Updated selected teacher/);
});

test('shared access summary remains factual during refresh and closes when account access changes',()=>{
 const snapshot=sharedStaffSnapshot();snapshot.user.role='admin';snapshot.accounts=[{id:'actual-teacher-account',role:'teacher'}];snapshot.teacherLinks=[{teacherResourceId:'resource-actual',userId:'actual-teacher-account'}];
 const p=preview({sharedSnapshot:()=>snapshot});p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'permissions'});
 snapshot.resources[1].displayName='Live room update';p.ui.teacherPortal();p.ui.action({action:'ui-staff',uiCommand:'noop'});
 assert.match(p.html,/Teachers can view their assigned lessons/);assert.doesNotMatch(p.html,/No access|data-ui-form="permissions"/);
 snapshot.user.accessRevision='access-2';p.ui.directory();assert.equal(p.html,'');assert.equal(p.ui.isOpen,false);
});

test('shared staff access action opens real settings for the stable resource and never falls back to local permission drafts',()=>{
 const snapshot=sharedStaffSnapshot(),managed=[];snapshot.user.role='admin';snapshot.accounts=[{id:'actual-teacher-account',role:'teacher'}];snapshot.teacherLinks=[{teacherResourceId:'resource-actual',userId:'actual-teacher-account'}];
 const p=preview({sharedSnapshot:()=>snapshot,onManageStaffAccess:record=>managed.push(record)});
 p.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});p.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'permissions'});
 assert.match(p.html,/Manage login and lesson access/);assert.doesNotMatch(p.html,/data-ui-command="open-permissions"[^>]*disabled/);
 p.ui.action({action:'ui-staff',uiCommand:'open-permissions',uiId:'resource-actual'});assert.deepEqual(managed,[{resourceId:'resource-actual'}]);assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
 p.ui.action({action:'ui-staff',uiCommand:'open-permissions',uiId:'missing-resource'});assert.equal(managed.length,1);
 const unavailable=preview({sharedSnapshot:()=>snapshot});unavailable.ui.action({action:'ui-staff',uiCommand:'open-detail',uiId:'resource-actual'});unavailable.ui.action({action:'ui-staff',uiCommand:'detail-tab',uiId:'resource-actual',uiTab:'permissions'});const before=unavailable.html;
 unavailable.ui.action({action:'ui-staff',uiCommand:'open-permissions',uiId:'resource-actual'});assert.equal(unavailable.html,before);assert.match(before,/data-ui-command="open-permissions"[^>]*disabled/);
 snapshot.user.role='teacher';p.ui.action({action:'ui-staff',uiCommand:'open-permissions',uiId:'resource-actual'});assert.equal(managed.length,1);
});

test('student lesson handoff resolves current family and session IDs after renaming, and rejects revoked or mismatched lessons',()=>{
 const current={t,role:'student',sharedMode:true,sharedIdentity:'["student-account","student","access-1"]',sharedReady:true,students:[{id:'person-one',displayName:'First actual child'},{id:'person-two',displayName:'Second actual child'}],lessons:[{id:'session-one',studentId:'person-one',scheduleId:'series-one',sequence:1,date:'2026-10-16',time:'12:00',duration:60,courseName:'First actual course'},{id:'session-two',studentId:'person-two',scheduleId:'series-two',sequence:2,date:'2026-10-17',time:'14:00',duration:60,courseName:'Second actual course'}]};
 const p=preview({context:()=>current});p.ui.action({action:'ui-student',uiCommand:'select-student',uiId:'person-two'});
 current.students[1].displayName='Second child renamed';current.lessons[1].time='15:00';
 let facts=p.ui.studentLessonFacts({uiStudentId:'person-two',uiScheduleId:'series-two',uiSequence:'2'});
 assert.equal(facts.student.displayName,'Second child renamed');assert.equal(facts.lesson.time,'15:00');
 facts=p.ui.studentLessonFacts({uiId:'session-two'});assert.equal(facts.student.id,'person-two');
 assert.equal(p.ui.studentLessonFacts({uiId:'session-two',uiStudentId:'person-one'}),null);
 assert.equal(p.ui.studentLessonFacts({uiId:'missing-session'}),null);
 p.ui.action({action:'ui-lesson',uiCommand:'launch',uiView:'student-request',uiId:'session-two',uiRequestType:'sick'});assert.match(p.html,/Second child renamed/);assert.match(p.html,/15:00/);
 p.ui.close();current.students=[current.students[0]];
 assert.equal(p.ui.studentLessonFacts({uiStudentId:'person-two',uiScheduleId:'series-two',uiSequence:'2'}),null);
 p.ui.action({action:'ui-lesson',uiCommand:'launch',uiView:'student-request',uiId:'session-two'});assert.equal(p.html,'');assert.equal(p.ui.isOpen,false);
 facts=p.ui.studentLessonFacts({});assert.equal(facts.student.id,'person-one');assert.equal(facts.lesson.scheduleId,'series-one');
 current.lessons=[];assert.equal(p.ui.studentLessonFacts({}),null);
});

test('shared student request host preserves typed fields and submits the reviewed request through its host callback',async()=>{
 const current={t,role:'student',sharedMode:true,sharedIdentity:'["student-account","student","access-1"]',sharedReady:true,students:[{id:'actual-child',displayName:'Actual child'}],lessons:[{id:'actual-session',studentId:'actual-child',scheduleId:'actual-series',sequence:4,date:'2026-11-07',time:'10:00',courseName:'Actual watercolour',teachers:[{displayName:'Actual teacher'}]}]};
 let form=null,submitted=null;const dom={activeElement:null,querySelector:selector=>selector==='#ui-lesson-form'?form:null,querySelectorAll:()=>[]},p=preview({context:()=>current,dom,onSubmitStudentRequest:async fields=>{submitted=fields;return {id:'request-actual-1'};}}),before=JSON.stringify(current);
 const facts=p.ui.studentLessonFacts({uiId:'actual-session'});assert.equal(facts.shared,true);assert.deepEqual(facts.requestCapabilities,{submit:true,upload:false});
 p.ui.action({action:'ui-lesson',uiCommand:'launch',uiView:'student-request',uiId:'actual-session'});
 form={values:{requestType:'reschedule',reason:'Reason typed before changing tab',preferredDate:'2026-11-14'}};
 p.ui.action({action:'ui-lesson',uiCommand:'request-type',uiId:'sick'});assert.match(p.html,/Reason typed before changing tab/);assert.match(p.html,/Supporting documents cannot be attached yet/);
 form={values:{requestType:'sick',reason:'Reason typed before changing tab'}};
 p.ui.action({action:'ui-lesson',uiCommand:'request-type',uiId:'reschedule'});assert.match(p.html,/value="2026-11-14"/);
 p.ui.submit({id:'ui-lesson-form',dataset:{uiCommand:'review'},values:{requestType:'reschedule',reason:'Reason typed before changing tab',preferredDate:'2026-11-14'}});form=null;assert.match(p.html,/Review request/);
 assert.match(p.html,/data-ui-command="submit-request"[^>]*>/);assert.doesNotMatch(p.html,/data-ui-command="submit-request"[^>]*disabled/);
 await p.ui.action({action:'ui-lesson',uiCommand:'submit-request'});
 assert.match(p.html,/Request submitted/);assert.equal(submitted.identity,current.sharedIdentity);assert.equal(submitted.studentSessionId,'actual-session');assert.equal(submitted.type,'reschedule');assert.equal(submitted.reason,'Reason typed before changing tab');assert.equal(submitted.preferredDate,'2026-11-14');
 assert.equal(JSON.stringify(current),before,'The UI passes the request to its host without mutating lesson or identity records itself');
 assert.equal(JSON.stringify(current),before);
});

test('shared request review retains rendered form values when the host can rebuild its root from the previous modal HTML',()=>{
 const current={t,role:'student',sharedMode:true,sharedIdentity:'["student-account","student","access-1"]',sharedReady:true,students:[{id:'actual-child',displayName:'Actual child'}],lessons:[{id:'actual-session',studentId:'actual-child',scheduleId:'actual-series',sequence:4,date:'2026-10-16',time:'13:30',courseName:'Actual drawing'}]};
 let modalHtml='',renderedHtml='',liveForm=null,mainPaints=0;
 const decode=value=>String(value||'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 const attributes=source=>Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,key,value])=>[key,decode(value)]));
 // Use controls parsed from the actual markup, rather than supplying form.values.
 // Replacing the host root recreates these controls from serialized defaults,
 // just as src.render() recreates #modal-root from its last modal string.
 const replaceRoot=html=>{
  renderedHtml=html;const match=html.match(/<form\b([^>]*)>([\s\S]*?)<\/form>/);
  if(!match){liveForm=null;return;}
  const attrs=attributes(match[1]);liveForm={id:attrs.id,dataset:{uiCommand:attrs['data-ui-command']},elements:[]};
  for(const field of match[2].matchAll(/<input\b([^>]*)>|<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/g)){
   const source=field[1]??field[2],attrs=attributes(source),form=liveForm;
   form.elements.push({name:attrs.name,type:attrs.type||'textarea',value:field[2]!==undefined?decode(field[3]):attrs.value||'',disabled:/\bdisabled\b/.test(source),closest:selector=>selector==='#ui-lesson-form'||selector==='form'?form:null});
  }
 };
 class Form{constructor(form){this.entries=form.elements.filter(control=>control.name&&!control.disabled).map(control=>[control.name,control.value]);}*[Symbol.iterator](){yield* this.entries;}}
 const dom={activeElement:null,querySelector:selector=>selector==='#ui-lesson-form'?liveForm:null,querySelectorAll:()=>[]};
 const ui=createInterfacePreview({context:()=>current,dom,Form,showModal:html=>{modalHtml=html;replaceRoot(html);},repaint:()=>{mainPaints++;replaceRoot(modalHtml);}});
 ui.action({action:'ui-lesson',uiCommand:'launch',uiView:'student-request',uiId:'actual-session'});
 const field=name=>liveForm.elements.find(control=>control.name===name);
 field('preferredDate').value='2026-10-23';ui.input(field('preferredDate'));
 field('reason').value='Prefer the following Friday afternoon.';ui.input(field('reason'));
 assert.deepEqual(Object.fromEntries(new Form(liveForm)),{requestType:'reschedule',preferredDate:'2026-10-23',reason:'Prefer the following Friday afternoon.'});
 ui.submit(liveForm);
 assert.match(renderedHtml,/Review request/);assert.match(renderedHtml,/Prefer the following Friday afternoon\./);assert.match(renderedHtml,/Preferred date: 2026-10-23/);assert.doesNotMatch(renderedHtml,/No additional details/);
 assert.equal(mainPaints,0,'Reviewing this unsaved request updates only its overlay, not the main page');
 ui.action({action:'ui-lesson',uiCommand:'back'});
 assert.equal(field('preferredDate').value,'2026-10-23');assert.equal(field('reason').value,'Prefer the following Friday afternoon.');
 // Clearing an optional value is still an intentional edit, not stale data.
 field('preferredDate').value='';field('reason').value='';ui.submit(liveForm);
 assert.match(renderedHtml,/No additional details/);assert.doesNotMatch(renderedHtml,/Preferred date:|Prefer the following Friday/);
});

test('an open shared student request closes when its session or family access disappears, including forged direct launches',()=>{
 for(const revoke of ['session','family','role','identity','missing-identity']){
  const current={t,role:'student',sharedMode:true,sharedIdentity:'["student-account","student","access-1"]',sharedReady:true,students:[{id:'actual-child',displayName:'Actual child'}],lessons:[{id:'actual-session',studentId:'actual-child',scheduleId:'actual-series',sequence:4,date:'2026-11-07',time:'10:00',courseName:'Actual watercolour'}]},p=preview({context:()=>current});
  p.ui.action({action:'ui-lesson',uiCommand:'launch',uiView:'student-request',uiId:'actual-session'});assert.equal(p.ui.isOpen,true);
  if(revoke==='session')current.lessons=[];if(revoke==='family')current.students=[];if(revoke==='role')current.role='teacher';if(revoke==='identity')current.sharedIdentity='["other-account","student","access-1"]';if(revoke==='missing-identity')current.sharedIdentity=null;
  p.ui.submit({id:'ui-lesson-form',dataset:{uiCommand:'review'},values:{reason:'A stale form'}});
  assert.equal(p.html,'',revoke);assert.equal(p.ui.isOpen,false,revoke);
 }
 const current={t,role:'student',sharedMode:true,sharedIdentity:'["student-account","student","access-1"]',sharedReady:true,students:[{id:'actual-child',displayName:'Actual child'}],lessons:[]},p=preview({context:()=>current});
 p.ui.openLesson('student-request',{student:{id:'other-child',displayName:'Unrelated child'},lesson:{id:'other-session',scheduleId:'other-series',sequence:1},shared:false});
 assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
 assert.equal(p.ui.action({action:'ui-lesson',uiCommand:'confirm-preview'}),true);assert.equal(p.html,'');
});

function studentRequestHarness(){
 const current={t,role:'student',sharedMode:true,sharedIdentity:'["student-account","student","access-1"]',sharedReady:true,students:[{id:'actual-child',displayName:'Actual child'}],lessons:[{id:'actual-session',studentId:'actual-child',scheduleId:'actual-series',sequence:4,date:'2026-11-07',time:'10:00',courseName:'Actual watercolour'}]};
 let form=null;const dom={activeElement:null,querySelector:selector=>selector==='#ui-lesson-form'?form:null,querySelectorAll:()=>[]},p=preview({context:()=>current,dom});
 const launch={action:'ui-lesson',uiCommand:'launch',uiView:'student-request',uiId:'actual-session'};p.ui.action(launch);
 return {current,p,launch,setForm:value=>form=value};
}

test('a temporary same-identity lesson refresh keeps unsaved DOM fields and blocks progress until revalidated',()=>{
 const h=studentRequestHarness(),{current,p}=h,students=current.students,lessons=current.lessons;
 h.setForm({values:{requestType:'reschedule',reason:'DOM draft not yet reviewed',preferredDate:'2026-11-14'}});
 current.sharedReady=false;current.students=[];current.lessons=[];
 p.ui.action({...h.launch,uiRequestType:'sick'});
 assert.equal(p.ui.isOpen,true);assert.match(p.html,/Updating lesson details/);assert.match(p.html,/DOM draft not yet reviewed/);
 assert.match(p.html,/Request Rescheduling/);assert.match(p.html,/value="2026-11-14"/);
 assert.match(p.html,/<fieldset[^>]*disabled/);assert.doesNotMatch(p.html,/Review request|This preview has been updated/);
 p.ui.submit({id:'ui-lesson-form',dataset:{uiCommand:'review'},values:{requestType:'sick',reason:'DOM draft not yet reviewed'}});
 assert.doesNotMatch(p.html,/Review request/);assert.match(p.html,/Request Rescheduling/);
 current.sharedError='Temporary read error';p.ui.action({action:'ui-lesson',uiCommand:'review'});assert.match(p.html,/Lesson details could not be updated/);assert.match(p.html,/DOM draft not yet reviewed/);
 current.sharedReady=true;current.sharedError='';current.students=students;current.lessons=lessons;h.setForm(null);
 p.ui.action({action:'ui-lesson',uiCommand:'review'});assert.match(p.html,/Review request/);assert.match(p.html,/DOM draft not yet reviewed/);assert.match(p.html,/2026-11-14/);assert.doesNotMatch(p.html,/Updating lesson details/);
});

test('keyboard recovery redraws waiting request controls after a successful same-identity refresh',()=>{
 const {current,p,setForm}=studentRequestHarness(),students=current.students,lessons=current.lessons;
 setForm({values:{requestType:'reschedule',reason:'Keyboard recovery draft'}});
 current.sharedReady=false;current.students=[];current.lessons=[];p.ui.action({action:'ui-lesson',uiCommand:'back'});
 assert.match(p.html,/Updating lesson details/);assert.match(p.html,/<fieldset[^>]*disabled/);
 current.sharedReady=true;current.students=students;current.lessons=lessons;setForm(null);
 p.ui.keyboard({key:'Tab',shiftKey:false,preventDefault(){}});
 assert.equal(p.ui.isOpen,true);assert.match(p.html,/Keyboard recovery draft/);assert.doesNotMatch(p.html,/Updating lesson details|<fieldset[^>]*disabled/);
 assert.doesNotMatch(p.html,/class="lw-button lw-primary" disabled>Next: review/);
});

test('the dedicated shared request refresh hook recovers without user input and closes confirmed revoked sessions',()=>{
 const {current,p,setForm}=studentRequestHarness(),students=current.students,lessons=current.lessons;
 setForm({values:{requestType:'reschedule',reason:'Background refresh draft',preferredDate:'2026-11-14'}});
 current.sharedReady=false;current.students=[];current.lessons=[];
 assert.equal(p.ui.refreshSharedStudentRequest(),true);assert.match(p.html,/Updating lesson details|Background refresh draft/);assert.match(p.html,/<fieldset[^>]*disabled/);
 current.sharedReady=true;current.students=students;current.lessons=lessons;setForm(null);
 assert.equal(p.ui.refreshSharedStudentRequest(),true);assert.match(p.html,/Background refresh draft/);assert.match(p.html,/2026-11-14/);
 assert.doesNotMatch(p.html,/Updating lesson details|<fieldset[^>]*disabled/);assert.doesNotMatch(p.html,/class="lw-button lw-primary" disabled>Next: review/);
 current.lessons=[];p.ui.refreshSharedStudentRequest();assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
 const standalone=preview();standalone.ui.openLesson('attendance');const html=standalone.html,writes=standalone.modalWrites;
 assert.equal(standalone.ui.refreshSharedStudentRequest(),false);assert.equal(standalone.html,html);assert.equal(standalone.modalWrites,writes);
});

test('unchanged shared request polls do not redraw or move focus and changed lesson details preserve scroll and text selection',()=>{
 const current={t,role:'student',sharedMode:true,sharedIdentity:'["student-account","student","access-1"]',sharedReady:true,students:[{id:'actual-child',displayName:'Actual child'}],lessons:[{id:'actual-session',studentId:'actual-child',scheduleId:'actual-series',sequence:4,date:'2026-11-07',time:'10:00',courseName:'Actual watercolour'}]};
 let p,writtenAt=0,focusCalls=0,selection=null;const oldBody={scrollTop:140,scrollLeft:8},newBody={scrollTop:0,scrollLeft:0},dialog={};
 const dom={activeElement:null,querySelector:selector=>selector==='#ui-lesson-form'?{values:{requestType:'reschedule',reason:'Draft kept across a timetable update'}}:selector==='#modal-root .lw-body'?(p.modalWrites>writtenAt?newBody:oldBody):null,querySelectorAll:()=>p.modalWrites>writtenAt?[newReason]:[oldReason]};
 const control=()=>({name:'reason',tagName:'TEXTAREA',dataset:{},selectionStart:6,selectionEnd:10,selectionDirection:'forward',closest:selector=>selector==='#modal-root .lw-dialog'?dialog:null,focus(){focusCalls++;dom.activeElement=this;},setSelectionRange(...values){selection=values;}}),oldReason=control(),newReason=control();
 p=preview({context:()=>current,dom});p.ui.action({action:'ui-lesson',uiCommand:'launch',uiView:'student-request',uiId:'actual-session'});writtenAt=p.modalWrites;dom.activeElement=oldReason;
 const paints=p.paints;
 p.ui.refreshSharedStudentRequest();assert.equal(p.modalWrites,writtenAt);assert.equal(focusCalls,0);assert.equal(dom.activeElement,oldReason);assert.equal(p.paints,paints);
 current.lessons=[{...current.lessons[0]}];current.students=[{...current.students[0]}];p.ui.refreshSharedStudentRequest();assert.equal(p.modalWrites,writtenAt);assert.equal(focusCalls,0);
 current.lessons[0].time='11:30';p.ui.refreshSharedStudentRequest();
 assert.equal(p.modalWrites,writtenAt+1);assert.match(p.html,/11:30/);assert.match(p.html,/Draft kept across a timetable update/);
 assert.equal(dom.activeElement,newReason);assert.equal(focusCalls,1);assert.deepEqual(selection,[6,10,'forward']);assert.equal(newBody.scrollTop,140);assert.equal(newBody.scrollLeft,8);assert.equal(p.paints,paints);
});

test('temporary refresh cannot retain a private request after same-role identity change or confirmed revocation on launch',()=>{
 for(const change of ['identity-during-loading','revoked-on-action-launch','revoked-on-direct-launch','revoked-on-account-launch']){
  const {current,p,launch}=studentRequestHarness();
  if(change==='identity-during-loading'){current.sharedReady=false;current.students=[];current.lessons=[];current.sharedIdentity='["another-student-account","student","access-1"]';}
  else {current.students=[];current.lessons=[];}
  if(change==='revoked-on-direct-launch')p.ui.openLesson('student-request',{student:{id:'actual-child'},lesson:{id:'actual-session'}});
  else if(change==='revoked-on-account-launch')p.ui.openAccount('activation');
  else p.ui.action(launch);
  assert.equal(p.ui.isOpen,false,change);assert.equal(p.html,'',change);
 }
});

test('shared students cannot open alternate lesson workflows through actions or direct calls while teacher previews still work',()=>{
 for(const direct of [false,true])for(const view of ['attendance','arrange','message','applicant','convert']){
  const {p,launch}=studentRequestHarness();
  if(direct)p.ui.openLesson(view,{student:{id:'actual-child'},lesson:{id:'actual-session'}});else p.ui.action({...launch,uiView:view});
  p.ui.action({action:'ui-lesson',uiCommand:'save-preview'});
  assert.match(p.html,/Request Rescheduling/);assert.doesNotMatch(p.html,/This preview has been updated|Preview complete|Attendance for this lesson/);
  p.ui.close();
  if(direct)p.ui.openLesson(view);else p.ui.action({...launch,uiView:view});
  assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
 }
 const teacher=preview();teacher.ui.openLesson('attendance');teacher.ui.submit({id:'ui-lesson-form',dataset:{uiCommand:'save-preview'},values:{attendance:'present'}});assert.match(teacher.html,/This preview has been updated/);
});
test('shared staff roster workflow actions cannot borrow a fixture for an unverified student session',()=>{
 for(const role of ['admin','teacher'])for(const view of ['attendance','arrange']){
  const p=preview({context:()=>({t,role,sharedMode:true,sharedIdentity:role+'-exact'})});
  p.ui.action({action:'ui-lesson',uiCommand:'launch',uiView:view,uiId:'actual-second-student-session'});
  assert.equal(p.html,'','Unverified shared session must not open a fixture');assert.equal(p.ui.isOpen,false);
  p.ui.submit({id:'ui-lesson-form',dataset:{uiCommand:'save-preview'},values:{attendance:'present'}});
  p.ui.action({action:'ui-lesson',uiCommand:'confirm-preview'});
  assert.equal(p.html,'');assert.doesNotMatch(p.html,/Chloe|Creative Drawing|Preview complete|This preview has been updated/);
 }
});
test('public shared staff lesson launch cannot trust caller-provided canonical-looking facts',()=>{
 for(const role of ['admin','teacher'])for(const view of ['attendance','arrange']){
  const identity=role+'-exact',p=preview({context:()=>({t,role,sharedMode:true,sharedIdentity:identity})});
  for(const facts of [{},{shared:true,sharedIdentity:identity,student:{id:'second-child',displayName:'Unverified second child'},lesson:{id:'actual-session',scheduleId:'actual-series',sequence:2,date:'2026-10-22',time:'15:00'},data:{students:[],slots:[],trialHistory:[]}}]){
   assert.equal(p.ui.openLesson(view,facts),false);assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
  }
 }
 const legacy=preview();legacy.ui.action({action:'ui-staff',uiCommand:'workflow',uiView:'arrange',uiId:'task-chloe'});assert.match(legacy.html,/Make Up This Class|2026-10-16/);
});

function productPaginationFocusHarness(){
 let ui,buttons=[],html='',modal='';const body={isConnected:true,focus(){dom.activeElement=this;}};const dom={activeElement:body,querySelector:s=>null,querySelectorAll:s=>s==='button'?buttons:[]};
 function repaint(){for(const button of buttons){if(dom.activeElement===button)dom.activeElement=body;button.isConnected=false;}html=ui.operations('products');buttons=[...html.matchAll(/<button\b([^>]*)>/g)].map(([,a])=>({isConnected:true,disabled:/\bdisabled\b/.test(a),dataset:Object.fromEntries([...a.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,k,v])=>[k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v])),focus(){if(!this.disabled)dom.activeElement=this;}}));}
 class Form{constructor(f){this.values=Object.entries(f.values||{});}*[Symbol.iterator](){yield* this.values;}}
 const records=Array.from({length:27},(_,i)=>({id:'page-product-'+i,nameZh:'產品 '+i,nameEn:'Product '+i,sku:'PAGE-'+i,price:1,stock:2,threshold:0,category:'materials',status:'active'}));
 ui=createInterfacePreview({context:()=>({t:(_,en)=>en,role:'admin',sharedMode:true,sharedIdentity:'pagination-admin',productsContext:{status:'ready',records,revision:'r1'}}),showModal:s=>modal=s,repaint,dom,Form});
 ui.action({action:'ui-operations',uiCommand:'apply-filters',uiSection:'products'},{closest:()=>({querySelectorAll:()=>[{name:'productPageSize',value:'10'}]})});
 return {ui,dom,body,get html(){return html},button:(command,value)=>buttons.find(b=>b.dataset.uiCommand===command&&(value===undefined||b.dataset.uiValue===value))};
}
test('independent product pagination retains a connected keyboard focus after going to the middle page',()=>{
 const p=productPaginationFocusHarness(),next=p.button('product-page','2');assert.ok(next&&!next.disabled);p.dom.activeElement=next;p.ui.action(next.dataset,next);assert.match(p.html,/Page 2 of 3/);assert.notEqual(p.dom.activeElement,p.body,'Removing the activated pagination button must restore focus to the equivalent enabled control or product list region');assert.equal(p.dom.activeElement.isConnected,true);
});
test('independent product pagination has a usable focus target at either end of the page range',()=>{
 const p=productPaginationFocusHarness();
 for(const page of ['2','3','2','1']){
  const button=p.button('product-page',page);assert.ok(button&&!button.disabled);p.dom.activeElement=button;p.ui.action(button.dataset,button);
  assert.match(p.html,new RegExp('Page '+page+' of 3'));assert.notEqual(p.dom.activeElement,p.body);assert.equal(p.dom.activeElement.isConnected,true);assert.notEqual(p.dom.activeElement.disabled,true,'A boundary page must not leave focus on disabled Previous or Next');
 }
});

function accountingHostHarness({today='2026-10-15',section:initialSection='accounting'}={}){
 let ui,modal='',main='',mainPaints=0,modalNodes=[],listNodes=[],modalForms=[],listForms=[],modalBody=null,section=initialSection,currentToday=today,conversationList={scrollTop:0,scrollLeft:0},messageHistory={scrollTop:0,scrollLeft:0};
 const page={isConnected:true,scrollTop:37,scrollLeft:0},table={isConnected:true,scrollTop:19,scrollLeft:83,getAttribute:()=> 'Accounting records'};
 const decode=value=>String(value??'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 const attributes=source=>Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,key,value])=>[key,decode(value)]));
 const dom={activeElement:null,body:{},scrollingElement:page,querySelector:selector=>{
  if(selector.includes('.ops-dialog-body'))return modalBody;
  if(selector.includes('.ops-conversation-list'))return conversationList;
  if(selector.includes('.ops-message-history'))return messageHistory;
  if(selector.includes('.ops-composer')&&selector.includes('textarea'))return listNodes.find(node=>node.name==='message')||null;
  if(selector==='#modal-root')return {innerHTML:modal};
  if(selector.includes('.ops-table'))return table;
  if(selector==='#ui-operations-form')return modalForms.find(form=>form.id==='ui-operations-form')||null;
  if(selector.includes('.ops-accounting-filters'))return selector.includes('[name=')?listNodes.find(node=>node.name===selector.match(/\[name=["']?([^"'\]]+)/)?.[1])||null:listForms.find(form=>form.className.includes('ops-accounting-filters'))||null;
  if(selector.includes('.dialog')&&selector.includes('button'))return modalNodes.find(node=>node.tagName==='BUTTON'&&!node.disabled)||null;
  return null;
 },querySelectorAll:selector=>selector.startsWith('#modal-root')?modalNodes:selector==='button'?[...listNodes,...modalNodes].filter(node=>node.tagName==='BUTTON'):selector.includes('.ops-accounting-filters')?listNodes.filter(node=>node.name||node.tagName==='BUTTON'):selector.includes('.ops-table')?[table]:[]};
 const parse=(html,inModal)=>{
  const forms=[...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)].map(match=>{const attr=attributes(match[1]);const form={id:attr.id||'',className:attr.class||'',dataset:Object.fromEntries(Object.entries(attr).filter(([key])=>key.startsWith('data-')).map(([key,value])=>[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),value])),start:match.index,end:match.index+match[0].length,isConnected:true,controls:[],matches:selector=>selector==='.ops-filters'&&(attr.class||'').split(' ').includes('ops-filters'),querySelectorAll:()=>form.controls.filter(node=>node.name)};form.closest=selector=>selector==='form'||selector.includes('.ops-accounting-filters')&&form.className.includes('ops-accounting-filters')||selector.includes('.ops-filters')&&form.className.includes('ops-filters')?form:null;return form;});
  const nodes=[...html.matchAll(/<(button|select|textarea)\b([^>]*)>([\s\S]*?)<\/\1>|<input\b([^>]*)>/g)].map(match=>{
   const tag=(match[1]||'input').toUpperCase(),raw=match[2]||match[4],attr=attributes(raw),form=forms.find(row=>row.start<=match.index&&row.end>match.index),options=tag==='SELECT'?[...match[3].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)]:[],selected=options.find(row=>/\bselected\b/.test(row[1]))||options[0];
   const node={tagName:tag,type:attr.type||(tag==='BUTTON'?'submit':tag==='SELECT'?'select-one':'text'),name:attr.name||'',value:tag==='TEXTAREA'?decode(match[3]):tag==='SELECT'?attributes(selected?.[1]||'').value??decode(selected?.[2]||''):attr.value||'',dataset:Object.fromEntries(Object.entries(attr).filter(([key])=>key.startsWith('data-')).map(([key,value])=>[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),value])),disabled:/\bdisabled\b/.test(raw),checked:/\bchecked\b/.test(raw),isConnected:true,form,selectionStart:0,selectionEnd:0,selectionDirection:'forward',setSelectionRange(start,end,direction='forward'){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;},getAttribute:key=>attr[key]??null,getClientRects:()=>[{}],focus(){if(this.isConnected&&!this.disabled)dom.activeElement=this;},closest:selector=>selector.includes('[hidden]')||selector.includes('fieldset')?null:selector==='form'||selector==='#ui-operations-form'?form||null:selector.includes('.ops-composer')&&!inModal?{dataset:{messageThreadId:attr['data-ui-id']},querySelector:()=>listNodes.find(node=>node.name==='message')||null}:selector.includes('.ops-accounting-filters')||selector.includes('.ops-filters')?form?.closest(selector)||null:inModal&&selector.includes('.dialog')?{}:null};
   form?.controls.push(node);return node;
  });return {forms,nodes};
 };
 const disconnect=nodes=>{for(const node of nodes){node.isConnected=false;if(dom.activeElement===node)dom.activeElement=dom.body;}};
 const replaceModal=html=>{disconnect([...modalNodes,...modalForms]);if(modalBody)modalBody.isConnected=false;modal=html;const parsed=parse(html,true);modalNodes=parsed.nodes;modalForms=parsed.forms;modalBody=html?{isConnected:true,scrollTop:0,scrollLeft:0}:null;};
 const mountMain=()=>{disconnect([...listNodes,...listForms]);main=ui.operations(section);conversationList={scrollTop:0,scrollLeft:0};messageHistory={scrollTop:0,scrollLeft:0};const parsed=parse(main,false);listNodes=parsed.nodes;listForms=parsed.forms;};
 const repaint=()=>{mainPaints++;mountMain();table.scrollTop=0;table.scrollLeft=0;page.scrollTop=0;replaceModal(modal);};
 class Form{constructor(form){this.entries=form.controls?form.controls.filter(node=>node.name&&!node.disabled&&(node.type!=='checkbox'||node.checked)).map(node=>[node.name,node.value]):Object.entries(form.values||{});}*[Symbol.iterator](){yield* this.entries;}}
 ui=createInterfacePreview({context:()=>({t,role:'admin',today:currentToday}),showModal:replaceModal,repaint,dom,Form});mountMain();
 const find=(command,id)=>[...modalNodes,...listNodes].find(node=>node.dataset.uiCommand===command&&(id===undefined||node.dataset.uiId===id));
 const clickNode=node=>{assert.ok(node&&!node.disabled,'A usable connected control must exist');node.focus();ui.action(node.dataset,node);return node;};
 const click=(command,id)=>clickNode(find(command,id));
 const field=name=>[...modalNodes,...listNodes].find(node=>node.name===name);
 const fill=values=>{for(const [name,value]of Object.entries(values)){const node=field(name);assert.ok(node,'The real '+name+' field must exist');node.value=value;}};
 return {ui,dom,page,table,click,clickNode,find,field,fill,get html(){return modal;},get main(){return main;},get body(){return modalBody;},get mainPaints(){return mainPaints;},get conversationList(){return conversationList;},get messageHistory(){return messageHistory;},get listNodes(){return listNodes;},get controls(){return modalNodes;},get filterForm(){return listForms.find(form=>form.className.includes('ops-accounting-filters'));},submit(values){fill(values);const form=modalForms[0];assert.ok(form);modalNodes.find(node=>node.type==='submit'&&node.tagName==='BUTTON')?.focus();ui.submit(form);},showSection(value){section=value;repaint();},setToday(value){currentToday=value;}};
}

test('accounting host Escape returns PDF options to the exact invoice and restores the parent control and scroll',()=>{
 const p=accountingHostHarness();p.click('view-invoice','invoice-2');assert.match(p.html,/INV-202610-002/);p.body.scrollTop=211;
 p.click('receipt-options','invoice-2');assert.match(p.html,/PDF Receipt/);const oldControl=p.find('receipt-save','invoice-2');assert.ok(oldControl.isConnected);
 p.ui.keyboard({key:'Escape',preventDefault(){}});
 assert.equal(p.ui.isOpen,true,'Escape from PDF options must return to its invoice instead of closing every layer');assert.match(p.html,/INV-202610-002/);assert.match(p.html,/<h2 id="ops-dialog-title">INV-202610-002<\/h2>/);assert.doesNotMatch(p.html,/<h2[^>]*>PDF Receipt<\/h2>|INV-202610-001/);assert.equal(oldControl.isConnected,false,'showModal must detach old controls');assert.equal(p.dom.activeElement.isConnected,true);assert.equal(p.dom.activeElement.dataset.uiCommand,'receipt-options');assert.equal(p.dom.activeElement.dataset.uiId,'invoice-2');assert.equal(p.body.scrollTop,211);
});

test('accounting host child steps and invalid receipt submissions keep the existing list mounted and scrolled',()=>{
 const p=accountingHostHarness();p.click('view-invoice','invoice-2');const paints=p.mainPaints,list=p.listNodes,opener=list.find(node=>node.dataset.uiCommand==='view-invoice'&&node.dataset.uiId==='invoice-2');p.table.scrollLeft=83;p.table.scrollTop=19;p.page.scrollTop=37;
 p.click('receipt-options','invoice-2');p.click('receipt-save','invoice-2');p.ui.submit({id:'ui-operations-form',dataset:{uiForm:'receipt-save'},values:{formKind:'receipt-save',recordId:'invoice-2',filename:'missing-extension',paperSize:'A4',documentLanguage:'en'}});
 assert.match(p.html,/ending in .pdf/);assert.equal(p.mainPaints,paints,'Receipt substeps and validation must update only the modal');assert.equal(p.listNodes,list);assert.equal(opener.isConnected,true);assert.equal(p.table.scrollLeft,83);assert.equal(p.table.scrollTop,19);assert.equal(p.page.scrollTop,37);
});

test('accounting host receipt previews return one parent at a time with the exact draft focus and body scroll',()=>{
 for(const branch of ['receipt-save','receipt-email'])for(const dismissal of ['Escape','X','Cancel','Back']){
  const p=accountingHostHarness(),opener=p.find('view-invoice','invoice-2');p.table.scrollLeft=91;p.table.scrollTop=22;p.page.scrollTop=318;p.click('view-invoice','invoice-2');const paints=p.mainPaints;p.body.scrollTop=211;p.click('receipt-options','invoice-2');p.body.scrollTop=88;p.click(branch,'invoice-2');p.body.scrollTop=55;
  const draft=branch==='receipt-save'?{filename:'Isla-specific.pdf',paperSize:'Letter',documentLanguage:'en'}:{recipientEmail:'isla.parent@example.test',templateId:'email-template-4',subject:'Isla October statement',body:'Please review this particular invoice.',attachmentName:'Isla-specific.pdf'};
  if(branch==='receipt-email'){p.fill(draft);p.click('apply-email-template','invoice-2');assert.equal(p.field('recipientEmail').value,draft.recipientEmail);assert.equal(p.field('attachmentName').value,draft.attachmentName);assert.equal(p.mainPaints,paints);}
  p.submit(draft);assert.match(p.html,branch==='receipt-save'?/<h2[^>]*>Save settings preview<\/h2>/:/<h2[^>]*>Receipt email preview<\/h2>/);const previewButton=p.controls.find(node=>node.dataset.uiCommand==='cancel-accounting');
  const dismiss=(preview=false)=>{if(dismissal==='Back'&&preview){p.click(branch,'invoice-2');return;}if(dismissal==='Escape'||dismissal==='Back')p.ui.keyboard({key:'Escape',preventDefault(){}});else{const controls=p.controls.filter(node=>node.dataset.uiCommand==='cancel-accounting');p.clickNode(dismissal==='X'?controls[0]:controls.at(-1));}};
  dismiss(true);assert.equal(previewButton.isConnected,false);assert.match(p.html,branch==='receipt-save'?/<h2[^>]*>Save receipt settings<\/h2>/:/<h2[^>]*>Receipt email settings<\/h2>/);for(const [name,value]of Object.entries(draft))assert.equal(p.field(name).value,value,branch+' '+dismissal+' '+name);assert.equal(p.body.scrollTop,55);assert.equal(p.dom.activeElement.isConnected,true);assert.equal(p.dom.activeElement.type,'submit');
  dismiss();assert.match(p.html,/<h2[^>]*>PDF Receipt<\/h2>/);assert.equal(p.body.scrollTop,88);assert.equal(p.dom.activeElement.dataset.uiCommand,branch);assert.equal(p.dom.activeElement.dataset.uiId,'invoice-2');
  dismiss();assert.match(p.html,/<h2[^>]*>INV-202610-002<\/h2>/);assert.equal(p.body.scrollTop,211);assert.equal(p.dom.activeElement.dataset.uiCommand,'receipt-options');assert.equal(p.dom.activeElement.dataset.uiId,'invoice-2');
  p.ui.keyboard({key:'Escape',preventDefault(){}});assert.equal(p.ui.isOpen,false);assert.equal(p.dom.activeElement,opener);assert.equal(opener.isConnected,true);assert.equal(p.table.scrollLeft,91);assert.equal(p.table.scrollTop,22);assert.equal(p.page.scrollTop,318);assert.equal(p.mainPaints,paints);
 }
});

test('accounting host force close discards every old receipt parent before another invoice is opened',()=>{
 const p=accountingHostHarness();p.click('view-invoice','invoice-2');p.click('receipt-options','invoice-2');p.click('receipt-save','invoice-2');p.submit({filename:'Old-private-draft.pdf',paperSize:'Letter',documentLanguage:'en'});assert.match(p.html,/Old-private-draft.pdf/);
 p.ui.close();assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');p.click('view-invoice','invoice-1');p.click('receipt-options','invoice-1');p.ui.keyboard({key:'Escape',preventDefault(){}});assert.match(p.html,/<h2[^>]*>INV-202610-001<\/h2>/);assert.doesNotMatch(p.html,/INV-202610-002|Old-private-draft/);p.ui.keyboard({key:'Escape',preventDefault(){}});assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');assert.equal(p.dom.activeElement.dataset.uiId,'invoice-1');
});

test('accounting host preserves period and query drafts across modes and applies the same form by button or Enter without filtering products',()=>{
 const p=accountingHostHarness();assert.match(p.main,/Applied period <strong><time>2026-10-01<\/time> – <time>2026-10-31<\/time>/);p.setToday('2027-02-01');p.showSection('accounting');assert.match(p.main,/Applied period <strong><time>2026-10-01<\/time> – <time>2026-10-31<\/time>/,'The host captures today at initialization rather than moving the applied period during later renders');
 const paints=p.mainPaints;p.fill({accountingMonth:'2026-11',accountingQuery:'Isla'});p.ui.input(p.field('accountingQuery'));assert.equal(p.mainPaints,paints);p.fill({accountingMode:'quarter'});p.ui.change(p.field('accountingMode'));assert.equal(p.field('accountingQuery').value,'Isla');assert.match(p.main,/Applied period <strong><time>2026-10-01<\/time> – <time>2026-10-31<\/time>/);
 p.fill({accountingYear:'2025',accountingQuarter:'2',accountingMode:'month'});p.ui.change(p.field('accountingMode'));assert.equal(p.field('accountingMonth').value,'2026-11');assert.equal(p.field('accountingQuery').value,'Isla');p.fill({accountingMode:'quarter'});p.ui.change(p.field('accountingMode'));assert.equal(p.field('accountingYear').value,'2025');assert.equal(p.field('accountingQuarter').value,'2');p.click('apply-filters');assert.match(p.main,/Applied period <strong><time>2025-04-01<\/time> – <time>2025-06-30<\/time>/);assert.match(p.main,/Search: Isla/);
 const entered=accountingHostHarness();entered.fill({accountingMode:'quarter'});entered.ui.change(entered.field('accountingMode'));entered.fill({accountingYear:'2025',accountingQuarter:'2',accountingQuery:'Isla'});entered.ui.submit(entered.filterForm);assert.equal(entered.main,p.main,'Enter and Apply must read the complete accounting form and produce the same applied view');
 p.fill({accountingMode:'custom'});p.ui.change(p.field('accountingMode'));p.fill({accountingFrom:'2026-12-31',accountingTo:'2026-01-01'});p.ui.submit(p.filterForm);assert.match(p.main,/End date must not precede start date/);assert.match(p.main,/Applied period <strong><time>2025-04-01<\/time> – <time>2025-06-30<\/time>/);
 p.showSection('products');for(const name of ['Sketchbook A4','Watercolour set','Creative toolkit','Studio apron'])assert.ok(p.main.includes(name),'Accounting drafts must not filter '+name);
});

test('accounting host order-document receipt Escape returns to its exact isolated document without adding it to the accounting list',()=>{
 const p=accountingHostHarness(),order={id:'OWN-ORDER-V9',studentId:'own-child',studentName:'Only this family',amountCents:12345,version:9,paymentStatus:'awaiting-payment',updatedAt:'2026-10-15T08:00:00Z',items:[{courseName:'Own enrolled art course'}]},before=JSON.stringify(order);
 p.ui.openOrderDocument(order);assert.match(p.html,/<h2[^>]*>OWN-ORDER-V9<\/h2>/);p.body.scrollTop=207;p.click('receipt-options',order.id);p.body.scrollTop=81;p.click('receipt-email',order.id);p.body.scrollTop=49;const draft={recipientEmail:'own.family@example.test',subject:'Only this order',body:'Please review the specified order.',attachmentName:'own-order.pdf'};p.submit(draft);assert.match(p.html,/<h2[^>]*>Receipt email preview<\/h2>/);
 p.ui.keyboard({key:'Escape',preventDefault(){}});assert.match(p.html,/<h2[^>]*>Receipt email settings<\/h2>/);for(const [name,value]of Object.entries(draft))assert.equal(p.field(name).value,value);assert.equal(p.body.scrollTop,49);
 p.click('cancel-accounting');assert.match(p.html,/<h2[^>]*>PDF Receipt<\/h2>/);assert.equal(p.body.scrollTop,81);p.ui.keyboard({key:'Escape',preventDefault(){}});assert.match(p.html,/<h2[^>]*>OWN-ORDER-V9<\/h2>/);assert.match(p.html,/Only this family/);assert.doesNotMatch(p.html,/INV-202610-00[12]/);assert.equal(p.body.scrollTop,207);
 p.ui.close();assert.equal(p.ui.isOpen,false);assert.doesNotMatch(p.ui.operations('accounting'),/OWN-ORDER-V9|Only this family/);assert.equal(JSON.stringify(order),before);assert.equal(p.mainPaints,0);
});

const accountingInvoiceEntryDraft={studentId:'student-2',date:'2026-10-15',dueDate:'2026-10-22',discount:'5',notes:'Keep this invoice draft','itemName_line-1':'Individual art lesson','quantity_line-1':'2','unitPrice_line-1':'125'};

test('accounting entry add and remove harvest all unsent fields and keep the list mounted',()=>{
 const p=accountingHostHarness(),original=p.main,list=p.listNodes;
 p.click('create-invoice');assert.equal(p.field('studentId').value,'');p.fill(accountingInvoiceEntryDraft);
 const notes=p.field('notes'),controls=p.controls;notes.focus();p.ui.input(notes);
 assert.equal(p.field('notes'),notes,'Typing must not replace the active form');assert.equal(p.controls,controls);assert.equal(p.mainPaints,0);
 p.body.scrollTop=89;p.click('accounting-add-item');
 assert.equal(p.field('notes').value,accountingInvoiceEntryDraft.notes);assert.equal(p.field('quantity_line-1').value,'2');assert.equal(p.field('unitPrice_line-1').value,'125');
 const second=p.controls.filter(node=>node.name.startsWith('itemName_'))[1].name.slice(9);
 assert.equal(p.dom.activeElement.name,'itemName_'+second,'Add must focus the new item instead of leaving focus at a detached button');
 p.fill({['itemName_'+second]:'Temporary middle item',['quantity_'+second]:'3',['unitPrice_'+second]:'10'});p.click('accounting-add-item');
 const third=p.controls.filter(node=>node.name.startsWith('itemName_'))[2].name.slice(9);
 p.fill({['itemName_'+third]:'Keep the last item',['quantity_'+third]:'4',['unitPrice_'+third]:'7'});
 const remove=p.controls.find(node=>node.dataset.uiCommand==='accounting-remove-item'&&node.dataset.uiValue===second);p.clickNode(remove);
 assert.equal(p.field('itemName_'+second),undefined);assert.equal(p.field('itemName_'+third).value,'Keep the last item');assert.equal(p.field('notes').value,accountingInvoiceEntryDraft.notes);
 assert.equal(p.dom.activeElement.name,'itemName_'+third,'Remove must focus a surviving neighbouring item');assert.equal(p.dom.activeElement.isConnected,true);
 assert.equal(p.mainPaints,0);assert.equal(p.main,original);assert.equal(p.listNodes,list);assert.equal(p.body.scrollTop,89);
});

test('accounting entry Review and explicit Back preserve the form draft focus and scroll without adding a record',()=>{
 const p=accountingHostHarness(),original=p.main,list=p.listNodes;
 p.click('create-invoice');p.body.scrollTop=143;p.submit(accountingInvoiceEntryDraft);
 assert.match(p.html,/Review invoice/);assert.match(p.html,/Individual art lesson/);assert.match(p.html,/HK\$245\.00/);
 const final=p.controls.find(node=>node.dataset.uiCommand==='finalize-accounting-entry');assert.ok(final&&final.disabled);assert.equal(final.type,'button');
 assert.equal(p.mainPaints,0);assert.equal(p.main,original);assert.equal(p.listNodes,list);
 p.click('accounting-entry-back');assert.equal(p.field('notes').value,accountingInvoiceEntryDraft.notes);assert.equal(p.field('quantity_line-1').value,'2');
 assert.equal(p.body.scrollTop,143);assert.equal(p.dom.activeElement.type,'submit');assert.equal(p.dom.activeElement.isConnected,true);
 p.ui.keyboard({key:'Escape',preventDefault(){}});assert.equal(p.ui.isOpen,false);assert.equal(p.main,original);assert.equal(p.mainPaints,0);
});

test('accounting editing a specific invoice returns through its review and edit form to the unchanged original detail',()=>{
 const p=accountingHostHarness(),original=p.main;p.click('view-invoice','invoice-2');p.body.scrollTop=201;
 p.click('edit-invoice','invoice-2');p.body.scrollTop=75;p.submit(accountingInvoiceEntryDraft);
 assert.match(p.html,/Review invoice/);assert.match(p.html,/Individual art lesson/);
 p.ui.keyboard({key:'Escape',preventDefault(){}});assert.equal(p.field('notes').value,accountingInvoiceEntryDraft.notes);assert.equal(p.body.scrollTop,75);
 p.ui.keyboard({key:'Escape',preventDefault(){}});assert.match(p.html,/<h2[^>]*>INV-202610-002<\/h2>/);assert.match(p.html,/Mixed media course/);assert.doesNotMatch(p.html,/Individual art lesson/);
 assert.equal(p.body.scrollTop,201);assert.equal(p.dom.activeElement.dataset.uiCommand,'edit-invoice');assert.equal(p.dom.activeElement.dataset.uiId,'invoice-2');
 assert.equal(p.mainPaints,0);assert.equal(p.main,original);
});

test('accounting payment selection updates its draft without replacing the form and Review cannot create payment records',()=>{
 const p=accountingHostHarness(),original=p.main;p.click('accounting-tab','payments');const payments=p.main;
 p.click('record-payment');assert.equal(p.field('invoiceId').value,'');p.fill({invoiceId:'invoice-2',amount:'80',date:'2026-10-15',method:'fps',reference:'Isla-partial',note:'Only this invoice'});
 const selector=p.field('invoiceId'),controls=p.controls;selector.focus();p.ui.change(selector);assert.equal(p.field('invoiceId'),selector);assert.equal(p.controls,controls);
 const paints=p.mainPaints;p.submit({});assert.match(p.html,/Review payment record/);assert.match(p.html,/INV-202610-002/);assert.match(p.html,/Isla/);assert.doesNotMatch(p.html,/Chloe|INV-202610-001/);
 assert.equal(p.mainPaints,paints);assert.equal(p.main,payments);assert.ok(p.controls.find(node=>node.dataset.uiCommand==='finalize-accounting-entry')?.disabled);
 p.ui.action({action:'ui-operations',uiCommand:'finalize-accounting-entry',uiSection:'accounting'});assert.equal(p.main,payments);assert.equal(p.mainPaints,paints);
 p.click('accounting-entry-back');assert.equal(p.field('reference').value,'Isla-partial');p.ui.keyboard({key:'Escape',preventDefault(){}});assert.equal(p.main,payments);
 assert.match(original,/Invoices in period/);
});

test('live staff refresh retains typed leave reason focus selection and scroll on changed read-state',()=>{
 let snapshot={ready:true,loading:false,error:'',hasSavedData:true,today:'2026-10-15',user:{id:'typed-admin',role:'admin',displayName:'Admin',accessRevision:'scope-1'},resources:[{id:'exact-teacher',kind:'teacher',displayName:'Exact teacher',active:true}],courses:[],accounts:[],teacherLinks:[],occurrences:[],rosters:new Map()},html='',nodes=[],form=null,body=null;
 const dom={activeElement:null,querySelector:selector=>selector==='#ui-leave-form'?form:selector.includes('.ui-staff-dialog-body')?body:selector.includes('.dialog')&&selector.includes('button')?nodes.find(node=>node.tagName==='BUTTON'&&!node.disabled):null,querySelectorAll:selector=>selector.startsWith('#modal-root')?nodes:[]};
 class Form{constructor(form){this.entries=Object.entries(form.values); }*[Symbol.iterator](){yield* this.entries;}}
 const makeNode=(tagName,name,value,dataset={})=>({tagName,name,value,dataset,isConnected:true,disabled:false,selectionStart:0,selectionEnd:0,selectionDirection:'forward',closest:selector=>selector.includes('.dialog')?{}:null,focus(){if(this.isConnected)dom.activeElement=this;},setSelectionRange(start,end,direction){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;}});
 const showModal=value=>{for(const node of nodes){node.isConnected=false;if(dom.activeElement===node)dom.activeElement=null;}html=value;const reason=makeNode('TEXTAREA','reason',html.match(/<textarea name="reason"[^>]*>([\s\S]*?)<\/textarea>/)?.[1]||'');const close=makeNode('BUTTON','', '',{action:'ui-leave',uiCommand:'leave-cancel',uiId:''});nodes=html?[close,reason]:[];body=html?{scrollTop:0,scrollLeft:0}:null;form=html.includes('id="ui-leave-form"')?{dataset:{uiCommand:'leave-review-new'},values:{staffId:'exact-teacher',type:'annual',from:'2026-10-15',to:'2026-10-15',get reason(){return reason.value;}}}:null;};
 const ui=createInterfacePreview({context:()=>({t:(_zh,en)=>en,role:'admin',sharedMode:true,sharedIdentity:'typed-admin',staffViewKey:'management'}),sharedSnapshot:()=>snapshot,showModal,repaint(){},dom,Form});ui.directory();ui.action({action:'ui-staff',uiCommand:'open-leave',uiId:'exact-teacher'});assert.match(html,/id="ui-leave-form"/);
 const reason=nodes.find(node=>node.name==='reason');reason.value='Keep this exact typed explanation';reason.focus();reason.setSelectionRange(5,9,'backward');body.scrollTop=142;
 snapshot={...snapshot,ready:false,error:'Network update failed',hasSavedData:true,resources:[]};assert.equal(ui.refreshSharedStaff(),true);const next=nodes.find(node=>node.name==='reason');assert.equal(next.value,'Keep this exact typed explanation');assert.equal(body.scrollTop,142);assert.equal(dom.activeElement,next,'Changed read state must restore the focused textarea, not jump to the Close button');assert.deepEqual([next.selectionStart,next.selectionEnd,next.selectionDirection],[5,9,'backward']);
});

test('message host native and uncommitted inline drafts stay with exact conversations without remounting while typing',()=>{
 const p=accountingHostHarness({section:'messages'}),typed=p.field('message'),paints=p.mainPaints;typed.value='CHLOE NATIVE DRAFT';typed.focus();typed.setSelectionRange(2,7,'backward');assert.equal(p.ui.input(typed),true);assert.equal(p.mainPaints,paints);assert.equal(p.field('message'),typed);
 p.click('thread','thread-2');assert.equal(p.field('message').value,'');p.field('message').value='ISLA BEFORE INPUT EVENT';p.click('thread','thread-1');assert.equal(p.field('message').value,'CHLOE NATIVE DRAFT');p.click('thread','thread-2');assert.equal(p.field('message').value,'ISLA BEFORE INPUT EVENT');
 p.ui.action({action:'ui-operations',uiCommand:'preview-reply',uiId:'missing-thread',uiSection:'messages'});assert.equal(p.html,'');assert.doesNotMatch(p.main,/Example parent/);
});
test('message host reply Back and Escape return to exact inline draft focus selection and all original scroll positions',()=>{
 const p=accountingHostHarness({section:'messages'});p.click('thread','thread-2');const reply=p.field('message');reply.value='EXACT ISLA REPLY';reply.setSelectionRange(3,8,'backward');p.page.scrollTop=173;p.page.scrollLeft=6;p.conversationList.scrollTop=51;p.conversationList.scrollLeft=3;p.messageHistory.scrollTop=219;
 p.click('preview-reply','thread-2');assert.match(p.html,/Isla’s parent/);assert.match(p.html,/EXACT ISLA REPLY/);assert.doesNotMatch(p.html,/Chloe’s parent/);p.click('message-back','thread-2');assert.equal(p.html,'');assert.equal(p.field('message').value,'EXACT ISLA REPLY');assert.equal(p.dom.activeElement,p.field('message'));assert.deepEqual([p.field('message').selectionStart,p.field('message').selectionEnd,p.field('message').selectionDirection],[3,8,'backward']);assert.deepEqual([p.page.scrollTop,p.page.scrollLeft,p.conversationList.scrollTop,p.conversationList.scrollLeft,p.messageHistory.scrollTop],[173,6,51,3,219]);
 p.click('preview-reply','thread-2');p.ui.keyboard({key:'Escape',preventDefault(){}});assert.equal(p.html,'');assert.equal(p.dom.activeElement,p.field('message'));assert.equal(p.messageHistory.scrollTop,219);
});
test('message host compose native drafts Review Escape and Cancel retain recipient fields form focus and original list',()=>{
 const p=accountingHostHarness({section:'messages'});p.page.scrollTop=181;p.conversationList.scrollTop=47;p.messageHistory.scrollTop=211;p.click('compose');p.fill({recipient:'thread-2',subject:'Exact subject',message:'COMPOSE NATIVE DRAFT'});const body=p.body,field=p.field('message');field.focus();field.setSelectionRange(1,6);p.ui.input(field);assert.equal(p.body,body);assert.equal(p.field('message'),field);p.body.scrollTop=137;
 p.submit({});assert.match(p.html,/Isla’s parent/);assert.match(p.html,/COMPOSE NATIVE DRAFT/);p.ui.keyboard({key:'Escape',preventDefault(){}});assert.match(p.html,/Compose message/);assert.equal(p.field('recipient').value,'thread-2');assert.equal(p.field('subject').value,'Exact subject');assert.equal(p.field('message').value,'COMPOSE NATIVE DRAFT');assert.equal(p.body.scrollTop,137);assert.equal(p.dom.activeElement?.type,'submit');
 p.field('message').value='UNCOMMITTED CANCELLED COMPOSE';p.ui.keyboard({key:'Escape',preventDefault(){}});assert.equal(p.html,'');assert.deepEqual([p.page.scrollTop,p.conversationList.scrollTop,p.messageHistory.scrollTop],[181,47,211]);p.click('compose');assert.equal(p.field('message').value,'UNCOMMITTED CANCELLED COMPOSE');assert.equal(p.field('recipient').value,'thread-2');
});
test('message host invalid Compose submission keeps the actual form draft position and Cancel harvests it',()=>{
 const p=accountingHostHarness({section:'messages'}),opener=p.find('compose');p.clickNode(opener);p.fill({recipient:'',subject:'Keep the unfinished subject',message:'Keep this unfinished message'});p.body.scrollTop=167;p.submit({});
 assert.match(p.html,/Choose a recipient/);assert.equal(p.body.scrollTop,167);assert.equal(p.dom.activeElement?.type,'submit');assert.equal(p.field('subject').value,'Keep the unfinished subject');assert.equal(p.field('message').value,'Keep this unfinished message');
 p.field('message').value='RAW BEFORE CANCEL';p.clickNode(p.controls.filter(node=>node.dataset.uiCommand==='close').at(-1));assert.equal(p.html,'');assert.equal(p.dom.activeElement,opener);p.click('compose');assert.equal(p.field('message').value,'RAW BEFORE CANCEL');assert.equal(p.field('recipient').value,'');
});

test('shared public trial cannot enter the legacy account fixture without the canonical public controller',()=>{
 const p=preview({context:()=>({t,sharedMode:true,role:'',sharedIdentity:null})});
 assert.equal(p.ui.openAccount('trial-application'),false);assert.equal(p.html,'');
 p.ui.action({action:'ui-account-actions',uiCommand:'launch',uiView:'trial-application',uiCourseId:'arbitrary',uiId:'arbitrary-slot'});assert.equal(p.html,'');
});

function recordableAttendancePreview(write){
 const calls=[];const p=canonicalRosterPreview({onSaveSharedAttendance:async(...args)=>{calls.push(args);return write(...args);}});p.facts.capabilities.save=true;p.facts.lesson.sessionVersion=1;
 p.ui.openSharedLesson('attendance',{sessionId:'actual-session'});p.ui.submit({id:'shared-lesson-workflow-form',values:{attendance:'sick',remark:' 原文\n<keep> ',sticker:'blue',showRemark:'yes'}});
 return {...p,get html(){return p.html;},get modalWrites(){return p.modalWrites;},calls};
}
const attendanceAck=payload=>({session:{id:payload.sessionId,studentId:'actual-person',scheduleId:'actual-schedule',sequence:7,courseId:'actual-course',version:2,sourceVersion:3,attendance:payload.attendance,remark:payload.remark,stickerColor:payload.sticker,showRemark:payload.showRemark}});
test('a verified shared attendance review calls the host once and returns the exact lesson only after acknowledgement',async()=>{
 const p=recordableAttendancePreview(async payload=>attendanceAck(payload));await p.ui.action({action:'ui-shared-lesson',uiCommand:'save'});assert.equal(p.calls.length,1);assert.deepEqual(p.calls[0][0],{sessionId:'actual-session',version:1,sourceVersion:3,attendance:'sick',remark:' 原文\n<keep> ',sticker:'blue',showRemark:true});assert.equal(p.calls[0][1].returnTicket,p.ticket);assert.ok(p.calls[0][1].operationKey);assert.equal(p.ui.isOpen,false);assert.equal(p.returns.at(-1).settings.restore,true);
});
test('pending shared attendance blocks repeated save Back Close and Escape, then preserves the draft after a connection failure',async()=>{
 let reject;const gate=new Promise((_yes,no)=>reject=no),p=recordableAttendancePreview(()=>gate),pending=p.ui.action({action:'ui-shared-lesson',uiCommand:'save'});await p.ui.action({action:'ui-shared-lesson',uiCommand:'save'});p.ui.action({action:'ui-shared-lesson',uiCommand:'back'});p.ui.close();p.ui.keyboard({key:'Escape',preventDefault(){}});assert.equal(p.ui.isOpen,true);assert.equal(p.calls.length,1);reject(new Error('offline'));await pending;assert.match(p.html,/原文/);assert.match(p.html,/offline|Could not/);assert.equal(p.returns.length,0);
});
test('shared attendance rejects known competing versions and wrong acknowledgements without a false successful return',async()=>{
 const p=recordableAttendancePreview(async payload=>attendanceAck(payload));p.facts.lesson.sessionVersion=2;p.ui.refreshSharedLesson();await p.ui.action({action:'ui-shared-lesson',uiCommand:'save'});assert.equal(p.calls.length,0);assert.equal(p.ui.isOpen,true);assert.match(p.html,/changed/);
 const bad=recordableAttendancePreview(async payload=>({session:{...attendanceAck(payload).session,id:'different-session'}}));await bad.ui.action({action:'ui-shared-lesson',uiCommand:'save'});assert.equal(bad.ui.isOpen,true);assert.equal(bad.returns.length,0);
});
test('late shared attendance acknowledgement cannot return to a different identity or route ticket',async()=>{
 let finish;const gate=new Promise(yes=>finish=yes),p=recordableAttendancePreview(()=>gate),pending=p.ui.action({action:'ui-shared-lesson',uiCommand:'save'});p.setContext({sharedIdentity:'another-account'});p.ui.refreshSharedLesson();finish(attendanceAck(p.calls[0]?.[0]||{}));await pending;assert.equal(p.ui.isOpen,false);assert.ok(p.returns.every(row=>row.settings.restore===false));
});

test('an annotation-only save keeps canonical unmarked attendance and does not invent a Present write',async()=>{
 const calls=[],p=canonicalRosterPreview({onSaveSharedAttendance:async(payload,options)=>{calls.push({payload,options});return {session:{...attendanceAck(payload).session,attendance:'unmarked'}};}});p.facts.capabilities.save=true;p.facts.lesson.sessionVersion=1;p.ui.openSharedLesson('attendance',{sessionId:'actual-session'});p.ui.submit({id:'shared-lesson-workflow-form',values:{remark:'Only a note',sticker:'blue',showRemark:'yes'}});assert.match(p.html,/Not marked/);await p.ui.action({action:'ui-shared-lesson',uiCommand:'save'});assert.equal(calls.length,1);assert.equal(Object.hasOwn(calls[0].payload,'attendance'),false);assert.equal(p.ui.isOpen,false);
});
test('lost attendance acknowledgement retries the original versions and key after a poll sees the committed row',async()=>{
 let count=0;const p=recordableAttendancePreview(async payload=>{if(++count===1)throw Object.assign(new Error('truncated'),{status:200,code:'service_unavailable'});return attendanceAck(payload);});await p.ui.action({action:'ui-shared-lesson',uiCommand:'save'});p.facts.lesson.sessionVersion=2;p.ui.refreshSharedLesson();await p.ui.action({action:'ui-shared-lesson',uiCommand:'save'});assert.equal(p.calls.length,2);assert.deepEqual(p.calls[0][0],p.calls[1][0]);assert.equal(p.calls[0][1].operationKey,p.calls[1][1].operationKey);assert.equal(p.ui.isOpen,false);
});
