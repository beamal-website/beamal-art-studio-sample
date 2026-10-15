import test from 'node:test';
import assert from 'node:assert/strict';
import {leavePageMarkup,leaveDialogMarkup,advanceLeaveUi} from '../client/staff-leave-ui.js';
const en={t:(_zh,en)=>en},zh={t:zh=>zh};
const model=()=>({viewer:{id:'admin-account',role:'admin',teacherResourceIds:['teacher-maya']},staff:[{id:'teacher-maya',userId:'admin-account',displayName:'Maya Lam',color:'#287b76'},{id:'teacher-leo',userId:'teacher-account',displayName:'Leo Chan',color:'#357d9a'},{id:'teacher-ava',displayName:'Ava Hui',color:'#b38a53'}],ready:true,loading:false,error:'',today:'2026-10-15',from:'2026-10-01',to:'2026-10-31',teacherId:'',status:'all',query:'',dialog:null,rows:[{id:'leave-leo',staffId:'teacher-leo',type:'sick',from:'2026-10-16',to:'2026-10-16',source:'teacher',status:'pending',reason:'Recover at home',affectedSessionIds:['session-leo']},{id:'leave-maya',staffId:'teacher-maya',type:'annual',from:'2026-10-20',to:'2026-10-21',source:'admin',status:'approved',reviewedBy:'Maya Lam',reviewedAt:'2026-10-12T12:00:00+08:00'}],balances:{'teacher-leo':{annual:{value:6,unit:'days'},compensation:{value:2}}},sessionsReady:true,sessions:[{id:'session-leo',staffId:'teacher-leo',date:'2026-10-16',start:'13:30',end:'14:30',courseName:'Creative art',roomName:'Studio A',capacity:10,enrolled:8},{id:'unlisted-leo',staffId:'teacher-leo',date:'2026-10-16',start:'15:30',end:'16:30',courseName:'Different lesson',capacity:12,enrolled:12},{id:'session-other',staffId:'teacher-maya',date:'2026-10-16',start:'13:30',end:'14:30',courseName:'Private other lesson'}]});
const validNew={staffId:'teacher-leo',type:'compensation',from:'2026-10-23',to:'2026-10-23',startTime:'13:00',endTime:'15:00',reason:''};

test('leave history provides filters, source, status, dates and exact staff records in both languages',()=>{
  const source=model();
  for(const locale of [en,zh]){
    const html=leavePageMarkup(source,locale);for(const name of ['from','to','teacherId','status','query'])assert.match(html,new RegExp(`<(?:input|select)[^>]*name="${name}"[^>]*data-ui-command="leave-filter"`));
    assert.match(html,/leave-open-new/);assert.match(html,/leave-leo/);assert.match(html,/leave-maya/);assert.doesNotMatch(html,/undefined|NaN|<input[^>]*data-action/);
  }
  let state=advanceLeaveUi(source,'leave-filter',{teacherId:'teacher-leo',status:'pending',query:'Leo'});
  assert.match(leavePageMarkup(state,en),/data-ui-id="leave-leo"/);assert.doesNotMatch(leavePageMarkup(state,en),/data-ui-id="leave-maya"/);
  assert.equal(source.teacherId,'');
});

test('teacher scope requires explicit account or resource identity and never shows orphan or another teacher records',()=>{
  const source=model();source.viewer={id:'teacher-account',role:'teacher',teacherResourceIds:[]};source.rows.push({id:'orphan',staffId:'teacher-account',from:'2026-10-16',to:'2026-10-16'});
  const html=leavePageMarkup(source,en);assert.match(html,/leave-leo/);assert.doesNotMatch(html,/leave-maya|Maya Lam|orphan|name="teacherId"/);
  const opened=advanceLeaveUi(source,'leave-open-new',{staffId:'teacher-maya'});assert.equal(opened.dialog,null);
  const wrong=leaveDialogMarkup({...source,dialog:{kind:'leave-record',id:'leave-maya'}},en);assert.doesNotMatch(wrong,/Maya Lam|Annual leave/);assert.match(wrong,/unavailable/);
  for(const viewer of [{id:'student-account',role:'student'},{}])assert.doesNotMatch(leavePageMarkup({...source,viewer},en),/leave-leo|leave-maya|leave-open-new/);
});

