import test from 'node:test';
import assert from 'node:assert/strict';
import {staffSharedState} from '../client/staff-shared-adapter.js';
import {staffInterfacePreviewState,staffDirectoryMarkup,staffPortalMarkup,staffDialogMarkup,advanceStaffPreview} from '../client/staff-portal-ui.js';

const en={t:(_zh,en)=>en};
function snapshot(){
  return {
    ready:true,today:'2026-10-15',currentTime:'12:20',user:{id:'user-admin',role:'admin',displayName:'Maya account',email:'admin@example.test',accessRevision:'scope-1'},
    resources:[...['maya','leo','ava','ethan'].map(name=>({id:`resource-${name}`,kind:'teacher',displayName:`Teacher ${name}`,active:true})),{id:'room-a',kind:'room',displayName:'Studio A',active:true}],
    courses:Array.from({length:6},(_,index)=>({id:`course-${index+1}`,courseName:`Art course ${index+1}`})),
    accounts:[{id:'user-admin',role:'admin',displayName:'Maya account'},{id:'user-teacher',role:'teacher',displayName:'Leo account'}],
    teacherLinks:[{teacherResourceId:'resource-maya',userId:'user-admin'},{teacherResourceId:'resource-leo',userId:'user-teacher'}],
    occurrences:[{sequence:1,date:'2026-10-16',item:{id:'schedule-maya',course:'course-1',time:'13:00',duration:60,teacherIds:['resource-maya'],roomIds:['room-a'],capacity:10}},{sequence:2,date:'2026-10-17',item:{id:'schedule-leo',course:'course-2',time:'14:00',duration:90,teacherIds:['resource-leo'],roomIds:['room-a'],capacity:12}}],
    rosters:new Map([['schedule-maya:1',{ready:true,capacity:10,occupied:2,students:[{id:'session-1',studentId:'student-chloe',displayName:'Chloe actual',attendance:'present'},{id:'session-2',studentId:'student-second',displayName:'Second student',attendance:'absent'}]}]]),
  };
}

test('calendar sharing and personal details require separate explicit sources and never borrow UI drafts or scheduling fields',()=>{
 const current=snapshot(),previous=staffSharedState({},current);
 Object.assign(previous,{calendarSharingReady:true,calendarSharingRecords:[{staffId:'resource-leo',enabled:true,url:'https://old.example.test/calendar'}],staffProfileReady:true,staffProfileRecords:[{staffId:'resource-leo',contactEmail:'old-private@example.test'}],calendarSharingUi:{records:[{staffId:'resource-leo',enabled:true}]},staffProfileUi:{records:[{staffId:'resource-leo',fullName:'Private stale record'}]}});
 const absent=staffSharedState(previous,current);assert.equal(absent.calendarSharingReady,false);assert.deepEqual(absent.calendarSharingRecords,[]);assert.equal(absent.staffProfileReady,false);assert.deepEqual(absent.staffProfileRecords,[]);
 const source={...current,calendarSharingReady:true,calendarSharingRecords:[{staffId:'resource-leo',enabled:false}],staffProfileReady:true,staffProfileRecords:[{staffId:'resource-leo',staffNumber:'002',contactEmail:'real@example.test'}]},before=JSON.stringify(source);
 const explicit=staffSharedState(previous,source);assert.equal(explicit.calendarSharingReady,true);assert.deepEqual(explicit.calendarSharingRecords,source.calendarSharingRecords);assert.equal(explicit.staffProfileReady,true);assert.deepEqual(explicit.staffProfileRecords,source.staffProfileRecords);assert.equal(JSON.stringify(source),before);
 for(const user of [{id:'student-user',role:'student'},{}]){const denied=staffSharedState(explicit,{...source,user});assert.equal(denied.calendarSharingReady,false);assert.deepEqual(denied.calendarSharingRecords,[]);assert.equal(denied.staffProfileReady,false);assert.deepEqual(denied.staffProfileRecords,[]);}
 const stale=staffSharedState(explicit,{...source,ready:false,hasSavedData:true});assert.equal(stale.calendarSharingReady,false);assert.deepEqual(stale.calendarSharingRecords,[]);assert.equal(stale.staffProfileReady,false);assert.deepEqual(stale.staffProfileRecords,[]);
});

