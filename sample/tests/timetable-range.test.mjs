import test from 'node:test';
import assert from 'node:assert/strict';
import { timetableDateRange, timetableRangeControlMarkup } from '../client/timetable-range.js';

test('custom ranges begin on the chosen Saturday and preserve their two original seven-day groups', () => {
  const range = timetableDateRange('2026-10-17', 9);
  assert.equal(range.start, '2026-10-17');
  assert.equal(range.end, '2026-10-25');
  assert.deepEqual(range.groups, [
    ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'],
    ['2026-10-24', '2026-10-25'],
  ]);
  const visible = new Set(['2026-10-18', '2026-10-24']);
  assert.deepEqual(range.groups.map(group => group.filter(date => visible.has(date))), [['2026-10-18'], ['2026-10-24']]);
});

test('every allowed day count stays consecutive and 8 through 14 use exactly two rows with at most seven dates', () => {
  for (let count = 1; count <= 14; count++) {
    const range = timetableDateRange('2026-12-25', count);
    assert.equal(range.count, count);
    assert.equal(range.days.length, count);
    assert.equal(new Set(range.days).size, count);
    assert.equal(range.groups.length, count <= 7 ? 1 : 2);
    assert.ok(range.groups.every(group => group.length >= 1 && group.length <= 7));
    assert.deepEqual(range.groups.flat(), range.days);
    for (let i = 1; i < range.days.length; i++) assert.equal(Date.parse(range.days[i]) - Date.parse(range.days[i - 1]), 86_400_000);
  }
  assert.deepEqual(timetableDateRange('2026-10-14', 14).groups.map(group => group.length), [7, 7]);
});

test('range dates cross leap days, non-leap centuries and early-year boundaries without local-time shifts', () => {
  assert.deepEqual(timetableDateRange('2024-02-27', 4).days, ['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01']);
  assert.deepEqual(timetableDateRange('1900-02-28', 2).days, ['1900-02-28', '1900-03-01']);
  assert.deepEqual(timetableDateRange('2000-02-28', 2).days, ['2000-02-28', '2000-02-29']);
  assert.deepEqual(timetableDateRange('0099-12-31', 2).days, ['0099-12-31', '0100-01-01']);
  assert.deepEqual(timetableDateRange('2026-12-31', 2).days, ['2026-12-31', '2027-01-01']);
});

test('previous and next navigation move one actual range instead of snapping to Monday', () => {
  const seven = timetableDateRange('2026-10-14', 7);
  assert.equal(seven.previousStart, '2026-10-07');
  assert.equal(seven.nextStart, '2026-10-21');
  const fourteen = timetableDateRange('2026-12-25', 14);
  assert.equal(fourteen.previousStart, '2026-12-11');
  assert.equal(fourteen.nextStart, '2027-01-08');
});

test('date limits keep the selected start, expose the real shortened count and never generate year 10000 or year zero', () => {
  const end = timetableDateRange('9999-12-30', 14);
  assert.equal(end.start, '9999-12-30');
  assert.equal(end.count, 2);
  assert.deepEqual(end.days, ['9999-12-30', '9999-12-31']);
  assert.equal(end.nextStart, '9999-12-30');
  assert.equal(end.previousStart, '9999-12-28');
  const last = timetableDateRange('9999-12-31', 7);
  assert.equal(last.count, 1);
  assert.equal(last.end, '9999-12-31');
  assert.equal(last.nextStart, last.start);
  const first = timetableDateRange('0001-01-01', 14);
  assert.equal(first.previousStart, first.start);
  assert.equal(first.nextStart, '0001-01-15');
  const nearEnd = timetableDateRange('9999-12-10', 14);
  assert.equal(nearEnd.nextStart, '9999-12-18');
  assert.equal(timetableDateRange(nearEnd.nextStart, 14).end, '9999-12-31');
});

test('invalid dates and day counts fail explicitly rather than silently displaying a different interval', () => {
  for (const start of ['2026-02-29', '2024-02-30', '2026-1-01', '0000-01-01', '10000-01-01', '', null]) {
    assert.throws(() => timetableDateRange(start, 7), RangeError);
  }
  for (const count of [0, 15, -1, 7.5, '7', NaN, Infinity, null]) assert.throws(() => timetableDateRange('2026-10-14', count), RangeError);
});

test('returned rows can be filtered without changing the range or another caller', () => {
  const range = timetableDateRange('2026-10-14', 14);
  range.groups[0].pop();
  assert.equal(range.days.length, 14);
  assert.deepEqual(timetableDateRange('2026-10-14', 14).groups.map(group => group.length), [7, 7]);
});

test('bilingual day controls show all fourteen choices, a real selected count and disabled choices at the date limit', () => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const en = { t: (_, english) => english, esc }, zh = { t: chinese => chinese, esc };
  const normal = timetableRangeControlMarkup({ start: '2026-10-14', count: 14 }, en);
  assert.match(normal, /id="tt-range-count" name="rangeDays"/);
  assert.equal((normal.match(/<option /g) || []).length, 14);
  assert.match(normal, /<option value="14" selected>14 days<\/option>/);
  assert.match(normal, /datetime="2026-10-27"/);
  assert.match(timetableRangeControlMarkup({ start: '2026-10-14', count: 1 }, zh), /1 天/);
  const limited = timetableRangeControlMarkup({ start: '9999-12-31', count: 14, disabled: true }, en);
  assert.match(limited, /<select[^>]* disabled>/);
  assert.match(limited, /<option value="1" selected>1 day<\/option>/);
  assert.match(limited, /<option value="14" disabled>14 days<\/option>/);
});
