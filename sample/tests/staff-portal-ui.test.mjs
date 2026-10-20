import test from 'node:test';
import assert from 'node:assert/strict';
import {staffDirectoryMarkup,staffPortalMarkup,staffDialogMarkup,staffInterfacePreviewState,advanceStaffPreview} from '../client/staff-portal-ui.js';
const en={t:(_zh,text)=>text},zh={t:text=>text};
test('staff directory keeps staff identities and routes permission settings through individual profiles',()=>{const html=staffDirectoryMarkup(staffInterfacePreviewState(),en);assert.match(html,/Maya Lam/);assert.match(html,/Leo Chan/);assert.match(html,/admin@gmail.com/);assert.match(html,/teacher@gmail.com/);assert.match(html,/data-ui-command="open-detail"[^>]*data-ui-id="leo"/);assert.doesNotMatch(html,/Interface preview|Preview profile|data-ui-command="open-permissions"/);assert.doesNotMatch(html,/000000|<img|fetch\(/);});
test('directory search filters visible cards and escapes names and attributes',()=>{const state=staffInterfacePreviewState();state.query='leo';let html=staffDirectoryMarkup(state,en);assert.match(html,/Leo Chan/);assert.doesNotMatch(html,/Maya Lam/);state.staff=[{id:'"><script>',displayName:'<script>bad</script>',role:'teacher',active:true}];state.query='';html=staffDirectoryMarkup(state,en);assert.match(html,/&lt;script&gt;bad&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);});
test('Teacher home prioritizes actionable To-do and classes without clock actions',()=>{const html=staffPortalMarkup({...staffInterfacePreviewState(),todoCategory:'other'},en);assert.match(html,/Other/);assert.match(html,/Chloe Ho/);assert.doesNotMatch(html,/<h2>Today’s classes<\/h2>/);assert.doesNotMatch(html,/data-ui-command="open-clock"/);assert.match(html,/data-ui-command="open-task"/);assert.doesNotMatch(html,/data-ui-command="open-class"/);assert.doesNotMatch(html,/navigator.geolocation|access-control\/|Confirm verified payment/);});
test('permissions dialog uses module-specific own/all read/edit scopes without pretending to save backend permissions',()=>{const state=staffInterfacePreviewState();state.dialog={kind:'permissions',id:'leo'};const html=staffDialogMarkup(state,en);assert.match(html,/id="ui-staff-form"/);assert.match(html,/data-ui-form="permissions"/);assert.match(html,/name="timetable_read"/);assert.match(html,/name="timetable_edit"/);assert.match(html,/value="own"/);assert.match(html,/value="all"/);assert.match(html,/>Save<\/button>/);assert.doesNotMatch(html,/Interface preview|Save preview/);assert.match(html,/role="dialog"/);assert.match(html,/aria-modal="true"/);assert.doesNotMatch(html,/type="password"|Grant administrator/);});
test('leave form has required dates and reason, bilingual rendering and preview-only submission',()=>{const state=staffInterfacePreviewState();state.dialog={kind:'leave',id:'leo'};const html=staffDialogMarkup(state,en);assert.match(html,/name="from"[^>]*required/);assert.match(html,/name="to"[^>]*required/);assert.match(html,/name="reason"[^>]*required/);assert.match(html,/>Submit request<\/button>/);assert.match(staffDialogMarkup(state,zh),/請假申請/);});
test('payroll retains unknown monthly pay while the Clock page stays blank',()=>{
 const state=staffInterfacePreviewState();state.portalTab='payroll';let html=staffPortalMarkup(state,en);
 for(const text of ['Scheduled','Actual','Approved OT','Net pay'])assert.ok(html.includes(text),text);
 assert.match(html,/type="month"/);assert.match(html,/Payroll records are not available yet/);assert.doesNotMatch(html,/Estimated total|HK\$960|pay-1/);
 state.portalTab='clock';state.clockedIn=true;html=staffPortalMarkup(state,en);
 assert.equal((html.match(/data-ui-command="open-clock"/g)||[]).length,0);assert.match(html,/ui-staff-clock-placeholder/);assert.doesNotMatch(html,/Clock records|12:45|name="teacherId"/);
 assert.doesNotMatch(html,/In progress|4h 17m|Clocked in|Ready to start|<button[^>]*>Clock (?:in|out)<\/button>|Interface preview|interface examples|\(preview\)/);
});

test('empty data and unknown staff dialogs remain readable and never invent saved records',()=>{const state={staff:[],todos:[],classes:[],clockEntries:[],leaveRequests:[],payrollRows:[],viewerId:'missing',dialog:{kind:'detail',id:'missing'}};assert.match(staffDirectoryMarkup(state,en),/No staff match/);assert.match(staffPortalMarkup({...state,portalTab:'class-schedule'},en),/No classes today/);assert.match(staffDialogMarkup(state,en),/Staff profile unavailable/);});

test('reducer edits a preview profile and granular permissions without mutating the input or creating real identities',async()=>{const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');const state=staffInterfacePreviewState(),opened=advanceStaffPreview(state,'open-edit',{id:'leo'});const edited=advanceStaffPreview(opened,'submit',{formKind:'edit',displayName:'Leo revised',email:'teacher@gmail.com',hourlyRate:'330',courses:'Drawing, Watercolour'});assert.equal(state.staff[1].displayName,'陳子朗 Leo Chan');assert.equal(edited.staff[1].displayName,'Leo revised');assert.deepEqual(edited.staff[1].courses,['Drawing','Watercolour']);assert.equal(edited.staff[1].role,'teacher');assert.equal(edited.dialog,null);const permissions=advanceStaffPreview(advanceStaffPreview(edited,'open-permissions',{id:'leo'}),'submit',{formKind:'permissions',timetable_read:'all',timetable_edit:'own'});assert.deepEqual(permissions.staff[1].permissions.timetable,{read:'all',edit:'own'});assert.equal(permissions.staff[1].permissions.payroll.read,'none');assert.equal(permissions.staff[1].role,'teacher');});
test('unconnected clock and legacy leave submissions cannot fabricate records while isolated task drafts remain usable',async()=>{
 const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');let state=staffInterfacePreviewState();
 const before=JSON.stringify(state.clockEntries);
 for(const command of ['clock-in','clock-out']){
  state=advanceStaffPreview(state,command,{id:'leo'});state=advanceStaffPreview(state,'submit',{formKind:'clock'});
  assert.equal(state.clockedIn,false);assert.equal(JSON.stringify(state.clockEntries),before);assert.match(state.error,/no clock record was saved/);assert.equal(state.dialog.kind,'clock');
  assert.match(staffDialogMarkup(state,en),/type="submit" disabled aria-describedby="ui-staff-clock-note"/);
 }
 state=advanceStaffPreview(state,'close-dialog');state=advanceStaffPreview(state,'open-leave',{id:'leo'});
 state=advanceStaffPreview(state,'submit',{formKind:'leave',from:'2026-10-20',to:'2026-10-21',reason:'Personal',leaveType:'annual'});
 assert.equal(state.leaveRequests.length,1);assert.equal(state.portalTab,'todo');assert.match(state.error,/no leave record was saved/);assert.equal(state.dialog.draft.reason,'Personal');
 state=advanceStaffPreview(state,'task-complete',{id:'task-chloe'});assert.equal(state.todos[0].tasks[0].done,true);assert.match(state.notice,/Updated for this demonstration/);
});

test('legacy leave submission retains even an invalid unsent draft without bypassing the new review flow',async()=>{const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');const state=advanceStaffPreview(staffInterfacePreviewState(),'open-leave',{id:'leo'});const result=advanceStaffPreview(state,'submit',{formKind:'leave',from:'2026-02-30',to:'2026-03-01',reason:'Personal'});assert.equal(result.dialog.kind,'leave');assert.deepEqual(result.leaveRequests,state.leaveRequests);assert.equal(result.dialog.draft.from,'2026-02-30');assert.match(result.error,/no leave record was saved/);assert.equal(result.notice,'');});

test('staff search input is handled by typing and never routed as a click command',()=>{const html=staffDirectoryMarkup(staffInterfacePreviewState(),en),input=html.match(/<input\b[^>]*type="search"[^>]*>/)?.[0];assert.ok(input);assert.match(input,/data-ui-command="search"/);assert.doesNotMatch(input,/data-action="ui-staff"/);});

test('To-do details provide make-up/message and separate trial/convert workflow shortcuts with matching preview facts',async()=>{const {staffWorkflowFacts}=await import('../client/staff-portal-ui.js');const state=staffInterfacePreviewState();state.dialog={kind:'task',id:'task-chloe'};let html=staffDialogMarkup(state,en);assert.match(html,/data-ui-command="workflow"[^>]*data-ui-view="arrange"/);assert.match(html,/Send Message to Parent/);const facts=staffWorkflowFacts(state,'task-chloe');assert.equal(facts.student.displayName,'何詠晴 Chloe Ho');assert.equal(facts.lesson.time,'13:00');assert.equal(facts.lesson.teacher,'陳子朗 Leo Chan');state.dialog={kind:'task',id:'task-trial'};html=staffDialogMarkup(state,en);assert.match(html,/data-ui-view="applicant"/);assert.match(html,/data-ui-view="convert"/);assert.equal(staffWorkflowFacts(state,'missing'),null);});
test('personal To-do priorities default pending first and reorder with accessible controls without mutating the source',async()=>{const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');const state=staffInterfacePreviewState();let next=advanceStaffPreview(state,'open-priorities');let html=staffDialogMarkup(next,en);assert.match(html,/Priority settings/);assert.match(html,/data-ui-command="priority-up"/);assert.match(html,/ui-staff-drag-handle/);next=advanceStaffPreview(next,'priority-up',{id:'payment'});assert.equal(next.todoPriorityOrder[0],'payment');assert.equal(state.todoPriorityOrder,undefined);next=advanceStaffPreview(next,'priorities-reset');assert.equal(next.todoPriorityOrder[0],'arrangements');});
test('payment review edits items and final amount, then Confirm Request stays unpaid and separate from verified payment',async()=>{const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');const state=advanceStaffPreview(staffInterfacePreviewState(),'open-payment',{id:'task-payment'});let html=staffDialogMarkup(state,en);for(const name of ['finalAmount','dueDate','reminder','item_0_name','item_0_quantity','item_0_price'])assert.ok(html.includes(`name="${name}"`),name);assert.match(html,/Confirm Request/);assert.doesNotMatch(html,/<button[^>]*>\s*Confirm Payment|data-ui-command="confirm-payment"/);const changed=advanceStaffPreview(state,'submit',{formKind:'payment',item_0_name:'Three lessons',item_0_quantity:'3',item_0_price:'300',finalAmount:'850',dueDate:'2026-10-20',reminder:'three-days',note:'Agreed adjustment'});assert.equal(changed.paymentRequests[0].status,'awaiting-payment');assert.equal(changed.paymentRequests[0].finalAmount,850);assert.equal(changed.paymentRequests[0].reminder,'three-days');assert.equal(changed.paymentRequests[0].paid,false);assert.equal(state.paymentRequests[0].finalAmount,900);});
test('payment PDF layout is an unpaid preview tied to its own request, not a foreign invoice',async()=>{const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');const state=advanceStaffPreview(staffInterfacePreviewState(),'open-payment-document',{id:'task-payment'}),html=staffDialogMarkup(state,en);assert.match(html,/Payment details/);assert.match(html,/Chloe Ho/);assert.match(html,/Draft document\. Payment has not been confirmed/);assert.match(html,/PAY-2026-001/);assert.doesNotMatch(html,/>preview-request-chloe</);assert.doesNotMatch(html,/ui-operations|data-ui-command="confirm-payment"|Verified paid/);});


test('individual staff profile keeps permission editing scoped to the chosen teacher and returns to their profile',async()=>{
  const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');
  const source=staffInterfacePreviewState();
  let state=advanceStaffPreview(source,'open-detail',{id:'leo'});
  state=advanceStaffPreview(state,'detail-tab',{id:'leo',tab:'permissions'});
  let html=staffDialogMarkup(state,en);
  assert.match(html,/Staff profile/);
  assert.match(html,/Leo Chan/);
  assert.match(html,/data-ui-command="open-permissions"[^>]*data-ui-id="leo"/);
  assert.match(html,/>Set permissions<\/button>/);
  state=advanceStaffPreview(state,'open-permissions',{id:'leo'});
  const cancelled=advanceStaffPreview(state,'close-dialog');
  assert.deepEqual(cancelled.dialog,{kind:'detail',id:'leo',tab:'permissions'});
  state=advanceStaffPreview(state,'submit',{formKind:'permissions',timetable_read:'all',timetable_edit:'own',students_read:'own'});
  assert.deepEqual(state.dialog,{kind:'detail',id:'leo',tab:'permissions'});
  assert.deepEqual(state.staff.find(row=>row.id==='leo').permissions.timetable,{read:'all',edit:'own'});
  assert.deepEqual(state.staff.find(row=>row.id==='maya'),source.staff.find(row=>row.id==='maya'));
  assert.deepEqual(source.staff.find(row=>row.id==='leo').permissions.timetable,{read:'own',edit:'own'});
  assert.match(state.notice,/login access is unchanged/);
});

test('staff sample uses natural lesson and room names without engineering labels in both languages',()=>{
  const state=staffInterfacePreviewState();
  for(const locale of [en,zh]){
    const pages=[staffDirectoryMarkup(state,locale),...['home','classes','leave','payroll'].map(portalTab=>staffPortalMarkup({...state,portalTab},locale)),...['detail','permissions','leave','clock','payroll','class'].map(kind=>staffDialogMarkup({...state,dialog:{kind,id:kind==='class'?'leo-1300':'leo'}},locale))];
    for(const html of pages)assert.doesNotMatch(html,/介面預覽|預覽檔案|（預覽）|虛構|中期檢查|Interface preview|Preview profile|fictional|checkpoint|\(preview\)/i);
  }
  assert.match(staffPortalMarkup({...state,portalTab:'classes'},zh),/創意藝術/);
  assert.match(staffPortalMarkup({...state,portalTab:'classes'},en),/Studio A/);
});

test('workspace keeps leave and Clock navigation without a separate clock action',()=>{
  const source=staffInterfacePreviewState();
  for(const locale of [en,zh])for(const clockedIn of [false,true]){
    const html=staffPortalMarkup({...source,clockedIn},locale);
    assert.doesNotMatch(html,/ui-staff-quick-note|Your teaching, at a glance|Keep class lists|Leave and cover arrangements|專注於你的課堂|減少來回尋找|請假及代課安排/);
    assert.match(html,/data-ui-command="tab"[^>]*data-ui-tab="leave"[^>]*>(Leave|請假)<\/button>/);
    assert.equal((html.match(/data-ui-command="open-clock"/g)||[]).length,0);
    assert.doesNotMatch(html,/data-ui-command="clock-in"|data-ui-command="clock-out"|>Clock in<|>Clock out<|>上班打卡<|>下班打卡</);
    assert.doesNotMatch(html.split('</header>')[0],/Leo Chan|<p>/);
  }
});

test('unconnected shared Clock stays with the current teacher and cannot create a misleading saved event',async()=>{
  const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');
  const source={shared:true,sharedReady:true,today:'2026-10-15',currentTime:'16:20',viewerId:'user-leo',viewer:{id:'user-leo',displayName:'陳子朗 Leo Chan',role:'teacher'},staff:[],classes:[],todos:[],clockEntries:[],leaveRequests:[],payrollRows:[],clockedIn:false};
  const opened=advanceStaffPreview(source,'open-clock',{id:'user-leo'});
  assert.equal(opened.dialog.kind,'clock');
  assert.equal(source.dialog,undefined);
  for(const locale of [en,zh]){
    const html=staffDialogMarkup(opened,locale);
    assert.doesNotMatch(html.split('</header>')[0],/Leo Chan|<p>/);
    assert.match(html,/16:20/);
    assert.doesNotMatch(html,/Maya Lam|Chloe Ho|Confirm clock in|Confirm clock out|確認上班打卡|確認下班打卡/);
    assert.match(html,/type="submit" disabled aria-describedby="ui-staff-clock-note"/);
    assert.match(html,locale===en?/No clock record will be saved/:/不會建立正式打卡紀錄/);
  }
  const attempted=advanceStaffPreview(opened,'submit',{formKind:'clock',note:'Typed note'});
  assert.deepEqual(attempted.clockEntries,[]);
  assert.equal(attempted.clockedIn,false);
  assert.equal(attempted.dialog.kind,'clock');
  assert.equal(attempted.dialog.draft.note,'Typed note');
  assert.equal(attempted.notice,'');
  assert.match(attempted.error,/no clock record was saved/);
});

function sharedLeaveState(){
  return {shared:true,sharedReady:true,today:'2026-10-15',viewerId:'user-leo',viewer:{id:'user-leo',displayName:'Leo account',role:'teacher',teacherResourceIds:['resource-leo'],leaveBalance:99},staff:[{id:'resource-leo',displayName:'Leo teacher',role:'teacher',leaveBalance:99},{id:'resource-maya',displayName:'Maya teacher',role:'admin',leaveBalance:88}],classes:[],todos:[],todosReady:false,clockEntries:[],leaveRequests:[{id:'old-preview',staffId:'user-leo',type:'annual',from:'2026-10-23',to:'2026-10-23',reason:'Unverified preview request'},{id:'other-private',staffId:'resource-maya',type:'sick',from:'2026-10-24',to:'2026-10-24',reason:'Another person private leave'}],payrollRows:[],portalTab:'leave'};
}

test('legacy leave offers four bilingual types but cannot create compensation records or calculate balances',async()=>{
  const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');
  const source=staffInterfacePreviewState(),opened=advanceStaffPreview(source,'open-leave',{id:'leo'});
  for(const [locale,labels] of [[en,['Annual leave','Sick leave','Personal leave','Compensation leave']],[zh,['年假','病假','事假','補假']]]){
    const html=staffDialogMarkup(opened,locale);
    for(const label of labels)assert.ok(html.includes(label),label);
    assert.match(html,/<option value="compensation"/);
  }
  const next=advanceStaffPreview(opened,'submit',{formKind:'leave',leaveType:'compensation',from:'2026-10-20',to:'2026-10-20',reason:'Public holiday compensation'});
  assert.deepEqual(next.leaveRequests,source.leaveRequests);
  assert.match(next.error,/no leave record was saved/);
  assert.deepEqual(next.staff,source.staff,'Choosing compensation must not calculate or deduct any leave balance');
  assert.equal(source.leaveRequests.length,1);
  assert.match(staffDialogMarkup(next,en),/<option value="compensation" selected/);
  assert.match(staffDialogMarkup(next,zh),/<option value="compensation" selected/);
});

test('shared leave separates annual and public holiday compensation availability without borrowing balances or request fixtures',()=>{
  const source=sharedLeaveState();
  for(const locale of [en,zh]){
    const html=staffPortalMarkup(source,locale);
    assert.match(html,locale===en?/Annual leave remaining/:/年假餘額/);
    assert.match(html,locale===en?/Compensation leave remaining/:/補假餘額/);
    assert.match(html,locale===en?/Leave records are not available yet/:/假期紀錄暫未提供/);
    assert.match(html,locale===en?/Leave history/:/假期紀錄/);
    assert.match(html,/—/);
    assert.doesNotMatch(html,/99 annual|88 annual|0 annual|Unverified preview request|Another person private leave|No leave requests yet|暫時沒有請假申請/);
  }
});

test('unconnected shared leave preserves the current teacher and draft without creating a saved request',async()=>{
  const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');
  const source=sharedLeaveState(),opened=advanceStaffPreview(source,'open-leave',{id:'user-leo'});
  for(const locale of [en,zh]){
    const html=staffDialogMarkup(opened,locale);
    assert.match(html,/Leo account/);
    assert.match(html,/type="submit" disabled aria-describedby="ui-staff-leave-note"/);
    assert.match(html,locale===en?/No leave record will be saved/:/不會建立正式請假紀錄/);
    assert.doesNotMatch(html,/Maya teacher|Another person private leave/);
  }
  const attempted=advanceStaffPreview(opened,'submit',{formKind:'leave',leaveType:'compensation',from:'2026-10-20',to:'2026-10-20',reason:'Keep this typed reason'});
  assert.deepEqual(attempted.leaveRequests,source.leaveRequests);
  assert.deepEqual(attempted.staff,source.staff);
  assert.equal(attempted.dialog.kind,'leave');
  assert.equal(attempted.dialog.draft.leaveType,'compensation');
  assert.equal(attempted.dialog.draft.reason,'Keep this typed reason');
  assert.equal(attempted.notice,'');
  assert.match(attempted.error,/no leave record was saved/);
  assert.match(staffDialogMarkup(attempted,en),/<option value="compensation" selected/);
  assert.equal(source.dialog,undefined);
});

test('shared leave uses explicit teacher resource identity and administrators can view only known staff targets',async()=>{
  const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');
  const source=sharedLeaveState();
  const own=advanceStaffPreview(source,'open-leave',{id:'resource-leo'});
  assert.match(staffDialogMarkup(own,en),/Leo teacher/);
  for(const id of ['resource-maya','missing-resource']){
    const blocked=advanceStaffPreview(source,'open-leave',{id});
    assert.equal(blocked.dialog,null);
    const direct=staffDialogMarkup({...source,dialog:{kind:'leave',id}},en);
    assert.doesNotMatch(direct,/data-ui-form="leave"|Maya teacher|Another person private leave/);
  }
  const admin={...source,viewerId:'user-admin',viewer:{id:'user-admin',displayName:'Admin account',role:'admin'}};
  assert.match(staffDialogMarkup(advanceStaffPreview(admin,'open-leave',{id:'resource-maya'}),en),/Maya teacher/);
  assert.doesNotMatch(staffDialogMarkup({...admin,dialog:{kind:'leave',id:'missing-resource'}},en),/data-ui-form="leave"|Admin account/);
  const unknownRole={...source,viewer:{...source.viewer,role:'student'}};
  assert.doesNotMatch(staffPortalMarkup(unknownRole,en),/data-ui-command="open-leave"|99 annual/);
});

test('shared unknown payroll differs from an explicitly loaded empty payroll and does not render an invented payslip status',()=>{
  const state={...sharedLeaveState(),portalTab:'payroll'};
  for(const locale of [en,zh]){
    const unavailable=staffPortalMarkup(state,locale);
    assert.match(unavailable,locale===en?/Payroll records are not available yet/:/薪金紀錄暫未提供/);
    assert.doesNotMatch(unavailable,/No payroll records yet|暫時沒有薪金紀錄|HK\$0|Estimated total/);
    const empty=staffPortalMarkup({...state,payrollReady:true},locale);
    assert.match(empty,locale===en?/No payroll records yet/:/暫時沒有薪金紀錄/);
    const payslip=staffDialogMarkup({...state,dialog:{kind:'payroll',id:'resource-leo'}},locale);
    assert.doesNotMatch(payslip,/October 2026|2026年10月|No payment issued|尚未發薪/);
  }
});

test('missing shared employment is not selected as part-time in profile or a forced edit draft',()=>{
  const state={...sharedLeaveState(),dialog:{kind:'detail',id:'resource-leo',tab:'teaching'}};
  for(const locale of [en,zh]){
    const html=staffDialogMarkup(state,locale);
    assert.match(html,locale===en?/Pending confirmation/:/待確認/);
    assert.doesNotMatch(html,/>Part-time<|>Full-time<|>兼職<|>全職</);
    const editor=staffDialogMarkup({...state,dialog:{kind:'edit',id:'resource-leo'}},locale);
    assert.match(editor,/<option value="" selected/);
    assert.doesNotMatch(editor,/<option value="part-time" selected/);
  }
});

test('workspace uses a left navigation shell with only overview tasks classes clock and leave',()=>{
 for(const locale of [en,zh]){
  const html=staffPortalMarkup(staffInterfacePreviewState(),locale);
  const nav=html.match(/<nav class="workspace-category-nav ui-staff-portal-tabs"[\s\S]*?<\/nav>/)?.[0]||'';
  assert.match(html,/workspace-reference/);
  assert.match(html,/class="workspace-content"/);
  for(const key of ['todo','class-schedule','classes','clock','leave'])assert.match(nav,new RegExp('data-ui-tab="'+key+'"'));
  assert.doesNotMatch(nav,/data-ui-tab="(?:roster|payroll)"/);
  assert.doesNotMatch(html,/students · Capacity/);
 }
 const detail=staffPortalMarkup({...staffInterfacePreviewState(),portalTab:'classes'},en);
 assert.match(detail,/students · Capacity/);
});

test('four-column task board keeps requests in the right group and excludes another teacher tasks',()=>{
 const state={...staffInterfacePreviewState(),todos:[{id:'student-requests',tasks:[{id:'move',staffId:'leo',requestType:'reschedule',title:'MOVE_ONLY',studentName:'MOVE_ONLY'},{id:'sick',staffId:'leo',requestType:'sick',title:'SICK_ONLY'},{id:'private',staffId:'maya',title:'PRIVATE_OTHER_TEACHER'}]},{id:'payment',tasks:[{id:'pay',staffId:'leo',title:'PAY_ONLY',payerName:'PAY_ONLY'}]}]};
 const html=staffPortalMarkup(state,en);
 const column=key=>staffPortalMarkup({...state,todoCategory:key},en).split('data-todo-category="'+key+'"')[1].split('</section>')[0];
 assert.equal((html.match(/data-todo-category=/g)||[]).length,1);
 assert.match(column('rescheduling'),/MOVE_ONLY/);assert.doesNotMatch(column('rescheduling'),/SICK_ONLY|PAY_ONLY/);
 assert.match(column('other'),/SICK_ONLY/);assert.match(column('payment'),/PAY_ONLY/);
 assert.doesNotMatch(html,/PRIVATE_OTHER_TEACHER/);
 for(const label of ['Rescheduling requests','Trial applications','Payment requests','Other'])assert.ok(html.includes(label));
});

test('workspace opens only To-do and keeps today’s classes as a separate inner page',()=>{
 const state=staffInterfacePreviewState(),home=staffPortalMarkup(state,en),schedule=staffPortalMarkup({...state,portalTab:'class-schedule'},en);
 assert.equal(state.portalTab,'todo');
 assert.match(home,/<h1 id="ui-staff-todo-board-title">Rescheduling requests<\/h1>/);assert.match(home,/id="ui-staff-todo-board-title"/);
 assert.doesNotMatch(home,/data-ui-tab="home"|data-ui-command="open-class"/);
 assert.match(schedule,/<h1 id="workspace-page-title">Today’s classes<\/h1>/);
 assert.match(schedule,/data-ui-command="open-class"/);assert.doesNotMatch(schedule,/id="ui-staff-todo-board-title"/);
 assert.match(staffPortalMarkup({...state,portalTab:'home'},en),/id="ui-staff-todo-board-title"/);
});

test('rescheduling lists preserve original and chosen lessons and open read-only details for either side',async()=>{
 const {advanceStaffPreview}=await import('../client/staff-portal-ui.js');
 const task={id:'exact-request',staffId:'leo',studentName:'Exact student',createdAt:'2026-10-19T03:20:00Z',requestType:'reschedule',originalLesson:{courseName:'Old painting',date:'2026-10-20',time:'10:00',duration:60},preferredLesson:{courseName:'Chosen painting',date:'2026-10-22',time:'15:00',duration:45},availableTimes:[{courseName:'Do not guess this option',date:'2026-10-21',time:'09:00'}]};
 const state={...staffInterfacePreviewState(),todos:[{id:'student-requests',tasks:[task]}]};
 const html=staffPortalMarkup(state,en);
 assert.match(html,/Old painting/);assert.match(html,/Chosen painting/);assert.match(html,/11:20/);assert.match(html,/ui-staff-transfer-arrow/);
 assert.doesNotMatch(html,/Do not guess this option/);
 for(const side of ['original','preferred']){
  const opened=advanceStaffPreview(state,'open-request-lesson',{id:task.id,tab:side}),dialog=staffDialogMarkup(opened,en);
  assert.match(dialog,side==='original'?/Old painting/:/Chosen painting/);
  assert.match(dialog,side==='original'?/10:00/:/15:00/);
  assert.doesNotMatch(dialog,/type="submit"|assign-lesson-request/);
 }
 const missing=staffPortalMarkup({...state,todos:[{id:'student-requests',tasks:[{...task,preferredLesson:null,preferredDate:'2026-10-25'}]}]},en);
 assert.match(missing,/New lesson not selected/);assert.match(missing,/2026-10-25/);assert.doesNotMatch(missing,/Do not guess this option/);
 const privateDialog=staffDialogMarkup({...state,viewerId:'maya',dialog:{kind:'request-lesson',id:task.id,tab:'original'}},en);
 assert.doesNotMatch(privateDialog,/Old painting/);
});

 test('today’s classes excludes other dates and teachers, sorts times and does not truncate the day',()=>{
 const base=staffInterfacePreviewState(),today=base.today;
 const rows=Array.from({length:10},(_,i)=>({id:'today-'+i,staffId:base.viewerId,date:today,time:String(18-i).padStart(2,'0')+':00',courseName:'TODAY_'+i}));
 const state={...base,portalTab:'class-schedule',classes:[...rows,{id:'past',staffId:base.viewerId,date:'2026-10-15',courseName:'PAST_ONLY'},{id:'future',staffId:base.viewerId,date:'2026-10-17',courseName:'FUTURE_ONLY'},{id:'other',staffId:'maya',date:today,courseName:'OTHER_TEACHER'}]};
 for(const shared of [false,true]){
 const html=staffPortalMarkup({...state,shared,sharedReady:true},en);
 assert.equal((html.match(/data-ui-command="open-class"/g)||[]).length,10);assert.doesNotMatch(html,/PAST_ONLY|FUTURE_ONLY|OTHER_TEACHER/);assert.ok(html.indexOf('TODAY_9')<html.indexOf('TODAY_0'));
 const empty=staffPortalMarkup({...state,shared,sharedReady:true,classes:state.classes.filter(row=>row.date!==today)},en);assert.match(empty,/No classes today/);assert.doesNotMatch(empty,/FUTURE_ONLY|PAST_ONLY|Upcoming classes/);
 }
 const all=staffPortalMarkup({...state,portalTab:'classes'},en);assert.match(all,/PAST_ONLY/);assert.match(all,/FUTURE_ONLY/);
 });

test('To-do opens its first child and switches between four independent pages with pending indicators',()=>{
 let state=staffInterfacePreviewState();state=advanceStaffPreview(state,'todo-category',{id:'trial'});
 const ctx={...en,workspacePending:{rescheduling:0,trial:2,payment:0,other:1}},html=staffPortalMarkup(state,ctx);
 assert.equal((html.match(/data-ui-command="todo-category"/g)||[]).length,4);
 assert.match(html,/data-ui-id="trial" aria-current="page"/);assert.match(html,/data-workspace-category="trial" role="status"/);
 assert.match(html,/data-workspace-category="rescheduling" hidden/);assert.match(html,/data-workspace-category="all" role="status"/);
 assert.equal((html.match(/data-todo-category=/g)||[]).length,1);assert.match(html,/data-todo-category="trial"/);assert.doesNotMatch(html,/data-todo-category="rescheduling"/);
 state=advanceStaffPreview(state,'tab',{tab:'todo'});assert.equal(state.todoCategory,'rescheduling');
 assert.match(staffPortalMarkup(state,en),/data-todo-category="rescheduling"/);
});
