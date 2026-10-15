import test from 'node:test';
import assert from 'node:assert/strict';
import { availabilityEditorMarkup, availabilityDetailMarkup, publicCourseDirectoryMarkup, publicCourseDetailsMarkup, availabilityPublicSettingsMarkup } from '../client/availability-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ui = language => ({ t: (zh, en) => language === 'en' ? en : zh, esc });
const course = { id: 'course-a', courseName: 'Fictional art class', category: 'Drawing', level: 'Beginner' };
const courses = [course, { id: 'course-b', courseName: 'Other art class' }];
const resources = [{ id: 'teacher-a', kind: 'teacher', displayName: 'Fictional teacher A', active: true }, { id: 'room-a', kind: 'room', displayName: 'Room A', active: true }];
const slot = {
  id: 'slot-a', courseId: 'course-a', date: '2026-10-15', time: '14:00', duration: 60,
  teacherIds: ['teacher-a'], roomIds: ['room-a'], teacherNames: ['Fictional teacher A'], roomNames: ['Room A'],
  totalCapacity: 10, trialCapacity: 3, reschedulingCapacity: 2, trialEnabled: true,
  reschedulingEnabled: true, reschedulingVisible: true, active: true, publicVisibility: 'default', remark: 'Private note',
  excludedStudentIds: ['private-person-a'], version: 4, sourceAvailable: true, unavailableReason: '',
  trialReserved: 1, reschedulingReserved: 0, totalReserved: null, trialRemaining: 2, reschedulingRemaining: 2, trialStatus: 'available',
};
const occurrences = [{ sequence: 2, date: '2026-10-16', item: { id: 'schedule-a', course: 'course-b', time: '16:00', duration: 45, teacherIds: ['teacher-a'], roomIds: ['room-a'] } }];
const tagById = (html, id) => html.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`))?.[0] || '';

test('public course colour stays attached to the exact named course in directory details and management preview',()=>{
 const coloured={...course,courseName:'Watercolour <A> & friends',publicColor:'#A1B2C3'},other={...course,id:'other-course',courseName:'Other course',publicColor:'#ffffff'};
 const directory=publicCourseDirectoryMarkup({courses:[coloured,other]},ui('en'));
 assert.match(directory,/--public-course-colour:#a1b2c3/);assert.match(directory,/--public-course-colour:#ffffff/);assert.match(directory,/Watercolour &lt;A&gt; &amp; friends/);
 for(const managementPreview of [false,true]){
  const html=publicCourseDetailsMarkup({course:coloured,slots:[{...slot,classAvailability:'full',trialRemaining:2}],from:slot.date},{...ui('en'),managementPreview,trialPreview:!managementPreview});
  assert.match(html,/--public-course-colour:#a1b2c3/);assert.match(html,/Watercolour &lt;A&gt; &amp; friends/);assert.match(html,/data-public-class-status="full"/);assert.match(html,/2 places remaining/);assert.doesNotMatch(html,/--teacher-colour|#ffffff|<A>/);
 }
});

test('missing or malformed public course colours never invent a colour or interpolate unsafe CSS',()=>{
 for(const publicColor of [undefined,null,'red','#123','#123456;display:none','url(https://example.test)',{},['#abcdef']]){
  const actual={...course,publicColor};for(const html of [publicCourseDirectoryMarkup({courses:[actual]},ui('en')),publicCourseDetailsMarkup({course:actual,slots:[slot],from:slot.date},ui('en'))]){
   assert.doesNotMatch(html,/--public-course-colour:|url\(https|display:none|\[object Object\]/);assert.ok(html.includes(course.courseName));assert.ok(html.includes('View times')||html.includes('data-availability-slot-id="slot-a"'));
  }
 }
});

test('published class and trial availability remain independent and only configured class labels are shown',()=>{
 const html=publicCourseDetailsMarkup({course,slots:[{...slot,classAvailability:'full',classType:{kind:'regular',name:'Regular Class',studentReschedulingAllowed:false,id:'PRIVATE_TYPE'}}],from:'2026-10-15'},{...ui('en'),trialPreview:true});
 assert.match(html,/data-public-class-status="full"/);assert.match(html,/Regular Class/);assert.match(html,/Class places/);assert.match(html,/Trial places/);assert.match(html,/2 places remaining/);assert.doesNotMatch(html.match(/<button[^>]*class="availability-trial-preview"[^>]*>/)?.[0]||'',/disabled/);assert.doesNotMatch(html,/PRIVATE_TYPE|Student rescheduling|not allowed/);
 const inverse=publicCourseDetailsMarkup({course,slots:[{...slot,classAvailability:'available',trialStatus:'full',trialRemaining:0}],from:'2026-10-15'},{...ui('en'),trialPreview:true});
 assert.match(inverse,/data-public-class-status="available"/);assert.match(inverse,/Trial places/);assert.match(inverse.match(/<button[^>]*class="availability-trial-preview"[^>]*>/)?.[0]||'',/disabled/);
});

test('unknown classes and standalone times never invent a Regular label or available class places',()=>{
 const unknown=publicCourseDetailsMarkup({course,slots:[{...slot,classAvailability:'unknown',classType:null}],from:'2026-10-15'},ui('en'));
 assert.match(unknown,/data-public-class-status="unknown"/);assert.match(unknown,/To be confirmed/);assert.doesNotMatch(unknown,/Regular Class|0 places remaining/);
 const standalone=publicCourseDetailsMarkup({course,slots:[{...slot,classAvailability:null,classType:{kind:'regular',name:'Regular Class'}}],from:'2026-10-15'},ui('en'));
 assert.doesNotMatch(standalone,/data-public-class-status=|Regular Class/);
});

test('public type filters use only published class trial and enabled visible rescheduling facts',()=>{
 const records=[{...slot,id:'class-only',classAvailability:'unknown',trialEnabled:false,reschedulingVisible:false},{...slot,id:'trial-only',classAvailability:null,reschedulingVisible:false,trialStatus:'full',trialRemaining:0},{...slot,id:'reschedule-only',classAvailability:null,trialEnabled:false},{...slot,id:'closed-reschedule',classAvailability:null,trialEnabled:false,reschedulingEnabled:false}];
 for(const [slotType,expected]of [['class',['class-only']],['trial',['trial-only']],['rescheduling',['reschedule-only']]]){
  const html=publicCourseDetailsMarkup({course,slots:records,from:'2026-10-15',slotType},ui('en'));assert.deepEqual([...html.matchAll(/data-availability-slot-id="([^"]+)"/g)].map(m=>m[1]),expected);assert.match(html,new RegExp(`<option value="${slotType}" selected>`));
 }
 const hidden=publicCourseDetailsMarkup({course,slots:[records[3]],from:'2026-10-15'},ui('en'));assert.doesNotMatch(hidden,/<strong>Rescheduling/);
});

test('a public filter with no matching published times has a distinct clear-filter state',()=>{
 const html=publicCourseDetailsMarkup({course,slots:[{...slot,classAvailability:null}],from:'2026-10-15',slotType:'class'},ui('en'));
 assert.match(html,/No times match this filter/);assert.match(html,/data-action="availability-public-type-reset"/);assert.doesNotMatch(html,/data-availability-slot-id=|No available times/);
 const preview=publicCourseDetailsMarkup({course,slots:[{...slot,classAvailability:null}],from:'2026-10-15',slotType:'class'},{...ui('en'),managementPreview:true});assert.match(preview,/data-action="availability-preview-type-reset"/);assert.doesNotMatch(preview,/availability-public-type-reset/);
});

test('public class types are escaped without exposing rules and the availability key has text labels',()=>{
 for(const language of ['zh','en']){
  const html=publicCourseDetailsMarkup({course,slots:[{...slot,classAvailability:'available',classType:{kind:'custom',name:'<Long & type>',studentReschedulingAllowed:false,version:12345}}],from:'2026-10-15'},ui(language));
  assert.match(html,/&lt;Long &amp; type&gt;/);assert.doesNotMatch(html,/<Long|12345|studentReschedulingAllowed|data-teacher-color/);assert.match(html,language==='zh'?/名額說明/:/Availability key/);
 }
});

test('a legacy public response without class facts is described as unavailable data rather than no classes',()=>{
 const legacy={...slot};delete legacy.classAvailability;
 const html=publicCourseDetailsMarkup({course,slots:[legacy],from:'2026-10-15',slotType:'class'},ui('en'));
 assert.match(html,/Some class information is unavailable/);assert.doesNotMatch(html,/No times match this filter|0 classes|Regular Class/);assert.match(html,/data-action="availability-public-type-reset"/);
});

test('trial preview keeps its selected public slot and disables full or unknown quotas',()=>{
  const data={course,slots:[slot],from:'2026-10-15',to:'2026-10-21'},context={...ui('en'),trialPreview:true};
  const button=html=>html.match(/<button[^>]*class="availability-trial-preview"[^>]*>/)?.[0]||'';
  const enabled=button(publicCourseDetailsMarkup(data,context));assert.match(enabled,/data-course-id="course-a"/);assert.match(enabled,/data-slot-id="slot-a"/);assert.doesNotMatch(enabled,/disabled/);
  for(const trialRemaining of [0,null,undefined])assert.match(button(publicCourseDetailsMarkup({...data,slots:[{...slot,trialRemaining}]},context)),/disabled/);
  assert.equal(button(publicCourseDetailsMarkup(data,ui('en'))),'');
});

test('standalone editor preserves version and uses actual course, date, duration and resource inputs', () => {
  const html = availabilityEditorMarkup({ slot, courses, resources, occurrences }, ui('en'));
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="availability-editor-title"/);
  assert.match(html, /class="dialog availability-editor-dialog" tabindex="-1"/);
  assert.match(html, /<form id="availability-editor" data-id="slot-a" data-version="4"/);
  assert.match(html, /<option value="standalone" selected>/);
  assert.match(html, /<option value="course-a" selected>Fictional art class<\/option>/);
  for (const name of ['date', 'time', 'duration']) assert.match(html, new RegExp(`name="${name}"`));
  assert.match(html, /name="teacherIds" value="teacher-a" checked/);
  assert.match(html, /name="roomIds" value="room-a" checked/);
  assert.match(html, /At least one teacher/);
  assert.match(tagById(html, 'availability-linked-fields'), /hidden disabled/);
  assert.doesNotMatch(html, /name="excludedStudentIds"|private-person-a/);
});

test('linked editor selects immutable occurrence identity and does not offer editable copied facts', () => {
  const html = availabilityEditorMarkup({ slot: { ...slot, mode: 'linked', scheduleId: 'schedule-a', sequence: 2 }, courses, resources, occurrences }, ui('en'));
  assert.match(html, /<option value="linked" selected>/);
  assert.match(html, /<option value="schedule-a:2" selected>/);
  assert.match(tagById(html, 'availability-standalone-fields'), /hidden disabled/);
  assert.doesNotMatch(tagById(html, 'availability-linked-fields'), /disabled|hidden/);
  assert.match(html, /id="availability-occurrence-summary"/);
  assert.match(html, /Other art class/);
  assert.match(html, /2026-10-16/);
  assert.match(html, /16:00/);
  assert.match(html, /Fictional teacher A/);
});

test('capacity settings are independent nonnegative whole values and unsupplied values remain blank', () => {
  const html = availabilityEditorMarkup({ slot, courses, resources }, ui('en'));
  for (const name of ['totalCapacity', 'trialCapacity', 'reschedulingCapacity']) assert.match(html, new RegExp(`name="${name}" type="number" min="0" step="1"`));
  for (const name of ['trialEnabled', 'reschedulingEnabled', 'active']) assert.match(html, new RegExp(`type="checkbox" name="${name}"[^>]* checked`));
  assert.match(html, /name="publicVisibility"/);
  assert.match(html, /<option value="default" selected>/);
  assert.match(html, /<option value="show">/);
  assert.match(html, /<option value="hide">/);
  assert.match(html, /name="remark" maxlength="2000"/);
  const empty = availabilityEditorMarkup({}, ui('en'));
  for (const name of ['totalCapacity', 'trialCapacity', 'reschedulingCapacity']) assert.match(empty, new RegExp(`name="${name}"[^>]*value=""`));
  assert.doesNotMatch(empty, /Total remaining|SQL|API|SQLite/);
});

test('editor escapes names, ids and draft notes, and retains unavailable linked identities', () => {
  const html = availabilityEditorMarkup({ slot: { ...slot, scheduleId: 'missing-schedule', sequence: 9, sourceAvailable: false, unavailableReason: 'SOURCE_REMOVED', unavailableReasonText: 'Source <removed>', remark: '<private draft>' }, courses: [{ ...course, courseName: '<course>' }], resources, occurrences }, ui('en'));
  assert.match(html, /value="missing-schedule:9" selected/);
  assert.match(html, /Source &lt;removed&gt;/);
  assert.match(html, /&lt;private draft&gt;/);
  assert.doesNotMatch(html, /<private draft>|<removed>|private-person-a/);
});

test('busy editor locks all fieldsets, both cancellation buttons and save while retaining an escaped error', () => {
  const html = availabilityEditorMarkup({ slot, courses, resources, busy: true, error: 'Save <failed>' }, ui('zh'));
  assert.match(html, /aria-busy="true"/);
  assert.match(tagById(html, 'availability-standalone-fields'), /disabled/);
  assert.match(tagById(html, 'availability-configuration-fields'), /disabled/);
  assert.match(tagById(html, 'availability-save'), /disabled/);
  assert.equal((html.match(/data-action="availability-editor-cancel"[^>]* disabled/g) || []).length, 2);
  assert.match(html, /role="alert"[^>]*>Save &lt;failed&gt;/);
});

test('internal detail shows genuine capacity and source state, without inventing total usage or class occupancy', () => {
  const html = availabilityDetailMarkup({ slot: { ...slot, scheduleId: 'schedule-a', sequence: 2, classCapacity: 12, classOccupied: null }, canEdit: true }, ui('en'));
  assert.match(html, /data-action="availability-edit" data-slot-id="slot-a"/);
  assert.match(html, /<dt>Total capacity<\/dt><dd>10<\/dd>/);
  assert.match(html, /<dt>Total reserved<\/dt><dd>—<\/dd>/);
  assert.match(html, /<dt>Class occupancy<\/dt><dd>—<\/dd>/);
  assert.match(html, /Private note/);
  const readonly = availabilityDetailMarkup({ slot, canEdit: false }, ui('en'));
  assert.doesNotMatch(readonly, /data-action="availability-edit"|Private note|private-person-a/);
  const unavailable = availabilityDetailMarkup({ slot: { ...slot, sourceAvailable: false, unavailableReason: 'SOURCE_CANCELLED', unavailableReasonText: 'Lesson cancelled', active: false } }, ui('en'));
  assert.match(unavailable, /Lesson cancelled/);
  assert.match(unavailable, /Inactive/);
});

test('editing a linked formal lesson requires explicit source permission and an available exact link', () => {
  const linked = { ...slot, scheduleId: 'schedule-second', sequence: 2 };
  const allowed = availabilityDetailMarkup({ slot: linked, canEdit: true, canEditSource: true }, ui('en'));
  assert.match(allowed, /data-action="availability-source-edit" data-slot-id="slot-a">Edit linked lesson<\/button>/);
  for (const data of [{ slot: linked }, { slot: linked, canEdit: true }, { slot, canEditSource: true }, { slot: { ...linked, sourceAvailable: false }, canEditSource: true }]) {
    assert.doesNotMatch(availabilityDetailMarkup(data, ui('en')), /availability-source-edit/);
  }
  assert.doesNotMatch(publicCourseDetailsMarkup({ course, slots: [linked], from: '2026-10-15' }, ui('en')), /schedule-second|availability-source-edit/);
});

test('public directory uses only published course facts with no invented image, price or description', () => {
  const html = publicCourseDirectoryMarkup({ courses: [{ ...course, description: 'PRIVATE_DESCRIPTION', fee: 1234, image: 'PRIVATE_IMAGE', remark: 'PRIVATE_REMARK' }] }, ui('en'));
  assert.match(html, /data-action="availability-public-course" data-course-id="course-a"/);
  assert.match(html, /Fictional art class/);
  assert.match(html, /Drawing/);
  assert.match(html, /Beginner/);
  assert.doesNotMatch(html, /PRIVATE_|<img|1234|data-go="\/join/);
  assert.match(publicCourseDirectoryMarkup({ loading: true }, ui('en')), /Loading courses/);
  assert.doesNotMatch(publicCourseDirectoryMarkup({ loading: true }, ui('en')), /No published courses/);
  const failed = publicCourseDirectoryMarkup({ error: 'Courses unavailable' }, ui('en'));
  assert.match(failed, /role="alert"[^>]*>Courses unavailable/);
  assert.match(failed, /data-action="availability-public-refresh"/);
  assert.doesNotMatch(failed, /No published courses/);
});

test('public details navigates seven days and only displays real slot ids and quota summaries', () => {
  const html = publicCourseDetailsMarkup({ course, slots: [slot], from: '2026-10-15', to: '2026-10-21' }, ui('en'));
  assert.match(html, /id="availability-public-from" name="from" type="date" value="2026-10-15"/);
  assert.match(html, /data-action="availability-public-range" data-from="2026-10-08"/);
  assert.match(html, /data-action="availability-public-range" data-from="2026-10-22"/);
  assert.equal((html.match(/data-availability-date="/g) || []).length, 7);
  assert.match(html, /data-availability-slot-id="slot-a"/);
  assert.match(html, /2 places remaining/);
  assert.match(html, /Trial applications are not yet open/);
  assert.doesNotMatch(html, /Private note|private-person-a|totalCapacity|1234|API|SQLite|data-go="\/join|data-action="pay/);
});

test('management preview reuses seven public dates and exact projected slots without a trial application action', () => {
  const data = { course, slots: [slot, { ...slot, id: 'other', courseId: 'course-b' }, { ...slot, id: 'unavailable', sourceAvailable: false }], from: '2026-10-15', to: '2026-10-21' };
  const html = publicCourseDetailsMarkup(data, { ...ui('en'), managementPreview: true, trialPreview: true });
  assert.match(html, /<h3 id="availability-preview-course-title">Fictional art class<\/h3>/);
  assert.match(html, /aria-labelledby="availability-preview-course-title"/);
  assert.match(html, /id="availability-preview-from" name="from" type="date" value="2026-10-15"/);
  assert.match(html, /data-action="availability-preview-back"/);
  assert.match(html, /data-action="availability-preview-range" data-from="2026-10-08"/);
  assert.match(html, /data-action="availability-preview-range" data-from="2026-10-22"/);
  assert.equal((html.match(/data-availability-date="/g) || []).length, 7);
  assert.equal((html.match(/data-action="availability-preview-manage"/g) || []).length, 1);
  assert.match(html, /data-action="availability-preview-manage" data-slot-id="slot-a"/);
  assert.doesNotMatch(html, /data-action="availability-public-|availability-public-from|availability-public-course-title|availability-trial-preview|trial-application|Private note|private-person-a|data-slot-id="other"|data-slot-id="unavailable"/);
  assert.equal(publicCourseDetailsMarkup(data, ui('en')), publicCourseDetailsMarkup(data, { ...ui('en'), managementPreview: false }));
});

test('management preview errors retry inside the preview without exposing stale slot actions', () => {
  const html = publicCourseDetailsMarkup({ course, slots: [slot], from: '2026-10-15', error: 'Times <unavailable>' }, { ...ui('en'), managementPreview: true });
  assert.match(html, /role="alert"[^>]*>Times &lt;unavailable&gt;/);
  assert.match(html, /data-action="availability-preview-refresh"/);
  assert.doesNotMatch(html, /data-action="availability-public-|data-action="availability-preview-manage"|No available times/);
});

test('preview date input is escaped independently of the canonical range and never changes anonymous controls', () => {
  const data = { course, slots: [slot], from: '2026-10-15', to: '2026-10-21', dateInput: '\" onfocus=\"bad', dateError: 'Choose a date.' };
  const preview = publicCourseDetailsMarkup(data, { ...ui('en'), managementPreview: true });
  assert.match(preview, /id="availability-preview-from"[^>]*value="&quot; onfocus=&quot;bad"/);
  assert.match(preview, /data-action="availability-preview-range" data-from="2026-10-22"/);
  assert.doesNotMatch(preview, /value="" onfocus=|availability-preview-manage/);
  const anonymous = publicCourseDetailsMarkup(data, ui('en'));
  assert.match(anonymous, /id="availability-public-from"[^>]*value="2026-10-15"/);
  assert.doesNotMatch(anonymous, /onfocus|Choose a date|aria-invalid/);
});

test('public details distinguishes a full quota from an unknown quota instead of fabricating zero remaining', () => {
  const full = publicCourseDetailsMarkup({ course, slots: [{ ...slot, trialStatus: 'full', trialRemaining: 0 }], from: '2026-10-15', to: '2026-10-21' }, ui('en'));
  assert.match(full, /Full/);
  const unknown = publicCourseDetailsMarkup({ course, slots: [{ ...slot, trialRemaining: undefined, reschedulingRemaining: undefined }], from: '2026-10-15', to: '2026-10-21' }, ui('en'));
  assert.match(unknown, /Availability information is unavailable/);
  assert.doesNotMatch(unknown, /0 places remaining/);
});

test('public details hides unrelated or unavailable slots even if a caller supplies a mixed collection', () => {
  const html = publicCourseDetailsMarkup({ course, slots: [slot, { ...slot, id: 'other-course-slot', courseId: 'course-b' }, { ...slot, id: 'unavailable-slot', sourceAvailable: false }, { ...slot, id: 'out-of-window-slot', date: '2026-10-22' }], from: '2026-10-15', to: '2026-10-21' }, ui('en'));
  assert.match(html, /data-availability-slot-id="slot-a"/);
  assert.doesNotMatch(html, /other-course-slot|unavailable-slot|out-of-window-slot/);
});

test('public details safely handles date boundaries, errors and loading without announcing empty data', () => {
  const start = publicCourseDetailsMarkup({ course, slots: [], from: '0001-01-01', to: '0001-01-07' }, ui('en'));
  assert.match(start, /data-action="availability-public-range" data-from="0001-01-01"[^>]* disabled/);
  assert.match(start, /data-from="0001-01-08"/);
  const end = publicCourseDetailsMarkup({ course, slots: [], from: '9999-12-25', to: '9999-12-31' }, ui('en'));
  assert.match(end, /data-action="availability-public-range" data-from="9999-12-25"[^>]* disabled/);
  assert.doesNotMatch(end, /10000-/);
  const loading = publicCourseDetailsMarkup({ course, from: '2026-10-15', to: '2026-10-21', loading: true }, ui('en'));
  assert.match(loading, /Loading available times/);
  assert.doesNotMatch(loading, /No available times/);
  const failed = publicCourseDetailsMarkup({ course, error: 'Could not load times' }, ui('en'));
  assert.match(failed, /role="alert"[^>]*>Could not load times/);
  assert.match(failed, /data-action="availability-public-refresh"/);
  assert.doesNotMatch(failed, /No available times/);
});

test('public course names and teacher names are escaped in both languages', () => {
  for (const language of ['zh', 'en']) {
    const html = publicCourseDetailsMarkup({ course: { ...course, courseName: '<Course>' }, slots: [{ ...slot, teacherNames: ['<Teacher>'], roomNames: ['<Room>'] }], from: '2026-10-15', to: '2026-10-21' }, ui(language));
    assert.match(html, /&lt;Course&gt;/);
    assert.match(html, /&lt;Teacher&gt;/);
    assert.match(html, /&lt;Room&gt;/);
    assert.doesNotMatch(html, /<Course>|<Teacher>|<Room>/);
    assert.match(html, language === 'en' ? /Trial applications are not yet open/ : /試堂申請暫未開放/);
  }
});

test('public settings preserve opened version, independent visibility switches and the default seven-day window', () => {
  const html = availabilityPublicSettingsMarkup({ settings: { version: 0, rangeDays: 7, showFullTrialSlots: true, showReschedulingSlots: false } }, ui('en'));
  assert.match(html, /<form id="availability-public-settings" data-version="0"/);
  assert.match(html, /type="checkbox" name="showFullTrialSlots" checked/);
  assert.match(html, /type="checkbox" name="showReschedulingSlots"/);
  assert.doesNotMatch(html, /type="checkbox" name="showReschedulingSlots" checked/);
  assert.match(html, /name="rangeDays" type="number" value="7" min="7" max="30"/);
  assert.match(html, /id="availability-public-settings-save"/);
  assert.match(html, /data-action="availability-settings-cancel"/);
  assert.doesNotMatch(html, /Total remaining|API|SQLite/);
  const busy = availabilityPublicSettingsMarkup({ settings: { version: 5 }, busy: true, error: 'Settings <failed>' }, ui('en'));
  assert.match(busy, /data-version="5"/);
  assert.match(tagById(busy, 'availability-public-settings-save'), /disabled/);
  assert.equal((busy.match(/data-action="availability-settings-cancel"[^>]* disabled/g) || []).length, 2);
  assert.match(busy, /role="alert"[^>]*>Settings &lt;failed&gt;/);
});

test('public rescheduling summaries require the explicit projection visibility flag', () => {
  const publicHtml = extra => publicCourseDetailsMarkup({ course, slots: [{ ...slot, ...extra }], from: '2026-10-15', to: '2026-10-21' }, ui('en'));
  assert.doesNotMatch(publicHtml({ reschedulingVisible: false }), /<strong>Rescheduling places<\/strong>/);
  assert.doesNotMatch(publicHtml({ reschedulingVisible: undefined }), /<strong>Rescheduling places<\/strong>/);
  assert.match(publicHtml({ reschedulingVisible: true }), /<strong>Rescheduling places<\/strong>/);
});

test('internal unavailable states never expose a raw technical reason code', () => {
  const unavailable = { ...slot, scheduleId: 'schedule-a', sequence: 2, sourceAvailable: false, unavailableReason: 'SCHEDULE_SOURCE_CANCELLED' };
  for (const language of ['zh', 'en']) {
    const detail = availabilityDetailMarkup({ slot: unavailable }, ui(language));
    const editor = availabilityEditorMarkup({ slot: unavailable, courses, resources, occurrences }, ui(language));
    for (const html of [detail, editor]) {
      assert.doesNotMatch(html, /SCHEDULE_SOURCE_CANCELLED/);
      assert.match(html, language === 'en' ? /This time is unavailable/ : /此時段暫不可使用/);
    }
  }
});

test('readonly available-time detail uses a single formal teacher colour and preserves all named colours for multiple teachers', () => {
  const single = availabilityDetailMarkup({ slot: { ...slot, teacherIds: ['teacher-a'], teacherNames: ['Teacher A'], teacherColors: ['#000000'] }, canEdit: false }, ui('en'));
  assert.match(single, /availability-detail-dialog" tabindex="-1" style="--tt-lesson-color:#000000"/);
  assert.match(single, /class="availability-detail-colour-markers"/);
  assert.match(single, /data-teacher-id="teacher-a"/);
  assert.match(single, /Representative colour #000000/);
  assert.doesNotMatch(single, /Private note|private-person-a|data-action="availability-edit"/);
  const multi = availabilityDetailMarkup({ slot: { ...slot, teacherIds: ['teacher-a', 'teacher-b'], teacherNames: ['Teacher A', 'Teacher B'], teacherColors: ['#000000', '#FFFFFF'] } }, ui('en'));
  assert.match(multi, /availability-detail-dialog" tabindex="-1" style="--tt-lesson-color:#27777b"/);
  assert.match(multi, /data-teacher-id="teacher-a"/);
  assert.match(multi, /data-teacher-id="teacher-b"/);
  assert.match(multi, /--teacher-colour:#ffffff/);
  const unsafe = availabilityDetailMarkup({ slot: { ...slot, teacherColors: ['red;position:fixed'] } }, ui('en'));
  assert.doesNotMatch(unsafe, /position:fixed/);
  assert.match(unsafe, /availability-detail-dialog" tabindex="-1" style="--tt-lesson-color:#27777b"/);
});

test('public date selector supports every confirmed range from seven to thirty days and navigates the chosen window',()=>{
 for(const rangeDays of [7,8,14,30]){
  const end=new Date('2026-12-20T00:00:00Z');end.setUTCDate(end.getUTCDate()+rangeDays-1);
  const html=publicCourseDetailsMarkup({course,slots:[],from:'2026-12-20',to:end.toISOString().slice(0,10),rangeDays},ui('en'));
  assert.equal((html.match(/data-availability-date=/g)||[]).length,rangeDays);
  assert.match(html,new RegExp(`value="${rangeDays}" selected`));
  assert.equal((html.match(/<option value="(?:[7-9]|[12]\d|30)"/g)||[]).length,24);
  const next=new Date('2026-12-20T00:00:00Z');next.setUTCDate(next.getUTCDate()+rangeDays);
  assert.match(html,new RegExp(`data-action="availability-public-range" data-from="${next.toISOString().slice(0,10)}"`));
 }
});

test('public range selector clamps the calendar boundary without fabricating dates or quota and settings expose the persisted default',()=>{
 const html=publicCourseDetailsMarkup({course,slots:[],from:'9999-12-25',to:'9999-12-31',rangeDays:30},ui('en'));
 assert.equal((html.match(/data-availability-date=/g)||[]).length,7);assert.doesNotMatch(html,/10000-/);
 assert.match(html,/Next 30 days/);assert.match(html,/data-action="availability-public-range" data-from="9999-12-25"[^>]*disabled/);
 const settings=availabilityPublicSettingsMarkup({settings:{rangeDays:14,version:2}},ui('en'));
 assert.match(settings,/name="rangeDays"[^>]*value="14"/);assert.match(settings,/min="7"/);assert.match(settings,/max="30"/);
 assert.doesNotMatch(settings,/Public pages show seven consecutive days at a time/);
});

test('hiding a full trial preserves the published class while removing only its trial view quota and entry',()=>{
 for(const language of ['en','zh']){
  const linked={...slot,classAvailability:'available',classType:{kind:'regular',name:'Regular Class'},trialVisible:false,trialStatus:'full',trialRemaining:0,reschedulingVisible:false};
  const state={course,slots:[linked],from:'2026-10-15',to:'2026-10-21'};
  const html=publicCourseDetailsMarkup({...state,slotType:'class'},{...ui(language),trialPreview:true});
  assert.match(html,/data-availability-slot-id="slot-a"/);assert.match(html,/data-public-class-status="available"/);
  assert.doesNotMatch(html,/<strong>(?:Trial places|試課名額)<\/strong>|data-action="availability-trial-open"/);
  const trial=publicCourseDetailsMarkup({...state,slotType:'trial'},{...ui(language),trialPreview:true});
  assert.doesNotMatch(trial,/data-availability-slot-id="slot-a"/);assert.match(trial,/data-action="availability-public-type-reset"/);
  const visible=publicCourseDetailsMarkup({...state,slots:[{...linked,trialVisible:true}]},{...ui(language),trialPreview:true});
  assert.match(visible,/<strong>(?:Trial places|試課名額)<\/strong>/);assert.match(visible,/data-action="availability-trial-open"[^>]*disabled/);
 }
});

test('a published rescheduling use is retained without claiming a hidden full trial or a formal class',()=>{
 const html=publicCourseDetailsMarkup({course,slots:[{...slot,classAvailability:null,classType:null,trialVisible:false,trialStatus:'full',trialRemaining:0}],from:'2026-10-15',to:'2026-10-21',slotType:'rescheduling'},{...ui('en'),trialPreview:true});
 assert.match(html,/data-availability-slot-id="slot-a"/);assert.match(html,/<strong>Rescheduling places<\/strong>/);
 assert.doesNotMatch(html,/<strong>Trial places<\/strong>|Class places|data-action="availability-trial-open"/);
});

test('public trial visibility accepts an explicit true flag or the legacy absent field without trusting malformed flags',()=>{
 const html=value=>publicCourseDetailsMarkup({course,slots:[{...slot,classAvailability:'available',trialVisible:value}],from:'2026-10-15',to:'2026-10-21'},{...ui('en'),trialPreview:true});
 for(const value of [false,null,0,1,'false','true'])assert.doesNotMatch(html(value),/<strong>Trial places<\/strong>|data-action="availability-trial-open"/);
 for(const value of [true,undefined])assert.match(html(value),/data-action="availability-trial-open"/);
});
