const fields = ['descriptionZh', 'descriptionEn', 'minAgeYears', 'maxAgeYears'];
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const raw = value => typeof value === 'string' ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
const validId = value => typeof value === 'string' && !!value.trim() && value === value.trim();
const validCourse = course => validId(course?.id) && Number.isSafeInteger(course.version) && course.version > 0;
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

function helpers(context) {
  const t = typeof context?.t === 'function' ? context.t : (_zh, en) => en;
  const esc = typeof context?.esc === 'function' ? context.esc : escape;
  return {t, esc, text: (zh, en) => esc(t(zh, en)), unknown: () => esc(t('未提供', 'Not provided'))};
}

export function readCourseContentDraft(input) {
  return Object.fromEntries(fields.map(field => [field, field.startsWith('description') ? typeof input?.[field] === 'string' ? input[field] : '' : raw(input?.[field])]));
}

function validAge(value) {
  return value === '' || value.length <= 16 && /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) && Number.isFinite(Number(value));
}

function normalizedAge(value) {
  const [whole = '', fraction = ''] = value.split('.');
  const integer = whole.replace(/^0+/, '') || '0', decimal = fraction.replace(/0+$/, '');
  return decimal ? `${integer}.${decimal}` : integer;
}

function ageGreaterThan(first, second) {
  const [firstWhole, firstFraction = ''] = normalizedAge(first).split('.'), [secondWhole, secondFraction = ''] = normalizedAge(second).split('.');
  if (firstWhole.length !== secondWhole.length) return firstWhole.length > secondWhole.length;
  if (firstWhole !== secondWhole) return firstWhole > secondWhole;
  const length = Math.max(firstFraction.length, secondFraction.length);
  return firstFraction.padEnd(length, '0') > secondFraction.padEnd(length, '0');
}

export function validateCourseContentDraft(input) {
  const values = readCourseContentDraft(input);
  for (const field of ['descriptionZh', 'descriptionEn']) if (values[field].length > 10000) return {values, error: 'description', field};
  for (const field of ['minAgeYears', 'maxAgeYears']) if (!validAge(values[field])) return {values, error: 'age', field};
  if (values.minAgeYears && values.maxAgeYears && ageGreaterThan(values.minAgeYears, values.maxAgeYears)) return {values, error: 'range', field: 'maxAgeYears'};
  return {values, error: '', field: ''};
}

function canonicalContent(course) {
  const content = course?.content;
  if (!plain(content) || Object.keys(content).some(field => !fields.includes(field))) return null;
  for (const field of ['descriptionZh', 'descriptionEn']) if (content[field] !== undefined && content[field] !== null && typeof content[field] !== 'string') return null;
  for (const field of ['minAgeYears', 'maxAgeYears']) if (content[field] !== undefined && content[field] !== null && !['string', 'number'].includes(typeof content[field])) return null;
  if (['minAgeYears', 'maxAgeYears'].some(field => typeof content[field] === 'number' && !Number.isFinite(content[field]))) return null;
  const result = validateCourseContentDraft(content);
  return result.error ? null : result.values;
}

function ageMarkup(values, h) {
  const min = values?.minAgeYears, max = values?.maxAgeYears;
  if (min && max) {
    const first = normalizedAge(min), last = normalizedAge(max);
    return h.esc(first === last ? h.t(`${first} 歲`, `${first} years`) : h.t(`${first}–${last} 歲`, `${first}–${last} years`));
  }
  if (min) return h.esc(h.t(`${normalizedAge(min)} 歲或以上`, `${normalizedAge(min)} years and above`));
  if (max) return h.esc(h.t(`${normalizedAge(max)} 歲或以下`, `Up to ${normalizedAge(max)} years`));
  return h.unknown();
}

