import test from 'node:test';
import assert from 'node:assert/strict';
import { studioCourseById, studioCourseByName, studioCourseDirectoryMarkup, studioCourseDetailsMarkup, studioCourseFromCatalog, studioCourseRooms } from '../client/studio-courses.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ui = language => ({ t: (zh, en) => language === 'en' ? en : zh, esc });

test('B11 and B8 list all requested classes and bilingual course details', () => {
  assert.deepEqual(studioCourseRooms.map(room => room.courses.length), [7, 5]);
  const zh = studioCourseDirectoryMarkup(ui('zh'));
  assert.equal((zh.match(/class="studio-course-row"/g) || []).length, 12);
  assert.match(zh, /B11 課室/);
  assert.match(zh, /B8 課室/);
  assert.match(zh, /45 分鐘 · 4／12／24 堂/);
  assert.match(zh, /120 分鐘 × 8 堂/);
  assert.match(zh, /初級 A 班（60 分鐘）＋面試班（30 分鐘）· 12 堂/);
  assert.match(studioCourseDirectoryMarkup(ui('en')), /B11 Classroom/);
  assert.match(studioCourseDirectoryMarkup(ui('en')), /Advanced Storybook Course/);
  assert.equal(studioCourseById('b8-sewing').ageEn, '6 years old or above');
  assert.equal(studioCourseByName('Junior Class A').id, 'b11-junior-a');
  assert.equal(studioCourseByName('初級 B 班').room.id, 'b8');
  assert.equal(studioCourseById('unknown'), null);
});

test('published database courses appear in the directory and matching presets use their saved ID', () => {
  const added={id:'saved-watercolour',courseName:'Watercolour Studio',category:'Art',level:'Beginner'};
  const html=studioCourseDirectoryMarkup({courses:[added],...ui('en')});
  assert.match(html,/href="\/classes\/saved-watercolour"/);
  assert.match(html,/Watercolour Studio/);
  assert.match(html,/Art · Beginner/);
  const preset={id:'saved-pre-baby',courseName:'Pre-Baby Class',category:'Children',level:'Junior'};
  const presetHtml=studioCourseDirectoryMarkup({courses:[preset],...ui('en')});
  assert.match(presetHtml,/href="\/classes\/saved-pre-baby"/);
  assert.doesNotMatch(presetHtml,/href="\/classes\/b11-pre-baby"/);
  assert.equal((presetHtml.match(/class="studio-course-row"/g)||[]).length,12);
  const details=studioCourseDetailsMarkup({course:studioCourseFromCatalog(added),serviceCourse:added,from:'2026-10-16',to:'2026-10-22'},ui('en'));
  assert.match(details,/Watercolour Studio/);
  assert.match(details,/Art/);
  assert.match(details,/Beginner/);
  assert.match(details,/No trial times are available/);
});

test('course info page shows real published trial times and disables unavailable bookings', () => {
  const course = studioCourseById('b11-pre-baby');
  const serviceCourse = { id: 'published-pre-baby', courseName: 'Pre-Baby Class' };
  const slot = { id: 'slot-open', courseId: serviceCourse.id, date: '2026-10-20', time: '10:00', duration: 45, roomNames: ['B11'], teacherNames: ['Teacher'], active: true, sourceAvailable: true, trialEnabled: true, trialRemaining: 2 };
  const html = studioCourseDetailsMarkup({ course, serviceCourse, slots: [slot], from: '2026-10-16', to: '2026-10-22' }, { ...ui('en'), trialPreview: true });
  assert.match(html, /Course information/);
  assert.match(html, /2\.5 years old/);
  assert.match(html, /2026-10-20/);
  assert.match(html, /data-action="availability-trial-application-open" data-course-id="published-pre-baby"/);
  assert.match(html, /data-trial-timeslot="2026-10-20 10:00"/);
  const full = studioCourseDetailsMarkup({ course, serviceCourse, slots: [{ ...slot, trialRemaining: 0 }], from: '2026-10-16', to: '2026-10-22' }, { ...ui('zh'), trialPreview: true });
  assert.match(full, /已滿額/);
  assert.match(full, /已滿額/);
  assert.doesNotMatch(full, /data-trial-timeslot="2026-10-20 10:00"/);
  const unpublished = studioCourseDetailsMarkup({ course }, ui('zh'));
  assert.match(unpublished, /試堂時間尚未公開/);
  assert.doesNotMatch(unpublished, /data-ui-course-id/);
});