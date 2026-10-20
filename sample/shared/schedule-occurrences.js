const DAY = 86400000;
const MAX_DAY = Date.parse('9999-12-31T00:00:00Z') / DAY;
const RULE_FIELDS = ['course', 'startDate', 'time', 'duration', 'weekdays', 'endMode', 'endDate', 'count', 'mustAttendAll', 'color', 'teacher', 'room', 'teacherIds', 'roomIds', 'capacity', 'availabilityPolicy', 'session', 'remark', 'detail', 'moreInfo', 'classType'];
const OVERRIDE_FIELDS = ['time', 'duration', 'teacher', 'room', 'teacherIds', 'roomIds', 'capacity', 'availabilityPolicy', 'session', 'color', 'remark', 'detail', 'moreInfo', 'classType'];
const METADATA_FIELDS = ['id', 'course', 'version', 'createdAt', 'updatedAt'];

function dayNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp / DAY : null;
}
const isoDate = day => day <= MAX_DAY ? new Date(day * DAY).toISOString().slice(0, 10) : null;
const copyRule = rule => Object.fromEntries(RULE_FIELDS.filter(key => Object.hasOwn(rule, key)).map(key => [key, Array.isArray(rule[key]) ? [...rule[key]] : rule[key]]));

function ruleInfo(rule) {
  const start = dayNumber(rule?.startDate), weekdays = rule?.weekdays;
  if (start === null || !Array.isArray(weekdays) || !weekdays.length || weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) return null;
  const weekday = new Date(start * DAY).getUTCDay();
  const offsets = [...new Set(weekdays)].map(day => (day - weekday + 7) % 7).sort((a, b) => a - b);
  const info = { start, offsets, total: Infinity };
  if (rule.endMode === 'date') {
    const end = dayNumber(rule.endDate);
    info.total = end === null ? 0 : countThrough(info, end);
  } else if (rule.endMode === 'count') {
    info.total = Number.isSafeInteger(rule.count) && rule.count > 0 ? rule.count : 0;
  } else if (rule.endMode !== 'forever') return null;
  return info;
}

function countThrough(info, day) {
  if (day < info.start) return 0;
  const distance = day - info.start, remainder = distance % 7;
  return Math.floor(distance / 7) * info.offsets.length + info.offsets.filter(offset => offset <= remainder).length;
}

function occurrenceDate(info, index) {
  if (!info || !Number.isSafeInteger(index) || index < 0 || index >= info.total) return null;
  const day = info.start + Math.floor(index / info.offsets.length) * 7 + info.offsets[index % info.offsets.length];
  return Number.isSafeInteger(day) ? isoDate(day) : null;
}

export function ruleOccurrenceDate(rule, index) {
  return occurrenceDate(ruleInfo(rule), index);
}

function scheduleState(schedule) {
  const bySequence = new Map([[1, { fromSequence: 1, rule: schedule }]]);
  for (const segment of schedule.segments || []) if (Number.isSafeInteger(segment.fromSequence) && segment.fromSequence > 0) bySequence.set(segment.fromSequence, segment);
  const segments = [...bySequence.values()].sort((a, b) => a.fromSequence - b.fromSequence);
  const parts = segments.map((segment, index) => {
    const info = ruleInfo(segment.rule), next = segments[index + 1]?.fromSequence ?? Infinity;
    return { ...segment, info, count: Math.min(info?.total ?? 0, next - segment.fromSequence) };
  });
  return { schedule, parts, exceptions: new Map((schedule.exceptions || []).map(exception => [exception.sequence, exception])) };
}

function selectedPart(state, sequence) {
  for (let index = state.parts.length - 1; index >= 0; index--) {
    const part = state.parts[index];
    if (part.fromSequence <= sequence) return sequence < part.fromSequence + part.count ? part : null;
  }
  return null;
}

