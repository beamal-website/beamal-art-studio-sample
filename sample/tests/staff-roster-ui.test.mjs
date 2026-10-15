import test from 'node:test';
import assert from 'node:assert/strict';
import {rosterPageMarkup,rosterDialogMarkup,advanceRosterUi} from '../client/staff-roster-ui.js';
const en={t:(_zh,en)=>en},zh={t:zh=>zh};
const model=()=>({viewer:{id:'admin-user',role:'admin',teacherResourceIds:['staff-maya']},staff:[{id:'staff-maya',userId:'admin-user',displayName:'Maya Lam'},{id:'staff-leo',userId:'teacher-user',displayName:'Leo Chan'},{id:'staff-ava',displayName:'Ava Hui'}],rows:[{id:'roster-leo',staffId:'staff-leo',date:'2026-10-16',offDuty:false,segments:[{start:'09:30',end:'12:00'},{start:'13:30',end:'16:00'}],note:'Morning and afternoon'},{id:'roster-leo-off',staffId:'staff-leo',date:'2026-10-17',offDuty:true,segments:[]},{id:'roster-maya',staffId:'staff-maya',date:'2026-10-16',offDuty:false,segments:[{start:'10:00',end:'18:00'}],note:'Other teacher private roster'}],ready:true,loading:false,error:'',today:'2026-10-15',teacherId:'staff-leo',month:'2026-10',dialog:null});
const validDraft={offDuty:'false',start1:'09:30',end1:'12:00',start2:'13:30',end2:'16:00',start3:'',end3:'',note:'Keep a break',scope:'day',until:''};
const openDay=(source=model(),date='2026-10-16')=>advanceRosterUi(source,'roster-open-day',{id:date});

test('personal roster has explicit month and staff filters, real calendar dates and saved roster source',()=>{
 const source=model();for(const locale of [en,zh]){const html=rosterPageMarkup(source,locale);assert.match(html,/name="teacherId"[^>]*data-ui-command="roster-filter"/);assert.match(html,/name="month"[^>]*data-ui-command="roster-filter"/);assert.match(html,/roster-prev-month/);assert.match(html,/roster-next-month/);assert.match(html,/data-ui-id="2026-10-31"/);assert.match(html,/09:30/);assert.doesNotMatch(html,/Other teacher private roster|09:00–20:00|undefined|NaN/);}
 const day=rosterDialogMarkup(openDay(source),en);assert.match(day,/Leo Chan/);assert.match(day,/09:30/);assert.match(day,/13:30/);assert.match(day,/Morning and afternoon/);assert.match(day,/roster-open-edit[^>]*data-ui-id="roster-leo"/);
});

test('global roster requires a selected teacher and profile scope cannot be forged to another teacher',()=>{
 const source={...model(),teacherId:''};assert.match(rosterPageMarkup(source,en),/Choose a teacher/);assert.doesNotMatch(rosterPageMarkup(source,en),/data-ui-id="2026-10-16"/);
 const profile={...model(),profileStaffId:'staff-leo'};const state=advanceRosterUi(profile,'roster-filter',{teacherId:'staff-maya'});assert.equal(state.teacherId,'staff-leo');assert.doesNotMatch(rosterPageMarkup(state,{...en,embedded:true,profile:true}),/name="teacherId"|<h1\b/);
 const day=openDay(profile);const forced=advanceRosterUi(day,'roster-open-edit',{id:'roster-maya'});assert.equal(forced.dialog.kind,'roster-day');assert.doesNotMatch(rosterDialogMarkup(forced,en),/Other teacher private roster/);
});

test('teacher can view only explicit own linked resources and cannot open editing even with forged commands',()=>{
 const source={...model(),viewer:{id:'teacher-user',role:'teacher',teacherResourceIds:[]},teacherId:'staff-maya'};
 const html=rosterPageMarkup(source,en);assert.match(html,/Leo Chan/);assert.doesNotMatch(html,/Maya Lam|Other teacher private roster|name="teacherId"/);
 const day=openDay(source);assert.equal(day.dialog.staffId,'staff-leo');assert.doesNotMatch(rosterDialogMarkup(day,en),/roster-open-edit/);assert.equal(advanceRosterUi(day,'roster-open-edit',{id:'roster-leo'}).dialog.kind,'roster-day');
 for(const viewer of [{id:'student',role:'student'},{id:' ',role:'admin'},{}])assert.doesNotMatch(rosterPageMarkup({...source,viewer},en),/Leo Chan|Maya Lam|roster-open-day/);
});

