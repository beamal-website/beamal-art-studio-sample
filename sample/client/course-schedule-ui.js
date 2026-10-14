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
  const editable = canEditSchedules();
  const header = `<div class="course-schedule-columns course-schedule-head">${labels.map(label => `<span>${esc(label)}</span>`).join('')}</div>`;
  const rows = groups.map(({ item, isSchedule, dates }, index) => {
    const days = present(weekdaysLabel(dates));
    const end = endTime(item);
    const time = `${present(item.time)}${end ? '–' + end : ''}`;
    const range = dates.length ? `(${dates[0]} – ${dates.at(-1)})` : '—';
    const editLabel = `${t('修改時間安排', 'Edit schedule')} ${present(activityLabel(item, isSchedule))}`;
    return `<details class="course-schedule-group" ${index === 0 ? 'open' : ''}><summary><span class="course-group-chevron" aria-hidden="true">${nextIcon()}</span><strong>${esc(days)}, ${esc(time)}</strong><span class="course-group-range">${esc(range)}</span><button type="button" class="course-detail-icon" data-edit-activity="${esc(item.id)}" data-activity-kind="${isSchedule ? 'schedule' : 'class'}"${editable ? '' : ' disabled'} aria-label="${esc(editLabel)}">${editIcon()}</button></summary><div role="table" aria-colcount="11" aria-label="${esc(days + ' ' + time)}">${dates.map(date => {
      const values = [date, weekdayLabel(date), item.time, end, item.teacher, item.room, item.capacity, studentCount(item, isSchedule, date), item.moreInfo, item.detail, item.remark];
      return `<div class="course-schedule-columns course-schedule-row" role="row">${values.map(cell).join('')}</div>`;
    }).join('')}</div></details>`;
  }).join('');
  return `<div class="course-schedule-scroll" role="region" tabindex="0" aria-label="${esc(t('課程時間安排', 'Course schedule'))}">${header}${rows || `<p class="course-detail-empty">${esc(t('這個月份暫無課堂', 'No lessons this month'))}</p>`}</div>`;
}
