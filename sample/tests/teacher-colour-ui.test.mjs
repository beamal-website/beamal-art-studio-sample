import test from 'node:test';
import assert from 'node:assert/strict';
import { representativeColour, timetableTeacherColour, teacherColourMarkersMarkup } from '../client/teacher-colour-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ui = language => ({ t: (zh, en) => language === 'en' ? en : zh, esc });

test('representative colours accept only complete six-digit hexadecimal values and normalize case', () => {
  assert.equal(representativeColour('#AbC123'), '#abc123');
  assert.equal(representativeColour('#000000'), '#000000');
  assert.equal(representativeColour('#FFFFFF'), '#ffffff');
  for (const invalid of [null, undefined, '', '#abc', 'abc123', '#abcd1234', '#gggggg', ' #abcdef', '#abcdef ', 'red', 'var(--colour)', 'url(https://example.test)', '#abcdef;display:none', {}, 123456]) assert.equal(representativeColour(invalid), null);
});

test('one formal teacher uses their current valid colour without mutating the schedule fallback', () => {
  const slot = { teacherIds: ['teacher-a'], teacherColors: ['#AbC123'], teacherNames: ['Avery'], color: '#123456' }, before = JSON.stringify(slot);
  assert.equal(timetableTeacherColour(slot, slot.color), '#abc123');
  assert.equal(JSON.stringify(slot), before);
  assert.equal(timetableTeacherColour({ teacherIds: ['teacher-a'], teacherColors: [null] }, '#123456'), '#123456');
  assert.equal(timetableTeacherColour({ teacherIds: ['teacher-a'], teacherColors: ['bad'] }, '#ABCDEF'), '#abcdef');
});

test('multiple teachers and legacy names cannot silently choose the first teacher as the primary colour', () => {
  const multi = { teacherIds: ['teacher-b', 'teacher-a'], teacherColors: ['#112233', '#abcdef'], teacherNames: ['B', 'A'] };
  assert.equal(timetableTeacherColour(multi, '#334455'), '#334455');
  assert.equal(timetableTeacherColour({ ...multi, teacherColors: ['#112233', null] }, '#334455'), '#334455');
  assert.equal(timetableTeacherColour({ teacherIds: ['teacher-a', 'teacher-a'], teacherColors: ['#112233', '#112233'] }, '#334455'), '#334455');
  assert.equal(timetableTeacherColour({ teacher: 'Avery', teacherNames: ['Avery'], teacherColors: ['#abcdef'] }, '#334455'), '#334455');
  assert.equal(timetableTeacherColour({ teacherIds: [''], teacherColors: ['#abcdef'] }, '#334455'), '#334455');
});

test('an unsafe or missing fallback always becomes the neutral Beamal colour', () => {
  for (const fallback of [undefined, null, 'red', '#f00', '#123456;position:fixed']) assert.equal(timetableTeacherColour({}, fallback), '#27777b');
  assert.equal(timetableTeacherColour({}, '#FFFFFF'), '#ffffff');
});

test('named samples preserve formal id alignment and list every valid teacher colour', () => {
  const slot = { teacherIds: ['teacher-a', 'teacher-b', 'teacher-c'], teacherColors: ['#000000', null, '#FFFFFF'], teacherNames: ['Teacher A', 'Teacher B', 'Teacher C'] };
  const html = teacherColourMarkersMarkup(slot, ui('en'));
  assert.match(html, /data-teacher-id="teacher-a"/);
  assert.match(html, /data-teacher-id="teacher-c"/);
  assert.doesNotMatch(html, /data-teacher-id="teacher-b"|Teacher B/);
  assert.match(html, /Teacher A/);
  assert.match(html, /Teacher C/);
  assert.match(html, /--teacher-colour:#000000/);
  assert.match(html, /--teacher-colour:#ffffff/);
  assert.match(html, /Representative colour #000000/);
  assert.match(html, /Representative colour #ffffff/);
  assert.doesNotMatch(html, /Full|Available|primary teacher|Main teacher/);
});

test('markers escape ids and names and reject hostile css while supporting unknown names safely', () => {
  const slot = { teacherIds: ['id" onclick="bad()', 'teacher-b', 'teacher-c'], teacherColors: ['#abcdef', '#123456;background:url(bad)', '#000000'], teacherNames: ['<script>bad()</script>', 'Bad CSS', ''] };
  for (const language of ['zh', 'en']) {
    const html = teacherColourMarkersMarkup(slot, ui(language));
    assert.match(html, /data-teacher-id="id&quot; onclick=&quot;bad\(\)"/);
    assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>|onclick="bad|background:url|Bad CSS/);
    assert.match(html, language === 'en' ? /Teacher name unavailable/ : /老師名稱暫未提供/);
  }
});

test('without a formal assignment or a valid colour there is no fabricated colour sample', () => {
  assert.equal(teacherColourMarkersMarkup({ teacher: 'Teacher A', teacherColors: ['#abcdef'], teacherNames: ['Teacher A'] }, ui('en')), '');
  assert.equal(teacherColourMarkersMarkup({ teacherIds: ['teacher-a'], teacherColors: [null] }, ui('en')), '');
  assert.equal(teacherColourMarkersMarkup({}, ui('en')), '');
});