test('profile-fixed teacher cannot be changed by filters or forged create fields',()=>{
  const source={...model(),profileStaffId:'teacher-leo'};
  const filtered=advanceLeaveUi(source,'leave-filter',{teacherId:'teacher-maya'});assert.equal(filtered.teacherId,'teacher-leo');
  let state=advanceLeaveUi(source,'leave-open-new',{staffId:'teacher-maya'});assert.equal(state.dialog.draft.staffId,'teacher-leo');
  state=advanceLeaveUi(state,'leave-review-new',{...validNew,staffId:'teacher-maya'});assert.equal(state.dialog.kind,'leave-new');assert.match(state.formError,/teacher/i);assert.equal(state.dialog.draft.staffId,'teacher-leo');
  const html=leavePageMarkup(source,en);assert.match(html,/leave-leo/);assert.doesNotMatch(html,/leave-maya|name="teacherId"/);
});

test('admin direct entry and own teacher application review without saving and back preserves all inputs',()=>{
  const source=model();let state=advanceLeaveUi(source,'leave-open-new',{staffId:'teacher-leo'});
  assert.equal(state.dialog.draft.type,'');
  for(const locale of [en,zh])for(const type of ['sick','personal','annual','compensation'])assert.match(leaveDialogMarkup(state,locale),new RegExp(`value="${type}"`));
  state=advanceLeaveUi(state,'leave-review-new',validNew);assert.equal(state.dialog.kind,'leave-new-review');assert.match(leaveDialogMarkup(state,en),/Admin entry/);assert.match(leaveDialogMarkup(state,en),/13:00/);assert.match(leaveDialogMarkup(state,en),/leave-register[^>]*disabled/);
  state=advanceLeaveUi(state,'leave-cancel');assert.equal(state.dialog.kind,'leave-new');assert.deepEqual(state.dialog.draft,validNew);
  state=advanceLeaveUi(state,'leave-cancel');assert.equal(state.dialog,null);assert.deepEqual(state.rows,source.rows);
  const teacher={...source,viewer:{id:'teacher-account',role:'teacher',teacherResourceIds:['teacher-leo']}};
  let own=advanceLeaveUi(teacher,'leave-open-new');assert.equal(own.dialog.draft.staffId,'teacher-leo');
  own=advanceLeaveUi(own,'leave-review-new',validNew);assert.match(leaveDialogMarkup(own,en),/Teacher application/);assert.match(leaveDialogMarkup(own,en),/leave-submit[^>]*disabled/);
});

test('date and optional paired-time validation retains draft without inventing a required reason',()=>{
  const source=model(),opened=advanceLeaveUi(source,'leave-open-new',{staffId:'teacher-leo'});
  for(const fields of [{...validNew,from:'2026-02-30'},{...validNew,to:'2026-10-22'},{...validNew,endTime:''},{...validNew,startTime:'16:00',endTime:'15:00'}]){
    const state=advanceLeaveUi(opened,'leave-review-new',fields);assert.equal(state.dialog.kind,'leave-new');assert.ok(state.formError);assert.equal(state.dialog.draft.from,fields.from);
  }
  const noTime=advanceLeaveUi(opened,'leave-review-new',{...validNew,startTime:'',endTime:'',reason:''});assert.equal(noTime.dialog.kind,'leave-new-review');assert.doesNotMatch(leaveDialogMarkup(opened,en),/name="reason"[^>]*required/);
});

test('pending approval and rejection have separate reviews and return to the exact record without changing canonical status',()=>{
  const source=model(),record=advanceLeaveUi(source,'leave-open-record',{id:'leave-leo'});
  for(const decision of ['approve','reject']){
    let state=advanceLeaveUi(record,`leave-open-${decision}`,{id:'leave-leo'});assert.equal(state.dialog.kind,`leave-${decision}`);
    state=advanceLeaveUi(state,`leave-review-${decision}`,{reviewNote:`Discuss ${decision}`});assert.equal(state.dialog.kind,`leave-${decision}-review`);
    const html=leaveDialogMarkup(state,en);assert.match(html,new RegExp(`leave-${decision}[^>]*disabled`));assert.match(html,new RegExp(`Discuss ${decision}`));
    state=advanceLeaveUi(state,'leave-cancel');assert.equal(state.dialog.kind,`leave-${decision}`);assert.equal(state.dialog.draft.reviewNote,`Discuss ${decision}`);
    state=advanceLeaveUi(state,'leave-cancel');assert.deepEqual(state.dialog,{kind:'leave-record',id:'leave-leo'});assert.deepEqual(state.rows,source.rows);
  }
  const approved=advanceLeaveUi(source,'leave-open-record',{id:'leave-maya'});assert.doesNotMatch(leaveDialogMarkup(approved,en),/leave-open-approve|leave-open-reject/);
});