function resolveOccurrence(state, sequence, includeCancelled) {
  if (state.schedule.activityDeleted || !Number.isSafeInteger(sequence) || sequence < 1) return null;
  const part = selectedPart(state, sequence);
  if (!part) return null;
  const originalDate = occurrenceDate(part.info, sequence - part.fromSequence);
  if (!originalDate) return null;
  const exception = state.exceptions.get(sequence), overrides = exception?.overrides || {};
  const cancelled = typeof exception?.cancelled === 'boolean' ? exception.cancelled : !!part.cancelled;
  if (cancelled && !includeCancelled) return null;
  const date = Object.hasOwn(overrides, 'date') ? overrides.date : originalDate;
  if (dayNumber(date) === null) return null;
  const item = copyRule(part.rule);
  item.session = (part.rule.session ?? 1) + sequence - part.fromSequence;
  for (const key of OVERRIDE_FIELDS) if (Object.hasOwn(overrides, key)) item[key] = Array.isArray(overrides[key]) ? [...overrides[key]] : overrides[key];
  for (const key of METADATA_FIELDS) if (Object.hasOwn(state.schedule, key)) item[key] = state.schedule[key];
  item.sequence = sequence;
  return { sequence, date, item, ...(cancelled ? { cancelled: true } : {}) };
}

export function scheduleOccurrence(schedule, sequence, { includeCancelled = false } = {}) {
  return resolveOccurrence(scheduleState(schedule), sequence, includeCancelled);
}

export function scheduleOccurrences(schedule, fromDate, toDate, { includeCancelled = false } = {}) {
  const from = dayNumber(fromDate), to = dayNumber(toDate);
  if (from === null || to === null || to < from || to - from >= 366) throw new RangeError('A valid inclusive date range of at most 366 days is required.');
  if (schedule.activityDeleted) return [];
  const state = scheduleState(schedule), candidates = new Set();
  for (const part of state.parts) {
    if (!part.info || !part.count) continue;
    const first = countThrough(part.info, from - 1), end = Math.min(part.count, countThrough(part.info, to));
    for (let index = first; index < end; index++) candidates.add(part.fromSequence + index);
  }
  // Date overrides may move a slot into this window from any original date.
  for (const sequence of state.exceptions.keys()) candidates.add(sequence);
  const rows = [];
  for (const sequence of candidates) {
    const row = resolveOccurrence(state, sequence, includeCancelled);
    if (row && row.date >= fromDate && row.date <= toDate) rows.push(row);
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.item.time.localeCompare(b.item.time) || a.sequence - b.sequence);
}

function remainingSlots(state, sequence) {
  return state.parts.reduce((total, part) => total + Math.max(0, part.fromSequence + part.count - Math.max(sequence, part.fromSequence)), 0);
}

export function scheduleLastSequence(schedule) {
  if (schedule.activityDeleted) return 0;
  return scheduleState(schedule).parts.reduce((last, part) => part.count ? Math.max(last, part.fromSequence + part.count - 1) : last, 0);
}

export function scheduleFollowingRule(schedule, sequence, { includeCancelled = false } = {}) {
  const state = scheduleState(schedule), selected = resolveOccurrence(state, sequence, includeCancelled);
  if (!selected) return null;
  const part = selectedPart(state, sequence), rule = copyRule(selected.item), remaining = remainingSlots(state, sequence);
  const originalDate = occurrenceDate(part.info, sequence - part.fromSequence);
  const shift = ((dayNumber(selected.date) - dayNumber(originalDate)) % 7 + 7) % 7;
  rule.startDate = selected.date;
  rule.weekdays = rule.weekdays.map(day => (day + shift) % 7).sort((a, b) => (a + 6) % 7 - (b + 6) % 7);
  rule.count = remaining === Infinity ? 1 : remaining;
  if (remaining === Infinity) { rule.endMode = 'forever'; rule.endDate = ''; }
  else {
    const tail = state.parts.filter(candidate => candidate.count).at(-1);
    rule.endMode = 'date';
    rule.endDate = tail.rule.endMode === 'date' ? tail.rule.endDate : occurrenceDate(tail.info, tail.count - 1);
  }
  // Edit exposes a finite series' original date boundary, not an extended quota.
  return rule;
}
