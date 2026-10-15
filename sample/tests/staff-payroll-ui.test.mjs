import test from 'node:test';
import assert from 'node:assert/strict';
import {payrollPageMarkup,payrollDialogMarkup,salaryProfileMarkup,advancePayrollUi} from '../client/staff-payroll-ui.js';

const en={t:(_zh,en)=>en},zh={t:zh=>zh};
const model=()=>({viewer:{id:'admin-account',role:'admin',teacherResourceIds:['teacher-maya']},today:'2026-10-15',ready:true,loading:false,error:'',month:'2026-10',teacherId:'',status:'all',query:'',dialog:null,staff:[{id:'teacher-maya',userId:'admin-account',displayName:'Maya account',salaryProfile:{salaryType:'monthly',monthlyBaseSalary:18000}},{id:'teacher-leo',userId:'teacher-account',displayName:'Leo account',salaryProfile:{salaryType:'hourly',hourlyRate:100}},{id:'teacher-ava',displayName:'Ava without account'}],rows:[{id:'oct-maya',staffId:'teacher-maya',month:'2026-10',status:'draft',scheduledMinutes:3000,actualMinutes:null,actualVerified:false,approvedOtMinutes:null,approvedOtPay:null,approvedDeduction:null,basePay:18000,netPay:null,visibleToTeacher:false},{id:'oct-leo',staffId:'teacher-leo',month:'2026-10',status:'approved',scheduledMinutes:4800,actualMinutes:5100,actualVerified:true,approvedOtMinutes:60,approvedOtPay:100,approvedDeduction:40,basePay:8000,netPay:8060,visibleToTeacher:true},{id:'sep-leo',staffId:'teacher-leo',month:'2026-09',status:'released',scheduledMinutes:4200,actualMinutes:4200,actualVerified:true,basePay:7000,netPay:7000,visibleToTeacher:true}]});

test('admin monthly payroll filters distinguish scheduled, actual, approved OT, approved deductions and net pay',()=>{
  const source=model(),html=payrollPageMarkup(source,en);
  for(const label of ['Payroll','Month','Teacher','Status','Scheduled','Actual','Approved OT','Approved deductions','Net pay','Maya account','Leo account'])assert.ok(html.includes(label),label);
  assert.doesNotMatch(html,/sep-leo/);
  for(const name of ['month','teacherId','status','query'])assert.match(html,new RegExp(`<(?:input|select)[^>]*name="${name}"[^>]*data-ui-command="payroll-filter"`));
  assert.doesNotMatch(html,/<(?:input|select)[^>]*data-action=/);
  const filtered=advancePayrollUi(source,'payroll-filter',{teacherId:'teacher-leo',status:'approved',query:'Leo'});
  assert.match(payrollPageMarkup(filtered,en),/oct-leo/);assert.doesNotMatch(payrollPageMarkup(filtered,en),/data-ui-id="oct-maya"/);
  assert.equal(source.teacherId,'');assert.equal(source.rows[1].netPay,8060);
});

test('teacher salary records require an exact linked teacher and explicit publication, never account-name inference',()=>{
  const source=model();source.viewer={id:'teacher-account',role:'teacher',teacherResourceIds:[]};
  source.rows.push({id:'own-private',staffId:'teacher-leo',month:'2026-10',visibleToTeacher:false,netPay:99999},{id:'orphan-private',staffId:'teacher-account',month:'2026-10',visibleToTeacher:true,netPay:88888},{id:'other-public',staffId:'teacher-maya',month:'2026-10',visibleToTeacher:true,netPay:77777});
  const html=payrollPageMarkup(source,en);
  assert.match(html,/oct-leo/);assert.doesNotMatch(html,/own-private|orphan-private|other-public|Maya account|Ava without account|99,999|88,888|77,777/);
  assert.doesNotMatch(html,/name="teacherId"|payroll-open-salary/);
  source.viewer={id:'unlinked',role:'teacher',displayName:'Leo account',email:'teacher@example.test',teacherResourceIds:[]};
  assert.doesNotMatch(payrollPageMarkup(source,en),/oct-leo|Leo account|8,060/);
});