test('record detail uses source fields and explicit affected session IDs, never date-matching unrelated sessions',()=>{
  const source=model(),state=advanceLeaveUi(source,'leave-open-record',{id:'leave-leo'}),html=leaveDialogMarkup(state,en);
  assert.match(html,/Teacher application|Teacher Application/);assert.match(html,/Creative art/);assert.doesNotMatch(html,/Different lesson|Private other lesson/);assert.match(html,/8 \/ 10/);assert.match(html,/leave-open-substitute[^>]*data-ui-id="session-leo"/);
  const approved=leaveDialogMarkup(advanceLeaveUi(source,'leave-open-record',{id:'leave-maya'}),en);assert.match(approved,/Maya Lam/);assert.match(approved,/12 Oct 2026/);assert.match(approved,/UTC\+08:00/);
});

test('affected sessions distinguish unavailable data, explicit empty and a clearly labelled unsaved date preview',()=>{
  const source=model(),open=value=>leaveDialogMarkup(advanceLeaveUi(value,'leave-open-record',{id:'leave-leo'}),en);
  const unavailable=open({...source,sessionsReady:false,sessions:[]});assert.match(unavailable,/Affected sessions are not available yet/);assert.doesNotMatch(unavailable,/No affected sessions|0 sessions/);
  const empty=structuredClone(source);empty.rows[0].affectedSessionIds=[];assert.match(open(empty),/No affected sessions/);
  const preview=structuredClone(source);delete preview.rows[0].affectedSessionIds;const html=open(preview);assert.match(html,/Preview based on dates/);assert.match(html,/Creative art/);assert.match(html,/Different lesson/);assert.doesNotMatch(html,/Private other lesson/);
});

test('single-session substitute selection has no default person and preserves exact session and capacity through review and back',()=>{
  const source=model();let state=advanceLeaveUi(advanceLeaveUi(source,'leave-open-record',{id:'leave-leo'}),'leave-open-substitute',{id:'session-leo'});
  assert.equal(state.dialog.kind,'leave-substitute');assert.equal(state.dialog.sessionId,'session-leo');assert.equal(state.dialog.draft.substituteStaffId,'');
  assert.match(leaveDialogMarkup(state,en),/<option value="" selected/);
  state=advanceLeaveUi(state,'leave-review-substitute',{substituteStaffId:'teacher-ava',note:'Confirm with Ava'});assert.equal(state.dialog.kind,'leave-substitute-review');assert.match(leaveDialogMarkup(state,en),/Ava Hui/);assert.match(leaveDialogMarkup(state,en),/8 \/ 10/);assert.match(leaveDialogMarkup(state,en),/leave-assign[^>]*disabled/);
  state=advanceLeaveUi(state,'leave-cancel');assert.equal(state.dialog.draft.substituteStaffId,'teacher-ava');
  state=advanceLeaveUi(state,'leave-cancel');assert.deepEqual(state.dialog,{kind:'leave-record',id:'leave-leo'});assert.deepEqual(state.sessions,source.sessions);assert.deepEqual(state.rows,source.rows);
});

test('substitute assignment rejects unknown, unrelated, original and teacher-forged selections',()=>{
  const source=model(),record=advanceLeaveUi(source,'leave-open-record',{id:'leave-leo'});
  for(const id of ['unlisted-leo','session-other','missing'])assert.equal(advanceLeaveUi(record,'leave-open-substitute',{id}).dialog.kind,'leave-record');
  const form=advanceLeaveUi(record,'leave-open-substitute',{id:'session-leo'});
  for(const substituteStaffId of ['','teacher-leo','missing']){const next=advanceLeaveUi(form,'leave-review-substitute',{substituteStaffId});assert.equal(next.dialog.kind,'leave-substitute');assert.ok(next.formError);}
  const teacher={...record,viewer:{id:'teacher-account',role:'teacher',teacherResourceIds:['teacher-leo']}};assert.doesNotMatch(leaveDialogMarkup(teacher,en),/leave-open-substitute/);assert.equal(advanceLeaveUi(teacher,'leave-open-substitute',{id:'session-leo'}).dialog.kind,'leave-record');
});

