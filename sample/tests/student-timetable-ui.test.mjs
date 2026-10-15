import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStudentTimetable } from '../client/student-timetable-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ui = language => ({ t: (zh, en) => language === 'en' ? en : zh, esc });
const lesson = changes => ({ scheduleId: 'shared-series', sequence: 2, classCode: 'ART-101', courseId: 'art', courseName: 'Drawing', date: '2026-10-16', time: '14:00', duration: 60, teacherNames: ['Maya Lam'], teacherColors: ['#426ea8'], roomNames: ['Studio A'], cancelled: false, ...changes });
const profile = { id: 'chloe', name: 'Chloe Ho', username: 'chloe.ho', email: 'chloe@example.test', fictional: true };

test('student sees their supplied profile and authoritative lesson identity, current time and cancellation', () => {
  const source = { profile, month: '2026-10', lessons: [lesson({ scheduleId: 'moved-series', sequence: 8, date: '2026-10-19', time: '16:30', cancelled: true }), lesson({})] };
  const before = JSON.stringify(source), html = renderStudentTimetable(source, ui('en'));
  assert.match(html, /Chloe Ho/);
  assert.match(html, /chloe\.ho/);
  assert.match(html, /data-schedule-id="moved-series" data-sequence="8"/);
  assert.match(html, /2026-10-19/);
  assert.match(html, /16:30/);
  assert.match(html, /Cancelled/);
  assert.match(html, /TEST/);
  assert.match(html, /Maya Lam/);
  assert.match(html, /Studio A/);
  assert.doesNotMatch(html, /Paid|Enrolled|Receipt|data-booking|<form|<input/);
  assert.equal(JSON.stringify(source), before, 'Rendering must not modify the shared API snapshot');
});

test('student refresh, empty and error states never invent lessons or success', () => {
  const pending = renderStudentTimetable({ profile, loading: true, lessons: [lesson({})] }, ui('en'));
  assert.match(pending, /Updating/);
  assert.match(pending, /aria-busy="true"/);
  assert.match(pending, /data-schedule-id="shared-series"/);
  const initial = renderStudentTimetable({ loading: true }, ui('en'));
  assert.match(initial, /Loading/);
  assert.doesNotMatch(initial, /No assigned lessons/);
  const empty = renderStudentTimetable({ profile, lessons: [] }, ui('en'));
  assert.match(empty, /No assigned lessons/);
  assert.doesNotMatch(empty, /data-schedule-id=/);
  const failed = renderStudentTimetable({ profile, error: 'Service unavailable', lessons: [] }, ui('en'));
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Service unavailable/);
  assert.doesNotMatch(failed, /No assigned lessons|Saved|Paid/);
});

test('student labels confirmed changed identities and unknown details in both languages', () => {
  for (const language of ['zh', 'en']) {
    const html = renderStudentTimetable({ profile: {}, lessons: [lesson({ courseName: '', classCode: '', date: '', time: '', duration: null, teacherNames: [], roomNames: [] })], changedLessonKeys: ['shared-series:2'] }, ui(language));
    assert.match(html, language === 'en' ? /Updated/ : /已更新/);
    assert.match(html, language === 'en' ? /Course name unavailable/ : /課程名稱暫未提供/);
    assert.match(html, language === 'en' ? /Teacher name unavailable/ : /老師名稱暫未提供/);
    assert.match(html, language === 'en' ? /Time unavailable/ : /時間暫未提供/);
    assert.match(html, language === 'en' ? /Room unavailable/ : /課室暫未提供/);
    assert.doesNotMatch(html, /undefined|NaN|>0 min</);
  }
});

test('student escapes all projected text and cannot expose incidental private data or inject colours', () => {
  const html = renderStudentTimetable({ profile: { ...profile, name: '<img src=x onerror=bad()>' }, lessons: [lesson({ scheduleId: 'id" onclick="bad()', courseName: '<script>bad()</script>', teacherNames: ['<b>Teacher</b>', 'Long '.repeat(35)], teacherColors: ['#123456;background:url(bad)', '#FFFFFF'], roomNames: ['<Room>'], privateRemark: 'STAFF_SECRET', rawTypePolicy: 'RAW_POLICY', otherStudents: ['OTHER_STUDENT'] })] }, ui('en'));
  assert.match(html, /&lt;img src=x onerror=bad\(\)&gt;/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.match(html, /data-schedule-id="id&quot; onclick=&quot;bad\(\)"/);
  assert.match(html, /&lt;b&gt;Teacher&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<img|<script>|onclick="bad|background:url|STAFF_SECRET|RAW_POLICY|OTHER_STUDENT/);
  assert.match(html, /--student-teacher-color:#ffffff/);
});
