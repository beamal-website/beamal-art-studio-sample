import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonAttendanceBadgeMarkup} from '../client/lesson-attendance-badge.js';

const statuses = [
  ['present', 'Present', '出席'],
  ['late', 'Late', '遲到'],
  ['absent', 'Absent', '缺席'],
  ['leave', 'Leave', '請假'],
  ['sick', 'Sick', '病假'],
  ['other', 'Other', '其他'],
  ['unmarked', 'Not marked', '未登記'],
];

for (const [status, label] of statuses) {
  test(`attendance badge shows ${label} as readable, noninteractive text`, () => {
    const html = lessonAttendanceBadgeMarkup(status);
    assert.equal(html, `<span class="lesson-attendance-badge lesson-attendance-badge-${status}">${label}</span>`);
    assert.doesNotMatch(html, /role=|tabindex=|aria-hidden=|<button|<input/);
  });
}

test('attendance badges use the selected language, including unmarked and unavailable states', () => {
  const context = {t: zh => zh};
  for (const [status, , label] of statuses) {
    assert.match(lessonAttendanceBadgeMarkup(status, context), new RegExp(`>${label}</span>$`));
  }
  assert.match(lessonAttendanceBadgeMarkup(null, context), />未提供<\/span>$/);
});

test('unknown and malformed attendance stays unavailable instead of guessing a recorded status', () => {
  for (const value of [undefined, null, '', 'unknown', 'Present', ' present ', 'false', false, 0, [], {}, {status: 'present'}, '__proto__', 'constructor']) {
    assert.equal(lessonAttendanceBadgeMarkup(value), '<span class="lesson-attendance-badge lesson-attendance-badge-unknown">Not provided</span>');
  }
  assert.notEqual(lessonAttendanceBadgeMarkup('unmarked'), lessonAttendanceBadgeMarkup(null));
});

test('untrusted attendance cannot supply a class, attribute, markup, or misleading visible label', () => {
  const value = 'present\" onclick=\"alert(1)\"><img src=x onerror=alert(1)>';
  const html = lessonAttendanceBadgeMarkup(value);
  assert.equal(html, '<span class="lesson-attendance-badge lesson-attendance-badge-unknown">Not provided</span>');
  assert.doesNotMatch(html, /onclick|onerror|<img|alert\(/);
});

test('translated labels are escaped and supplied translation and escaping helpers are respected', () => {
  const translated = `<b>Late & waiting</b> "student's"`;
  const escaped = '&lt;b&gt;Late &amp; waiting&lt;/b&gt; &quot;student&#39;s&quot;';
  assert.equal(lessonAttendanceBadgeMarkup('late', {t: () => translated}), `<span class="lesson-attendance-badge lesson-attendance-badge-late">${escaped}</span>`);
  const context = Object.freeze({
    t: (zh, en) => `${zh} / ${en}`,
    esc: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'),
  });
  assert.match(lessonAttendanceBadgeMarkup('late', context), />遲到 \/ Late<\/span>$/);
  assert.equal(context.t('出席', 'Present'), '出席 / Present');
});
