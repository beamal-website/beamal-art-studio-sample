// Public pages only use published records supplied by the catalogue service.
// Retained exports keep older callers from reintroducing removed display presets.
export const studioCourseRooms = [];
export const studioCourseById = () => null;
export const studioCourseByName = () => null;
export function studioCourseFromCatalog(record) {
 const name=String(record?.courseName||'');
 return {id:record?.id,nameZh:name,nameEn:String(record?.courseNameEn||name),ageZh:'',ageEn:'',formatsZh:[],formatsEn:[],category:record?.category||'',level:record?.level||'',room:{nameZh:'',nameEn:''}};
}
export function studioCourseDirectoryMarkup({courses=[],loading=false,error='',t,esc}) {
 const rows=courses.map(record=>{const course=studioCourseFromCatalog(record),detail=[course.category,course.level].filter(Boolean).join(' · ');
 return `<a class="studio-course-row" href="/classes/${encodeURIComponent(course.id)}" data-go="/classes/${encodeURIComponent(course.id)}"><span class="studio-course-copy"><strong>${esc(t(course.nameZh,course.nameEn))}</strong>${detail?`<span>${esc(detail)}</span>`:''}</span><span class="studio-course-more">${esc(t('課程資料及試堂時段','Info & trial times'))}<span aria-hidden="true">↗</span></span></a>`;}).join('');
 return `<section class="studio-course-catalog" aria-labelledby="studio-courses-title"><header class="studio-catalog-heading"><p>${esc(t('公開課程','CLASSES'))}</p><h2 id="studio-courses-title">${esc(t('選擇適合的課程','Find a class'))}</h2></header>${loading?`<p role="status">${esc(t('正在同步公開課程…','Syncing published courses…'))}</p>`:''}${error?`<p role="alert">${esc(error)}</p>`:''}${rows?`<section class="studio-room"><header class="studio-room-heading"><h3>${esc(t('課程','Classes'))}</h3><span>${courses.length} ${esc(t('個課程','courses'))}</span></header><div class="studio-course-list">${rows}</div></section>`:!loading&&!error?`<p class="empty">${esc(t('暫時沒有公開課程。','No published courses at the moment.'))}</p>`:''}</section>`;
}