test('staff and workspace use shared IDs, explicit account links, six real courses and actual roster attendance',()=>{
  const source=snapshot(),state=staffSharedState(staffInterfacePreviewState(),source);
  assert.equal(state.staff.length,4);
  assert.deepEqual(state.staff.map(row=>row.id),['resource-maya','resource-leo','resource-ava','resource-ethan']);
  assert.equal(state.staff.find(row=>row.id==='resource-maya').role,'admin');
  assert.equal(state.staff.find(row=>row.id==='resource-leo').accountName,'Leo account');
  assert.equal(state.viewerId,'user-admin');
  assert.deepEqual(state.classes.map(row=>row.id),['schedule-maya:1']);
  assert.equal(state.classes[0].occupied,2);
  assert.equal(state.classes[0].endTime,'14:00');
  assert.equal(state.classes[0].students[0].id,'student-chloe');
  assert.equal(state.classes[0].students[0].sessionId,'session-1');
  assert.equal(state.classes[0].students[1].attendance,'absent');
  assert.equal(source.rosters.get('schedule-maya:1').students[0].id,'session-1');
  const html=staffPortalMarkup({...state,portalTab:'class-schedule',today:'2026-10-16'},en);
  assert.match(html,/Today’s classes/);
  assert.match(html,/Art course 1/);
  assert.match(html,/Studio A/);
  assert.doesNotMatch(html,/2 students/);
  assert.match(staffPortalMarkup({...state,portalTab:'classes'},en),/2 students/);
  assert.doesNotMatch(html,/Art course 2|Sophie|Ryan|Noah|Mia Chan|Checkpoint|\(preview\)/);
  assert.doesNotMatch(staffDirectoryMarkup(state,en),/\[object Object\]/);
  assert.match(staffDirectoryMarkup(state,en),/Linked login account/);
  assert.doesNotMatch(staffDirectoryMarkup(state,en),/Leo account/);
  assert.deepEqual(state.todos,[]);
  assert.deepEqual(state.payrollRows,[]);
  const lesson=staffDialogMarkup({...state,dialog:{kind:'class',id:'schedule-maya:1'}},en);
  assert.match(lesson,/Chloe actual/);
  assert.match(lesson,/Present/);
  assert.match(lesson,/Absent/);
});
test('administrator to-do projects each pending student lesson request with its actionable details',()=>{
 const source={...snapshot(),studentRequestsReady:true,studentRequests:[{id:'request-1',studentId:'student-chloe',studentName:'Chloe actual',type:'reschedule',status:'pending',createdAt:'2026-10-15T09:00:00Z',lesson:{date:'2026-10-16',time:'13:00',courseName:'Art course 1'},availableTimes:[{scheduleId:'schedule-next',sequence:2,courseId:'course-art',courseName:'Art course 1',date:'2026-10-23',time:'15:00',availableSeats:2}],preferredDate:'2026-10-18',reason:'Family schedule'}]};
 const state=staffSharedState(staffInterfacePreviewState(),source),task=state.todos[0].tasks[0],html=staffPortalMarkup({...state,portalTab:'todo'},en);
 assert.equal(state.todosReady,true);assert.equal(task.id,'request-1');assert.equal(task.studentName,'Chloe actual');
 assert.equal(task.courseName,'Art course 1');assert.deepEqual(task.availableTimes,source.studentRequests[0].availableTimes);
 assert.match(task.detail.en,/2026-10-16 13:00/);assert.match(task.detail.en,/2026-10-18/);assert.match(task.detail.en,/Family schedule/);
 assert.match(html,/Chloe actual/);assert.match(html,/Original lesson/);assert.match(html,/Art course 1/);assert.match(html,/2026-10-16/);assert.match(html,/data-ui-command="open-task"/);
 const dialog=staffDialogMarkup({...state,dialog:{kind:'task',id:'request-1'}},en);assert.match(dialog,/Eligible rescheduling times/);assert.match(dialog,/Art course 1/);assert.match(dialog,/2026-10-23 · 15:00/);assert.match(dialog,/2 seats available/);assert.match(dialog,/data-ui-command="assign-lesson-request"/);assert.match(dialog,/Move paid lesson here/);assert.match(dialog,/frees the original seat and adds no charge/);
});

test('request projection keeps the submitted lesson snapshots and request time without choosing an available alternative',()=>{
 const request={id:'request-snapshots',studentName:'Applicant',type:'reschedule',status:'pending',createdAt:'2026-10-19T03:20:00Z',lesson:{courseName:'Original art',date:'2026-10-20',time:'10:00',duration:60},preferredSlot:{courseName:'Requested art',date:'2026-10-22',time:'15:00',duration:45},preferredDate:'2026-10-22',availableTimes:[{courseName:'Another option',date:'2026-10-23',time:'16:00'}]};
 const state=staffSharedState({}, {...snapshot(),studentRequestsReady:true,studentRequests:[request]}),task=state.todos[0].tasks[0];
 assert.equal(task.createdAt,request.createdAt);assert.deepEqual(task.originalLesson,request.lesson);assert.deepEqual(task.preferredLesson,request.preferredSlot);assert.equal(task.preferredDate,request.preferredDate);
 const html=staffPortalMarkup({...state,portalTab:'todo'},en);assert.match(html,/Original art/);assert.match(html,/Requested art/);assert.doesNotMatch(html,/Another option/);
});