test('leave balances preserve unknown values and only supplied units, never borrowing zero or assuming days',()=>{
  const source={...model(),profileStaffId:'teacher-leo'},html=leavePageMarkup(source,en);
  assert.match(html,/6 days/);assert.match(html,/<dd>2<\/dd>/);assert.doesNotMatch(html,/2 days|0 days/);
  const unavailable=leavePageMarkup({...source,balances:undefined},en);assert.match(unavailable,/Annual leave remaining/);assert.match(unavailable,/Compensation leave remaining/);assert.match(unavailable,/<dd>—<\/dd>/);assert.doesNotMatch(unavailable,/0 days/);
});

test('read states and invalid filters distinguish unknown, loading, failure, genuine empty and no matches without losing applied dates',()=>{
  const source=model();assert.match(leavePageMarkup({...source,ready:false},en),/Leave records are not available yet/);
  assert.match(leavePageMarkup({...source,ready:false,loading:true},en),/Loading leave records/);
  const failed=leavePageMarkup({...source,ready:false,error:'Private raw error'},en);assert.match(failed,/Could not load leave records/);assert.doesNotMatch(failed,/Private raw error|No leave records/);
  assert.match(leavePageMarkup({...source,rows:[]},en),/No leave records yet/);assert.match(leavePageMarkup({...source,query:'No match'},en),/No matching leave records/);
  const invalid=advanceLeaveUi(source,'leave-filter',{from:'2026-10-31',to:'2026-10-01'});assert.equal(invalid.from,'2026-10-01');assert.equal(invalid.to,'2026-10-31');assert.equal(invalid.filterDraft.from,'2026-10-31');assert.ok(invalid.filterError);
});

test('final business commands never register, submit, approve, reject, assign or create success',()=>{
  const source=model();let state=advanceLeaveUi(advanceLeaveUi(source,'leave-open-new',{staffId:'teacher-leo'}),'leave-review-new',validNew);
  for(const command of ['leave-submit','leave-register','leave-approve','leave-reject','leave-assign']){const next=advanceLeaveUi(state,command,validNew);assert.deepEqual(next.rows,source.rows);assert.deepEqual(next.sessions,source.sessions);assert.deepEqual(next.balances,source.balances);assert.equal(next.dialog.kind,'leave-new-review');assert.equal(next.notice||'','');}
});

test('embedded display and all form values escape markup without duplicate h1 or fake downloadable files',()=>{
  const source=model();source.staff[1].displayName='<script>Leo</script>';const html=leavePageMarkup(source,{...en,embedded:true});assert.doesNotMatch(html,/<h1\b|<script>|href=|blob:/);assert.match(html,/&lt;script&gt;Leo&lt;\/script&gt;/);
  const state=advanceLeaveUi(advanceLeaveUi(source,'leave-open-new',{staffId:'teacher-leo'}),'leave-review-new',{...validNew,reason:'<img src=x onerror=bad>'});assert.match(leaveDialogMarkup(state,en),/&lt;img/);assert.doesNotMatch(leaveDialogMarkup(state,en),/<img\b/);
});

test('affected sessions preserve original teacher identity after substitution and reject blank or missing session IDs',()=>{
  const source=model();source.rows[0].affectedSessionIds=['session-leo','original-leo','','missing'];
  source.sessions.push({id:'original-leo',staffId:'teacher-ava',originalStaffId:'teacher-leo',date:'2026-10-16',start:'17:00',end:'18:00',courseName:'Already substituted lesson'},{id:'',staffId:'teacher-leo',date:'2026-10-16',courseName:'Invalid empty ID lesson'},{staffId:'teacher-leo',date:'2026-10-16',courseName:'Invalid missing ID lesson'});
  const html=leaveDialogMarkup(advanceLeaveUi(source,'leave-open-record',{id:'leave-leo'}),en);
  assert.match(html,/Already substituted lesson/);assert.doesNotMatch(html,/Invalid empty ID lesson|Invalid missing ID lesson/);assert.match(html,/Some affected session details are unavailable/);
});