test('explicit teacher resource mapping is accepted but published records cannot bypass unknown staff IDs',()=>{
  const source=model();source.viewer={id:'new-account',role:'teacher',teacherResourceIds:['teacher-leo','missing']};
  source.rows.push({id:'missing-record',staffId:'missing',month:'2026-10',visibleToTeacher:true,netPay:500});
  assert.match(payrollPageMarkup(source,en),/oct-leo/);assert.doesNotMatch(payrollPageMarkup(source,en),/missing-record/);
});

test('unknown actual work and adjustments never become zero, inferred OT, Out events or a calculated net amount',()=>{
  const source=model();source.rows=[{id:'unverified-month',staffId:'teacher-leo',month:'2026-10',status:'draft',scheduledMinutes:60,actualMinutes:250,actualVerified:false,clockEvents:[{type:'in',time:'13:50'},{type:'in',time:'18:00'}],basePay:null,approvedOtMinutes:null,approvedOtPay:null,approvedDeduction:null,netPay:null}];
  const html=payrollDialogMarkup(advancePayrollUi(source,'payroll-open-record',{id:'unverified-month'}),en);
  assert.match(html,/Pending verification/);assert.doesNotMatch(html,/250 min|HK\$0|HK\$250|Check Out|Estimated total/);
  assert.equal(source.rows[0].actualMinutes,250);assert.equal(source.rows[0].netPay,null);
});

test('unavailable, failed, loading, genuine empty and filter misses are separate payroll states',()=>{
  const source=model();
  assert.match(payrollPageMarkup({...source,ready:false,rows:[]},en),/Payroll records are not available yet/);
  const failed=payrollPageMarkup({...source,ready:false,error:'secret raw service error'},en);
  assert.match(failed,/Could not load payroll/);assert.doesNotMatch(failed,/secret raw|No payroll records|Loading payroll/);
  assert.match(payrollPageMarkup({...source,ready:false,loading:true},en),/Loading payroll/);
  assert.match(payrollPageMarkup({...source,rows:[]},en),/No payroll records yet/);
  assert.match(payrollPageMarkup({...source,query:'nothing matching'},en),/No matching payroll records/);
});

test('all matching payroll records remain accessible without silently clipping after twenty rows',()=>{
  const source=model();source.rows=Array.from({length:31},(_,i)=>({...source.rows[1],id:`payroll-${i}`}));
  const html=payrollPageMarkup(source,en);assert.equal((html.match(/data-ui-command="payroll-open-record"/g)||[]).length,31);assert.match(html,/data-ui-id="payroll-30"/);
});

test('salary profile keeps unknown, hourly and monthly settings separate and only administrators can edit',()=>{
  const source=model();
  assert.match(salaryProfileMarkup(source,source.staff[0],en),/Monthly salary/);assert.match(salaryProfileMarkup(source,source.staff[0],en),/18,000/);
  assert.match(salaryProfileMarkup(source,source.staff[1],en),/Hourly salary/);assert.match(salaryProfileMarkup(source,source.staff[1],en),/100/);
  const unknown=salaryProfileMarkup(source,source.staff[2],en);assert.match(unknown,/Pending confirmation/);assert.doesNotMatch(unknown,/HK\$0|Hourly salary<\/dd>/);
  const teacher={...source,viewer:{id:'teacher-account',role:'teacher',teacherResourceIds:['teacher-leo']}};
  assert.doesNotMatch(salaryProfileMarkup(teacher,source.staff[1],en),/payroll-open-salary/);
  assert.doesNotMatch(salaryProfileMarkup(teacher,source.staff[0],en),/18,000|Maya account/);
});

