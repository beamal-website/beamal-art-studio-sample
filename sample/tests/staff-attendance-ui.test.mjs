import test from 'node:test';
import assert from 'node:assert/strict';
import {attendancePageMarkup,attendanceDialogMarkup,advanceAttendanceUi} from '../client/staff-attendance-ui.js';

const en={t:(_zh,en)=>en};
const fixture=()=>({viewer:{id:'admin',role:'admin',teacherResourceIds:['maya']},staff:[{id:'maya',userId:'admin',displayName:'Maya Lam'},{id:'leo',userId:'teacher',displayName:'Leo Chan'},{id:'ava',userId:'other',displayName:'Ava Hui'}],events:[{id:'leo-in',staffId:'leo',timestamp:'2026-10-15T13:50:00+08:00',label:'in',locationStatus:'normal',distanceMeters:0,photoAvailable:false},{id:'leo-later',staffId:'leo',timestamp:'2026-10-15T18:00:00+08:00',label:'Check In',locationStatus:'offsite',distanceMeters:150,photoAvailable:true,reason:'Covering another studio',photoUrl:'https://private.example.test/photo'},{id:'ava-out',staffId:'ava',timestamp:'2026-10-16T15:20:00+08:00',label:'out',locationStatus:'normal',distanceMeters:80,reason:'Private Ava reason'},{id:'orphan',staffId:'missing',timestamp:'2026-10-17T15:20:00+08:00',label:'out',locationStatus:'normal',reason:'ORPHAN SECRET'}],ready:true,loading:false,error:'',today:'2026-10-15',from:'',to:'',teacherId:'',label:'',locationStatus:'',settingsReady:true,settings:{studioName:'Beamal',address:'Studio A',latitude:22.3,longitude:114.2,preClassMinutes:15,postClassMinutes:30,requirePhoto:null,requireReason:null},dialog:null});
const configured={studioName:'Beamal Central',address:'Studio B',latitude:'22.31',longitude:'114.21',preClassMinutes:'0',postClassMinutes:'30',requirePhoto:'false',requireReason:'true'};
const teacher=()=>({...fixture(),viewer:{id:'teacher',role:'teacher',teacherResourceIds:[]}});

test('teacher workspace embeds clock history below its existing page heading',()=>{
 const html=attendancePageMarkup(teacher(),{...en,embedded:true});
 assert.doesNotMatch(html,/<h1\b|<h2>Staff attendance<\/h2>/);assert.match(html,/<h2>Clock records<\/h2>/);
});