test('live lesson time, room and roster changes update without replacing the open staff access summary',()=>{
  const source=snapshot();let state=staffSharedState({},source);
  state=advanceStaffPreview(state,'open-detail',{id:'resource-leo'});
  state=advanceStaffPreview(state,'detail-tab',{id:'resource-leo',tab:'permissions'});
  state.query='Leo';state.page=2;
  source.occurrences[0].item.time='15:15';source.occurrences[0].item.duration=45;source.resources.find(row=>row.id==='room-a').displayName='Garden room';source.rosters.get('schedule-maya:1').occupied=3;
  const next=staffSharedState(state,source);
  assert.equal(next.classes[0].time,'15:15');assert.equal(next.classes[0].endTime,'16:00');
  assert.equal(next.classes[0].room,'Garden room');assert.equal(next.classes[0].occupied,3);
  assert.deepEqual(next.dialog,state.dialog);assert.equal(next.query,'Leo');assert.equal(next.page,2);
  assert.match(staffDialogMarkup(next,en),/Teachers can view their assigned lessons/);assert.doesNotMatch(staffDialogMarkup(next,en),/No access|name="timetable_read"/);
});

test('a shared timetable does not imply an empty task list or retain another task readiness claim',()=>{
  const source=snapshot(),previous=staffSharedState({},source);
  previous.todosReady=true;
  previous.todos=[{id:'old',title:'Previous task',tasks:[{id:'old-task',staffId:previous.viewerId,studentName:'Other child'}]}];
  const state=staffSharedState(previous,source);
  assert.equal(state.sharedReady,true);
  assert.equal(state.todosReady,false);
  assert.deepEqual(state.todos,[]);
  for(const portalTab of ['home','todo'])for(const locale of [en,{t:zh=>zh}]){
    const html=staffPortalMarkup({...state,portalTab},locale);
    assert.match(html,/Tasks are not available yet|待辦事項暫未提供/);
    assert.doesNotMatch(html,/No outstanding tasks|暫時沒有待辦事項|Other child|old-task/);
  }
  assert.match(staffPortalMarkup({...state,todosReady:true},en),/No outstanding tasks/);
});

test('teacher workspace respects the exact authorized occurrence subset and does not infer identity from names or emails',()=>{
  const source=snapshot();source.user={id:'user-renamed',role:'teacher',displayName:'Teacher maya',email:'admin@example.test',accessRevision:'teacher-1'};
  source.teacherLinks=[];source.accounts=[];source.occurrences=[source.occurrences[1]];
  const state=staffSharedState({},source);
  assert.equal(state.viewerId,'user-renamed');assert.equal(state.viewer.displayName,'Teacher maya');
  assert.deepEqual(state.classes.map(row=>row.id),['schedule-leo:2']);
  assert.ok(state.staff.every(member=>member.role==='teacher'&&!member.accountId));
  assert.equal(state.classes[0].rosterReady,false);assert.equal(state.classes[0].occupied,null);
  const html=staffPortalMarkup({...state,portalTab:'class-schedule',today:'2026-10-17'},en);assert.match(html,/Art course 2/);assert.doesNotMatch(html,/Student list not loaded/);assert.match(staffPortalMarkup({...state,portalTab:'classes'},en),/Student list not loaded/);assert.doesNotMatch(html,/Art course 1|0 students/);
  source.user.role='admin';const admin=staffSharedState({},source);assert.deepEqual(admin.classes,[],'administrator personal classes require an explicit teacher link');
});

test('shared loading and identity or access changes never retain fixtures or a previous viewer draft',()=>{
  const source=snapshot();let state=staffSharedState(staffInterfacePreviewState(),{...source,ready:false});
  assert.deepEqual(state.staff,[]);assert.deepEqual(state.classes,[]);
  assert.match(staffDirectoryMarkup(state,en),/Loading staff/);assert.match(staffPortalMarkup(state,en),/Loading workspace/);
  assert.doesNotMatch(staffPortalMarkup(state,en),/Chloe|Leo Chan|Maya Lam|Sophie/);
  state=staffSharedState(state,source);state=advanceStaffPreview(state,'open-edit',{id:'resource-leo'});state.dialog.draft={displayName:'Unsaved draft'};
  const revoked=staffSharedState(state,{...source,user:{...source.user,accessRevision:'scope-2'},occurrences:[]});
  assert.equal(revoked.dialog,null);assert.deepEqual(revoked.classes,[]);assert.deepEqual(revoked.staffDrafts,{});
  const switched=staffSharedState(state,{...source,user:{id:'other-user',role:'teacher',displayName:'Other'},occurrences:[]});assert.equal(switched.dialog,null);
});

test('shared directory pagination searches every resource and resets the page after filtering',()=>{
  const source=snapshot();source.resources=Array.from({length:25},(_,index)=>({id:`actual-teacher-${index}`,kind:'teacher',displayName:`Teacher ${String(index).padStart(2,'0')}`,active:true}));
  let state=staffSharedState({},source),html=staffDirectoryMarkup(state,en);
  assert.match(html,/Page 1 of 2/);assert.match(html,/Teacher 00/);assert.doesNotMatch(html,/Teacher 24/);
  state=advanceStaffPreview(state,'page',{tab:'2'});html=staffDirectoryMarkup(state,en);assert.match(html,/Teacher 24/);assert.doesNotMatch(html,/Teacher 00/);
  state=advanceStaffPreview(state,'search',{value:'Teacher 24'});assert.equal(state.page,1);html=staffDirectoryMarkup(state,en);assert.match(html,/Teacher 24/);assert.doesNotMatch(html,/Teacher 00/);
});

