import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarSharingPageMarkup,calendarSharingDialogMarkup,advanceCalendarSharingUi,calendarSharingCopySource} from '../client/staff-calendar-sharing-ui.js';
const en={t:(_zh,en)=>en,canCopyCalendarSharing:true},zh={t:zh=>zh,canCopyCalendarSharing:true};
const model=()=>({viewer:{id:'admin-user',role:'admin',teacherResourceIds:['staff-maya']},staff:[{id:'staff-maya',userId:'admin-user',displayName:'Maya Lam'},{id:'staff-leo',userId:'teacher-user',displayName:'Leo Chan'}],profileStaffId:'staff-leo',records:[{staffId:'staff-leo',enabled:true,url:'https://calendar.example.test/shared/existing-token.ics'},{staffId:'staff-maya',enabled:true,url:'https://calendar.example.test/another-private-token.ics'}],ready:true,loading:false,error:'',dialog:null});

test('known enabled source shows a readonly exact URL and an actual callback-gated copy control in both languages',()=>{
 const source=model();for(const locale of [en,zh]){const html=calendarSharingPageMarkup(source,locale);assert.match(html,/value="https:\/\/calendar\.example\.test\/shared\/existing-token\.ics"[^>]*readonly/);assert.match(html,/data-ui-command="calendar-sharing-copy"[^>]*data-ui-id="staff-leo"/);assert.doesNotMatch(html,/another-private-token|<a\b|<iframe|Google|Apple/);}
 assert.match(calendarSharingPageMarkup(source,{...en,canCopyCalendarSharing:false}),/calendar-sharing-copy[^>]*disabled/);
 assert.match(calendarSharingPageMarkup(source,{}),/calendar-sharing-copy[^>]*disabled/);
});

test('unknown loading failed disabled enabled-no-link and a known empty source are distinct',()=>{
 const source=model();const unknown=calendarSharingPageMarkup({...source,ready:false},en);assert.match(unknown,/Calendar sharing details are not available yet/);assert.doesNotMatch(unknown,/existing-token|Sharing enabled|Sharing disabled/);
 assert.match(calendarSharingPageMarkup({...source,ready:false,loading:true},en),/Loading calendar sharing/);
 const failed=calendarSharingPageMarkup({...source,ready:false,error:'Private raw error'},en);assert.match(failed,/Could not load calendar sharing/);assert.doesNotMatch(failed,/Private raw error|existing-token/);
 const disabled=calendarSharingPageMarkup({...source,records:[{staffId:'staff-leo',enabled:false,url:source.records[0].url}]},en);assert.match(disabled,/Sharing disabled/);assert.doesNotMatch(disabled,/existing-token/);
 const noLink=calendarSharingPageMarkup({...source,records:[{staffId:'staff-leo',enabled:true}]},en);assert.match(noLink,/Sharing enabled/);assert.match(noLink,/Sharing link is not available yet/);
 assert.match(calendarSharingPageMarkup({...source,records:[]},en),/Current sharing status is unavailable/);
});

