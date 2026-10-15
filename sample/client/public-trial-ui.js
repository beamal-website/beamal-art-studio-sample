const fields = ['localName', 'fullName', 'dateOfBirth', 'gender', 'school', 'referrer', 'parentName', 'whatsapp', 'email', 'remark'];
const limits = { localName: 200, fullName: 200, school: 200, referrer: 200, parentName: 200, whatsapp: 100, email: 254, remark: 2000 };
const text = value => typeof value === 'string' ? value : '';
const identified = value => typeof value === 'string' && Boolean(value.trim());
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(text(value)) && value >= '0001-01-01' && value <= '9999-12-31' && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const validSource = state => identified(state?.publicCourse?.id) && identified(state?.slot?.id) && state.slot.courseId === state.publicCourse.id && validDate(state.slot.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(text(state.slot.time)) && Number.isSafeInteger(state.slot.duration) && state.slot.duration > 0 && state.slot.duration <= 1440 - Number(state.slot.time.slice(0, 2)) * 60 - Number(state.slot.time.slice(3));
const sourceStatus = state => validSource(state) && ['ready', 'loading', 'error', 'unavailable'].includes(state?.sourceStatus) ? state.sourceStatus : 'unavailable';
const mergeDraft = (draft, values) => Object.fromEntries(fields.map(key => [key, Object.hasOwn(values || {}, key) && typeof values[key] === 'string' ? values[key] : text(draft?.[key])]));
const age = (birth, today) => {
  if (!validDate(birth) || !validDate(today) || birth > today) return null;
  const [by, bm, bd] = birth.split('-').map(Number), [ty, tm, td] = today.split('-').map(Number);
  const months = (ty - by) * 12 + tm - bm - (td < bd ? 1 : 0);
  return { years: Math.floor(months / 12), months: months % 12 };
};

export function createPublicTrialDraft({ course = null, slot = null, today = '' } = {}) {
  const publicCourse = course ? Object.fromEntries(['id', 'courseName', 'category', 'level'].map(key => [key, text(course[key])])) : null;
  const publicSlot = slot ? {
    ...Object.fromEntries(['id', 'courseId', 'date', 'time'].map(key => [key, text(slot[key])])),
    duration: slot.duration,
    teacherNames: Array.isArray(slot.teacherNames) ? slot.teacherNames.filter(name => typeof name === 'string') : [],
    roomNames: Array.isArray(slot.roomNames) ? slot.roomNames.filter(name => typeof name === 'string') : [],
    ...Object.fromEntries(['trialEnabled', 'trialRemaining', 'trialStatus'].filter(key => Object.hasOwn(slot, key)).map(key => [key, slot[key]])),
  } : null;
  const state = { publicCourse, slot: publicSlot, today: text(today), step: 'details', draft: mergeDraft(), error: '', sourceStatus: 'ready', sourceMessage: '', capabilities: { submit: false } };
  return validSource(state) ? state : { ...state, sourceStatus: 'unavailable' };
}

function validation(draft, today) {
  if (Object.entries(limits).some(([key, limit]) => draft[key].length > limit)) return 'length';
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return 'email';
  if (draft.dateOfBirth.trim()) {
    if (!validDate(draft.dateOfBirth)) return 'birth-date';
    if (!validDate(today)) return 'birth-context';
    if (draft.dateOfBirth > today) return 'birth-future';
  }
  if (!['', 'male', 'female', 'unspecified'].includes(draft.gender)) return 'gender';
  return '';
}

export function advancePublicTrial(state = {}, command, values = {}) {
  if (!['draft', 'review', 'back'].includes(command)) return state;
  const draft = mergeDraft(state.draft, values);
  if (command === 'draft') return { ...state, draft, error: '' };
  if (command === 'back') return { ...state, draft, step: 'details', error: '' };
  const error = sourceStatus(state) === 'ready' ? validation(draft, state.today) : 'source';
  return { ...state, draft, step: error ? 'details' : 'review', error };
}

const labels = {
  localName: ['中文姓名', 'Chinese name'], fullName: ['英文姓名', 'English name'], dateOfBirth: ['出生日期', 'Date of birth'],
  gender: ['性別', 'Gender'], school: ['學校', 'School'], referrer: ['介紹人', 'Referrer'], parentName: ['家長姓名', 'Parent name'],
  whatsapp: ['WhatsApp', 'WhatsApp'], email: ['電郵', 'Email'], remark: ['備註', 'Remark'],
};
const errorLabels = {
  email: ['請輸入有效的電郵地址，或留空。', 'Enter a valid email address, or leave it blank.'],
  'birth-date': ['請輸入有效的出生日期，或留空。', 'Enter a valid date of birth, or leave it blank.'],
  'birth-future': ['出生日期不能晚於今天。', 'Date of birth cannot be in the future.'],
  'birth-context': ['暫時無法核對出生日期，請重新載入時段。', 'The date of birth cannot be checked yet. Please reload this time.'],
  gender: ['請選擇性別，或留空。', 'Choose a gender option, or leave it blank.'],
  length: ['部分資料過長，請縮短後再核對。', 'Some entries are too long. Please shorten them before reviewing.'],
  source: ['暫時無法核對此時段，請重新載入。', 'This time cannot be checked yet. Please reload it.'],
};
const genderLabels = { male: ['男', 'Male'], female: ['女', 'Female'], unspecified: ['不透露', 'Prefer not to say'] };
const fallbackEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ageText = (state, t) => {
  const value = age(state.draft?.dateOfBirth, state.today);
  return value ? t(`${value.years} 歲 ${value.months} 個月`, `${value.years} years ${value.months} months`) : '';
};
const buttonMarkup = (command, label, { esc, primary = false, disabled = false, submit = false } = {}) => `<button type="${submit ? 'submit' : 'button'}" class="public-trial-button${primary ? ' public-trial-primary' : ''}" data-action="public-trial-command" data-command="${command}"${disabled ? ' disabled' : ''}>${esc(label)}</button>`;

function sourceMarkup(state, { t, esc }) {
  const status = sourceStatus(state);
  if (status === 'ready') return '';
  const fallback = status === 'loading' ? t('正在載入此時段…', 'Loading this time…') : status === 'error' ? t('暫時未能更新此時段，請重試。', 'Could not refresh this time. Please try again.') : t('此時段已不可使用，請返回選擇其他時段。', 'This time is no longer available. Please choose another time.');
  return `<div class="public-trial-source" role="${status === 'loading' ? 'status' : 'alert'}"><p>${esc(text(state.sourceMessage).trim() ? state.sourceMessage : fallback)}</p>${status !== 'loading' ? buttonMarkup('retry', t('重新載入', 'Retry'), { esc }) : ''}</div>`;
}

function summaryMarkup(state, { t, esc }) {
  if (!validSource(state)) return '';
  return `<section class="public-trial-context" aria-label="${esc(t('已選時段', 'Selected time'))}"><h3>${esc(state.publicCourse.courseName || t('課程', 'Course'))}</h3><p><time datetime="${esc(state.slot.date)}">${esc(state.slot.date)}</time> · ${esc(state.slot.time)} · ${esc(t(`${state.slot.duration} 分鐘`, `${state.slot.duration} minutes`))}</p><p>${esc(t('老師', 'Teachers'))}：${esc(state.slot.teacherNames?.filter(name => typeof name === 'string').join(t('、', ', ')) || '—')}</p></section>`;
}

function formField(key, state, { t, esc }) {
  const value = text(state.draft?.[key]), label = t(...labels[key]), invalid = key === 'email' && state.error === 'email' || key === 'dateOfBirth' && ['birth-date', 'birth-future', 'birth-context'].includes(state.error) || key === 'gender' && state.error === 'gender';
  const shared = `id="public-trial-${key}" name="${key}"${invalid ? ` aria-invalid="true" aria-describedby="public-trial-${key}-error"` : ''}`;
  let control;
  if (key === 'gender') control = `<select ${shared}><option value=""${value === '' ? ' selected' : ''}>${esc(t('選擇（可留空）', 'Choose (optional)'))}</option>${Object.entries(genderLabels).map(([option, names]) => `<option value="${option}"${value === option ? ' selected' : ''}>${esc(t(...names))}</option>`).join('')}</select>`;
  else if (key === 'remark') control = `<textarea ${shared} maxlength="2000" rows="4">${esc(value)}</textarea>`;
  else control = `<input ${shared} type="${key === 'dateOfBirth' ? 'date' : key === 'email' ? 'email' : 'text'}" value="${esc(value)}"${limits[key] ? ` maxlength="${limits[key]}"` : ''}${key === 'dateOfBirth' && validDate(state.today) ? ` max="${esc(state.today)}"` : ''}>`;
  const displayedAge = key === 'dateOfBirth' ? ageText(state, t) : '';
  const correction = invalid ? `<small id="public-trial-${key}-error" class="public-trial-field-error" role="alert">${esc(t(...errorLabels[state.error]))}</small>` : '';
  return `<label class="public-trial-field${key === 'remark' ? ' public-trial-wide' : ''}" for="public-trial-${key}"><span>${esc(label)}</span>${control}${displayedAge ? `<small class="public-trial-age">${esc(displayedAge)} · ${esc(t('截至', 'As of'))} ${esc(state.today)}</small>` : ''}${correction}</label>`;
}

function reviewMarkup(state, { t, esc }) {
  const rows = fields.map(key => {
    const value = text(state.draft?.[key]), shown = key === 'gender' && Object.hasOwn(genderLabels, value) ? t(...genderLabels[value]) : value;
    return `<div><dt>${esc(t(...labels[key]))}</dt><dd>${shown ? esc(shown) : '—'}</dd></div>`;
  });
  const displayedAge = ageText(state, t);
  if (displayedAge) rows.splice(3, 0, `<div><dt>${esc(t('年齡', 'Age'))}</dt><dd>${esc(displayedAge)}<small>${esc(t('截至', 'As of'))} ${esc(state.today)}</small></dd></div>`);
  return `<dl class="public-trial-summary">${rows.join('')}</dl>`;
}

export function publicTrialMarkup(state = {}, { t = (_zh, en) => en, esc = fallbackEscape } = {}) {
  const review = state.step === 'review', ready = sourceStatus(state) === 'ready', title = review ? t('核對試課資料', 'Review trial details') : t('試課資料', 'Trial details');
  const error = Object.hasOwn(errorLabels, state.error) && !['email', 'birth-date', 'birth-future', 'birth-context', 'gender'].includes(state.error) ? errorLabels[state.error] : null, context = { t, esc };
  const body = `${summaryMarkup(state, context)}<p class="public-trial-note">${esc(t('試課申請暫未開放，可先填寫及核對資料。', 'Trial applications are not yet open. You can fill in and review the details first.'))}</p>${sourceMarkup(state, context)}${review ? reviewMarkup(state, context) : `<div class="public-trial-fields">${fields.map(key => formField(key, state, context)).join('')}</div>`}${error ? `<p id="public-trial-error" class="public-trial-error" role="alert" tabindex="-1">${esc(t(...error))}</p>` : ''}`;
  const footer = review ? `${buttonMarkup('back', t('修改資料', 'Edit details'), { esc })}${buttonMarkup('close', t('關閉', 'Close'), { esc })}${buttonMarkup('submit', t('提交申請', 'Submit application'), { esc, primary: true, disabled: true })}` : `${buttonMarkup('close', t('取消', 'Cancel'), { esc })}${buttonMarkup('review', t('下一步：核對資料', 'Next: review details'), { esc, primary: true, disabled: !ready, submit: true })}`;
  return `<div class="modal public-trial-modal" role="dialog" aria-modal="true" aria-labelledby="public-trial-title"><div class="dialog public-trial-dialog" tabindex="-1"><header class="public-trial-header"><h2 id="public-trial-title">${esc(title)}</h2><button type="button" class="public-trial-button public-trial-close" data-action="public-trial-command" data-command="close" aria-label="${esc(t('關閉', 'Close'))}">×</button></header>${review ? '<div class="public-trial-content">' : '<form id="public-trial-form" novalidate>'}<div class="public-trial-body" aria-busy="${sourceStatus(state) === 'loading'}">${body}</div><footer class="public-trial-footer">${footer}</footer>${review ? '</div>' : '</form>'}</div></div>`;
}