test('hourly salary draft reviews and returns with input values while canonical salary remains unchanged',()=>{
  const source=model();let state=advancePayrollUi(source,'payroll-open-salary',{id:'teacher-leo'});
  state=advancePayrollUi(state,'payroll-draft',{hourlyRate:'125.50',note:'Discuss at the next review'});
  state=advancePayrollUi(state,'payroll-review-salary',{salaryType:'hourly',hourlyRate:'125.50',note:'Discuss at the next review'});
  assert.equal(state.dialog.kind,'salary-review');assert.equal(state.dialog.id,'teacher-leo');
  let html=payrollDialogMarkup(state,en);assert.match(html,/Leo account/);assert.match(html,/125\.50/);assert.match(html,/Discuss at the next review/);assert.match(html,/type="submit"[^>]*disabled/);assert.doesNotMatch(html,/Monthly base salary/);
  state=advancePayrollUi(state,'payroll-cancel');assert.equal(state.dialog.kind,'salary-edit');
  html=payrollDialogMarkup(state,en);assert.match(html,/name="hourlyRate"[^>]*value="125\.50"/);
  assert.deepEqual(state.staff,source.staff);assert.equal(source.staff[1].salaryProfile.hourlyRate,100);
});

test('salary type switching retains both drafts but reviews only the selected monthly or hourly route',()=>{
  let state=advancePayrollUi(model(),'payroll-open-salary',{id:'teacher-ava'});
  assert.match(payrollDialogMarkup(state,en),/<option value="" selected/);
  state=advancePayrollUi(state,'payroll-salary-type',{value:'hourly'});
  state=advancePayrollUi(state,'payroll-draft',{hourlyRate:'150'});
  state=advancePayrollUi(state,'payroll-salary-type',{value:'monthly'});
  state=advancePayrollUi(state,'payroll-review-salary',{salaryType:'monthly',monthlyBaseSalary:'18500'});
  assert.equal(state.dialog.kind,'salary-review');assert.equal(state.dialog.draft.hourlyRate,'150');
  const html=payrollDialogMarkup(state,en);assert.match(html,/Monthly salary/);assert.match(html,/18,500/);assert.doesNotMatch(html,/Hourly rate|150\.00/);
  state=advancePayrollUi(state,'payroll-cancel');state=advancePayrollUi(state,'payroll-salary-type',{value:'hourly'});
  assert.match(payrollDialogMarkup(state,en),/name="hourlyRate"[^>]*value="150"/);
});

test('invalid salary review retains draft and identifies missing type or rate instead of coercing blanks into zero',()=>{
  const source=model();let state=advancePayrollUi(source,'payroll-open-salary',{id:'teacher-ava'});
  state=advancePayrollUi(state,'payroll-review-salary',{salaryType:'monthly',monthlyBaseSalary:'',note:'Keep this note'});
  assert.equal(state.dialog.kind,'salary-edit');assert.match(state.formError,/Enter a valid monthly base salary/);assert.equal(state.dialog.draft.note,'Keep this note');
  state=advancePayrollUi(state,'payroll-review-salary',{salaryType:'hourly',hourlyRate:'-1'});
  assert.match(state.formError,/Enter a valid hourly rate/);assert.deepEqual(state.staff,source.staff);
});

test('forged final actions never save, approve, generate, download or create misleading success',()=>{
  const source=model(),opened=advancePayrollUi(source,'payroll-open-salary',{id:'teacher-leo'}),review=advancePayrollUi(opened,'payroll-review-salary',{salaryType:'hourly',hourlyRate:'200'});
  for(const command of ['payroll-save','payroll-approve','payroll-generate','payroll-download']){
    const state=advancePayrollUi(review,command,{id:'oct-leo'});
    assert.deepEqual(state.staff,source.staff);assert.deepEqual(state.rows,source.rows);assert.equal(state.dialog.kind,'salary-review');assert.equal(state.notice||'','');
  }
});

test('unknown staff or record IDs never fall back to another profile or first monthly record',()=>{
  const source=model();
  for(const [command,id] of [['payroll-open-salary','missing-staff'],['payroll-open-record','missing-record']]){
    const state=advancePayrollUi(source,command,{id});assert.equal(state.dialog,null);assert.match(state.formError,/unavailable/i);
  }
  const inaccessible=payrollDialogMarkup({...source,dialog:{kind:'payroll-record',id:'sep-leo'}},en);
  assert.doesNotMatch(inaccessible,/7,000|September|Leo account/);assert.match(inaccessible,/unavailable/i);
});

