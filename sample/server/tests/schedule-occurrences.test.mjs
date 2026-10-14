import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleOccurrence, scheduleOccurrences, scheduleFollowingRule, ruleOccurrenceDate, scheduleLastSequence } from '../../shared/schedule-occurrences.js';

const rule = fields => ({ course: 'fictional-course', startDate: '2026-10-08', time: '10:00', duration: 45, weekdays: [4], endMode: 'count', endDate: '', count: 4, mustAttendAll: true, color: '#27777b', teacher: 'Fictional teacher', room: '', capacity: 8, session: 1, remark: '', detail: '', moreInfo: '', ...fields });
const schedule = fields => ({ ...rule(), id: 'fictional-series', version: 7, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', ...fields });
const dates = rows => rows.map(row => row.date);

test('weekday math keeps immutable numbers and inclusive count/date ends across leap days', () => {
  const s = schedule({ startDate: '2026-10-14', weekdays: [1, 3], session: 5 });
  assert.deepEqual(dates(scheduleOccurrences(s, '2026-10-01', '2026-10-31')), ['2026-10-14', '2026-10-19', '2026-10-21', '2026-10-26']);
  assert.equal(scheduleOccurrence(s, 3).item.session, 7);
  assert.equal(scheduleOccurrence(s, 5), null);
  for (const invalid of [0, -1, 1.5, NaN, Infinity]) assert.equal(scheduleOccurrence(s, invalid), null);
  const leap = rule({ startDate: '2024-02-28', weekdays: [3, 4] });
  assert.deepEqual([0, 1, 2, 3].map(index => ruleOccurrenceDate(leap, index)), ['2024-02-28', '2024-02-29', '2024-03-06', '2024-03-07']);
  assert.equal(ruleOccurrenceDate(leap, 4), null);
  const finite = schedule({ startDate: '2026-10-14', endMode: 'date', endDate: '2026-10-29' });
  assert.equal(scheduleLastSequence(finite), 3);
  assert.deepEqual(dates(scheduleOccurrences(finite, '2026-10-01', '2026-10-31')), ['2026-10-15', '2026-10-22', '2026-10-29']);
});

test('a moved exception appears once at its actual date, including outside the original range', () => {
  const s = schedule({ exceptions: [{ sequence: 2, overrides: { date: '2026-11-05', time: '11:30', teacher: 'Replacement', capacity: 3, remark: 'Moved\nlesson' } }] });
  assert.deepEqual(dates(scheduleOccurrences(s, '2026-10-01', '2026-10-31')), ['2026-10-08', '2026-10-22', '2026-10-29']);
  const moved = scheduleOccurrences(s, '2026-11-05', '2026-11-05');
  assert.equal(moved.length, 1);assert.equal(moved[0].sequence, 2);assert.equal(moved[0].date, '2026-11-05');
  assert.equal(moved[0].item.time, '11:30');assert.equal(moved[0].item.teacher, 'Replacement');assert.equal(moved[0].item.capacity, 3);assert.equal(moved[0].item.remark, 'Moved\nlesson');
  assert.equal(moved[0].item.session, 2);assert.equal(moved[0].item.id, s.id);assert.equal(moved[0].item.version, 7);
  assert.equal(moved[0].item.startDate, s.startDate);assert.equal(Object.hasOwn(moved[0].item, 'exceptions'), false);assert.equal(Object.hasOwn(moved[0].item, 'segments'), false);
});

test('same-date lessons remain separate and sort by actual time then immutable sequence', () => {
  const s = schedule({ exceptions: [{ sequence: 2, overrides: { date: '2026-10-08' } }, { sequence: 3, overrides: { date: '2026-10-08', time: '09:00' } }] });
  assert.deepEqual(scheduleOccurrences(s, '2026-10-08', '2026-10-08').map(row => row.sequence), [3, 1, 2]);
});

test('following segments replace their suffix without renumbering, leaking metadata or resurfacing an old tail', () => {
  const s = schedule({ segments: [{ fromSequence: 3, rule: rule({ startDate: '2026-10-22', time: '11:00', count: 3, session: 9, course: 'forged-course', id: 'forged-id', version: 100 }) }], exceptions: [{ sequence: 4, overrides: { teacher: 'Stable exception', id: 'forged-exception', course: 'forged-course', version: 200 } }] });
  const before = JSON.stringify(s), rows = scheduleOccurrences(s, '2026-10-01', '2026-11-30');
  assert.deepEqual(rows.map(row => [row.sequence, row.date, row.item.time, row.item.session]), [[1, '2026-10-08', '10:00', 1], [2, '2026-10-15', '10:00', 2], [3, '2026-10-22', '11:00', 9], [4, '2026-10-29', '11:00', 10], [5, '2026-11-05', '11:00', 11]]);
  assert.equal(rows[3].item.teacher, 'Stable exception');assert.ok(rows.every(row => row.item.id === s.id && row.item.course === s.course && row.item.version === 7));
  assert.equal(scheduleLastSequence(s), 5);assert.equal(scheduleOccurrence(s, 6), null);assert.equal(JSON.stringify(s), before);
  const short = schedule({ segments: [{ fromSequence: 3, rule: rule({ startDate: '2026-10-22', count: 1 }) }] });
  assert.equal(scheduleLastSequence(short), 3);assert.equal(scheduleOccurrence(short, 4), null);
});

test('cancellation consumes its original slot and explicit single restoration can override a cancelled segment', () => {
  const s = schedule({ segments: [{ fromSequence: 2, rule: rule({ startDate: '2026-10-15', count: 3, session: 2 }), cancelled: true }], exceptions: [{ sequence: 3, overrides: { time: '12:00' }, cancelled: false }] });
  assert.deepEqual(scheduleOccurrences(s, '2026-10-01', '2026-11-30').map(row => row.sequence), [1, 3]);
  assert.equal(scheduleOccurrence(s, 2), null);assert.equal(scheduleOccurrence(s, 2, { includeCancelled: true }).cancelled, true);
  assert.equal(scheduleOccurrence(s, 3).item.time, '12:00');assert.equal(scheduleLastSequence(s), 4);
  assert.deepEqual(scheduleOccurrences(s, '2026-10-01', '2026-11-30', { includeCancelled: true }).map(row => [row.sequence, !!row.cancelled]), [[1, false], [2, true], [3, false], [4, true]]);
  const deleted = { ...s, activityDeleted: true };
  assert.equal(scheduleOccurrence(deleted, 1, { includeCancelled: true }), null);assert.deepEqual(scheduleOccurrences(deleted, '2026-10-01', '2026-11-30', { includeCancelled: true }), []);
});

test('following editor prefill uses actual fields, counts cancelled slots and handles an edited future tail', () => {
  const s = schedule({ exceptions: [{ sequence: 3, overrides: {}, cancelled: true }] });
  const next = scheduleFollowingRule(s, 2);
  assert.equal(next.startDate, '2026-10-15');assert.equal(next.session, 2);assert.equal(next.count, 3);assert.equal(next.endMode, 'date');assert.equal(next.endDate, '2026-10-29');assert.equal(Object.keys(next).length, 17);
  assert.equal(scheduleFollowingRule(s, 3), null);assert.equal(scheduleFollowingRule(s, 3, { includeCancelled: true }).count, 2);
  const finite = schedule({ endMode: 'date', endDate: '2026-10-30' });
  assert.deepEqual([scheduleFollowingRule(finite, 3).endMode, scheduleFollowingRule(finite, 3).endDate, scheduleFollowingRule(finite, 3).count], ['date', '2026-10-30', 2]);
  const segmented = schedule({ segments: [{ fromSequence: 3, rule: rule({ startDate: '2026-10-22', count: 3 }) }] });
  assert.deepEqual([scheduleFollowingRule(segmented, 2).endMode, scheduleFollowingRule(segmented, 2).endDate, scheduleFollowingRule(segmented, 2).count], ['date', '2026-11-05', 4]);
  const endless = schedule({ segments: [{ fromSequence: 3, rule: rule({ startDate: '2026-10-22', endMode: 'forever' }) }] });
  assert.equal(scheduleLastSequence(endless), Infinity);assert.equal(scheduleFollowingRule(endless, 2).endMode, 'forever');assert.equal(scheduleFollowingRule(endless, 2).count, 1);
});

test('following prefill rotates moved weekdays while preserving the original date end rather than adding extra lessons', () => {
  const moved = schedule({ endMode: 'date', endDate: '2026-10-29', exceptions: [{ sequence: 4, overrides: { date: '2026-11-02', time: '14:00', room: 'Moved room' } }] });
  const next = scheduleFollowingRule(moved, 4);
  assert.equal(next.startDate, '2026-11-02');assert.deepEqual(next.weekdays, [1]);assert.equal(next.count, 1);assert.equal(next.endMode, 'date');assert.equal(next.endDate, '2026-10-29');assert.equal(next.session, 4);assert.equal(next.time, '14:00');assert.equal(next.room, 'Moved room');assert.equal(ruleOccurrenceDate(next, 0), null);
  const observed = schedule({ startDate: '2026-10-14', weekdays: [3], count: 3, exceptions: [{ sequence: 2, overrides: { date: '2026-10-22' } }] });
  const observedNext = scheduleFollowingRule(observed, 2);
  assert.deepEqual([observedNext.startDate, observedNext.weekdays, observedNext.endMode, observedNext.endDate, observedNext.count, observedNext.session], ['2026-10-22', [4], 'date', '2026-10-28', 2, 2]);
  assert.equal(ruleOccurrenceDate(observedNext, 0), '2026-10-22');assert.equal(ruleOccurrenceDate(observedNext, 1), null, 'The old date end must not invent an extra October 29 lesson');
  const multi = schedule({ startDate: '2026-10-14', weekdays: [1, 3], exceptions: [{ sequence: 1, overrides: { date: '2026-10-15' } }] });
  assert.deepEqual(scheduleFollowingRule(multi, 1).weekdays, [2, 4]);
});

test('a backend time-only following receipt preserves a moved date and the remaining original weekdays', () => {
  // Canonical receipt contract supplied by the backend worker, not the edit prefill.
  const receipt = schedule({
    startDate: '2026-10-14', weekdays: [3], count: 3, time: '12:30',
    segments: [{ fromSequence: 2, rule: rule({ startDate: '2026-10-21', weekdays: [3], count: 2, time: '13:15', session: 2 }) }],
    exceptions: [{ sequence: 2, overrides: { date: '2026-10-22' } }],
  });
  assert.deepEqual(scheduleOccurrences(receipt, '2026-10-01', '2026-10-31').map(row => [row.sequence, row.date, row.item.time, row.item.session]), [
    [1, '2026-10-14', '12:30', 1], [2, '2026-10-22', '13:15', 2], [3, '2026-10-28', '13:15', 3],
  ]);
  assert.equal(scheduleOccurrences(receipt, '2026-10-29', '2026-10-29').length, 0);
  const prefill = scheduleFollowingRule(receipt, 2);
  assert.deepEqual([prefill.startDate, prefill.weekdays, prefill.endMode, prefill.endDate, prefill.count, prefill.session], ['2026-10-22', [4], 'date', '2026-10-28', 2, 2]);
});

test('bounded windows jump directly to distant dates and reject invalid, reversed or overlong windows', { timeout: 1000 }, () => {
  const s = schedule({ startDate: '0001-01-01', weekdays: [1], endMode: 'forever' });
  const far = scheduleOccurrences(s, '8999-12-01', '8999-12-31');
  assert.ok(far.length >= 4 && far.length <= 5);assert.ok(far.every(row => row.sequence > 400000 && new Date(row.date + 'T00:00:00Z').getUTCDay() === 1));
  for (const [from, to] of [['2026-02-30', '2026-03-01'], ['2026-02-02', '2026-02-01'], ['2026-01-01', '2027-01-02'], ['', '2026-01-01']]) assert.throws(() => scheduleOccurrences(s, from, to), RangeError);
  assert.doesNotThrow(() => scheduleOccurrences(s, '2026-01-01', '2027-01-01'));
});