function contentMarkup(values, h, heading = 'h3') {
  const descriptions = [['descriptionZh', '中文介紹', 'Description (Chinese)', 'zh-Hant'], ['descriptionEn', '英文介紹', 'Description (English)', 'en']];
  return `<div class="course-content-copy">${descriptions.map(([field, chinese, english, language]) => {
    const provided = !!values?.[field]?.trim();
    return `<section><${heading}>${h.text(chinese, english)}</${heading}><p${provided ? ` lang="${language}"` : ''}>${provided ? h.esc(values[field]) : h.unknown()}</p></section>`;
  }).join('')}<dl><div><dt>${h.text('建議年齡', 'Recommended age')}</dt><dd>${ageMarkup(values, h)}</dd></div></dl></div>`;
}

function publicContentMarkup(values, h) {
  const selected = h.t('descriptionZh', 'descriptionEn') === 'descriptionZh' ? 'descriptionZh' : 'descriptionEn';
  const other = selected === 'descriptionZh' ? 'descriptionEn' : 'descriptionZh';
  const field = values[selected].trim() ? selected : values[other].trim() ? other : null;
  const description = field ? `<p lang="${field === 'descriptionZh' ? 'zh-Hant' : 'en'}">${h.esc(values[field])}</p>` : '';
  return `<div class="course-content-copy">${description}<dl><div><dt>${h.text('建議年齡', 'Recommended age')}</dt><dd>${ageMarkup(values, h)}</dd></div></dl></div>`;
}

export function courseContentPanelMarkup(course, {role = 'teacher', sourceError = ''} = {}, context = {}) {
  if (!['admin', 'teacher', 'public'].includes(role)) return '';
  const values = canonicalContent(course), hasContent = values && fields.some(field => values[field].trim());
  if (role === 'public' && (!validId(course?.id) || sourceError || course.deletedAt || !hasContent)) return '';
  if (role !== 'public' && !validCourse(course) && !sourceError) return '';
  const h = helpers(context);
  const content = role === 'public' ? publicContentMarkup(values, h) : hasContent ? contentMarkup(values, h) : `<div class="course-content-copy"><p>${h.text('課程介紹及建議年齡尚未提供。', 'Course descriptions and recommended ages have not been provided.')}</p></div>`;
  return `<section class="course-content-panel"><header><h2>${h.text('課程內容', 'Course content')}</h2>${role === 'admin' && validCourse(course) && !course.deletedAt && !sourceError ? `<button type="button" data-action="course-content-open" data-course-id="${h.esc(course.id)}">${h.text('編輯內容', 'Edit content')}</button>` : ''}</header>${sourceError ? `<p class="course-content-error" role="alert">${h.esc(sourceError)}</p>` : content}</section>`;
}

export function courseContentSourceKey(course) {
  if (!validCourse(course) || course.deletedAt) return '';
  return JSON.stringify([course.id, course.version, canonicalContent(course)]);
}

function validationMessage(error, h) {
  if (error === 'description') return h.t('每段介紹不可超過 10,000 字元。', 'Each description must be no longer than 10,000 characters.');
  if (error === 'age') return h.t('請輸入有效的非負年齡，例如 2.5；最多 16 個字元。', 'Enter a valid non-negative age, such as 2.5, using at most 16 characters.');
  if (error === 'range') return h.t('建議年齡上限不可低於下限。', 'The maximum recommended age cannot be lower than the minimum.');
  return error;
}

