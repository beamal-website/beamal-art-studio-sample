import test from 'node:test';
import assert from 'node:assert/strict';
import {getStudentPortalData,studentPortalPageMarkup,studentPortalDialogMarkup,advanceStudentPortal} from '../client/student-portal-ui.js';
const en={t:(_z,e)=>e};
test('four student workspaces are complete bilingual preview screens without external actions',()=>{for(const section of ['profile','requests','notifications','information']){const html=studentPortalPageMarkup(section,{},en);assert.match(html,/Interface preview/);assert.match(html,/data-action="ui-student"/);assert.doesNotMatch(html,/undefined|NaN|href="https?:|<img/);}assert.match(studentPortalPageMarkup('profile',{}, {t:z=>z}),/學生資料/);});
test('authorized student facts override fictional identity and absent registered fields remain unknown',()=>{const html=studentPortalPageMarkup('profile',{}, {...en,student:{id:'own',displayName:'Authorized Child',email:'own@example.test',dateOfBirth:null,phone:'',school:''}});assert.match(html,/Authorized Child/);assert.match(html,/own@example.test/);assert.doesNotMatch(html,/2017-04-18/);assert.match(html,/Registered details/);});
test('family selection keeps purchased remaining and historical packages separate',()=>{let state={data:getStudentPortalData(),selectedStudentId:'child-1'};const first=studentPortalPageMarkup('profile',state,en);state=advanceStudentPortal(state,'select-student',{id:'child-2'});const second=studentPortalPageMarkup('profile',state,en);assert.match(first,/Drawing foundations/);assert.match(first,/Completed courses/);assert.match(second,/Creative explorers/);assert.doesNotMatch(second,/Drawing foundations/);});
test('request filters and details show individual lesson status and reschedule sick request entry points',()=>{const html=studentPortalPageMarkup('requests',{requestFilter:'reschedule'},en);assert.match(html,/Request Rescheduling/);assert.match(html,/Apply for Sick Leave/);assert.match(html,/Pending review/);assert.doesNotMatch(html,/PREVIEW-PAY-001/);const detail=studentPortalDialogMarkup({dialog:{type:'request',id:'request-1'}},en);assert.match(detail,/2026-10-16/);assert.match(detail,/does not cancel the whole class/);});
test('shared student request details show the approved replacement lesson without preview-only wording',()=>{
 const request={id:'request-moved',reference:'LR-12345678',studentId:'student-1',type:'reschedule',status:'approved',lesson:{courseName:'Art course',date:'2026-10-16',time:'13:00'},assignedLesson:{courseName:'Art course',date:'2026-10-30',time:'15:00'},reason:'Family appointment',timeline:[{date:'2026-10-16',labelEn:'Request submitted'},{date:'2026-10-17',labelEn:'Moved to another class'}]};
 const html=studentPortalDialogMarkup({dialog:{type:'request',id:request.id}},{...en,sharedMode:true,sharedReady:true,students:[{id:'student-1',displayName:'Student One'}],studentRequests:[request]});
 assert.match(html,/Approved/);assert.match(html,/Assigned lesson/);assert.match(html,/2026-10-30 · 15:00/);assert.match(html,/No extra charge was added/);assert.match(html,/Moved to another class/);assert.doesNotMatch(html,/No actual request has been submitted/);
});
test('payment request review supports multiple items coupon breakdown and remains unpaid after preview submission',()=>{let state={data:getStudentPortalData(),dialog:{type:'payment-request'}};state=advanceStudentPortal(state,'submit',{formKind:'payment-request',requestKind:'renewal','item_drawing':'on','quantity_drawing':'1','item_sketchbook':'on','quantity_sketchbook':'1',note:'Example'});assert.equal(state.dialog.type,'payment-review');const html=studentPortalDialogMarkup(state,en);assert.match(html,/Original amount/);assert.match(html,/Coupon discount/);assert.match(html,/HK\$1,228.00/);state=advanceStudentPortal(state,'confirm-payment-request');assert.equal(state.data.requests.at(-1).status,'pending-approval');assert.equal(state.data.requests.at(-1).paid,false);assert.match(state.notice,/preview|預覽/i);});
test('payment detail separates FPS screenshot preview from verification and never invents a saved receipt',()=>{const html=studentPortalDialogMarkup({dialog:{type:'request',id:'request-3'}},en);assert.match(html,/Awaiting payment/);assert.match(html,/FPS/);assert.match(html,/Receipt not generated/);assert.match(html,/open-slip/);assert.doesNotMatch(html,/Download PDF|Payment successful/);let state=advanceStudentPortal({data:getStudentPortalData(),dialog:{type:'slip',id:'request-3'}},'submit',{formKind:'slip',recordId:'request-3',file:{name:'example-proof.png'}});assert.equal(state.data.requests.find(row=>row.id==='request-3').status,'awaiting-payment');assert.equal(state.data.requests.find(row=>row.id==='request-3').paid,false);assert.equal(state.dialog.type,'slip-preview');});
test('notifications distinguish system and teacher sender, detail and read states update preview only',()=>{let state={data:getStudentPortalData()};const page=studentPortalPageMarkup('notifications',state,en);assert.match(page,/System notifications/);assert.match(page,/Messages from teachers/);state=advanceStudentPortal(state,'notification',{id:'notice-2'});assert.equal(state.data.notifications.find(row=>row.id==='notice-2').read,true);const detail=studentPortalDialogMarkup(state,en);assert.match(detail,/Leo Chan/);assert.match(detail,/Message from/);state=advanceStudentPortal(state,'notification-filter',{id:'system'});assert.equal(state.notificationFilter,'system');});
test('information includes courses workshops competitions and useful details with preview enrollment entry',()=>{const html=studentPortalPageMarkup('information',{},en);assert.match(html,/Courses/);assert.match(html,/Workshops/);assert.match(html,/Competitions/);const detail=studentPortalDialogMarkup({dialog:{type:'information',id:'info-1'}},en);assert.match(detail,/Age/);assert.match(detail,/Lesson duration/);assert.match(detail,/request-payment/);});
test('reducer is pure and keeps invalid form fields visible with actionable errors',()=>{const state={data:getStudentPortalData(),dialog:{type:'payment-request'}},before=JSON.stringify(state),next=advanceStudentPortal(state,'submit',{formKind:'payment-request',note:'Keep this note'});assert.equal(JSON.stringify(state),before);assert.ok(next.error);assert.equal(next.dialog.values.note,'Keep this note');assert.match(studentPortalDialogMarkup(next,en),/role="alert"[^>]*>[^<]+/);});
test('all untrusted names descriptions messages and form values are escaped',()=>{const data=getStudentPortalData();data.students[0].displayName='<script>bad()</script>';data.notifications[0].bodyEn='<img src=x onerror=bad()>';assert.match(studentPortalPageMarkup('profile',{data},en),/&lt;script&gt;bad\(\)&lt;\/script&gt;/);const html=studentPortalDialogMarkup({data,dialog:{type:'notification',id:data.notifications[0].id}},en);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img|<script>/);});

test('teacher and administrator notifications use work records without student family switching or parent payment messages',()=>{for(const role of ['teacher','admin']){const state={data:getStudentPortalData(),role},html=studentPortalPageMarkup('notifications',state,{...en,role});assert.match(html,/System notifications/);assert.match(html,/Messages from teachers/);assert.doesNotMatch(html,/sp-family-bar|Chloe Ho|Ethan Ho|Payment request details confirmed/);assert.match(html,/work|Work|teaching|Teaching|team|Team/);const row=state.data.staffNotifications?.find(row=>row.role===role);assert.ok(row);const opened=advanceStudentPortal(state,'notification',{id:row.id});assert.equal(opened.data.staffNotifications.find(record=>record.id===row.id).read,true);assert.match(studentPortalDialogMarkup(opened,{...en,role}),/Fictional notification example/);}});
test('controller repeated item selections and slip filename metadata work without file access or payment verification',()=>{let state=advanceStudentPortal({data:getStudentPortalData(),dialog:{type:'payment-request'}},'submit',{formKind:'payment-request',items:['drawing','sketchbook'],quantity_drawing:'1',quantity_sketchbook:'1'});assert.equal(state.paymentDraft.items.length,2);assert.equal(state.paymentDraft.total,1228);state=advanceStudentPortal({data:getStudentPortalData(),dialog:{type:'slip',id:'request-3'}},'submit',{formKind:'slip',recordId:'request-3',filename:'example.pdf'});assert.equal(state.dialog.type,'slip-preview');assert.equal(state.data.requests.find(row=>row.id==='request-3').paid,false);assert.match(studentPortalDialogMarkup({dialog:{type:'slip',id:'request-3'}},en),/name="slip"/);});

const sharedChild={id:'d3000000-0000-4000-8000-000000000601',displayName:'何詠晴 Chloe Ho',kind:'student',version:1,dateOfBirth:'2017-04-18',school:'Beamal Primary',level:'Beginner'};
const sharedLesson={id:'session-chloe-1',studentId:sharedChild.id,studentName:sharedChild.displayName,scheduleId:'actual-schedule',sequence:1,courseId:'actual-course',courseName:'Creative Art',date:'2026-10-16',time:'13:00',duration:60,teachers:[{id:'teacher-leo',displayName:'陳子朗 Leo Chan'}],rooms:[{id:'room-a',displayName:'Studio A'}],attendance:'unmarked'};
const sharedContext=overrides=>({...en,role:'student',sharedMode:true,sharedReady:true,students:[sharedChild],student:sharedChild,lessons:[sharedLesson],...overrides});
test('shared student profile uses only explicitly linked people and current lessons without fixture claims',()=>{
 const state={data:getStudentPortalData(),selectedStudentId:'child-2'},html=studentPortalPageMarkup('profile',state,sharedContext());
 assert.match(html,/Chloe Ho/);assert.match(html,/Beamal Primary/);assert.doesNotMatch(html,/Current student|Lesson overview|Lesson arrangements|Creative Art|<svg|edit-profile/);
 assert.doesNotMatch(html,/Ethan Ho|child-1|child-2|Drawing foundations|Watercolour discoveries|family@example\.test|PREVIEW20|Example balances|Remaining 5 of 12|Interface preview/);
});
test('shared registered profile updates replace stale identity drafts and do not invent unavailable fields',()=>{
 const state={data:getStudentPortalData(),selectedStudentId:sharedChild.id};state.data.profileOverrides[sharedChild.id]={displayName:'Stale draft',school:'Old school'};
 const html=studentPortalPageMarkup('profile',state,sharedContext({students:[{...sharedChild,displayName:'Chloe Updated',school:'Updated school',level:'Intermediate',dateOfBirth:null}],student:{displayName:'Login fallback'}}));
 assert.match(html,/Chloe Updated/);assert.match(html,/Updated school/);assert.match(html,/Intermediate/);assert.doesNotMatch(html,/Stale draft|Old school|Login fallback|2017-04-18|family@example\.test|Mrs Ho/);
});
test('shared loading and unlinked states never fall back to independent sample children',()=>{
 for(const sharedReady of [false,true])for(const section of ['profile','requests','notifications','information']){
  const html=studentPortalPageMarkup(section,{data:getStudentPortalData()},sharedContext({sharedReady,students:[],student:{displayName:'Unlinked login'},lessons:[]}));
  assert.doesNotMatch(html,/Chloe Ho|Ethan Ho|Unlinked login|child-1|child-2|Drawing foundations|PREVIEW|Request to Pay/);
  assert.match(html,sharedReady?/No linked student profile/:/Loading your student details/);
 }
});
test('shared family selection follows stable person ids and filters each child’s lesson actions',()=>{
 const sibling={...sharedChild,id:'actual-sibling',displayName:'Actual sibling'},lesson={...sharedLesson,id:'session-sibling',studentId:sibling.id,courseName:'Sibling ceramics',scheduleId:'sibling-schedule'},context=sharedContext({students:[sharedChild,sibling],lessons:[sharedLesson,lesson]});
 const state=advanceStudentPortal({data:getStudentPortalData()},'select-student',{id:sibling.id},context);
 assert.equal(state.selectedStudentId,sibling.id);const html=studentPortalPageMarkup('requests',state,context);
 assert.match(html,/Sibling ceramics/);assert.match(html,/data-ui-schedule-id="sibling-schedule"/);assert.doesNotMatch(html,/Creative Art|actual-schedule|PREVIEW-PAY|Pending review/);
 assert.match(html,/data-ui-student-id="actual-sibling"/);
});
test('shared request and notification pages do not display unrelated independent histories or fake payment items',()=>{
 const context=sharedContext(),state={data:getStudentPortalData(),dialog:{type:'request',id:'request-3'}};
 const request=studentPortalPageMarkup('requests',state,context),notification=studentPortalPageMarkup('notifications',state,context),detail=studentPortalDialogMarkup(state,context);
 assert.match(request,/Creative Art/);assert.doesNotMatch(request+notification+detail,/PREVIEW-|Payment request details confirmed|HK\$1,228|pending-approval|paid-state/);
 const next=advanceStudentPortal(state,'request-payment',{},context);assert.equal(next.dialog,null);assert.ok(next.notice);
 assert.doesNotMatch(studentPortalPageMarkup('information',state,context),/Little ceramics studio|My little city|Weekend ceramics studio/);
});
test('shared student request history distinguishes loading, errors and a loaded empty history',()=>{
 const context=sharedContext({studentRequests:[],studentRequestsReady:false});
 assert.match(studentPortalPageMarkup('requests',{},context),/Loading request history/);
 const failed=studentPortalPageMarkup('requests',{}, {...context,studentRequestsError:'Request service unavailable'});
 assert.match(failed,/role="alert"/);assert.match(failed,/Request service unavailable/);assert.match(failed,/data-action="orders-refresh"/);
 const empty=studentPortalPageMarkup('requests',{}, {...context,studentRequestsReady:true});
 assert.match(empty,/You have not submitted any requests yet/);assert.doesNotMatch(empty,/Request history is not available yet/);
 const saved={id:'saved-request',studentId:sharedChild.id,type:'sick',status:'pending',createdAt:'2026-10-16',lesson:{date:'2026-10-16',time:'13:00',courseName:'Creative Art'}};
 assert.match(studentPortalPageMarkup('requests',{}, {...context,studentRequestsReady:true,studentRequests:[saved]}),/Creative Art/);
});

test('portfolio keeps student details without duplicating lesson arrangements',()=>{
 const state={data:getStudentPortalData(),selectedStudentId:sharedChild.id},moved={...sharedLesson,date:'2026-10-18',time:'15:30'};
 const before=studentPortalPageMarkup('profile',state,sharedContext()),after=studentPortalPageMarkup('profile',state,sharedContext({lessons:[moved]}));
 assert.equal(before,after);assert.match(after,/Chloe Ho/);assert.doesNotMatch(after,/Lesson arrangements|Lesson overview|Current student|data-ui-command="edit-profile"/);
});


test('a shared initial read failure shows escaped error and a real reload entry without a fictional family',()=>{
 for(const section of ['profile','requests','notifications','information']){
  const html=studentPortalPageMarkup(section,{data:getStudentPortalData()},sharedContext({sharedReady:false,students:[],lessons:[],sharedError:'Connection failed <script>bad()</script>'}));
  assert.match(html,/role="alert"/);assert.match(html,/Connection failed &lt;script&gt;bad\(\)&lt;\/script&gt;/);assert.match(html,/data-action="orders-refresh"/);assert.match(html,/>Retry<\/button>/);
  assert.doesNotMatch(html,/<script>|Loading your student details|No linked student profile|Chloe Ho|Ethan Ho|child-1|child-2/);
 }
});
test('a shared refresh error preserves last authorized profile and lessons while offering reload',()=>{
 const html=studentPortalPageMarkup('profile',{data:getStudentPortalData()},sharedContext({sharedError:'Could not refresh. Please retry.'}));
 assert.match(html,/role="alert"/);assert.match(html,/Could not refresh/);assert.match(html,/data-action="orders-refresh"/);assert.match(html,/Chloe Ho/);assert.match(html,/Beamal Primary/);
 assert.doesNotMatch(html,/Ethan Ho|Example balances|Drawing foundations|family@example\.test/);
});

test('lesson request entry points include every loaded authorized lesson beyond the first six in date and time order',()=>{
 const lessons=Array.from({length:9},(_,index)=>({...sharedLesson,id:'owned-'+index,scheduleId:'owned-schedule-'+index,sequence:index+1,date:'2026-10-'+String(16+Math.floor(index/2)).padStart(2,'0'),time:index%2?'15:00':'10:00',courseName:'Owned lesson '+index}));
 const sibling={...sharedChild,id:'sibling-id',displayName:'Sibling'},foreign={...sharedLesson,id:'other',studentId:sibling.id,scheduleId:'sibling-only',courseName:'Sibling only lesson'};
 const source=[...lessons].reverse().concat(foreign),context=sharedContext({students:[sharedChild,sibling],lessons:source}),before=JSON.stringify(source);
 for(const language of [en,{t:z=>z}]){
  const html=studentPortalPageMarkup('requests',{selectedStudentId:sharedChild.id},{...context,...language});
  assert.equal((html.match(/data-ui-request-type="reschedule"/g)||[]).length,9);
  assert.equal((html.match(/data-ui-request-type="sick"/g)||[]).length,9);
  for(let index=0;index<9;index++)assert.match(html,new RegExp('data-ui-schedule-id="owned-schedule-'+index+'"'));
  assert.doesNotMatch(html,/Sibling only lesson|sibling-only/);
  assert.ok(html.indexOf('Owned lesson 0')<html.indexOf('Owned lesson 1'));
  assert.ok(html.indexOf('Owned lesson 7')<html.indexOf('Owned lesson 8'));
 }
 assert.equal(JSON.stringify(source),before);
 const siblingHtml=studentPortalPageMarkup('requests',{selectedStudentId:sibling.id},context);
 assert.match(siblingHtml,/sibling-only/);assert.doesNotMatch(siblingHtml,/owned-schedule-/);
});

test('shared request lessons label their actual date window and provide the timetable date selection entry',()=>{
 for(const language of [en,{t:z=>z}]){
  const html=studentPortalPageMarkup('requests',{},sharedContext({...language,lessonWindow:{from:'2026-11-01',to:'2026-11-30'}}));
  assert.match(html,/<time datetime="2026-11-01">2026-11-01<\/time>/);
  assert.match(html,/<time datetime="2026-11-30">2026-11-30<\/time>/);
  assert.match(html,/data-tab="overview"/);
 }
 const unknown=studentPortalPageMarkup('requests',{},sharedContext({lessonWindow:{from:'<script>bad()</script>',to:'2026-11-30'}}));
 assert.doesNotMatch(unknown,/<script>|datetime="2026-11-30"/);
 assert.match(unknown,/Choose a specific lesson first/);
});