test('shared profile drafts cannot override canonical names, account identities or assigned courses',()=>{
  const source=snapshot(),previous=staffSharedState({},source);
  previous.staffDrafts={'resource-maya':{displayName:'Stale name',email:'wrong@example.test',role:'teacher',courses:['Other course'],permissions:{timetable:{read:'own',edit:'none'}}}};
  const next=staffSharedState(previous,source),member=next.staff.find(row=>row.id==='resource-maya');
  assert.equal(member.displayName,'Teacher maya');assert.equal(member.email,'admin@example.test');assert.equal(member.role,'admin');assert.deepEqual(member.courses,['Art course 1']);
  assert.equal(member.permissions,undefined);assert.deepEqual(next.staffDrafts,{});
});

test('shared staff defaults to four active teachers while preserving inactive records behind the All filter',()=>{
  const source=snapshot();source.resources.push({id:'prior-inactive',kind:'teacher',displayName:'Prior inactive teacher',active:false});
  let state=staffSharedState({},source),html=staffDirectoryMarkup(state,en);
  assert.equal(state.filter,'active');assert.equal(state.staff.length,5);
  assert.equal((html.match(/class="ui-staff-person"/g)||[]).length,4);
  assert.match(html,/Active team members/);assert.doesNotMatch(html,/Prior inactive teacher/);
  state=advanceStaffPreview(state,'filter',{tab:'all'});state=staffSharedState(state,source);html=staffDirectoryMarkup(state,en);
  assert.equal(state.filter,'all');assert.equal((html.match(/class="ui-staff-person"/g)||[]).length,5);
  assert.match(html,/Prior inactive teacher/);assert.match(html,/Inactive/);
});


test('shared access summaries distinguish linked teachers, administrators and unlinked profiles without a fake module matrix',()=>{
  const state=staffSharedState({},snapshot()),context={...en,canManageStaffAccess:true};
  const view=id=>staffDialogMarkup({...state,dialog:{kind:'detail',id,tab:'permissions'}},context);
  const teacher=view('resource-leo');
  assert.match(teacher,/Login and data access/);assert.match(teacher,/Linked login account/);assert.match(teacher,/Teachers can view their assigned lessons/);assert.match(teacher,/Manage login and lesson access/);
  assert.doesNotMatch(teacher,/No access|name="timetable_read"|name="students_edit"|data-ui-form="permissions"|Save preview/);
  assert.match(view('resource-maya'),/Administrators can manage centre data and schedules/);
  assert.match(view('resource-ava'),/No linked login account/);assert.doesNotMatch(view('resource-ava'),/Teachers can view their assigned lessons/);
  const missing=staffDialogMarkup({...state,dialog:{kind:'detail',id:'resource-leo',tab:'permissions'}},en);
  assert.match(missing,/data-ui-command="open-permissions"[^>]*disabled/);
  const forced=staffDialogMarkup({...state,dialog:{kind:'permissions',id:'resource-leo',draft:{timetable_read:'none'}}},context);
  assert.doesNotMatch(forced,/data-ui-form="permissions"|No access|<select/);
  const attempted=advanceStaffPreview({...state,dialog:{kind:'permissions',id:'resource-leo'}},'submit',{formKind:'permissions',timetable_read:'all'});
  assert.equal(attempted.staff.find(row=>row.id==='resource-leo').permissions,undefined);assert.equal(attempted.notice,'');assert.match(attempted.error,/Use login and lesson access settings/);
});

test('shared staff distinguishes a first read failure from loading and never displays synthetic empty counts',()=>{
  const source={...snapshot(),ready:false,loading:false,error:'private service diagnostic'};
  const state=staffSharedState(staffInterfacePreviewState(),source);
  for(const [render,label] of [[staffDirectoryMarkup,'staff'],[staffPortalMarkup,'workspace']]){
    const html=render(state,en);
    assert.match(html,new RegExp(`Could not load ${label}`));
    assert.match(html,/data-ui-command="retry"/);
    assert.doesNotMatch(html,/Loading (?:staff|workspace)|No staff match|<strong>0<\/strong>|private service diagnostic|Chloe|Leo Chan|Maya Lam/);
  }
  assert.equal(state.sharedReady,false);
});

