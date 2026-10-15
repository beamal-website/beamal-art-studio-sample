import test from 'node:test';
import assert from 'node:assert/strict';
import { availabilityPublicPreviewMarkup } from '../client/availability-public-preview-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ui = language => ({ t: (zh, en) => language === 'en' ? en : zh, esc });
const course = { id: 'course-2', courseName: 'Colour and line', category: 'Art', level: 'Beginner', remark: 'PRIVATE_COURSE_NOTE', fee: 9876, studentIds: ['private-student'] };
const slot = { id: 'slot-2', courseId: course.id, date: '2026-10-16', time: '15:30', duration: 45, teacherNames: ['Teacher Two'], roomNames: ['Studio Two'], trialEnabled: true, trialRemaining: 2, reschedulingVisible: false, remark: 'PRIVATE_SLOT_NOTE', excludedStudentIds: ['private-exclusion'] };
const model = { course, slots: [slot], from: '2026-10-15', to: '2026-10-21' };

test('preview has a bounded modal contract and renders the same seven-day public projection', () => {
  const html = availabilityPublicPreviewMarkup(model, ui('en'));
  assert.match(html, /class="modal availability-modal availability-preview-modal" role="dialog" aria-modal="true" aria-labelledby="availability-preview-title"/);
  assert.match(html, /class="dialog availability-preview-dialog" tabindex="-1"/);
  assert.match(html, /<h2 id="availability-preview-title">Public timetable<\/h2>/);
  assert.match(html, /class="availability-body availability-preview-body"/);
  assert.match(html, /<h3 id="availability-preview-course-title">Colour and line<\/h3>/);
  assert.equal((html.match(/data-availability-date="/g) || []).length, 7);
  assert.match(html, /data-availability-slot-id="slot-2"/);
  assert.match(html, /data-action="availability-preview-manage" data-slot-id="slot-2"/);
  assert.match(html, /2 places remaining/);
  assert.match(html, /data-action="availability-preview-refresh"/);
  assert.equal((html.match(/data-action="availability-preview-close"/g) || []).length, 2);
  assert.doesNotMatch(html, /PRIVATE_|private-student|private-exclusion|9876|trial-application|availability-trial-preview|type="submit"|data-action="availability-edit"|data-action="availability-save"/);
});

test('only the selected course public slots receive a management action', () => {
  const html = availabilityPublicPreviewMarkup({ ...model, slots: [slot, { ...slot, id: 'wrong-course', courseId: 'course-1' }, { ...slot, id: 'removed', sourceAvailable: false }, { ...slot, id: 'old-date', date: '2026-10-14' }, { ...slot, id: 'next-week', date: '2026-10-22' }] }, ui('en'));
  assert.equal((html.match(/data-action="availability-preview-manage"/g) || []).length, 1);
  assert.doesNotMatch(html, /wrong-course|removed|old-date|next-week/);
});

test('loading and failure remove old course facts and slots rather than announcing empty results', () => {
  const loading = availabilityPublicPreviewMarkup({ ...model, loading: true }, ui('en'));
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Loading available times/);
  assert.doesNotMatch(loading, /Colour and line|Teacher Two|Studio Two|slot-2|No available times/);
  const failed = availabilityPublicPreviewMarkup({ ...model, error: 'Could not load <times>' }, ui('en'));
  assert.match(failed, /role="alert"[^>]*>Could not load &lt;times&gt;/);
  assert.doesNotMatch(failed, /Colour and line|Teacher Two|Studio Two|slot-2|No available times|<times>/);
});

test('genuine empty projection and missing course remain distinct', () => {
  const empty = availabilityPublicPreviewMarkup({ ...model, slots: [] }, ui('en'));
  assert.match(empty, /Colour and line/);
  assert.equal((empty.match(/No available times\./g) || []).length, 7);
  assert.doesNotMatch(empty, /availability-preview-manage/);
  const unknown = availabilityPublicPreviewMarkup({ ...model, course: null }, ui('en'));
  assert.match(unknown, /Course details are unavailable/);
  assert.doesNotMatch(unknown, /slot-2|Teacher Two|No available times/);
});

test('invalid date state keeps the known public course context while hiding slot results', () => {
  const html = availabilityPublicPreviewMarkup({ ...model, dateError: 'Choose a valid seven-day range.' }, ui('en'));
  assert.match(html, /id="availability-preview-from"[^>]*value="2026-10-15"/);
  assert.match(html, /id="availability-preview-from"[^>]*aria-invalid="true"/);
  assert.match(html, /role="alert"[^>]*>Choose a valid seven-day range\./);
  assert.match(html, /<h3 id="availability-preview-course-title">Colour and line<\/h3>/);
  assert.doesNotMatch(html, /slot-2|No available times/);
});

test('clearing the date keeps the native input blank while canonical range navigation remains available', () => {
  const html = availabilityPublicPreviewMarkup({ ...model, from: '2026-10-23', to: '2026-10-29', dateInput: '', dateError: 'Choose a valid date.' }, ui('en'));
  assert.match(html, /id="availability-preview-from" name="from" type="date" value=""[^>]*aria-invalid="true"/);
  assert.match(html, /data-action="availability-preview-range" data-from="2026-10-16"/);
  assert.match(html, /data-action="availability-preview-range" data-from="2026-10-30"/);
  assert.match(html, /<h3 id="availability-preview-course-title">Colour and line<\/h3>/);
  assert.match(html, /role="alert"[^>]*>Choose a valid date\./);
  assert.doesNotMatch(html, /availability-preview-manage|data-availability-slot-id|No available times/);
  for (const state of [{ loading: true }, { error: 'Could not load times.' }]) {
    const stale = availabilityPublicPreviewMarkup({ ...model, ...state, dateInput: '', dateError: 'Choose a valid date.' }, ui('en'));
    assert.doesNotMatch(stale, /Colour and line|Teacher Two|slot-2/);
  }
});

test('preview escapes identities and public labels and supports both languages', () => {
  for (const language of ['zh', 'en']) {
    const html = availabilityPublicPreviewMarkup({ ...model, course: { ...course, id: '<course>', courseName: '<script>course</script>' }, slots: [{ ...slot, courseId: '<course>', id: '\" onfocus=\"x', teacherNames: ['<Teacher>'], roomNames: ['<Room>'] }] }, ui(language));
    assert.match(html, /&lt;script&gt;course&lt;\/script&gt;/);
    assert.match(html, /data-slot-id="&quot; onfocus=&quot;x"/);
    assert.match(html, /&lt;Teacher&gt;/);
    assert.match(html, /&lt;Room&gt;/);
    assert.doesNotMatch(html, /<script>|<Teacher>|<Room>|data-slot-id="" onfocus=/);
    assert.match(html, language === 'en' ? /Public timetable/ : /公開課表/);
    assert.match(html, language === 'en' ? />Manage time<\/button>/ : />管理時段<\/button>/);
  }
});
