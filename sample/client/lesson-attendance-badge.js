const attendanceLabels = {
  present: ['出席', 'Present'],
  late: ['遲到', 'Late'],
  absent: ['缺席', 'Absent'],
  leave: ['請假', 'Leave'],
  sick: ['病假', 'Sick'],
  other: ['其他', 'Other'],
  unmarked: ['未登記', 'Not marked'],
};

const escapeText = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export function lessonAttendanceBadgeMarkup(attendance, context = {}) {
  const status = typeof attendance === 'string' && Object.hasOwn(attendanceLabels, attendance) ? attendance : 'unknown';
  const [zh, en] = status === 'unknown' ? ['未提供', 'Not provided'] : attendanceLabels[status];
  const t = typeof context?.t === 'function' ? context.t : (chinese, english) => english;
  const esc = typeof context?.esc === 'function' ? context.esc : escapeText;
  return `<span class="lesson-attendance-badge lesson-attendance-badge-${status}">${esc(t(zh, en))}</span>`;
}
