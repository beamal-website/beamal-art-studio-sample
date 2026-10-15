const validId = value => typeof value === 'string' && !!value.trim() && value === value.trim();
// Schedule occurrences and student_sessions both start at one in the service.
const validSequence = value => Number.isSafeInteger(value) && value >= 1;

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function resourceIds(resources) {
  if (!Array.isArray(resources) || resources.some(row => !validId(row?.id))) return null;
  const ids = resources.map(row => row.id);
  return new Set(ids).size === ids.length ? ids : null;
}

function validOccurrence(row) {
  if (!row || !['id', 'studentId', 'orderId', 'courseId', 'scheduleId'].every(field => validId(row[field])) || !validSequence(row.sequence)) return false;
  if (row.sourceUnavailable || row.cancelled || row.deletedAt) return false;
  if (!validDate(row.date) || typeof row.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)) return false;
  const start = Number(row.time.slice(0, 2)) * 60 + Number(row.time.slice(3));
  if (!Number.isSafeInteger(row.duration) || row.duration < 1 || start + row.duration > 1440) return false;
  return resourceIds(row.teachers) !== null && resourceIds(row.rooms) !== null;
}

const cloneResources = resources => resources.map(row => ({id: row.id, ...(typeof row.displayName === 'string' ? {displayName: row.displayName} : {})}));

export function resolveStudentLessonOrderOrigin(cache, {sessionId, studentId, orderId} = {}) {
  if (cache?.ready !== true || cache.error || ![sessionId, studentId, orderId].every(validId) || !Array.isArray(cache.students) || !Array.isArray(cache.lessons)) return null;
  if (cache.students.filter(row => row?.id === studentId).length !== 1) return null;
  const candidates = cache.lessons.filter(row => row?.id === sessionId);
  if (candidates.length !== 1) return null;
  const row = candidates[0];
  if (!validOccurrence(row) || row.studentId !== studentId || row.orderId !== orderId) return null;
  if (cache.lessons.filter(other => other?.studentId === studentId && other.scheduleId === row.scheduleId && other.sequence === row.sequence).length !== 1) return null;
  return {id: row.id, studentId: row.studentId, orderId: row.orderId, courseId: row.courseId, scheduleId: row.scheduleId, sequence: row.sequence, date: row.date, time: row.time, duration: row.duration, teachers: cloneResources(row.teachers), rooms: cloneResources(row.rooms)};
}

export function studentLessonOrderMatches(order, origin) {
  if (!validOccurrence(origin) || !order || order.id !== origin.orderId || order.studentId !== origin.studentId || order.paymentStatus !== 'paid' || !Array.isArray(order.items)) return false;
  let matchingItems = 0, matchingOccurrences = 0;
  for (const item of order.items) {
    if (!item || !validId(item.courseId) || !Array.isArray(item.lessons)) return false;
    const matches = item.lessons.filter(lesson => lesson?.scheduleId === origin.scheduleId && lesson.sequence === origin.sequence).length;
    matchingOccurrences += matches;
    if (item.courseId === origin.courseId && matches === 1) matchingItems++;
  }
  return matchingItems === 1 && matchingOccurrences === 1;
}

export function studentLessonOrderSourceKey(row) {
  if (!validOccurrence(row)) return '';
  return JSON.stringify([row.id, row.studentId, row.orderId, row.courseId, row.scheduleId, row.sequence, row.date, row.time, row.duration, [...resourceIds(row.teachers)].sort(), [...resourceIds(row.rooms)].sort()]);
}
