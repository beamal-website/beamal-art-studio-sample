import test from 'node:test';
import assert from 'node:assert/strict';
import { classCapacityStatusMarkup, classCapacityStatusEditorMarkup } from '../client/class-capacity-status-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ui = language => ({ t: (zh, en) => language === 'en' ? en : zh, esc });
const current = { scheduleId: 'schedule-a', sequence: 2, version: 4, sourceVersion: 9, manualStatus: 'full', effectiveStatus: 'full', statusSource: 'manual', classCapacity: 8, classOccupied: null, automaticStatus: null, date: '2026-10-15', time: '14:00', duration: 60 };
const lesson = { courseName: 'Fictional art class', date: '2026-10-14', time: '12:00', duration: 45 };
const tagById = (html, id) => html.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`))?.[0] || '';

test('Full and Available are separate badges with a readable status in both languages', () => {
  for (const language of ['zh', 'en']) {
    const full = classCapacityStatusMarkup(current, ui(language));
    assert.match(full, /class="class-capacity-status-badge"/);
    assert.match(full, /data-class-status="full"/);
    assert.match(full, /role="img"/);
    assert.match(full, language === 'en' ? /aria-label="Class capacity: Full"/ : /aria-label="班額：已滿"/);
    assert.match(full, language === 'en' ? />Full<\/span>/ : />已滿<\/span>/);
    const available = classCapacityStatusMarkup({ ...current, effectiveStatus: 'available', manualStatus: 'available' }, ui(language));
    assert.match(available, /data-class-status="available"/);
    assert.match(available, language === 'en' ? />Available<\/span>/ : />尚有名額<\/span>/);
    assert.doesNotMatch(full + available, /style=|tt-lesson-color|teacherColors/);
  }
});

test('unknown effective status never turns green based on capacity, a legacy count or a manual field alone', () => {
  for (const dto of [null, {}, { ...current, effectiveStatus: null }, { ...current, effectiveStatus: 'unknown' }, { ...current, effectiveStatus: null, classOccupied: 0, classCapacity: 8, manualStatus: 'available', students: [] }]) {
    const html = classCapacityStatusMarkup(dto, ui('en'));
    assert.match(html, /data-class-status="unknown"/);
    assert.match(html, />Unknown<\/span>/);
    assert.doesNotMatch(html, /data-class-status="available"|>Available<\/span>/);
  }
});

test('compact corner markers retain a readable tooltip and accessible name while hiding the visual word', () => {
  const html = classCapacityStatusMarkup(current, { ...ui('en'), compact: true });
  assert.match(html, /class-capacity-status-compact/);
  assert.match(html, /title="Class capacity: Full"/);
  assert.match(html, /aria-label="Class capacity: Full"/);
  assert.match(html, /class="class-status-sr-only"[^>]*>Full<\/span>/);
  assert.match(html, /class="class-capacity-status-dot" aria-hidden="true"/);
});

test('editor identifies one immutable occurrence and preserves both opened versions', () => {
  const html = classCapacityStatusEditorMarkup({ current, lesson }, ui('en'));
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="class-capacity-status-title"/);
  assert.match(html, /class="dialog class-status-editor-dialog" tabindex="-1"/);
  assert.match(html, /<form id="class-capacity-status-editor" data-schedule-id="schedule-a" data-sequence="2" data-version="4" data-source-version="9"/);
  assert.match(html, /Fictional art class/);
  assert.match(html, /2026-10-15/);
  assert.match(html, /14:00/);
  assert.doesNotMatch(html, /2026-10-14|12:00/);
  assert.match(html, /Lesson #2/);
  assert.match(html, /<dt>Class capacity<\/dt><dd>8<\/dd>/);
  assert.match(html, /<dt>Confirmed occupancy<\/dt><dd>—<\/dd>/);
  assert.doesNotMatch(html, /<dt>Confirmed occupancy<\/dt><dd>0<\/dd>|Trial reserved|Rescheduling reserved/);
});

test('editor offers exactly three manual choices, including null represented by an empty value', () => {
  const html = classCapacityStatusEditorMarkup({ current, lesson }, ui('en'));
  assert.equal((html.match(/type="radio" name="manualStatus"/g) || []).length, 3);
  assert.match(html, /name="manualStatus" value="full" checked/);
  assert.match(html, /name="manualStatus" value="available"/);
  assert.match(html, /name="manualStatus" value=""/);
  assert.match(html, /Clear manual status/);
  assert.match(html, /clearing displays Unknown/);
  assert.match(html, /Enrolment still requires capacity and eligibility checks/);
  assert.match(html, /id="class-capacity-status-save"/);
  assert.match(html, /id="class-capacity-status-error"/);
  const cleared = classCapacityStatusEditorMarkup({ current: { ...current, version: 0, manualStatus: null, effectiveStatus: null }, lesson }, ui('en'));
  assert.match(cleared, /data-version="0"/);
  assert.match(cleared, /name="manualStatus" value="" checked/);
  assert.equal((cleared.match(/\bchecked\b/g) || []).length, 1);
});

test('busy editor locks all radios, save and both cancellation actions while preserving the error', () => {
  const html = classCapacityStatusEditorMarkup({ current, lesson, busy: true, error: 'Save <conflict>' }, ui('en'));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /<fieldset class="class-status-options" disabled/);
  assert.match(tagById(html, 'class-capacity-status-save'), /disabled/);
  assert.equal((html.match(/data-action="class-status-cancel"[^>]* disabled/g) || []).length, 2);
  assert.match(html, /role="alert"[^>]*>Save &lt;conflict&gt;/);
  assert.match(html, /Saving/);
});

test('missing or invalid occurrence identities cannot be submitted as a formal class status', () => {
  for (const invalid of [null, { ...current, scheduleId: '' }, { ...current, sequence: 0 }, { ...current, sequence: -1 }, { ...current, sequence: 1.5 }]) {
    const html = classCapacityStatusEditorMarkup({ current: invalid, lesson }, ui('en'));
    assert.match(tagById(html, 'class-capacity-status-save'), /disabled/);
    assert.match(html, /<fieldset class="class-status-options" disabled/);
  }
});

test('editor escapes course, identity and error values and does not expose unrelated private metadata', () => {
  const html = classCapacityStatusEditorMarkup({ current: { ...current, scheduleId: 'id" onclick="bad', privateNotes: 'PRIVATE_SENTINEL' }, lesson: { ...lesson, courseName: '<script>course()</script>' }, error: '<img src=x>' }, ui('en'));
  assert.match(html, /data-schedule-id="id&quot; onclick=&quot;bad"/);
  assert.match(html, /&lt;script&gt;course\(\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.doesNotMatch(html, /<script>|<img|onclick="bad|PRIVATE_SENTINEL|SQLite|API/);
});