test('a failed same-identity refresh retains only explicitly available saved records and the open draft',()=>{
  const source=snapshot();let state=staffSharedState({},source);
  state=advanceStaffPreview(state,'open-edit',{id:'resource-leo'});
  state.dialog.draft={phone:'5555 2222'};state.query='leo';
  const next=staffSharedState(state,{...source,ready:false,hasSavedData:true,loading:false,error:'read failed',resources:[],occurrences:[]});
  assert.equal(next.sharedReady,true);assert.equal(next.sharedStale,true);
  assert.deepEqual(next.staff,state.staff);assert.deepEqual(next.classes,state.classes);
  assert.deepEqual(next.dialog,state.dialog);assert.equal(next.query,'leo');
  const html=staffDirectoryMarkup(next,en);
  assert.match(html,/Could not update staff data/);assert.match(html,/Showing the last loaded records/);
  assert.match(html,/Teacher leo/);assert.match(html,/data-ui-command="retry"/);assert.doesNotMatch(html,/Loading staff|No staff match|read failed/);
  const discarded=staffSharedState(state,{...source,ready:false,hasSavedData:false,loading:false,error:'read failed',resources:[],occurrences:[]});
  assert.deepEqual(discarded.staff,[]);assert.deepEqual(discarded.classes,[]);assert.equal(discarded.dialog,null);
});

test('refreshing saved staff remains visible and retry is disabled until the read settles',()=>{
  const source=snapshot(),previous=staffSharedState({},source);
  const next=staffSharedState(previous,{...source,ready:false,hasSavedData:true,loading:true,error:'previous error'});
  assert.equal(next.sharedReady,true);assert.equal(next.sharedLoading,true);
  const html=staffPortalMarkup({...next,portalTab:'class-schedule',today:'2026-10-16'},en);
  assert.match(html,/Updating workspace/);assert.match(html,/Art course 1/);
  assert.match(html,/data-ui-command="retry"[^>]*disabled/);
  assert.doesNotMatch(html,/Could not load|No classes scheduled/);
});

test('saved data flags never carry staff records or private drafts across identity, access or role boundaries',()=>{
  const source=snapshot(),previous=staffSharedState({},source);previous.dialog={kind:'edit',id:'resource-leo',draft:{phone:'private draft'}};
  for(const user of [{...source.user,id:'different-user'},{...source.user,accessRevision:'scope-2'},{...source.user,role:'student'},{}]){
    const next=staffSharedState(previous,{...source,user,ready:false,hasSavedData:true,loading:false,error:'not available'});
    assert.equal(next.sharedReady,false);assert.deepEqual(next.staff,[]);assert.deepEqual(next.classes,[]);assert.equal(next.dialog,null);
    assert.doesNotMatch(staffDirectoryMarkup(next,en),/Teacher leo|Teacher maya|private draft/);
  }
});

test('source gaps in staff employment, pay and clock never borrow fixture defaults or claim verified empty data',()=>{
  const state=staffSharedState({},snapshot());
  assert.equal(state.payrollReady,false);assert.equal(state.clockReady,false);
  const teaching=staffDialogMarkup({...state,dialog:{kind:'detail',id:'resource-leo',tab:'teaching'}},en);
  assert.match(teaching,/Employment[\s\S]*Pending confirmation/);assert.doesNotMatch(teaching,/Part-time|Full-time/);
  for(const portalTab of ['payroll','clock']){
    const html=staffPortalMarkup({...state,portalTab},en);
    assert.match(html,portalTab==='payroll'?/Payroll records are not available yet/:/ui-staff-clock-placeholder/);
    assert.doesNotMatch(html,/No (?:payroll )?records yet|HK\$0|Estimated total/);
  }
});

test('an authorized empty roster is distinct from filtering all existing staff out',()=>{
  const source=snapshot(),empty=staffSharedState({}, {...source,resources:[],occurrences:[]});
  const emptyHtml=staffDirectoryMarkup(empty,en);
  assert.match(emptyHtml,/No staff yet/);assert.doesNotMatch(emptyHtml,/No staff match|Could not load|Loading staff/);
  const filtered=staffSharedState({},source);filtered.query='No matching name';
  const filteredHtml=staffDirectoryMarkup(filtered,en);
  assert.match(filteredHtml,/No staff match/);assert.doesNotMatch(filteredHtml,/No staff yet/);
});

test('leave service projections require each explicit ready flag and do not borrow workspace classes or private drafts',()=>{
 const source=snapshot(),previous=staffSharedState({},source);Object.assign(previous,{leaveReady:true,leaveRecords:[{id:'old-private'}],leaveSessionsReady:true,leaveSessions:[{id:'old-session'}],leaveBalances:{'resource-leo':{annual:{value:99,unit:'days'}}},leaveUi:{dialog:{kind:'leave-new',draft:{reason:'Current unsent draft'}},rows:[{id:'forged-draft-record'}]}});
 const next=staffSharedState(previous,source);
 assert.equal(next.leaveReady,false);assert.deepEqual(next.leaveRecords,[]);assert.equal(next.leaveSessionsReady,false);assert.deepEqual(next.leaveSessions,[]);assert.deepEqual(next.leaveBalances,{});assert.equal(next.leaveUi.dialog.draft.reason,'Current unsent draft');
 assert.notEqual(next.classes.length,0,'An authorized workspace may have classes while the leave impact source is unavailable');
});

