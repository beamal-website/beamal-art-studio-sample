export const studioCourseRooms = [
  {
    id: 'b11', nameZh: 'B11 課室', nameEn: 'B11 Classroom', audienceZh: '幼兒及初級課程', audienceEn: 'Junior classes', courses: [
      { id: 'b11-pre-baby', nameZh: '幼幼班', nameEn: 'Pre-Baby Class', ageZh: '2.5 歲', ageEn: '2.5 years old', formatsZh: ['45 分鐘 · 4／12／24 堂'], formatsEn: ['45 minutes · 4 / 12 / 24 lessons'] },
      { id: 'b11-baby', nameZh: '幼兒班', nameEn: 'Baby Class', ageZh: '3 歲', ageEn: '3 years old', formatsZh: ['60 分鐘 · 4／12／24 堂'], formatsEn: ['60 minutes · 4 / 12 / 24 lessons'] },
      { id: 'b11-junior-a', nameZh: '初級 A 班', nameEn: 'Junior Class A', ageZh: '4–5 歲', ageEn: '4–5 years old', formatsZh: ['60 分鐘 · 4／12／24 堂'], formatsEn: ['60 minutes · 4 / 12 / 24 lessons'] },
      { id: 'b11-interview', nameZh: '面試班', nameEn: 'Interview Class', ageZh: '', ageEn: '', formatsZh: ['60 分鐘 · 8 堂'], formatsEn: ['60 minutes · 8 lessons'] },
      { id: 'b11-basic-story', nameZh: '基礎繪本課程', nameEn: 'Basic Story Course', ageZh: '', ageEn: '', formatsZh: ['60 分鐘 · 12 堂', '120 分鐘 · 6 堂'], formatsEn: ['60 minutes · 12 lessons', '120 minutes · 6 lessons'] },
      { id: 'b11-package-1', nameZh: '套裝 1', nameEn: 'Package 1', ageZh: '', ageEn: '', formatsZh: ['初級 A 班（60 分鐘）＋面試班（30 分鐘）· 12 堂'], formatsEn: ['Junior Class A (60 minutes) + Interview Class (30 minutes) · 12 lessons'] },
      { id: 'b11-package-2', nameZh: '套裝 2', nameEn: 'Package 2', ageZh: '', ageEn: '', formatsZh: ['初級 A 班（60 分鐘）＋面試班（60 分鐘）· 8 堂'], formatsEn: ['Junior Class A (60 minutes) + Interview Class (60 minutes) · 8 lessons'] },
    ],
  },
  {
    id: 'b8', nameZh: 'B8 課室', nameEn: 'B8 Classroom', audienceZh: '高級課程', audienceEn: 'Senior classes', courses: [
      { id: 'b8-junior-b', nameZh: '初級 B 班', nameEn: 'Junior Class B', ageZh: '6–8 歲', ageEn: '6–8 years old', formatsZh: ['60 分鐘 · 4／12／24 堂'], formatsEn: ['60 minutes · 4 / 12 / 24 lessons'] },
      { id: 'b8-pre-senior', nameZh: '預備高級班', nameEn: 'Pre-Senior Class', ageZh: '8–16 歲', ageEn: '8–16 years old', formatsZh: ['90 分鐘 · 4／12／24 堂'], formatsEn: ['90 minutes · 4 / 12 / 24 lessons'] },
      { id: 'b8-senior', nameZh: '高級班', nameEn: 'Senior Class', ageZh: '14 歲或以上', ageEn: '14 years old or above', formatsZh: ['120 分鐘 · 4／12／24 堂'], formatsEn: ['120 minutes · 4 / 12 / 24 lessons'] },
      { id: 'b8-advanced-story', nameZh: '進階繪本課程', nameEn: 'Advanced Storybook Course', ageZh: '6 歲或以上', ageEn: '6 years old or above', formatsZh: ['60 分鐘 × 16 堂', '120 分鐘 × 8 堂'], formatsEn: ['60 minutes × 16 lessons', '120 minutes × 8 lessons'] },
      { id: 'b8-sewing', nameZh: '縫紉班', nameEn: 'Sewing Class', ageZh: '6 歲或以上', ageEn: '6 years old or above', formatsZh: ['60 分鐘 · 4 堂'], formatsEn: ['60 minutes · 4 lessons'] },
    ],
  },
];

export function studioCourseById(id) {
  for (const room of studioCourseRooms) {
    const course = room.courses.find(item => item.id === id);
    if (course) return { ...course, room };
  }
  return null;
}

export function studioCourseByName(name) {
  const normalized = String(name ?? '').trim().toLocaleLowerCase();
  if (!normalized) return null;
  for (const room of studioCourseRooms) {
    const course = room.courses.find(item => [item.nameZh, item.nameEn].some(label => label.toLocaleLowerCase() === normalized));
    if (course) return { ...course, room };
  }
  return null;
}