test('roster loading failure unknown and known empty differ and never borrow lessons, Clock or a default workday',()=>{
 const source=model();assert.match(rosterPageMarkup({...source,ready:false},en),/Roster records are not available yet/);assert.match(rosterPageMarkup({...source,ready:false,loading:true},en),/Loading roster/);
 const failed=rosterPageMarkup({...source,ready:false,error:'secret raw service error'},en);assert.match(failed,/Could not load roster/);assert.doesNotMatch(failed,/secret raw|09:30/);
 const unknown=rosterDialogMarkup(openDay({...source,ready:false,rows:[],classes:[{date:'2026-10-16',time:'09:00',duration:660}],clockEvents:[{label:'in',timestamp:'2026-10-16T09:00:00'}]}),en);assert.match(unknown,/Roster details are unavailable/);assert.doesNotMatch(unknown,/Off duty|No roster set|09:00|20:00/);
 const empty=rosterDialogMarkup(openDay({...source,rows:[]}),en);assert.match(empty,/No roster set/);assert.doesNotMatch(empty,/Off duty|09:00|20:00/);
});

test('month navigation handles year transitions and real leap dates without changing staff selection',()=>{
 const source={...model(),month:'2026-12'};let state=advanceRosterUi(source,'roster-next-month');assert.equal(state.month,'2027-01');assert.equal(state.teacherId,'staff-leo');state=advanceRosterUi(state,'roster-prev-month');assert.equal(state.month,'2026-12');
 const leap=rosterPageMarkup({...source,month:'2028-02'},en);assert.match(leap,/data-ui-id="2028-02-29"/);assert.doesNotMatch(leap,/data-ui-id="2028-02-30"/);
 const ancient=rosterPageMarkup({...source,month:'0099-02'},en);assert.match(ancient,/data-ui-id="0099-02-28"/);assert.doesNotMatch(ancient,/1999-02/);
 assert.equal(advanceRosterUi(source,'roster-open-day',{id:'2026-02-30'}).dialog,null);
});

test('admin edits exactly the selected existing record then reviews and backs without changing canonical rows',()=>{
 const source=model();let state=advanceRosterUi(openDay(source),'roster-open-edit',{id:'roster-leo'});assert.equal(state.dialog.kind,'roster-edit');assert.equal(state.dialog.recordId,'roster-leo');assert.equal(state.dialog.draft.start1,'09:30');assert.equal(state.dialog.returnTo.id,'2026-10-16');
 state=advanceRosterUi(state,'roster-review',{...validDraft,start1:'09:45'});assert.equal(state.dialog.kind,'roster-review');assert.match(rosterDialogMarkup(state,en),/09:45/);assert.match(rosterDialogMarkup(state,en),/This day only/);assert.match(rosterDialogMarkup(state,en),/roster-save[^>]*disabled/);
 state=advanceRosterUi(state,'roster-cancel');assert.equal(state.dialog.kind,'roster-edit');assert.equal(state.dialog.draft.start1,'09:45');state=advanceRosterUi(state,'roster-cancel');assert.deepEqual(state.dialog,{kind:'roster-day',id:'2026-10-16',staffId:'staff-leo'});assert.deepEqual(state.rows,source.rows);
});

test('new roster has no assumed duty status or hours and retains three segment fields through weekly review',()=>{
 let state=advanceRosterUi(openDay(model(),'2026-10-18'),'roster-open-edit',{id:'2026-10-18'});assert.equal(state.dialog.draft.offDuty,'');assert.equal(state.dialog.draft.start1,'');assert.equal(state.dialog.draft.end1,'');
 const editor=rosterDialogMarkup(state,en);assert.match(editor,/<option value="" selected/);assert.doesNotMatch(editor,/value="09:00"|value="20:00"/);
 state=advanceRosterUi(state,'roster-review',{...validDraft,start3:'17:00',end3:'18:00',scope:'weekly',until:'2026-11-15'});assert.equal(state.dialog.kind,'roster-review');const html=rosterDialogMarkup(state,en);assert.match(html,/Every week/);assert.match(html,/2026-11-15/);assert.match(html,/17:00/);assert.match(html,/18:00/);
 state=advanceRosterUi(state,'roster-cancel');assert.equal(state.dialog.draft.start3,'17:00');assert.equal(state.dialog.draft.until,'2026-11-15');
});

test('working time validation requires paired positive non-overlapping segments and explicit weekly end',()=>{
 const source=advanceRosterUi(openDay(model(),'2026-10-18'),'roster-open-edit',{id:'2026-10-18'});
 for(const draft of [{...validDraft,offDuty:''},{...validDraft,end1:''},{...validDraft,end1:'09:30'},{...validDraft,end1:'09:00'},{...validDraft,start2:'11:30',end2:'14:00'},{...validDraft,scope:'weekly',until:''},{...validDraft,scope:'weekly',until:'2026-10-17'}]){const next=advanceRosterUi(source,'roster-review',draft);assert.equal(next.dialog.kind,'roster-edit');assert.ok(next.formError);assert.equal(next.dialog.draft.note,'Keep a break');}
 const adjacent=advanceRosterUi(source,'roster-review',{...validDraft,start2:'12:00',end2:'14:00'});assert.equal(adjacent.dialog.kind,'roster-review');
});

