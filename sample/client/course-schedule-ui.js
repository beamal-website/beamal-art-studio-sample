export function courseScheduleTableMarkup(groups, context) {
  const { t, esc, weekdaysLabel, weekdayLabel, endTime, activityLabel, studentCount, canEditSchedules, editIcon, nextIcon } = context;
  const labels = [
    t('日期', 'Date'), t('星期', 'Weekday'), t('開始時間', 'Start time'),
    t('結束時間', 'End time'), t('老師', 'Teachers'), t('課室', 'Room'),
    t('名額', 'Capacity'), t('學生', 'Students'), t('更多資訊', 'More info'),
    t('詳細資料', 'Details'), t('備註', 'Remark'),
  ];
  const present = value => value === null || value === undefined || String(value).trim() === '' ? '—' : String(value);
  const cell = (value, index) => `<span role="cell" aria-colindex="${index + 1}">${esc(present(value))}</span>`;
  const occurrenceAttributes = (date, sequence) => date && Number.isSafeInteger(sequence) && sequence > 0 ? ` data-activity-date="${esc(date)}" data-activity-sequence="${esc(sequence)}"` : '';
  const editable = canEditSchedules();
  const header = `<div class="course-schedule-columns course-schedule-head">${labels.map(label => `<span>${esc(label)}</span>`).join('')}</div>`;
  const rows = groups.map((group, index) => {
    const { item, isSchedule } = group;
    const occurrences = Array.isArray(group.occurrences) ? group.occurrences : (group.dates || []).map(date => ({ date, item }));
    const dates = occurrences.map(occurrence => occurrence.date);
    const days = present(weekdaysLabel(dates));
    const times = [...new Set(occurrences.map(({ item: occurrenceItem }) => {
      const rowItem = occurrenceItem || item, end = endTime(rowItem);
      return `${present(rowItem.time)}${end ? '–' + end : ''}`;
    }))];
    const time = times.length > 1 ? t('各堂時段不同，請查看明細', 'Times vary; see individual lessons') : times[0] || present(item.time);
    const range = dates.length ? `(${dates[0]} – ${dates.at(-1)})` : '—';
    const editLabel = `${t('修改時間安排', 'Edit schedule')} ${present(activityLabel(item, isSchedule))}`;
    return `<details class="course-schedule-group" data-course-schedule-group="${isSchedule ? 'schedule' : 'class'}:${esc(item.id)}" ${index === 0 ? 'open' : ''}><summary><span class="course-group-chevron" aria-hidden="true">${nextIcon()}</span><strong>${esc(days)}, ${esc(time)}</strong><span class="course-group-range">${esc(range)}</span><button type="button" class="course-detail-icon" data-edit-activity="${esc(item.id)}" data-activity-kind="${isSchedule ? 'schedule' : 'class'}"${occurrenceAttributes(group.editDate, group.editSequence)}${editable ? '' : ' disabled'} aria-label="${esc(editLabel)}">${editIcon()}</button></summary><div role="table" aria-colcount="11" aria-label="${esc(days + ' ' + time)}">${occurrences.map(({ date, sequence, item: occurrenceItem }) => {
      const rowItem = occurrenceItem || item;
      const values = [date, weekdayLabel(date), rowItem.time, endTime(rowItem), rowItem.teacher, rowItem.room, rowItem.capacity, studentCount(rowItem, isSchedule, date), rowItem.moreInfo, rowItem.detail, rowItem.remark];
      const sequenceAttribute = Number.isSafeInteger(sequence) && sequence > 0 ? ` data-lesson-sequence="${esc(sequence)}"` : '';
      const dateCell = date ? `<span role="cell" aria-colindex="1"><button type="button" class="course-schedule-date-edit" data-open-lesson="${esc(item.id)}" data-lesson-kind="${isSchedule ? 'schedule' : 'class'}" data-lesson-date="${esc(date)}"${sequenceAttribute} aria-label="${esc(t('查看課堂詳情', 'View lesson details') + ' ' + date)}">${esc(present(date))}</button></span>` : cell(date, 0);
      return `<div class="course-schedule-columns course-schedule-row" role="row">${dateCell}${values.slice(1).map((value, index) => cell(value, index + 1)).join('')}</div>`;
    }).join('')}</div></details>`;
  }).join('');
  return `<div class="course-schedule-scroll" role="region" tabindex="0" aria-label="${esc(t('課程時間安排', 'Course schedule'))}">${header}${rows || `<p class="course-detail-empty">${esc(t('這個月份暫無課堂', 'No lessons this month'))}</p>`}</div>`;
}
