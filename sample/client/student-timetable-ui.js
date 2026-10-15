import { representativeColour } from './teacher-colour-ui.js';

const availableText = (value, fallback) => typeof value === 'string' && value.trim() ? value : fallback;
const names = value => Array.isArray(value) ? value : [];

function monthLabel(month, t) {
  const key = month instanceof Date && !Number.isNaN(month.getTime())
    ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
    : typeof month === 'string' ? month : '';
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  if (!match) return '';
  const englishMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return t(`${match[1]}年${Number(match[2])}月`, `${englishMonths[Number(match[2]) - 1]} ${match[1]}`);
}

function teacherMarkup(lesson, { t, esc }) {
  const teacherNames = names(lesson.teacherNames), colours = names(lesson.teacherColors);
  if (!teacherNames.length) return esc(t('老師名稱暫未提供', 'Teacher name unavailable'));
  return teacherNames.map((value, index) => {
    const colour = representativeColour(colours[index]);
    return `<span class="student-teacher">${colour ? `<span class="student-teacher-swatch" style="--student-teacher-color:${colour}" aria-hidden="true"></span>` : ''}<span>${esc(availableText(value, t('老師名稱暫未提供', 'Teacher name unavailable')))}</span></span>`;
  }).join('');
}

function lessonMarkup(lesson, changed, { t, esc }) {
  const date = availableText(lesson.date, t('日期暫未提供', 'Date unavailable'));
  const time = availableText(lesson.time, t('時間暫未提供', 'Time unavailable'));
  const duration = typeof lesson.duration === 'number' && Number.isFinite(lesson.duration) && lesson.duration > 0
    ? t(`${lesson.duration} 分鐘`, `${lesson.duration} min`) : t('時長暫未提供', 'Duration unavailable');
  const rooms = names(lesson.roomNames).map(value => availableText(value, t('課室暫未提供', 'Room unavailable')));
  const sequence = Number.isInteger(lesson.sequence) && lesson.sequence > 0 ? t(`第 ${lesson.sequence} 堂`, `Lesson #${lesson.sequence}`) : t('課次暫未提供', 'Lesson number unavailable');
  const dateMarkup = /^\d{4}-\d{2}-\d{2}$/.test(lesson.date || '') ? `<time datetime="${esc(lesson.date)}">${esc(date)}</time>` : `<span>${esc(date)}</span>`;
  return `<li class="student-lesson${lesson.cancelled === true ? ' student-lesson-cancelled' : ''}${changed ? ' student-lesson-updated' : ''}" data-schedule-id="${esc(lesson.scheduleId ?? '')}" data-sequence="${esc(lesson.sequence ?? '')}">
    <div class="student-lesson-date">${dateMarkup}<span>${esc(time)}</span></div>
    <article class="student-lesson-content">
      <div class="student-lesson-heading"><div><p class="student-lesson-code">${esc(availableText(lesson.classCode, t('班別編號暫未提供', 'Class code unavailable')))} · ${esc(sequence)}</p><h3>${esc(availableText(lesson.courseName, t('課程名稱暫未提供', 'Course name unavailable')))}</h3></div><div class="student-lesson-badges">${lesson.cancelled === true ? `<span class="student-lesson-status student-lesson-status-cancelled">${esc(t('已取消', 'Cancelled'))}</span>` : ''}${changed ? `<span class="student-lesson-status student-lesson-status-updated">${esc(t('已更新', 'Updated'))}</span>` : ''}</div></div>
      <dl class="student-lesson-facts"><div><dt>${esc(t('時間／時長', 'Time / duration'))}</dt><dd>${esc(time)} · ${esc(duration)}</dd></div><div><dt>${esc(t('老師', 'Teacher'))}</dt><dd class="student-lesson-teachers">${teacherMarkup(lesson, { t, esc })}</dd></div><div><dt>${esc(t('課室', 'Room'))}</dt><dd>${esc(rooms.length ? rooms.join(' · ') : t('課室暫未提供', 'Room unavailable'))}</dd></div></dl>
      ${lesson.cancelled === true ? `<p class="student-lesson-cancel-note">${esc(t('這一堂已取消，請留意新的課表安排。', 'This lesson is cancelled. Check the timetable for a new arrangement.'))}</p>` : ''}
    </article>
  </li>`;
}

