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

test('trial preview keeps its selected public slot and disables full or unknown quotas',()=>{
  const data={course,slots:[slot],from:'2026-10-15',to:'2026-10-21'},context={...ui('en'),trialPreview:true};
  const button=html=>html.match(/<button[^>]*class="availability-trial-preview"[^>]*>/)?.[0]||'';
  const enabled=button(publicCourseDetailsMarkup(data,context));assert.match(enabled,/data-ui-course-id="course-a"/);assert.match(enabled,/data-ui-id="slot-a"/);assert.doesNotMatch(enabled,/disabled/);
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

test('public settings preserve opened version, independent visibility switches and a fixed seven-day window', () => {
  const html = availabilityPublicSettingsMarkup({ settings: { version: 0, rangeDays: 7, showFullTrialSlots: true, showReschedulingSlots: false } }, ui('en'));
  assert.match(html, /<form id="availability-public-settings" data-version="0"/);
  assert.match(html, /type="checkbox" name="showFullTrialSlots" checked/);
  assert.match(html, /type="checkbox" name="showReschedulingSlots"/);
  assert.doesNotMatch(html, /type="checkbox" name="showReschedulingSlots" checked/);
  assert.match(html, /seven consecutive days/);
  assert.match(html, /id="availability-public-settings-save"/);
  assert.match(html, /data-action="availability-settings-cancel"/);
  assert.doesNotMatch(html, /type="number"|Total remaining|API|SQLite/);
  const busy = availabilityPublicSettingsMarkup({ settings: { version: 5 }, busy: true, error: 'Settings <failed>' }, ui('en'));
  assert.match(busy, /data-version="5"/);
  assert.match(tagById(busy, 'availability-public-settings-save'), /disabled/);
  assert.equal((busy.match(/data-action="availability-settings-cancel"[^>]* disabled/g) || []).length, 2);
  assert.match(busy, /role="alert"[^>]*>Settings &lt;failed&gt;/);
});

test('public rescheduling summaries require the explicit projection visibility flag', () => {
  const publicHtml = extra => publicCourseDetailsMarkup({ course, slots: [{ ...slot, ...extra }], from: '2026-10-15', to: '2026-10-21' }, ui('en'));
  assert.doesNotMatch(publicHtml({ reschedulingVisible: false }), /<strong>Rescheduling<\/strong>/);
  assert.doesNotMatch(publicHtml({ reschedulingVisible: undefined }), /<strong>Rescheduling<\/strong>/);
  assert.match(publicHtml({ reschedulingVisible: true }), /<strong>Rescheduling<\/strong>/);
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
