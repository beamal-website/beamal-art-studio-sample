import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveStudentLessonOrderOrigin, studentLessonOrderMatches, studentLessonOrderSourceKey} from '../client/student-lesson-order-origin.js';

const lesson = {id: 'session-a', studentId: 'child-a', orderId: 'order-a', courseId: 'course-a', scheduleId: 'schedule-a', sequence: 1, date: '2026-11-07', time: '15:30', duration: 60, teachers: [{id: 'teacher-a', displayName: 'Leo', color: '#27777b'}], rooms: [{id: 'room-a', displayName: 'Studio'}], studentName: 'Same name', courseName: 'Same course', attendance: 'present', privateNote: 'NOT AN ORIGIN FIELD'};
const target = {sessionId: lesson.id, studentId: lesson.studentId, orderId: lesson.orderId};
const cache = rows => ({ready: true, error: '', students: [{id: 'child-a'}, {id: 'child-b'}], lessons: rows || [lesson]});
const paidOrder = {id: 'order-a', studentId: 'child-a', paymentStatus: 'paid', orderStatus: 'parent-confirmed', items: [{courseId: 'course-a', feeId: 'fee-a', lessons: [{scheduleId: 'schedule-a', sequence: 1, date: '2026-10-30', time: '13:30', duration: 90}]}]};

test('resolving an authorized selected lesson returns a distinct whitelisted occurrence, including first sequence one', () => {
  const result = resolveStudentLessonOrderOrigin(cache(), target);
  assert.deepEqual(result, {id: 'session-a', studentId: 'child-a', orderId: 'order-a', courseId: 'course-a', scheduleId: 'schedule-a', sequence: 1, date: '2026-11-07', time: '15:30', duration: 60, teachers: [{id: 'teacher-a', displayName: 'Leo'}], rooms: [{id: 'room-a', displayName: 'Studio'}]});
  assert.notEqual(result, lesson);
  assert.notEqual(result.teachers, lesson.teachers);
  assert.notEqual(result.teachers[0], lesson.teachers[0]);
  assert.doesNotMatch(JSON.stringify(result), /privateNote|NOT AN ORIGIN FIELD|color|attendance|studentName|courseName/);
});

test('only a ready successful cache with one exact authorized student and selected session can resolve', () => {
  for (const source of [{...cache(), ready: false}, {...cache(), ready: 1}, {...cache(), error: 'Read failed'}, {...cache(), students: []}, {...cache(), students: [{id: 'child-a'}, {id: 'child-a'}]}, {...cache(), students: undefined}, {...cache(), lessons: [lesson, {...lesson}]}, {...cache(), lessons: []}]) assert.equal(resolveStudentLessonOrderOrigin(source, target), null);
  for (const query of [{...target, sessionId: 'other'}, {...target, studentId: 'child-b'}, {...target, orderId: 'other'}, {...target, orderId: ''}, {...target, studentId: ' child-a '}, {studentId: 'child-a', orderId: 'order-a'}]) assert.equal(resolveStudentLessonOrderOrigin(cache(), query), null);
});

test('invalid stable IDs, zero or unsafe sequence, malformed occurrence and duplicate resources cannot become an order origin', () => {
  for (const patch of [{courseId: ''}, {scheduleId: null}, {sequence: 0}, {sequence: -1}, {sequence: '1'}, {sequence: 1.5}, {sequence: Number.MAX_SAFE_INTEGER + 1}, {date: '2026-02-30'}, {time: '25:00'}, {duration: 0}, {duration: NaN}, {teachers: [{id: ''}]}, {rooms: [{id: 'r'}, {id: 'r'}]}, {sourceUnavailable: true}, {cancelled: true}]) assert.equal(resolveStudentLessonOrderOrigin(cache([{...lesson, ...patch}]), target), null, JSON.stringify(patch));
  const duplicateOccurrence = {...lesson, id: 'another-session', orderId: 'another-order'};
  assert.equal(resolveStudentLessonOrderOrigin(cache([lesson, duplicateOccurrence]), target), null);
});