test('unknown source retains headings and named filters without inventing zero events',()=>{
 const html=attendancePageMarkup({...fixture(),ready:false,events:[]},en);
 assert.match(html,/Clock records are not available yet/);assert.match(html,/name="from"/);assert.match(html,/name="teacherId"/);assert.match(html,/name="locationStatus"/);assert.doesNotMatch(html,/No clock events|0 events/);
});
test('admin sees only stable staff events as independent rows without paired clock or hours',()=>{
 const html=attendancePageMarkup(fixture(),en);
 assert.match(html,/data-ui-id="leo-in"/);assert.match(html,/data-ui-id="leo-later"/);assert.match(html,/data-ui-id="ava-out"/);assert.doesNotMatch(html,/orphan|ORPHAN SECRET|Actual hours|Clock out<\/th>|In progress/);assert.match(html,/>0 m</);assert.match(html,/Check In/);assert.match(html,/Check Out/);
});
test('teacher is scoped by explicit account link and cannot see another teacher or their reason',()=>{
 const html=attendancePageMarkup(teacher(),en);
 assert.match(html,/leo-in/);assert.doesNotMatch(html,/ava-out|Ava Hui|Private Ava reason|Attendance settings/);
 const denied=advanceAttendanceUi(teacher(),'attendance-open-event',{id:'ava-out'},en);
 assert.equal(denied.dialog,null);assert.doesNotMatch(attendanceDialogMarkup({...teacher(),dialog:{kind:'attendance-event',id:'ava-out'}},en),/Private Ava reason/);
});
test('resource link permits own events without user link but undefined links never match',()=>{
 const model={...fixture(),viewer:{id:'unlinked',role:'teacher',teacherResourceIds:['ava']}};
 assert.match(attendancePageMarkup(model,en),/ava-out/);assert.doesNotMatch(attendancePageMarkup(model,en),/leo-in/);
 const noLink={...fixture(),viewer:{role:'teacher'},staff:[{id:'ava',displayName:'Ava Hui'}]};
 assert.doesNotMatch(attendancePageMarkup(noLink,en),/ava-out/);
});
test('event filters combine dates teacher label and location without changing stored events',()=>{
 const model=fixture(),before=structuredClone(model.events);
 const next=advanceAttendanceUi(model,'attendance-filter',{from:'2026-10-15',to:'2026-10-15',teacherId:'leo',label:'in',locationStatus:'offsite'},en);
 const html=attendancePageMarkup(next,en);
 assert.match(html,/leo-later/);assert.doesNotMatch(html,/data-ui-id="leo-in"|ava-out/);assert.deepEqual(next.events,before);assert.equal(model.from,'');
});
test('reversed and impossible filter dates keep applied range and report the input problem',()=>{
 const model={...fixture(),from:'2026-10-15',to:'2026-10-16'};
 for(const fields of [{from:'2026-10-17',to:'2026-10-15'},{from:'2026-02-30'}]){
  const next=advanceAttendanceUi(model,'attendance-filter',fields,en);
  assert.equal(next.from,model.from);assert.equal(next.to,model.to);assert.ok(next.validationError);
 }
});
test('unknown event values remain unknown and do not infer check out or a location from distance',()=>{
 const model={...fixture(),events:[{id:'unknown',staffId:'leo',timestamp:'2026-10-15T18:00:00+08:00',distanceMeters:150}]};
 const html=attendancePageMarkup(model,en);assert.match(html,/Label unavailable/);assert.match(html,/Location status unavailable/);assert.doesNotMatch(html,/In progress|data-location-status="offsite"/);
});
test('exact event detail reveals only authorized metadata and never embeds external photo URLs',()=>{
 const next=advanceAttendanceUi(fixture(),'attendance-open-event',{id:'leo-later'},en),html=attendanceDialogMarkup(next,en);
 assert.equal(next.dialog.id,'leo-later');assert.match(html,/Covering another studio/);assert.match(html,/Photo attached/);assert.doesNotMatch(html,/private\.example|<img|download=/);
 const missing=advanceAttendanceUi(fixture(),'attendance-open-event',{id:'missing'},en);assert.equal(missing.dialog,null);
});
test('stale dialogs and orphan events never fall back to another record',()=>{
 for(const id of ['missing','orphan']){
  const html=attendanceDialogMarkup({...fixture(),dialog:{kind:'attendance-event',id}},en);
  assert.match(html,/Clock event is unavailable/);assert.doesNotMatch(html,/Covering another studio|Private Ava reason|ORPHAN SECRET/);
 }
});
test('teacher cannot open or forge settings review or render private settings',()=>{
 for(const command of ['attendance-open-settings','attendance-review-settings','attendance-draft','attendance-save-settings']){
  const next=advanceAttendanceUi(teacher(),command,configured,en);assert.equal(next.dialog,null);assert.deepEqual(next.settings,teacher().settings);
 }
 assert.doesNotMatch(attendanceDialogMarkup({...teacher(),dialog:{kind:'attendance-settings',draft:configured}},en),/22\.31|Studio B|Require photo/);
});
test('unknown photo and reason choices remain two independent unset settings',()=>{
 const next=advanceAttendanceUi(fixture(),'attendance-open-settings',{},en),html=attendanceDialogMarkup(next,en);
 assert.equal(next.dialog.draft.requirePhoto,null);assert.equal(next.dialog.draft.requireReason,null);assert.match(html,/name="requirePhoto"/);assert.match(html,/name="requireReason"/);assert.equal((html.match(/value="" selected/g)||[]).length,2);assert.match(html,/100 m/);
});
test('review rejects unknown independent policies and does not treat empty numeric values as zero',()=>{
 const opened=advanceAttendanceUi(fixture(),'attendance-open-settings',{},en);
 for(const fields of [{...configured,requireReason:''},{...configured,requirePhoto:''},{...configured,latitude:''},{...configured,preClassMinutes:''},{...configured,postClassMinutes:'-1'},{...configured,longitude:'181'}]){
  const next=advanceAttendanceUi(opened,'attendance-review-settings',fields,en);
  assert.equal(next.dialog.kind,'attendance-settings');assert.ok(next.validationError);assert.deepEqual(next.settings,fixture().settings);
 }
});
test('settings review keeps false distinct from unknown, zero window valid and original settings unchanged',()=>{
 const model=fixture(),opened=advanceAttendanceUi(model,'attendance-open-settings',{},en),next=advanceAttendanceUi(opened,'attendance-review-settings',configured,en);
 assert.equal(next.dialog.kind,'attendance-review');assert.equal(next.dialog.draft.requirePhoto,false);assert.equal(next.dialog.draft.requireReason,true);assert.equal(next.dialog.draft.preClassMinutes,0);assert.deepEqual(next.settings,model.settings);assert.deepEqual(model.dialog,null);
 const html=attendanceDialogMarkup(next,en);assert.match(html,/Require photo/);assert.match(html,/Require reason/);assert.match(html,/Save settings[\s\S]*|disabled/);assert.match(html,/<button[^>]*disabled[^>]*>Save settings<\/button>/);
});
test('draft changes survive review and back; cancelling settings or event closes without persistence',()=>{
 let next=advanceAttendanceUi(fixture(),'attendance-open-settings',{},en);
 next=advanceAttendanceUi(next,'attendance-draft',configured,en);
 assert.equal(next.dialog.draft.address,'Studio B');
 next=advanceAttendanceUi(next,'attendance-review-settings',{},en);
 next=advanceAttendanceUi(next,'attendance-cancel',{},en);
 assert.equal(next.dialog.kind,'attendance-settings');assert.equal(next.dialog.draft.requirePhoto,false);assert.equal(next.dialog.draft.address,'Studio B');
 next=advanceAttendanceUi(next,'attendance-cancel',{},en);assert.equal(next.dialog,null);assert.equal(next.settings.address,'Studio A');
 next=advanceAttendanceUi(next,'attendance-open-settings',{},en);assert.equal(next.dialog.draft.address,'Studio A');
});
test('forged final save confirm clock and downloads have no writes or success signal',()=>{
 const opened=advanceAttendanceUi(fixture(),'attendance-open-settings',{},en),review=advanceAttendanceUi(opened,'attendance-review-settings',configured,en);
 for(const command of ['attendance-save-settings','attendance-confirm','attendance-clock','attendance-download']){
  const next=advanceAttendanceUi(review,command,configured,en);assert.deepEqual(next,review);assert.deepEqual(next.events,fixture().events);assert.equal(next.notice,undefined);
 }
});
test('settings review never starts from a forged form outside a current settings dialog',()=>{
 const next=advanceAttendanceUi(fixture(),'attendance-review-settings',configured,en);assert.equal(next.dialog,null);assert.deepEqual(next.settings,fixture().settings);
});
test('read failures distinguish unavailable from known empty data and retain authorized loaded events',()=>{
 const first=attendancePageMarkup({...fixture(),ready:false,error:'read failed',events:[]},en);assert.match(first,/Could not load clock records/);assert.doesNotMatch(first,/No clock events/);
 const stale=attendancePageMarkup({...fixture(),ready:true,error:'read failed'},en);assert.match(stale,/Showing the last loaded records/);assert.match(stale,/leo-in/);
 assert.match(attendancePageMarkup({...fixture(),events:[]},en),/No clock events/);
});
test('source errors never disclose private diagnostic payloads in page or settings',()=>{
 const model={...fixture(),ready:false,error:'PRIVATE API PAYLOAD <script>secret()</script>'};
 assert.doesNotMatch(attendancePageMarkup(model,en),/PRIVATE|secret\(\)|script/);
 const opened=advanceAttendanceUi(model,'attendance-open-settings',{},en);
 assert.doesNotMatch(attendanceDialogMarkup(opened,en),/PRIVATE|secret\(\)|script/);
 assert.match(attendancePageMarkup(opened,en),/Could not load clock records/);
});
test('invalid filter drafts remain visible without changing results or posing as source failure',()=>{
 let model={...fixture(),from:'2026-09-01',to:'2026-09-30'};
 model=advanceAttendanceUi(model,'attendance-filter',{from:'2026-10-17',to:'2026-10-15'},en);
 let html=attendancePageMarkup(model,en);
 assert.match(html,/name="from" value="2026-10-17"[^>]*aria-invalid="true"/);assert.match(html,/name="to" value="2026-10-15"[^>]*aria-invalid="true"/);
 assert.match(html,/previous valid filters/);assert.doesNotMatch(html,/Could not update|No clock events/);assert.equal(model.from,'2026-09-01');
 model=advanceAttendanceUi(model,'attendance-filter',{to:'2026-10-18'},en);
 html=attendancePageMarkup(model,en);assert.equal(model.from,'2026-10-17');assert.equal(model.to,'2026-10-18');assert.doesNotMatch(html,/aria-invalid="true"|previous valid filters/);
});
test('opening and cancelling a settings dialog does not hide an outstanding filter date error',()=>{
 let model=advanceAttendanceUi(fixture(),'attendance-filter',{from:'2026-10-17',to:'2026-10-15'},en);
 model=advanceAttendanceUi(model,'attendance-open-settings',{},en);
 model=advanceAttendanceUi(model,'attendance-cancel',{},en);
 const html=attendancePageMarkup(model,en);assert.match(html,/aria-invalid="true"/);assert.match(html,/Check the from and to dates/);assert.match(html,/previous valid filters/);
});
test('missing current identity cannot render staff events reasons settings or advance private dialogs',()=>{
 for(const role of ['admin','teacher'])for(const id of [undefined,'','   ']){
  const model={...fixture(),viewer:{id,role,teacherResourceIds:['leo']}};
  const html=attendancePageMarkup(model,en);assert.doesNotMatch(html,/Leo Chan|leo-in|Maya Lam|Attendance settings/);assert.match(html,/Account details are unavailable/);
  for(const dialog of [{kind:'attendance-event',id:'leo-later'},{kind:'attendance-settings',draft:configured},{kind:'attendance-review',draft:configured}])assert.doesNotMatch(attendanceDialogMarkup({...model,dialog},en),/Covering another studio|22\.31|Studio B/);
  for(const command of ['attendance-open-event','attendance-open-settings','attendance-review-settings','attendance-draft','attendance-filter'])assert.deepEqual(advanceAttendanceUi(model,command,{...configured,id:'leo-later',from:'2026-10-10'},en),model);
 }
});
test('unavailable teacher selection retains intent and never silently applies all teachers',()=>{
 const model={...fixture(),teacherId:'leo'};
 const next=advanceAttendanceUi(model,'attendance-filter',{teacherId:'missing'},en);
 assert.equal(next.teacherId,'leo');assert.equal(next.filterDraft.teacherId,'missing');
 const html=attendancePageMarkup(next,en);assert.match(html,/Selected teacher unavailable/);assert.match(html,/Choose an available teacher/);assert.doesNotMatch(html,/ava-out/);
 const stale={...model,staff:model.staff.filter(row=>row.id!=='leo')};
 assert.doesNotMatch(attendancePageMarkup(stale,en),/leo-in|ava-out|No clock events/);assert.match(attendancePageMarkup(stale,en),/Selected teacher unavailable/);
});
const visibleText=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
test('clock list and event details show a readable source-local date time and offset in both languages',()=>{
 const model={...fixture(),events:[{...fixture().events[0],timestamp:'2026-10-15T18:30:07+08:00'}]};
 for(const [ctx,date] of [[en,'15 Oct 2026'],[{t:zh=>zh},'2026年10月15日']]){
  for(const html of [attendancePageMarkup(model,ctx),attendanceDialogMarkup({...model,dialog:{kind:'attendance-event',id:'leo-in'}},ctx)]){
   const text=visibleText(html);assert.ok(text.includes(date));assert.match(text,/18:30:07/);assert.match(text,/UTC\+08:00/);assert.doesNotMatch(text,/2026-10-15T18:30:07\+08:00|Timestamp/);
  }
 }
 assert.match(attendancePageMarkup(model,en),/>Clock time</);
});
test('clock formatting preserves seconds fractions and negative or UTC offsets without device conversion',()=>{
 for(const [timestamp,date,time,offset] of [['2026-10-15T23:59:58.125-04:00','15 Oct 2026','23:59:58.125','UTC-04:00'],['2026-10-15T00:00:01Z','15 Oct 2026','00:00:01','UTC'],['2026-10-15T18:30+05:30','15 Oct 2026','18:30','UTC+05:30']]){
  const model={...fixture(),events:[{...fixture().events[0],timestamp}]},text=visibleText(attendancePageMarkup(model,en));
  for(const part of [date,time,offset])assert.ok(text.includes(part),part);assert.doesNotMatch(text,/16 Oct 2026/);assert.equal(model.events[0].timestamp,timestamp);
 }
});
test('unknown and invalid clock timestamps never create a date or expose the invalid source as a clock time',()=>{
 for(const timestamp of [undefined,null,'not-a-time','2026-02-30T18:30:00+08:00','2026-10-15T25:30:00+08:00','2026-10-15T18:30:00+99:00']){
  const model={...fixture(),events:[{...fixture().events[0],timestamp}]};
  for(const html of [attendancePageMarkup(model,en),attendanceDialogMarkup({...model,dialog:{kind:'attendance-event',id:'leo-in'}},en)]){
   const text=visibleText(html);assert.match(text,/Clock time unavailable/);assert.doesNotMatch(text,/not-a-time|2026-02-30T|2026-10-15T25|UTC\+99|15 Oct 2026|30 Feb 2026/);
  }
 }
});
test('a timestamp without an offset keeps its source time and explicitly leaves the zone unknown',()=>{
 const model={...fixture(),events:[{...fixture().events[0],timestamp:'2026-10-15T18:30:00'}]},text=visibleText(attendancePageMarkup(model,en));
 assert.match(text,/15 Oct 2026/);assert.match(text,/18:30:00/);assert.match(text,/Time zone unavailable/);assert.doesNotMatch(text,/UTC\+08:00/);
});