test('leave service projections preserve supplied records balances and exact session identities without changing them',()=>{
 const source={...snapshot(),leaveReady:true,leaveRecords:[{id:'leave-exact',staffId:'resource-leo',type:'annual',from:'2026-10-20',to:'2026-10-20',source:'teacher',status:'pending'}],leaveSessionsReady:true,leaveSessions:[{id:'session-exact',staffId:'resource-leo',date:'2026-10-20',start:'13:00',end:'14:00',courseName:'Only this class'}],leaveBalancesReady:true,leaveBalances:{'resource-leo':{annual:{value:0,unit:'days'},compensation:{value:null}}}},before=JSON.stringify(source);
 const state=staffSharedState({},source);
 assert.equal(state.leaveReady,true);assert.deepEqual(state.leaveRecords,source.leaveRecords);assert.equal(state.leaveSessionsReady,true);assert.deepEqual(state.leaveSessions,source.leaveSessions);assert.deepEqual(state.leaveBalances,source.leaveBalances);assert.equal(JSON.stringify(source),before);
});

test('leave service projections cannot retain records or balances after identity or role access is lost',()=>{
 const source={...snapshot(),leaveReady:true,leaveRecords:[{id:'private-leave',staffId:'resource-leo'}],leaveSessionsReady:true,leaveSessions:[{id:'private-session'}],leaveBalancesReady:true,leaveBalances:{'resource-leo':{annual:{value:5,unit:'days'}}}},previous=staffSharedState({},source);
 for(const user of [{id:'new-viewer',role:'teacher'}, {...source.user,role:'student'},{}]){
  const next=staffSharedState(previous,{...source,user,ready:false,hasSavedData:true});
  assert.equal(next.leaveReady,false);assert.deepEqual(next.leaveRecords,[]);assert.equal(next.leaveSessionsReady,false);assert.deepEqual(next.leaveSessions,[]);assert.deepEqual(next.leaveBalances,{});assert.equal(next.leaveUi,undefined);
 }
});

test('teacher self identity comes from the authenticated explicit IDs even without management links or upcoming classes',()=>{
 const source=snapshot();source.user={id:'user-teacher',role:'teacher',displayName:'Leo account',teacherResourceIds:['resource-leo']};source.teacherLinks=[];source.occurrences=[];
 const state=staffSharedState({},source),own=state.staff.find(row=>row.id==='resource-leo'),other=state.staff.find(row=>row.id==='resource-maya');
 assert.deepEqual(state.viewer.teacherResourceIds,['resource-leo']);assert.equal(own.userId,source.user.id);assert.equal(own.accountId,source.user.id);assert.equal(other.userId,null);
 const html=staffPortalMarkup({...state,portalTab:'leave'},en);assert.match(html,/data-ui-command="leave-open-new"/);assert.match(html,/Annual leave remaining/);
});

test('visible teacher resources or granted classes do not become self identity and explicit IDs must name teacher resources',()=>{
 const source=snapshot();source.teacherLinks=[];source.user={id:'user-teacher',role:'teacher',displayName:'Leo account',teacherResourceIds:[]};
 const granted=staffSharedState({},source);assert.deepEqual(granted.viewer.teacherResourceIds,[]);assert.doesNotMatch(staffPortalMarkup({...granted,portalTab:'leave'},en),/data-ui-command="leave-open-new"/);
 source.user.teacherResourceIds=['resource-leo','resource-leo','missing-resource','room-a',null];source.resources.push({id:'room-a',kind:'room',displayName:'Room A'});
 assert.deepEqual(staffSharedState({},source).viewer.teacherResourceIds,['resource-leo']);
});

test('changed authenticated self IDs discard saved ownership and private drafts even when the general access revision is unchanged',()=>{
 const source=snapshot();source.user={id:'user-teacher',role:'teacher',teacherResourceIds:['resource-leo'],accessRevision:'same'};source.teacherLinks=[];
 const previous=staffSharedState({},source);previous.leaveUi={dialog:{kind:'leave-new',draft:{reason:'Private old identity'}}};
 for(const teacherResourceIds of [[],null,['resource-maya']]){
  const state=staffSharedState(previous,{...source,ready:false,hasSavedData:true,error:'Read failed',user:{...source.user,teacherResourceIds}});
  assert.equal(state.sharedReady,false);assert.deepEqual(state.staff,[]);assert.deepEqual(state.viewer.teacherResourceIds,[]);assert.equal(state.leaveUi,undefined);
 }
 const unchanged=staffSharedState(previous,{...source,ready:false,hasSavedData:true,error:'Read failed'});assert.equal(unchanged.sharedReady,true);assert.deepEqual(unchanged.viewer.teacherResourceIds,['resource-leo']);
});

test('authenticated self IDs do not expand when stale management links also identify another visible teacher as self',()=>{
 const source=snapshot();source.user={id:'user-teacher',role:'teacher',displayName:'Current teacher account',accessRevision:'teacher-scope-1',teacherResourceIds:['resource-leo']};
 source.teacherLinks=[{teacherResourceId:'resource-leo',userId:'user-teacher'},{teacherResourceId:'resource-maya',userId:'user-teacher'}];
 const before=JSON.stringify(source),state=staffSharedState({},source),other=state.staff.find(member=>member.id==='resource-maya');
 assert.deepEqual(state.viewer.teacherResourceIds,['resource-leo']);
 assert.equal(state.staff.find(member=>member.id==='resource-leo').userId,'user-teacher');
 assert.notEqual(other.userId,'user-teacher','A stale management self link must not bypass the authenticated self list through staff.userId');
 assert.notEqual(other.accountId,'user-teacher');
 assert.equal(JSON.stringify(source),before);
});