const shiftDate = (value, days) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export function studioCourseDetailsMarkup({ course, serviceCourse = null, slots = [], from = '', to = '', loading = false, error = '', timesMarkup = null, backToTimetable = false } = {}, { t, esc, trialPreview = false }) {
  const age = course.ageZh ? `<div><dt>${esc(t('適合年齡', 'Age'))}</dt><dd>${esc(t(course.ageZh, course.ageEn))}</dd></div>` : '';
  const category = course.category ? `<div><dt>${esc(t('類別', 'Category'))}</dt><dd>${esc(course.category)}</dd></div>` : '';
  const level = course.level ? `<div><dt>${esc(t('程度', 'Level'))}</dt><dd>${esc(course.level)}</dd></div>` : '';
  const formats = (course.formatsZh || []).map((format, index) => `<li>${esc(t(format, course.formatsEn[index]))}</li>`).join('');
  const formatInfo = formats ? `<div><dt>${esc(t('課程安排', 'Class format'))}</dt><dd><ul>${formats}</ul></dd></div>` : '';
  const start = from || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
  const end = to || shiftDate(start, 6);
  const validSlots = slots.filter(slot => slot.courseId === serviceCourse?.id && slot.sourceAvailable !== false && slot.active !== false && slot.date >= start && slot.date <= end);
  const previous = shiftDate(start, -7), next = shiftDate(start, 7);
  const applicationCourseId = serviceCourse?.id || course.id, applicationCourseName = t(course.nameZh, course.nameEn);
  const bookButton = (timeslot = '') => `<button type="button" class="studio-book-trial" data-action="availability-trial-application-open" data-course-id="${esc(applicationCourseId)}" data-course-name="${esc(applicationCourseName)}" data-trial-timeslot="${esc(timeslot)}">${esc(t('預約試堂', 'Book a trial class'))}</button>`;
  const timeList = error
    ? `<div class="studio-time-state"><p role="alert">${esc(error)}</p><button type="button" class="ghost" data-action="availability-public-refresh">${esc(t('重新載入', 'Reload'))}</button></div>`
    : loading
      ? `<p class="studio-time-state" role="status">${esc(t('正在載入可約時段…', 'Loading available times…'))}</p>`
      : serviceCourse
        ? `<div class="studio-time-range"><label for="availability-public-from">${esc(t('開始日期', 'From'))}<input id="availability-public-from" name="from" type="date" value="${esc(start)}"></label><button type="button" class="ghost" data-action="availability-public-range" data-from="${esc(previous)}">${esc(t('前七天', 'Previous 7 days'))}</button><button type="button" class="ghost" data-action="availability-public-range" data-from="${esc(next)}">${esc(t('後七天', 'Next 7 days'))}</button></div>${validSlots.length ? `<div class="studio-time-list">${validSlots.map(slot => {
          const hasPlaces = slot.trialEnabled && Number.isSafeInteger(slot.trialRemaining) && slot.trialRemaining > 0;
          const status = !slot.trialEnabled ? t('未開放試堂', 'Trial unavailable') : hasPlaces ? t(`尚餘 ${slot.trialRemaining} 個名額`, `${slot.trialRemaining} places left`) : slot.trialRemaining === 0 ? t('已滿額', 'Full') : t('名額資料暫未提供', 'Availability unknown');
          return `<article class="studio-time-row"><div><time datetime="${esc(slot.date)}">${esc(slot.date)}</time><strong>${esc(slot.time || '—')} · ${esc(slot.duration ? t(`${slot.duration} 分鐘`, `${slot.duration} minutes`) : '—')}</strong><span>${esc([...(slot.roomNames || []), ...(slot.teacherNames || [])].join(' · ') || t('課室及老師資料暫未提供', 'Room and teacher details unavailable'))}</span></div><div><small>${esc(status)}</small>${hasPlaces ? bookButton(`${slot.date} ${slot.time}`) : ''}</div></article>`;
        }).join('')}</div><p class="studio-trial-note">${esc(t('目前提供試堂申請預覽；尚未正式送出預約。', 'Trial booking is a preview and is not submitted yet.'))}</p>` : `<p class="studio-time-state">${esc(t('這七天暫未有可約試堂時段。', 'No trial times are available in this seven-day period.'))}</p>`}</div>`
        : `<p class="studio-time-state">${esc(t('試堂時間尚未公開，請稍後再查看。', 'Trial times have not been published yet.'))}</p>`;

  return `<article class="studio-course-detail">${backToTimetable?`<button type="button" class="ghost studio-back-link" data-action="availability-public-back">← ${esc(t('返回時間表','Back to timetable'))}</button>`:`<a class="studio-back-link" href="/classes" data-go="/classes">← ${esc(t('返回課程', 'Back to classes'))}</a>`}<header><p>${esc(t(course.room.nameZh, course.room.nameEn))}</p><h1>${esc(t(course.nameZh, course.nameEn))}</h1></header><section class="studio-course-info" aria-labelledby="studio-course-info-title"><h2 id="studio-course-info-title">${esc(t('課程資料', 'Course information'))}</h2><dl>${age}${category}${level}${formatInfo}</dl></section>${timesMarkup!==null?timesMarkup:`<section class="studio-trial-times" aria-labelledby="studio-trial-title"><header><div><h2 id="studio-trial-title">${esc(t('可預約試堂時段', 'Available trial times'))}</h2><p>${esc(t('只顯示已公開的真實時段。', 'Only published times are shown.'))}</p></div></header>${timeList}</section>`}</article>`;
}