export function courseContentEditorMarkup({course, role, step = 'edit', values: suppliedValues, error = '', field = '', sourceError = '', stale = false, loading = false} = {}, context = {}) {
  if (role !== 'admin' || !validCourse(course) || course.deletedAt) return '';
  const h = helpers(context), validation = validateCourseContentDraft(suppliedValues === undefined ? canonicalContent(course) : suppliedValues), values = validation.values;
  const blocked = !!sourceError || !!stale || !!loading;
  const review = step === 'review' && !validation.error && !blocked;
  const activeError = error || (step === 'review' ? validation.error : ''), requestedErrorField = field || (activeError ? validation.field : '');
  const errorField = fields.includes(requestedErrorField) ? requestedErrorField : '';
  const message = validationMessage(activeError, h);
  const sourceMessage = sourceError || (stale ? h.t('課程資料已更新，請重新讀取後再繼續。', 'Course details have changed. Reload the course before continuing.') : '');
  const inlineField = !review && message && errorField;
  const errorMarkup = `<p id="course-content-error" class="course-content-error" role="alert" tabindex="-1"${message ? '' : ' hidden'}>${h.esc(message)}</p>`;
  const fieldErrorAttributes = key => message && errorField === key ? ' aria-invalid="true" aria-describedby="course-content-error"' : '';
  const fieldBlock = (key, label) => `<div data-course-content-field="${key}">${label}${inlineField === key ? errorMarkup : ''}</div>`;
  const descriptions = [['descriptionZh', '中文介紹（可選）', 'Description in Chinese (optional)', 'zh-Hant'], ['descriptionEn', '英文介紹（可選）', 'Description in English (optional)', 'en']].map(([key, chinese, english, language]) => fieldBlock(key, `<label for="course-content-${key}"><span>${h.text(chinese, english)}</span><textarea id="course-content-${key}" name="${key}" maxlength="10000" rows="6" lang="${language}"${fieldErrorAttributes(key)}>${h.esc(values[key])}</textarea></label>`)).join('');
  const ages = [['minAgeYears', '下限（歲）', 'Minimum age (years)'], ['maxAgeYears', '上限（歲）', 'Maximum age (years)']].map(([key, chinese, english]) => fieldBlock(key, `<label for="course-content-${key}"><span>${h.text(chinese, english)}</span><input id="course-content-${key}" name="${key}" type="text" inputmode="decimal" maxlength="16" value="${h.esc(values[key])}"${fieldErrorAttributes(key)}></label>`)).join('');
  const fieldsMarkup = `<div class="course-content-fields">${descriptions}<fieldset><legend>${h.text('建議年齡（可選）', 'Recommended ages (optional)')}</legend><div class="course-content-age-fields">${ages}</div></fieldset></div>`;
  const sourceFeedback = `<p id="course-content-source-error" class="course-content-error" role="alert" tabindex="-1"${sourceMessage ? '' : ' hidden'}>${h.esc(sourceMessage)}</p><button type="button" id="course-content-refresh" class="course-content-secondary" data-action="course-content-refresh"${loading ? ' disabled' : ''}${sourceMessage ? '' : ' hidden'}>${h.text('重新讀取課程', 'Reload course')}</button>`;
  const body = `<div id="course-content-body" class="course-content-body" tabindex="0">${inlineField ? '' : errorMarkup}<p class="course-content-course-name">${h.esc(course.courseName || h.t('課程資料', 'Course details'))}</p>${review ? `<section class="course-content-preview"><h3>${h.text('預覽（未發布）', 'Preview (not published)')}</h3>${contentMarkup(values, h, 'h4')}</section>` : fieldsMarkup}<p class="course-content-unsaved">${h.text('內容尚未儲存。', 'Contents have not been saved.')}</p></div>`;
  return `<div class="modal course-content-modal" role="dialog" aria-modal="true" aria-labelledby="course-content-title"><div class="dialog course-content-dialog"><header class="course-content-header"><h2 id="course-content-title">${review ? h.text('核對課程內容', 'Review course content') : h.text('編輯課程內容', 'Edit course content')}</h2><button type="button" data-action="course-content-close" aria-label="${h.text('關閉', 'Close')}">×</button></header>${sourceFeedback}<form id="course-content-editor" data-step="${review ? 'review' : 'edit'}" novalidate${loading ? ' aria-busy="true"' : ''}>${body}<footer class="course-content-footer"><button type="button" class="course-content-secondary" data-action="${review ? 'course-content-back' : 'course-content-close'}">${review ? h.text('返回修改', 'Back to edit') : h.text('取消', 'Cancel')}</button>${review ? `<div class="course-content-save"><button type="submit" disabled>${h.text('儲存內容', 'Save contents')}</button><small>${h.text('課程內容儲存尚未開放。', 'Saving course contents is not available yet.')}</small></div>` : `<button type="submit" id="course-content-review" data-action="course-content-review"${blocked ? ' disabled' : ''}>${h.text('核對', 'Review')}</button>`}</footer></form></div></div>`;
}