test('only safe absolute source URLs can be exposed and unsafe or disabled URLs never become copyable',()=>{
 const source=model(),render=url=>calendarSharingPageMarkup({...source,records:[{staffId:'staff-leo',enabled:true,url}]},en);
 for(const url of ['javascript:alert(1)','data:text/html,bad','https://user:password@calendar.example.test/a','https://calendar.example.test/a\n','https://calendar.example.test/a\t','/relative.ics','https://','https://calendar.example.test\\fake']){
  const html=render(url);assert.match(html,/calendar-sharing-copy[^>]*disabled/);assert.doesNotMatch(html,/value="(?:javascript:|data:|https:\/\/user:password)/);
 }
 for(const url of ['https://calendar.example.test/a.ics','http://127.0.0.1:5180/example.ics','webcal://calendar.example.test/a.ics'])assert.ok(render(url).includes(`value="${url}"`),url);
});

test('teacher sees only their explicit profile, cannot mutate and explicit empty authority does not borrow a stale user link',()=>{
 const source=model();source.viewer={id:'teacher-user',role:'teacher',teacherResourceIds:['staff-leo']};const html=calendarSharingPageMarkup(source,en);assert.match(html,/existing-token/);assert.doesNotMatch(html,/another-private-token|calendar-sharing-open/);
 assert.equal(advanceCalendarSharingUi(source,'calendar-sharing-open',{id:'staff-leo'},en).dialog,null);
 const revoked={...source,viewer:{...source.viewer,teacherResourceIds:[]}};assert.doesNotMatch(calendarSharingPageMarkup(revoked,en),/existing-token|Leo Chan|calendar-sharing-copy/);
 const other={...source,profileStaffId:'staff-maya'};assert.doesNotMatch(calendarSharingPageMarkup(other,en),/another-private-token|Maya Lam/);
});

test('student missing and whitespace identities or orphan profiles do not render sharing secrets',()=>{
 const source=model();for(const viewer of [{id:'student',role:'student'},{id:' ',role:'admin'},{}])assert.doesNotMatch(calendarSharingPageMarkup({...source,viewer},en),/existing-token|another-private-token|Leo Chan|calendar-sharing-open/);
 assert.doesNotMatch(calendarSharingPageMarkup({...source,profileStaffId:'unknown-profile'},en),/existing-token|another-private-token/);
});

test('profile fixed identity cannot be switched through forged open draft review or copy fields',()=>{
 const source=model();let state=advanceCalendarSharingUi(source,'calendar-sharing-open',{id:'staff-maya'},en);assert.equal(state.dialog,null);
 state=advanceCalendarSharingUi(source,'calendar-sharing-open',{id:'staff-leo'},en);assert.equal(state.dialog.id,'staff-leo');
 state=advanceCalendarSharingUi(state,'calendar-sharing-review',{enabled:'false',staffId:'staff-maya',url:'https://attacker.example.test'},en);assert.equal(state.dialog.id,'staff-leo');assert.equal(state.profileStaffId,'staff-leo');assert.deepEqual(state.records,source.records);
});

test('admin unknown status requires an explicit choice and review/back/cancel retain the draft without applying it',()=>{
 const source={...model(),ready:false,records:[]};let state=advanceCalendarSharingUi(source,'calendar-sharing-open',{id:'staff-leo'},en);assert.equal(state.dialog.kind,'calendar-sharing-edit');assert.equal(state.dialog.draft.enabled,'');assert.match(calendarSharingDialogMarkup(state,en),/<option value="" selected/);
 const invalid=advanceCalendarSharingUi(state,'calendar-sharing-review',{enabled:''},en);assert.equal(invalid.dialog.kind,'calendar-sharing-edit');assert.ok(invalid.formError);
 state=advanceCalendarSharingUi(state,'calendar-sharing-review',{enabled:'true'},en);assert.equal(state.dialog.kind,'calendar-sharing-review');const html=calendarSharingDialogMarkup(state,en);assert.match(html,/Anyone with the link may be able to read the calendar/);assert.match(html,/not been applied/);assert.match(html,/calendar-sharing-save[^>]*disabled/);assert.doesNotMatch(html,/https:\/\/calendar|existing-token/);
 state=advanceCalendarSharingUi(state,'calendar-sharing-cancel',{},en);assert.equal(state.dialog.kind,'calendar-sharing-edit');assert.equal(state.dialog.draft.enabled,'true');state=advanceCalendarSharingUi(state,'calendar-sharing-cancel',{},en);assert.equal(state.dialog,null);assert.deepEqual(state.records,source.records);
});

test('known false initializes an explicit disabled draft without altering the source URL or claiming saved changes',()=>{
 const source={...model(),records:[{staffId:'staff-leo',enabled:false}]};let state=advanceCalendarSharingUi(source,'calendar-sharing-open',{},en);assert.equal(state.dialog.draft.enabled,'false');state=advanceCalendarSharingUi(state,'calendar-sharing-draft',{enabled:'true'},en);assert.equal(state.dialog.draft.enabled,'true');assert.equal(state.records[0].enabled,false);
});

test('copy source uses only the current canonical URL and success waits for an actual host callback result',()=>{
 const source=model(),state=advanceCalendarSharingUi(source,'calendar-sharing-copy',{id:'staff-leo',url:'https://attacker.example.test'},en);
 assert.deepEqual(calendarSharingCopySource(source,en),{staffId:'staff-leo',url:source.records[0].url});assert.equal(state.notice||'','');assert.equal(state.copyRequest,undefined);assert.deepEqual(state.records,source.records);
 assert.equal(calendarSharingCopySource(source,{...en,canCopyCalendarSharing:false}),null);
 const success=advanceCalendarSharingUi(state,'calendar-sharing-copy-result',{ok:true},en);assert.match(success.notice,/copied/);
 const failed=advanceCalendarSharingUi(state,'calendar-sharing-copy-result',{ok:false},en);assert.match(failed.formError,/Could not copy/);assert.equal(failed.notice,'');
 const forged=advanceCalendarSharingUi(state,'calendar-sharing-copy-result',{ok:'true'},en);assert.equal(forged.notice,'');
});

test('stale identity or profile changes revoke an open draft and its copy intent instead of retaining another profile',()=>{
 let state=advanceCalendarSharingUi(model(),'calendar-sharing-open',{id:'staff-leo'},en);state=advanceCalendarSharingUi(state,'calendar-sharing-review',{enabled:'true'},en);
 const changed={...state,viewer:{id:'other-teacher',role:'teacher',teacherResourceIds:['staff-maya']}};assert.doesNotMatch(calendarSharingDialogMarkup(changed,en),/Leo Chan|existing-token|id="ui-calendar-sharing-form"/);const next=advanceCalendarSharingUi(changed,'calendar-sharing-save',{},en);assert.equal(next.dialog,null);assert.equal(next.copyRequest,undefined);
 const wrongProfile={...state,profileStaffId:'staff-maya'};assert.doesNotMatch(calendarSharingDialogMarkup(wrongProfile,en),/Leo Chan|id="ui-calendar-sharing-form"/);
});

test('ambiguous duplicate source rows or nonboolean flags never borrow the first URL or infer enabled status',()=>{
 const source=model(),duplicate={...source,records:[source.records[0],{...source.records[0],enabled:false}]};assert.doesNotMatch(calendarSharingPageMarkup(duplicate,en),/existing-token/);assert.match(calendarSharingPageMarkup(duplicate,en),/Current sharing status is unavailable/);
 for(const enabled of ['true',1,null,undefined])assert.doesNotMatch(calendarSharingPageMarkup({...source,records:[{staffId:'staff-leo',enabled,url:source.records[0].url}]},en),/existing-token|Sharing enabled/);
});

test('forged save never mutates enabled state or generates links and embedding escapes profile names',()=>{
 const source=model();let state=advanceCalendarSharingUi(source,'calendar-sharing-open',{},en);state=advanceCalendarSharingUi(state,'calendar-sharing-review',{enabled:'false'},en);const final=advanceCalendarSharingUi(state,'calendar-sharing-save',{enabled:'false'},en);assert.deepEqual(final.records,source.records);assert.equal(final.dialog.kind,'calendar-sharing-review');assert.equal(final.notice||'','');
 source.staff[1].displayName='<script>Leo</script>';assert.match(calendarSharingPageMarkup(source,en),/&lt;script&gt;Leo&lt;\/script&gt;/);const html=calendarSharingPageMarkup(source,{...en,embedded:true,profile:true});assert.doesNotMatch(html,/<h1\b|<h2\b|<script>/);
});

test('a present malformed self list cannot restore sharing access through a stale user link',()=>{
 const source=model();for(const teacherResourceIds of [null,'staff-leo',{},1]){
  const malformed={...source,viewer:{id:'teacher-user',role:'teacher',teacherResourceIds}};
  assert.doesNotMatch(calendarSharingPageMarkup(malformed,en),/existing-token|Leo Chan|calendar-sharing-copy/);
  assert.equal(calendarSharingCopySource(malformed,en),null);
 }
 const legacy={...source,viewer:{id:'teacher-user',role:'teacher'}};
 assert.match(calendarSharingPageMarkup(legacy,en),/existing-token/);
});

test('duplicate staff identities make the fixed profile unavailable instead of choosing one private record',()=>{
 const source=model();source.staff.push({id:'staff-leo',userId:'other-teacher',displayName:'Another Leo'});
 for(const viewer of [source.viewer,{id:'teacher-user',role:'teacher',teacherResourceIds:['staff-leo']}]){
  const ambiguous={...source,viewer};
  assert.doesNotMatch(calendarSharingPageMarkup(ambiguous,en),/existing-token|Leo Chan|Another Leo|calendar-sharing-open/);
  assert.equal(calendarSharingCopySource(ambiguous,en),null);
  assert.equal(advanceCalendarSharingUi(ambiguous,'calendar-sharing-open',{id:'staff-leo'},en).dialog,null);
 }
});