test('an explicit empty self list after revocation cannot regain own HR access through stale management links',()=>{
 const source=snapshot();source.user={id:'user-teacher',role:'teacher',displayName:'Current teacher account',accessRevision:'teacher-scope-1',teacherResourceIds:['resource-leo']};
 source.teacherLinks=[{teacherResourceId:'resource-leo',userId:'user-teacher'}];
 const previous=staffSharedState({},source);previous.leaveUi={dialog:{kind:'leave-new',draft:{staffId:'resource-leo',reason:'Private revoked self draft'}}};
 const revoked={...source,user:{...source.user,accessRevision:'teacher-scope-2',teacherResourceIds:[]}},state=staffSharedState(previous,revoked);
 assert.deepEqual(state.viewer.teacherResourceIds,[]);
 assert.notEqual(state.staff.find(member=>member.id==='resource-leo').userId,'user-teacher');
 assert.notEqual(state.staff.find(member=>member.id==='resource-leo').accountId,'user-teacher');
 assert.equal(state.leaveUi,undefined);
 assert.doesNotMatch(staffPortalMarkup({...state,portalTab:'leave'},en),/data-ui-command="leave-open-new"|Private revoked self draft/);
});

test('present but malformed self identity values fail closed and only a missing field permits legacy management self links',()=>{
 const source=snapshot();source.user={id:'user-teacher',role:'teacher',displayName:'Current teacher account',accessRevision:'teacher-scope-1'};
 source.teacherLinks=[{teacherResourceId:'resource-leo',userId:'user-teacher'}];
 for(const teacherResourceIds of [null,undefined,'resource-leo',{teacherResourceId:'resource-leo'},[null,1,{},'missing-resource','room-a']]){
  const state=staffSharedState({}, {...source,user:{...source.user,teacherResourceIds}});
  assert.deepEqual(state.viewer.teacherResourceIds,[],'An explicit malformed field must not authorize a legacy self link');
  assert.notEqual(state.staff.find(member=>member.id==='resource-leo').userId,'user-teacher');
  assert.doesNotMatch(staffPortalMarkup({...state,portalTab:'leave'},en),/data-ui-command="leave-open-new"/);
 }
 assert.equal(Object.hasOwn(source.user,'teacherResourceIds'),false);
 const legacy=staffSharedState({},source);
 assert.deepEqual(legacy.viewer.teacherResourceIds,['resource-leo']);
 assert.equal(legacy.staff.find(member=>member.id==='resource-leo').userId,'user-teacher');
});

test('the authenticated own teacher ID keeps the current account identity when a stale management link names somebody else',()=>{
 const source=snapshot();source.user={id:'user-teacher',role:'teacher',displayName:'Authenticated current account',accessRevision:'teacher-scope-1',teacherResourceIds:['resource-leo']};
 source.accounts.push({id:'stale-other-account',role:'teacher',displayName:'Old management account'});
 source.teacherLinks=[{teacherResourceId:'resource-leo',userId:'stale-other-account'}];
 const state=staffSharedState({},source),own=state.staff.find(member=>member.id==='resource-leo');
 assert.deepEqual(state.viewer.teacherResourceIds,['resource-leo']);
 assert.equal(own.userId,source.user.id);assert.equal(own.accountId,source.user.id);
 assert.equal(own.accountName,source.user.displayName);assert.equal(own.email,source.user.email??'');
 assert.notEqual(own.accountName,'Old management account');
});

test('personal source supplies directory position employment and contact separately from the login account',()=>{
 const current=snapshot();Object.assign(current,{staffProfileReady:true,staffProfileRecords:[{staffId:'resource-leo',version:1,position:'Watercolour tutor',employment:'part-time',contactEmail:'leo.contact@example.test',mobile:'+852 9000 1234',phone:'2345 6789',joined:'2024-09-02',dateOfBirth:'1996-10-16'}]});
 const before=JSON.stringify(current),state=staffSharedState({},current),member=state.staff.find(row=>row.id==='resource-leo');
 assert.equal(member.position,'Watercolour tutor');assert.equal(member.employment,'part-time');assert.equal(member.contactEmail,'leo.contact@example.test');assert.equal(member.mobile,'+852 9000 1234');assert.equal(member.email,'');assert.equal(member.personalSourceStatus,'ready');
 const html=staffDirectoryMarkup(state,en);assert.match(html,/Watercolour tutor/);assert.match(html,/Employment[\s\S]*Part-time/);assert.match(html,/Contact[\s\S]*leo.contact@example.test/);assert.match(html,/Login account/);assert.doesNotMatch(html,/1996-10-16/);assert.equal(JSON.stringify(current),before);
});