test('uncreated payslips never become downloadable links and all final business controls remain disabled',()=>{
  const source=model(),html=payrollDialogMarkup(advancePayrollUi(source,'payroll-open-record',{id:'oct-leo'}),en);
  assert.match(html,/Payslip has not been generated/);assert.match(html,/payroll-download[^>]*disabled/);assert.doesNotMatch(html,/<a\b|href=|blob:|data:application\/pdf/);
  for(const locale of [en,zh]){const out=payrollPageMarkup(source,locale)+payrollDialogMarkup(advancePayrollUi(source,'payroll-open-salary',{id:'teacher-leo'}),locale);assert.doesNotMatch(out,/Interface preview|checkpoint|虛構|中期檢查|undefined|NaN/);}
});

test('staff and draft values escape markup in pages, settings and review',()=>{
  const source=model();source.staff[1].displayName='<img src=x onerror=bad()> & Leo';
  const state=advancePayrollUi(advancePayrollUi(source,'payroll-open-salary',{id:'teacher-leo'}),'payroll-review-salary',{salaryType:'hourly',hourlyRate:'100',note:'<script>bad()</script>'});
  const html=payrollPageMarkup(source,en)+payrollDialogMarkup(state,en);assert.match(html,/&lt;img/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<img\b|<script>/);
});

test('embedded teacher payroll retains one workspace heading and keeps source failures apart from validation errors',()=>{
  const source=model();source.ready=false;source.error='Private source error';
  const next=advancePayrollUi(advancePayrollUi(source,'payroll-open-salary',{id:'teacher-leo'}),'payroll-review-salary',{salaryType:'hourly',hourlyRate:''});
  assert.equal(next.error,'Private source error');assert.match(next.formError,/valid hourly rate/);
  const html=payrollPageMarkup(source,{...en,embedded:true});assert.doesNotMatch(html,/<h1\b|Private source error/);assert.doesNotMatch(html,/<h2>Payroll<\/h2>/);
  for(const heading of ['Scheduled','Actual','Approved OT','Approved deductions','Net pay'])assert.ok(html.includes(heading),heading);
});

test('a directly supplied incomplete review never turns a missing amount or salary type into a zero salary',()=>{
  const source=model();
  for(const draft of [{salaryType:'monthly',monthlyBaseSalary:''},{salaryType:'hourly',hourlyRate:null},{}]){
    const html=payrollDialogMarkup({...source,dialog:{kind:'salary-review',id:'teacher-leo',draft}},en);
    assert.doesNotMatch(html,/HK\$0\.00/);assert.match(html,/Pending confirmation|—/);
  }
});

test('historical payroll uses its own salary type snapshot instead of the current teacher profile',()=>{
  const source=model();source.rows=[{...source.rows[1],salaryType:'monthly'}];
  const html=payrollPageMarkup(source,en);assert.match(html,/>Monthly salary<\/td>/);assert.doesNotMatch(html,/>Hourly salary<\/td>/);
  source.rows[0].salaryType=undefined;
  assert.match(payrollPageMarkup(source,en),/>Pending confirmation<\/td>/);
});

test('recognized lateness remains unknown or verified zero without taking a Clock duration as its value',()=>{
  const source=model();source.rows=[{...source.rows[1],approvedLateMinutes:null}];
  const unknown=payrollDialogMarkup(advancePayrollUi(source,'payroll-open-record',{id:'oct-leo'}),en);
  assert.match(unknown,/Recognized late[\s\S]*?<dd>—<\/dd>/);
  source.rows[0].approvedLateMinutes=0;
  const zero=payrollDialogMarkup(advancePayrollUi(source,'payroll-open-record',{id:'oct-leo'}),en);
  assert.match(zero,/Recognized late[\s\S]*?<dd>0 min<\/dd>/);
});