export function studioCourseFromCatalog(record) {
  const known = studioCourseByName(record?.courseName);
  if (known) return { ...known, id: record.id, category: record.category || '', level: record.level || '' };
  const name = String(record?.courseName || '');
  return { id: record?.id, nameZh: name, nameEn: name, ageZh: '', ageEn: '', formatsZh: [], formatsEn: [], category: record?.category || '', level: record?.level || '', room: { nameZh: '其他課程', nameEn: 'Other courses' } };
}

export function studioCourseDirectoryMarkup({ courses = [], loading = false, error = '', t, esc }) {
  const normalized = value => String(value || '').trim().toLocaleLowerCase();
  const fixed = studioCourseRooms.flatMap(room => room.courses.map(course => {
    const linked = courses.find(record => [course.nameZh, course.nameEn].some(name => normalized(name) === normalized(record.courseName)));
    return { room, course, id: linked?.id || course.id, linked };
  }));
  const linkedIds = new Set(fixed.map(item => item.linked?.id).filter(Boolean));
  const row = (course, id, detail) => `<a class="studio-course-row" href="/classes/${encodeURIComponent(id)}" data-go="/classes/${encodeURIComponent(id)}"><span class="studio-course-copy"><strong>${esc(course)}</strong><span>${esc(detail)}</span></span><span class="studio-course-more">${esc(t('課程資料及試堂時段', 'Info & trial times'))}<span aria-hidden="true">↗</span></span></a>`;
  const rooms = studioCourseRooms.map(room => {
    const entries = fixed.filter(item => item.room.id === room.id);
    return `<section class="studio-room" aria-labelledby="studio-room-${room.id}"><header class="studio-room-heading"><div><p>${esc(t(room.audienceZh, room.audienceEn))}</p><h3 id="studio-room-${room.id}">${esc(t(room.nameZh, room.nameEn))}</h3></div><span>${String(entries.length).padStart(2, '0')} ${esc(t('個課程', 'classes'))}</span></header><div class="studio-course-list">${entries.map(({ course, id, linked }) => row(t(course.nameZh, course.nameEn), id, `${course.ageZh ? `${t(course.ageZh, course.ageEn)} · ` : ''}${t(course.formatsZh.join('；'), course.formatsEn.join('; '))}${linked?.category ? ` · ${linked.category}` : ''}`)).join('')}</div></section>`;
  }).join('');
  const additional = courses.filter(record => !linkedIds.has(record.id));
  const extraRoom = additional.length ? `<section class="studio-room" aria-labelledby="studio-room-additional"><header class="studio-room-heading"><div><p>${esc(t('更多公開課程', 'ADDITIONAL COURSES'))}</p><h3 id="studio-room-additional">${esc(t('其他課程', 'Other courses'))}</h3></div><span>${String(additional.length).padStart(2, '0')} ${esc(t('個課程', 'courses'))}</span></header><div class="studio-course-list">${additional.map(course => row(course.courseName, course.id, [course.category, course.level].filter(Boolean).map(esc).join(' · ') || t('課程資料', 'Course information'))).join('')}</div></section>` : '';
  return `<section class="studio-course-catalog" aria-labelledby="studio-courses-title"><header class="studio-catalog-heading"><p>${esc(t('課程及課室', 'CLASSES & CLASSROOMS'))}</p><h2 id="studio-courses-title">${esc(t('選擇適合的課程', 'Find a class'))}</h2></header>${loading ? `<p class="studio-catalog-status" role="status">${esc(t('正在同步公開課程…', 'Syncing published courses…'))}</p>` : ''}${error ? `<p class="studio-catalog-status" role="alert">${esc(error)}</p>` : ''}${rooms}${extraRoom}</section>`;
}

const shiftDate = (value, days) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export function studioCourseDetailsMarkup({ course, serviceCourse = null, slots = [], from = '', to = '', loading = false, error = '' } = {}, { t, esc, trialPreview = false }) {
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

  return `<article class="studio-course-detail"><a class="studio-back-link" href="/classes" data-go="/classes">← ${esc(t('返回課程', 'Back to classes'))}</a><header><p>${esc(t(course.room.nameZh, course.room.nameEn))}</p><h1>${esc(t(course.nameZh, course.nameEn))}</h1></header><section class="studio-course-info" aria-labelledby="studio-course-info-title"><h2 id="studio-course-info-title">${esc(t('課程資料', 'Course information'))}</h2><dl>${age}${category}${level}${formatInfo}</dl></section><section class="studio-trial-times" aria-labelledby="studio-trial-title"><header><div><h2 id="studio-trial-title">${esc(t('可預約試堂時段', 'Available trial times'))}</h2><p>${esc(t('只顯示已公開的真實時段。', 'Only published times are shown.'))}</p></div>${bookButton()}</header>${timeList}</section></article>`;
}