test('personal directory source loading error and verified empty stay natural without scheduling or login fallbacks',()=>{
 const current=snapshot();current.resources[1].position='UNTRUSTED RESOURCE POSITION';current.resources[1].employment='part-time';current.resources[1].phone='UNTRUSTED RESOURCE PHONE';
 for(const [extra,status,pattern]of [[{staffProfileLoading:true},'loading',/Loading personal details/],[{staffProfileError:'PRIVATE SQL'},'error',/Could not load personal details/],[{staffProfileReady:true,staffProfileRecords:[]},'empty',/Personal details not provided/],[{},'unavailable',/Personal details unavailable/]]){
  const state=staffSharedState({}, {...current,...extra}),member=state.staff.find(row=>row.id==='resource-leo'),html=staffDirectoryMarkup(state,en);assert.equal(member.personalSourceStatus,status);assert.equal(member.contactEmail,'');assert.equal(member.employment,undefined);assert.match(html,pattern);assert.doesNotMatch(html,/UNTRUSTED RESOURCE|PRIVATE SQL|Part-time|Full-time/);
 }
});

test('personal profiles are scoped by exact self identity even when a malformed host supplies other staff records',()=>{
 const current=snapshot();current.user={id:'user-teacher',role:'teacher',teacherResourceIds:['resource-leo']};current.staffProfileReady=true;current.staffProfileRecords=[{staffId:'resource-maya',position:'PRIVATE OTHER POSITION',contactEmail:'private-other@example.test'},{staffId:'resource-leo',position:'Own tutor',contactEmail:'own@example.test'},{staffId:'orphan',contactEmail:'orphan-private@example.test'}];
 const state=staffSharedState({},current);assert.deepEqual(state.staffProfileRecords.map(row=>row.staffId),['resource-leo']);assert.match(staffDirectoryMarkup(state,en),/Own tutor|own@example.test/);assert.doesNotMatch(JSON.stringify(state.staff),/PRIVATE OTHER|private-other|orphan-private/);
 for(const teacherResourceIds of [[],null,'resource-leo']){const denied=staffSharedState({}, {...current,user:{...current.user,teacherResourceIds}});assert.deepEqual(denied.staffProfileRecords,[]);assert.doesNotMatch(JSON.stringify(denied.staff),/own@example.test|private-other/);}
});

test('ambiguous personal records cannot supply guessed directory facts and signed-out identity cannot retain contact data',()=>{
 const current={...snapshot(),staffProfileReady:true,staffProfileRecords:[{staffId:'resource-leo',position:'PRIVATE FIRST',contactEmail:'private1@example.test'},{staffId:'resource-leo',position:'PRIVATE SECOND',contactEmail:'private2@example.test'}]},state=staffSharedState({},current);
 const member=state.staff.find(row=>row.id==='resource-leo');assert.equal(member.personalSourceStatus,'ambiguous');assert.equal(member.contactEmail,'');assert.doesNotMatch(staffDirectoryMarkup(state,en),/PRIVATE FIRST|PRIVATE SECOND|private[12]@/);
 const denied=staffSharedState(state,{...current,user:{id:' ',role:'admin'},ready:false,hasSavedData:true});assert.deepEqual(denied.staff,[]);assert.deepEqual(denied.staffProfileRecords,[]);
});

test('a teacher cannot mistake other visible scheduling resources for known empty personal profiles',()=>{
 const current={...snapshot(),user:{id:'user-teacher',role:'teacher',teacherResourceIds:['resource-leo']},staffProfileReady:true,staffProfileRecords:[]},state=staffSharedState({},current);
 assert.equal(state.staff.find(row=>row.id==='resource-leo').personalSourceStatus,'empty');assert.equal(state.staff.find(row=>row.id==='resource-maya').personalSourceStatus,'unavailable');
});

test('staff profile host projection keeps the canonical current day for read-only age details',()=>{
 const current={...snapshot(),staffProfileReady:true,staffProfileRecords:[{staffId:'resource-leo',dateOfBirth:'1996-10-16'}]},state=staffSharedState({},current),html=staffDialogMarkup({...state,dialog:{kind:'detail',id:'resource-leo',tab:'contact'}},en);
 assert.match(html,/1996-10-16/);assert.match(html,/29 years/);assert.doesNotMatch(html,/name="age"|name="dateOfBirth"/);
});

test('teaching badges and directory filter follow staff eligibility independently of login role',()=>{
 const source=snapshot();source.resources.find(row=>row.id==='resource-leo').teachingAllowed=false;
 const state=staffSharedState({},source);assert.equal(state.staff.find(row=>row.id==='resource-leo').teaching,false);assert.equal(state.staff.find(row=>row.id==='resource-maya').teaching,true);
 const html=staffDirectoryMarkup({...state,filter:'teacher'},en);assert.match(html,/Teacher maya/);assert.doesNotMatch(html,/Teacher leo/);assert.match(html,/Teacher ethan/);
});