export function renderStudentTimetable({ profile = null, lessons = [], loading = false, error = '', month, locale = 'zh', changedLessonKeys = [] } = {}, { t, esc }) {
  const rows = Array.isArray(lessons) ? lessons.filter(row => row && typeof row === 'object').slice().sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')) || String(a.time ?? '').localeCompare(String(b.time ?? '')) || (a.sequence ?? 0) - (b.sequence ?? 0)) : [];
  const changed = new Set(Array.isArray(changedLessonKeys) ? changedLessonKeys : []), monthName = monthLabel(month, t);
  const profileMarkup = profile ? `<aside class="student-profile" aria-labelledby="student-profile-title"><div class="student-profile-heading"><h2 id="student-profile-title">${esc(t('我的資料', 'My profile'))}</h2>${profile.fictional === true ? `<span class="student-test-label">TEST</span>` : ''}</div><strong class="student-profile-name">${esc(availableText(profile.name, t('姓名暫未提供', 'Name unavailable')))}</strong><dl><div><dt>${esc(t('登入名稱', 'Username'))}</dt><dd>${esc(availableText(profile.username, t('登入名稱暫未提供', 'Username unavailable')))}</dd></div><div><dt>${esc(t('電郵', 'Email'))}</dt><dd>${esc(availableText(profile.email, t('電郵暫未提供', 'Email unavailable')))}</dd></div></dl></aside>` : !loading ? `<aside class="student-profile"><p>${esc(t('個人資料暫未提供。', 'Profile unavailable.'))}</p></aside>` : '';
  return `<section class="student-timetable-page" aria-labelledby="student-timetable-title" aria-busy="${loading ? 'true' : 'false'}" lang="${locale === 'en' ? 'en' : 'zh-Hant'}">
    <header class="portal-page-heading student-timetable-heading"><h1 id="student-timetable-title">${esc(t('我的時間表', 'My Calendar'))}</h1>${monthName ? `<span class="student-month-label">${esc(monthName)}</span>` : ''}</header>
    <div class="student-timetable-body"><p class="student-timetable-note"><span class="student-test-label">TEST</span><span>${esc(t('這裡顯示指定給你的測試課次。老師、日期及時間按已保存的排課更新。', 'These are test lessons assigned to you. Teachers, dates and times follow the saved schedule.'))}</span></p>
      ${error ? `<p class="student-timetable-error" role="alert">${esc(error)}${rows.length ? ` <span>${esc(t('以下是上次成功載入的資料；最新安排暫未能確認。', 'The lessons below were last loaded successfully; the latest arrangement could not be confirmed.'))}</span>` : ''}</p>` : ''}
      ${loading ? `<p class="student-timetable-loading" role="status" aria-live="polite">${esc(rows.length ? t('正在更新課表…', 'Updating timetable…') : t('正在載入課表…', 'Loading timetable…'))}</p>` : ''}
      <div class="student-timetable-layout">${profileMarkup}<div class="student-lessons"><h2>${esc(t('指定課次', 'Assigned lessons'))}</h2>${rows.length ? `<ol class="student-lesson-list">${rows.map(row => lessonMarkup(row, changed.has(`${row.scheduleId}:${row.sequence}`), { t, esc })).join('')}</ol>` : !loading && !error ? `<p class="student-timetable-empty" role="status">${esc(t('這個月份暫無指定課次。', 'No assigned lessons this month.'))}</p>` : ''}</div></div>
    </div>
  </section>`;
}