test('a profile-scoped known empty history is empty for that person rather than a failed search',()=>{
  const html=leavePageMarkup({...model(),profileStaffId:'teacher-leo',rows:[]},en);
  assert.match(html,/No leave records yet/);assert.doesNotMatch(html,/No matching leave records/);
});

test('review timestamps show readable date and source offset while missing date, time or zone stays explicit',()=>{
  const source=model(),show=value=>{source.rows[1].reviewedAt=value;return leaveDialogMarkup(advanceLeaveUi(source,'leave-open-record',{id:'leave-maya'}),en);};
  let html=show('2026-10-12T12:00:00+08:00');assert.match(html,/12 Oct 2026/);assert.match(html,/12:00:00/);assert.match(html,/UTC\+08:00/);assert.doesNotMatch(html,/2026-10-12T12:00:00/);
  html=show('2026-10-12T12:00');assert.match(html,/Time zone unavailable/);
  html=show('2026-10-12');assert.match(html,/12 Oct 2026/);assert.match(html,/Time unavailable/);assert.match(html,/Time zone unavailable/);
  html=show('2026-02-30T12:00:00Z');assert.match(html,/Review date and time unavailable/);
});

test('whitespace identities cannot become administrators or read private leave records',()=>{
  for(const id of [' ','\t','\n']){
    const source={...model(),viewer:{id,role:'admin'}};assert.doesNotMatch(leavePageMarkup(source,en),/leave-leo|leave-maya|Maya Lam|Leo Chan|leave-open-new/);assert.equal(advanceLeaveUi(source,'leave-open-new',{staffId:'teacher-leo'}).dialog,null);
  }
});

test('date-derived affected preview requires complete valid dates and paired times before claiming no affected sessions',()=>{
  for(const badRange of [{from:'',to:''},{from:'2026-02-30',to:'2026-10-16'},{from:'2026-10-16',to:'2026-10-15'},{from:'2026-10-16',to:'2026-10-16',startTime:'13:00',endTime:''}]){
    const source=model();delete source.rows[0].affectedSessionIds;Object.assign(source.rows[0],badRange);
    source.from='';source.to='';const html=leaveDialogMarkup(advanceLeaveUi(source,'leave-open-record',{id:'leave-leo'}),en);
    assert.match(html,/Affected sessions are not available yet/);assert.doesNotMatch(html,/No affected sessions/);
  }
});

test('teacher workspace does not repeat its Leave page heading while profile history keeps a section title',()=>{
 const source=model();source.viewer={id:'account-leo',role:'teacher',teacherResourceIds:['teacher-leo']};
 const embedded=leavePageMarkup(source,{...en,embedded:true});assert.doesNotMatch(embedded,/<h[12]>Leave<\/h[12]>/);assert.match(embedded,/Request leave/);
 const profile=leavePageMarkup({...source,profileStaffId:'teacher-leo'},{...en,embedded:true});assert.match(profile,/<h2>Leave<\/h2>/);
});

test('new leave review shows an unsent entry rather than a pending request or nonexistent processing history',()=>{
 for(const role of ['admin','teacher']){
  const source=model();if(role==='teacher')source.viewer={id:'account-leo',role:'teacher',teacherResourceIds:['teacher-leo']};
  const state=advanceLeaveUi(advanceLeaveUi(source,'leave-open-new',{staffId:'teacher-leo'}),'leave-review-new',validNew),html=leaveDialogMarkup(state,en);
  assert.match(html,role==='admin'?/Not registered/:/Not submitted/);assert.doesNotMatch(html,/>Pending<|>Reviewed by<|>Reviewed at<|Review date and time unavailable/);
  assert.deepEqual(state.rows,source.rows);
 }
});

test('an unreviewed record has no invented processing timestamp or date error',()=>{
 const source=model();delete source.rows[0].reviewedAt;
 const html=leaveDialogMarkup(advanceLeaveUi(source,'leave-open-record',{id:'leave-leo'}),en);
 assert.match(html,/<dt>Reviewed at<\/dt><dd>—<\/dd>/);assert.doesNotMatch(html,/Review date and time unavailable/);
});
