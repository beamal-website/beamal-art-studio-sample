const DAY = 86_400_000;
const MIN_DAY = Date.parse('0001-01-01T00:00:00Z') / DAY;
const MAX_DAY = Date.parse('9999-12-31T00:00:00Z') / DAY;

function dateDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Choose a valid date from year 0001 through 9999.');
  const time = Date.parse(value + 'T00:00:00Z'), day = time / DAY;
  if (!Number.isSafeInteger(day) || day < MIN_DAY || day > MAX_DAY || new Date(time).toISOString().slice(0, 10) !== value) throw new RangeError('Choose a valid date from year 0001 through 9999.');
  return day;
}

const dateKey = day => new Date(day * DAY).toISOString().slice(0, 10);

export function timetableDateRange(start, count = 7) {
  const first = dateDay(start);
  if (!Number.isSafeInteger(count) || count < 1 || count > 14) throw new RangeError('Choose a whole number of days from 1 through 14.');
  // Keep the selected start at the calendar limit and expose the actual count.
  // The controller and its dropdown must both use this normalized value.
  count = Math.min(count, MAX_DAY - first + 1);
  const days = Array.from({ length: count }, (_, offset) => dateKey(first + offset));
  const groups = [days.slice(0, 7)];
  if (count > 7) groups.push(days.slice(7));
  return {
    start,
    end: days.at(-1),
    count,
    days,
    groups,
    previousStart: dateKey(Math.max(MIN_DAY, first - count)),
    nextStart: dateKey(Math.min(MAX_DAY - count + 1, first + count)),
  };
}

export function timetableRangeControlMarkup({ start, count = 7, disabled = false }, { t, esc }) {
  const range = timetableDateRange(start, count), available = Math.min(14, MAX_DAY - dateDay(start) + 1);
  return `<div class="tt-range-control"><label class="tt-range-count-label" for="tt-range-count"><span>${esc(t('連續日子', 'Consecutive days'))}</span><select id="tt-range-count" name="rangeDays"${disabled ? ' disabled' : ''}>${Array.from({ length: 14 }, (_, index) => {
    const value = index + 1;
    return `<option value="${value}"${range.count === value ? ' selected' : ''}${value > available ? ' disabled' : ''}>${esc(t(`${value} 天`, `${value} ${value === 1 ? 'day' : 'days'}`))}</option>`;
  }).join('')}</select></label><p class="tt-range-dates" aria-live="polite"><time datetime="${esc(range.start)}">${esc(range.start)}</time><span aria-hidden="true"> – </span><time datetime="${esc(range.end)}">${esc(range.end)}</time></p></div>`;
}
