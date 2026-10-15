const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const rawValue = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const savedFee = fee => typeof fee?.id === 'string' && !!fee.id.trim();
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
const validFuturePrice = price => typeof price === 'number' && Number.isFinite(price) && price >= .01 && price <= 1_000_000 && Math.abs(price * 100 - Math.round(price * 100)) < .000001;

function helpers(context) {
  const t = typeof context?.t === 'function' ? context.t : (_zh, en) => en;
  const esc = typeof context?.esc === 'function' ? context.esc : escape;
  return {t, esc, text: (zh, en) => esc(t(zh, en)), unknown: () => esc(t('未提供', 'Not provided'))};
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function validateFeePricingDraft(values = {}) {
  const draft = {futurePrice: rawValue(values?.futurePrice), effectiveDate: rawValue(values?.effectiveDate)};
  const amount = /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(draft.futurePrice) ? Number(draft.futurePrice) : NaN;
  const errors = {};
  if (!validFuturePrice(amount)) errors.futurePrice = 'amount';
  if (!validDate(draft.effectiveDate)) errors.effectiveDate = 'date';
  return {valid: !Object.keys(errors).length, values: draft, price: errors.futurePrice ? null : amount, effectiveDate: draft.effectiveDate, errors};
}

function money(value, h) {
  // Known saved amounts remain facts even when they fall outside today's input limits.
  const known = typeof value === 'number' && Number.isFinite(value) && value >= 0;
  return known ? h.esc(new Intl.NumberFormat('en-HK', {style: 'currency', currency: 'HKD'}).format(value)) : h.unknown();
}

function provided(value, h) {
  return typeof value === 'string' && value.trim() ? h.esc(value) : h.unknown();
}

function count(value, zh, en, singular, h) {
  return positiveInteger(value) ? h.esc(h.t(`${value} ${zh}`, `${value} ${value === 1 ? singular : en}`)) : h.unknown();
}

function pricingModel(model, h) {
  if (model === 'monthly-lessons') return h.text('按當月堂數計算月費', 'Monthly fee by lesson count');
  if (model === 'fixed-monthly') return h.text('固定月費', 'Fixed monthly fee');
  if (model === 'package') return h.text('固定套票', 'Fixed package');
  return h.unknown();
}

function bookingExpiry(value, h) {
  if (value === null) return h.text('不設預約期限', 'No booking expiry');
  const units = {days: ['日', 'days', 'day'], weeks: ['星期', 'weeks', 'week'], months: ['個月', 'months', 'month']};
  const unit = typeof value?.unit === 'string' && Object.hasOwn(units, value.unit) ? units[value.unit] : null;
  return unit ? count(value.value, ...unit, h) : h.unknown();
}

function definition(label, value) {
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}

function pricingFacts(pricing = {}, h, current = false) {
  const model = pricing?.pricingModel;
  let facts = definition(h.text('收費模式', 'Pricing model'), pricingModel(model, h));
  facts += definition(current ? h.text('已儲存現價', 'Saved current price') : h.text('記錄價格', 'Recorded price'), money(pricing?.price, h));
  if (model === 'monthly-lessons') facts += definition(h.text('每堂時長', 'Duration per lesson'), count(pricing.duration, '分鐘', 'minutes', 'minute', h));
  if (model === 'monthly-lessons' || model === 'fixed-monthly') facts += definition(h.text('月數', 'No. of months'), count(pricing.months, '個月', 'months', 'month', h));
  if (model === 'package') {
    const unit = pricing.packageType === 'minutes' ? ['分鐘', 'minutes', 'minute'] : ['visits', 'lessons'].includes(pricing.packageType) ? ['次', 'visits', 'visit'] : null;
    facts += definition(h.text('套票總額度', 'Package total'), unit ? count(pricing.packageTotal, ...unit, h) : h.unknown());
  }
  facts += definition(h.text('預約期限（由發票日期起計）', 'Booking expiry (from invoice date)'), bookingExpiry(pricing?.bookingExpiry, h));
  return facts;
}

function savedDetails(fee, h) {
  return `<section class="fee-ui-section"><h3>${provided(fee.feeName, h)}</h3><dl class="fee-ui-facts">${definition(h.text('費用編號', 'Fee code'), provided(fee.feeCode, h))}${definition(h.text('版本', 'Version'), positiveInteger(fee.version) ? h.esc(fee.version) : h.unknown())}${pricingFacts(fee, h, true)}${definition(h.text('網上商店', 'Online Store'), fee.onlineStore === true ? h.text('顯示', 'Shown') : fee.onlineStore === false ? h.text('隱藏', 'Hidden') : h.unknown())}</dl></section>`;
}

function linkedCourses(courseNames, h) {
  const names = Array.isArray(courseNames) ? courseNames.filter(value => typeof value === 'string' && value.trim()) : [];
  return `<section class="fee-ui-section"><h3>${h.text('已儲存的關聯課程', 'Saved linked courses')}</h3>${names.length ? `<ul class="fee-ui-courses">${names.map(name => `<li>${h.esc(name)}</li>`).join('')}</ul>` : `<p class="fee-ui-note">${h.text('關聯課程資料暫未提供。', 'Linked course details are not available yet.')}</p>`}</section>`;
}

function alertMarkup(message, h, id = '') {
  return `<p${id ? ` id="${id}"` : ''} class="fee-ui-error" role="alert" tabindex="-1"${message ? '' : ' hidden'}>${h.esc(message)}</p>`;
}

// UI stage only. Never submit a future price through the current-price editor.
export function feePricingMarkup({fee, courseNames = [], values = {}, role, step = 'edit', error = '', sourceError = ''} = {}, context = {}) {
  if (role !== 'admin' || (!savedFee(fee) && !sourceError)) return '';
  const h = helpers(context), validation = validateFeePricingDraft(values);
  const review = step === 'review' && validation.valid && !sourceError;
  const showErrors = !!error || step === 'review' && !validation.valid;
  const amountError = showErrors && validation.errors.futurePrice ? h.t('請輸入 0.01 至 1,000,000 港元，最多兩位小數。', 'Enter HK$0.01 to HK$1,000,000 with at most two decimal places.') : '';
  const dateError = showErrors && validation.errors.effectiveDate ? h.t('請輸入有效日期（年-月-日）。', 'Enter a valid date (YYYY-MM-DD).') : '';
  const message = sourceError || error || (showErrors && !validation.valid ? h.t('請檢查新價格及生效日期。', 'Check the new price and effective date.') : '');
  const proposal = review ? `<section class="fee-ui-section"><h3>${h.text('核對新價格', 'Review new pricing')}</h3><dl class="fee-ui-facts">${definition(h.text('新價格（港元）', 'New price (HKD)'), money(validation.price, h))}${definition(h.text('生效日期', 'Effective date'), h.esc(validation.effectiveDate))}</dl><input type="hidden" name="futurePrice" value="${h.esc(validation.values.futurePrice)}"><input type="hidden" name="effectiveDate" value="${h.esc(validation.values.effectiveDate)}"></section>` : `<section class="fee-ui-section"><h3>${h.text('新價格', 'New pricing')}</h3><div class="fee-ui-inputs"><label class="fee-ui-field" for="fee-pricing-amount"><span>${h.text('新價格（港元）', 'New price (HKD)')}</span><input id="fee-pricing-amount" name="futurePrice" type="text" inputmode="decimal" value="${h.esc(validation.values.futurePrice)}" required aria-describedby="fee-pricing-amount-help${amountError ? ' fee-pricing-amount-error' : ''}"${amountError ? ' aria-invalid="true"' : ''}><small id="fee-pricing-amount-help">${h.text('0.01 至 1,000,000，最多兩位小數。', '0.01 to 1,000,000, at most two decimal places.')}</small>${amountError ? `<small id="fee-pricing-amount-error" class="fee-ui-field-error">${h.esc(amountError)}</small>` : ''}</label><label class="fee-ui-field" for="fee-pricing-date"><span>${h.text('生效日期', 'Effective date')}</span><input id="fee-pricing-date" name="effectiveDate" type="date" value="${h.esc(validation.values.effectiveDate)}" required${dateError ? ' aria-invalid="true" aria-describedby="fee-pricing-date-error"' : ''}>${dateError ? `<small id="fee-pricing-date-error" class="fee-ui-field-error">${h.esc(dateError)}</small>` : ''}</label></div></section>`;
  return `<div class="modal create-course-modal fee-pricing-modal" role="dialog" aria-modal="true" aria-labelledby="fee-pricing-title"><div class="dialog create-course-dialog fee-pricing-dialog"><header class="create-course-header fee-ui-header"><h2 id="fee-pricing-title">${review ? h.text('核對新價格', 'Review new pricing') : h.text('預約新價格', 'Schedule new pricing')}</h2><button type="button" data-action="fee-pricing-close" aria-label="${h.text('關閉', 'Close')}">×</button></header><form id="fee-pricing-editor" data-step="${review ? 'review' : 'edit'}" novalidate><div class="create-course-body fee-pricing-body" tabindex="0">${alertMarkup(message, h, 'fee-pricing-error')}${sourceError ? `<button type="button" class="fee-ui-secondary" data-action="fee-pricing-refresh">${h.text('重新讀取費用', 'Reload fee')}</button>` : savedDetails(fee, h) + linkedCourses(courseNames, h)}${proposal}<p class="fee-ui-note">${h.text('既有訂單保留已儲存的價格快照。', 'Existing orders keep their saved price snapshots.')}</p><p class="fee-ui-notice">${h.text('價格排程暫未提供；此處輸入及核對不會更改現價。', 'Price scheduling is not available yet. Entering and reviewing details here does not change the current price.')}</p></div><footer class="create-course-footer fee-ui-footer"><button type="button" class="ghost" data-action="${review ? 'fee-pricing-back' : 'fee-pricing-close'}">${review ? h.text('返回修改', 'Back to edit') : h.text('取消', 'Cancel')}</button><button type="submit"${review || sourceError ? ' disabled' : ''}>${review ? h.text('儲存新價格', 'Save new pricing') : h.text('核對', 'Review')}</button></footer></form></div></div>`;
}

function recordedAction(action, h) {
  const labels = {
    create: ['建立', 'Created'], created: ['建立', 'Created'], 'fee.create': ['建立', 'Created'], 'course.create': ['建立', 'Created'],
    update: ['修改', 'Updated'], updated: ['修改', 'Updated'], 'fee.update': ['修改', 'Updated'], 'course.update': ['修改', 'Updated'], 'course.fee.update': ['修改費用', 'Fee updated'],
  };
  return typeof action === 'string' && Object.hasOwn(labels, action) ? h.text(...labels[action]) : h.unknown();
}

function recordedTime(value, h) {
  if (typeof value !== 'string') return h.unknown();
  const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts || !validDate(parts[1]) || Number(parts[2]) > 23 || Number(parts[3]) > 59 || Number(parts[4]) > 59) return h.unknown();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return h.unknown();
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(date);
    const get = type => formatted.find(part => part.type === type)?.value || '';
    const display = `${get('year').padStart(4, '0')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
    return `<time datetime="${h.esc(value)}">${h.esc(display)} ${h.text('（香港時間）', '(Hong Kong time)')}</time>`;
  } catch {
    return h.unknown();
  }
}

function recordedEdits(history, h) {
  const status = history?.status;
  let content;
  if (status === 'loading') content = `<p class="fee-ui-note" role="status">${h.text('正在讀取修改記錄…', 'Loading recorded edits…')}</p>`;
  else if (status === 'error') content = `${alertMarkup(history.error || h.t('暫時無法讀取修改記錄。', 'Recorded edits could not be loaded.'), h)}<button type="button" class="fee-ui-secondary" data-action="fee-history-refresh">${h.text('重新讀取', 'Retry')}</button>`;
  else if (status === 'ready') {
    const records = Array.isArray(history.records) ? history.records.filter(record => record && typeof record === 'object' && !Array.isArray(record)) : [];
    content = records.length ? `<ol class="fee-ui-history">${records.map(record => {
      return `<li><h4>${provided(record.feeName, h)}</h4><dl class="fee-ui-facts">${definition(h.text('版本', 'Version'), positiveInteger(record.version) ? h.esc(record.version) : h.unknown())}${definition(h.text('操作', 'Action'), recordedAction(record.action, h))}${definition(h.text('記錄時間', 'Recorded at'), recordedTime(record.recordedAt, h))}${record.actorName ? definition(h.text('操作人員', 'Recorded by'), provided(record.actorName, h)) : ''}${pricingFacts(record.pricing, h)}</dl></li>`;
    }).join('')}</ol>` : `<p class="fee-ui-note">${h.text('未有傳回修改記錄；這不代表此費用從未更改。', 'No recorded edits were returned; this does not mean the fee has never changed.')}</p>`;
  } else content = `<p class="fee-ui-note">${h.text('修改記錄暫未提供。', 'Recorded edits are not available.')}</p>`;
  return `<section class="fee-ui-section fee-ui-recorded-edits"><h3>${h.text('修改記錄', 'Recorded edits')}</h3><p class="fee-ui-note">${h.text('記錄時間是修改資料的時間，不是價格生效期間。', 'Recorded times are edit times, not effective price periods.')}</p>${content}</section>`;
}

export function feeOverviewMarkup({fee, courseNames = [], role, history = {status: 'unavailable', records: []}, sourceError = ''} = {}, context = {}) {
  if (!['admin', 'teacher'].includes(role) || (!savedFee(fee) && !sourceError)) return '';
  const h = helpers(context);
  const content = sourceError ? alertMarkup(sourceError, h, 'fee-overview-error') : savedDetails(fee, h) + linkedCourses(courseNames, h) + (role === 'admin' ? recordedEdits(history, h) : '');
  return `<div class="modal create-course-modal fee-overview-modal" role="dialog" aria-modal="true" aria-labelledby="fee-overview-title"><div class="dialog create-course-dialog fee-overview-dialog"><header class="create-course-header fee-ui-header"><h2 id="fee-overview-title">${h.text('費用詳情', 'Fee details')}</h2><button type="button" data-action="fee-overview-close" aria-label="${h.text('關閉', 'Close')}">×</button></header><div class="fee-overview-body" tabindex="0">${content}</div><footer class="create-course-footer fee-ui-footer"><button type="button" class="ghost" data-action="fee-overview-close">${h.text('關閉', 'Close')}</button>${role === 'admin' && !sourceError ? `<button type="button" class="fee-ui-secondary" data-action="fee-overview-edit">${h.text('修改費用', 'Edit fee')}</button><button type="button" data-action="fee-overview-pricing">${h.text('預約新價格', 'Schedule new pricing')}</button>` : ''}</footer></div></div>`;
}