test('off duty is explicit and does not compute work hours while hidden working drafts survive toggling back',()=>{
 let state=advanceRosterUi(openDay(model(),'2026-10-18'),'roster-open-edit',{id:'2026-10-18'});state=advanceRosterUi(state,'roster-draft',validDraft);state=advanceRosterUi(state,'roster-review',{offDuty:'true'});assert.equal(state.dialog.kind,'roster-review');const html=rosterDialogMarkup(state,en);assert.match(html,/Off duty/);assert.doesNotMatch(html,/09:30|13:30|0 hours|0 min/);
 state=advanceRosterUi(state,'roster-cancel');state=advanceRosterUi(state,'roster-draft',{offDuty:'false'});assert.equal(state.dialog.draft.start1,'09:30');assert.match(rosterDialogMarkup(state,en),/name="start3"/);
});

test('group metadata is independent and cannot turn an unknown group into a fabricated Blank Roster default',()=>{
 const source={...model(),profileStaffId:'staff-leo'};assert.match(rosterPageMarkup(source,en),/Roster group information is unavailable/);assert.doesNotMatch(rosterPageMarkup(source,en),/Blank Roster/);
 assert.match(rosterPageMarkup({...source,groupsReady:true,staffGroups:{}},en),/No roster group assigned/);
 assert.match(rosterPageMarkup({...source,groupsReady:true,staffGroups:{'staff-leo':{id:'group-1',name:'Morning team'}}},en),/Morning team/);
});

test('forged final save never changes rows, groups, other teachers, Clock or causes a success notice',()=>{
 const source=model();let state=advanceRosterUi(openDay(source),'roster-open-edit',{id:'roster-leo'});state=advanceRosterUi(state,'roster-review',validDraft);const saved=advanceRosterUi(state,'roster-save',{staffId:'staff-maya',date:'2026-10-20',offDuty:'true'});assert.deepEqual(saved.rows,source.rows);assert.equal(saved.dialog.kind,'roster-review');assert.equal(saved.dialog.staffId,'staff-leo');assert.equal(saved.notice||'','');
});

test('record and note markup is escaped and profile embedding avoids a repeated heading',()=>{
 const source={...model(),profileStaffId:'staff-leo'};source.staff[1].displayName='<img src=x> Leo';source.rows[0].note='<script>bad</script>';const page=rosterPageMarkup(source,{...en,embedded:true,profile:true});assert.doesNotMatch(page,/<h1\b|<h2\b|<img\b/);assert.match(page,/&lt;img/);assert.match(rosterDialogMarkup(openDay(source),en),/&lt;script&gt;/);assert.doesNotMatch(rosterDialogMarkup(openDay(source),en),/<script>/);
});

test('multiple explicit own teacher profiles remain selectable without revealing another account profile',()=>{
 const source={...model(),viewer:{id:'teacher-user',role:'teacher',teacherResourceIds:[]},teacherId:''};source.staff.push({id:'staff-leo-extra',userId:'teacher-user',displayName:'Leo additional profile'});
 const html=rosterPageMarkup(source,en);assert.match(html,/name="teacherId"/);assert.match(html,/Leo additional profile/);assert.doesNotMatch(html,/Maya Lam|Ava Hui/);
 const selected=advanceRosterUi(source,'roster-filter',{teacherId:'staff-leo-extra'});assert.equal(selected.teacherId,'staff-leo-extra');
 const forged=advanceRosterUi(selected,'roster-filter',{teacherId:'staff-maya'});assert.notEqual(forged.teacherId,'staff-maya');assert.doesNotMatch(rosterPageMarkup(forged,en),/Maya Lam|Other teacher private roster/);
});

test('overlapping saved source segments are unavailable rather than a normal workday, while adjacent shifts remain valid and editable',()=>{
 const source=model();source.rows[0].segments=[{start:'10:00',end:'13:00'},{start:'12:00',end:'15:00'}];const before=structuredClone(source.rows);
 for(const locale of [en,zh]){
  const page=rosterPageMarkup(source,locale),day=rosterDialogMarkup(openDay(source),locale);
  assert.match(page,locale===en?/Times unavailable/:/時段資料未提供/);assert.match(day,locale===en?/Times unavailable/:/時段資料未提供/);assert.doesNotMatch(day,/10:00–13:00|12:00–15:00|Off duty|0 hours/);
 }
 let draft=advanceRosterUi(openDay(source),'roster-open-edit',{id:'roster-leo'});assert.equal(draft.dialog.draft.start1,'10:00');assert.equal(draft.dialog.draft.start2,'12:00');assert.deepEqual(source.rows,before);
 draft=advanceRosterUi(draft,'roster-review',{...validDraft,start1:'10:00',end1:'13:00',start2:'12:00',end2:'15:00'});assert.equal(draft.dialog.kind,'roster-edit');assert.match(draft.formError,/overlap/);
 source.rows[0].segments=[{start:'13:00',end:'15:00'},{start:'10:00',end:'13:00'}];const adjacent=rosterDialogMarkup(openDay(source),en);assert.match(adjacent,/13:00–15:00/);assert.match(adjacent,/10:00–13:00/);assert.doesNotMatch(adjacent,/Times unavailable/);
});