test('same-named siblings and same-order lessons stay separate by their exact stable identities', () => {
  const sibling = {...lesson, id: 'session-b', studentId: 'child-b', orderId: 'order-b'};
  const next = {...lesson, id: 'session-next', sequence: 2, date: '2026-11-14'};
  const source = cache([sibling, next, lesson]);
  assert.equal(resolveStudentLessonOrderOrigin(source, target).id, 'session-a');
  assert.equal(resolveStudentLessonOrderOrigin(source, {sessionId: 'session-next', studentId: 'child-a', orderId: 'order-a'}).sequence, 2);
  assert.equal(resolveStudentLessonOrderOrigin(source, {...target, sessionId: 'session-b'}), null);
});

test('paid order matches stable selected occurrence even when its purchased date, time and duration predate a reschedule', () => {
  const origin = resolveStudentLessonOrderOrigin(cache(), target);
  assert.equal(studentLessonOrderMatches(paidOrder, origin), true);
  for (const patch of [{id: 'other'}, {studentId: 'child-b'}, {paymentStatus: 'awaiting-payment'}, {paymentStatus: null}, {items: []}, {items: [{...paidOrder.items[0], courseId: 'other'}]}, {items: [{...paidOrder.items[0], lessons: [{scheduleId: 'other', sequence: 1}]}]}, {items: [{...paidOrder.items[0], lessons: [{scheduleId: 'schedule-a', sequence: 2}]}]}]) assert.equal(studentLessonOrderMatches({...paidOrder, ...patch}, origin), false);
  assert.equal(studentLessonOrderMatches(paidOrder, null), false);
});

test('duplicate matching items or occurrences are rejected rather than choosing the first', () => {
  const origin = resolveStudentLessonOrderOrigin(cache(), target);
  assert.equal(studentLessonOrderMatches({...paidOrder, items: [paidOrder.items[0], {...paidOrder.items[0], feeId: 'other-fee'}]}, origin), false);
  assert.equal(studentLessonOrderMatches({...paidOrder, items: [{...paidOrder.items[0], lessons: [...paidOrder.items[0].lessons, {...paidOrder.items[0].lessons[0]}]}]}, origin), false);
  assert.equal(studentLessonOrderMatches({...paidOrder, items: [paidOrder.items[0], {courseId: 'other-course', lessons: [{scheduleId: 'schedule-a', sequence: 1}]}]}, origin), false);
  assert.equal(studentLessonOrderMatches({...paidOrder, items: [...paidOrder.items, {courseId: 'course-a', feeId: 'next-fee', lessons: [{scheduleId: 'schedule-a', sequence: 2}]}]}, origin), true);
});

test('source keys capture effective occurrence and resource identities without relying on names, colour or input order', () => {
  const origin = resolveStudentLessonOrderOrigin(cache(), target), key = studentLessonOrderSourceKey(origin);
  assert.equal(typeof key, 'string');
  assert.ok(key.length > 0);
  assert.equal(studentLessonOrderSourceKey({...lesson, courseName: 'Renamed course', studentName: 'Renamed child', attendance: 'absent', teachers: [{...lesson.teachers[0], displayName: 'New name', color: '#ffffff'}]}), key);
  for (const patch of [{id: 'another-session'}, {studentId: 'child-b'}, {orderId: 'order-b'}, {courseId: 'course-b'}, {scheduleId: 'schedule-b'}, {sequence: 2}, {date: '2026-11-08'}, {time: '16:30'}, {duration: 90}, {teachers: [{id: 'teacher-b'}]}, {rooms: [{id: 'room-b'}]}]) assert.notEqual(studentLessonOrderSourceKey({...origin, ...patch}), key, JSON.stringify(patch));
  const multiple = {...origin, teachers: [{id: 'b'}, {id: 'a'}], rooms: [{id: 'two'}, {id: 'one'}]};
  assert.equal(studentLessonOrderSourceKey(multiple), studentLessonOrderSourceKey({...multiple, teachers: [...multiple.teachers].reverse(), rooms: [...multiple.rooms].reverse()}));
  assert.deepEqual(multiple.teachers.map(row => row.id), ['b', 'a']);
  assert.equal(studentLessonOrderSourceKey({...origin, sequence: 0}), '');
});