test('admin adjustment draft reviews separately from the recorded net and cancels through the exact original record',()=>{
  const source=model();let state=advancePayrollUi(source,'payroll-open-record',{id:'oct-leo'});
  assert.match(payrollDialogMarkup(state,en),/payroll-open-adjustment/);
  state=advancePayrollUi(state,'payroll-open-adjustment',{id:'oct-leo'});
  assert.equal(state.dialog.kind,'payroll-adjustment');assert.equal(state.dialog.returnTo.id,'oct-leo');
  state=advancePayrollUi(state,'payroll-review-adjustment',{approvedLateMinutes:'12',approvedOtMinutes:'30',approvedOtPay:'75',approvedDeduction:'',note:'Review these adjustments with the teacher'});
  assert.equal(state.dialog.kind,'payroll-adjustment-review');
  const html=payrollDialogMarkup(state,en);assert.match(html,/Recorded net pay[\s\S]*8,060/);assert.match(html,/12 min/);assert.match(html,/30 min/);assert.match(html,/75\.00/);assert.match(html,/Review these adjustments/);assert.match(html,/type="submit"[^>]*disabled/);assert.doesNotMatch(html,/8,135/);
  state=advancePayrollUi(state,'payroll-cancel');assert.equal(state.dialog.kind,'payroll-adjustment');
  assert.equal(state.dialog.draft.approvedDeduction,'');assert.match(payrollDialogMarkup(state,en),/name="approvedLateMinutes"[^>]*value="12"/);
  state=advancePayrollUi(state,'payroll-cancel');assert.deepEqual(state.dialog,{kind:'payroll-record',id:'oct-leo'});
  assert.deepEqual(state.rows,source.rows);assert.equal(source.rows[1].netPay,8060);
});

test('adjustment validation rejects guessed decimal minutes, negative money and keeps the entered draft',()=>{
  const source=model();let state=advancePayrollUi(advancePayrollUi(source,'payroll-open-record',{id:'oct-leo'}),'payroll-open-adjustment',{id:'oct-leo'});
  state=advancePayrollUi(state,'payroll-review-adjustment',{approvedLateMinutes:'1.5',approvedOtMinutes:'30',approvedOtPay:'0',approvedDeduction:'0',note:'Keep my note'});
  assert.equal(state.dialog.kind,'payroll-adjustment');assert.match(state.formError,/whole minutes/);assert.equal(state.dialog.draft.note,'Keep my note');
  state=advancePayrollUi(state,'payroll-review-adjustment',{approvedLateMinutes:'0',approvedOtMinutes:'30',approvedOtPay:'-1',approvedDeduction:'0'});
  assert.equal(state.dialog.kind,'payroll-adjustment');assert.match(state.formError,/valid adjustment amount/);
  assert.deepEqual(state.rows,source.rows);
});

test('teachers and unknown records cannot open adjustment forms, and final approval cannot write review drafts',()=>{
  const source=model(),teacher={...source,viewer:{id:'teacher-account',role:'teacher',teacherResourceIds:['teacher-leo']}};
  const teacherRecord=advancePayrollUi(teacher,'payroll-open-record',{id:'oct-leo'});
  assert.doesNotMatch(payrollDialogMarkup(teacherRecord,en),/payroll-open-adjustment/);
  assert.equal(advancePayrollUi(teacherRecord,'payroll-open-adjustment',{id:'oct-leo'}).dialog.kind,'payroll-record');
  assert.equal(advancePayrollUi(source,'payroll-open-adjustment',{id:'missing'}).dialog,null);
  let review=advancePayrollUi(advancePayrollUi(source,'payroll-open-record',{id:'oct-leo'}),'payroll-open-adjustment',{id:'oct-leo'});
  review=advancePayrollUi(review,'payroll-review-adjustment',{approvedLateMinutes:'0',approvedOtMinutes:'30',approvedOtPay:'50',approvedDeduction:'0',note:'Pending approval'});
  const forged=advancePayrollUi(review,'payroll-approve');assert.deepEqual(forged.rows,source.rows);assert.equal(forged.dialog.kind,'payroll-adjustment-review');assert.equal(forged.notice,'');
});
