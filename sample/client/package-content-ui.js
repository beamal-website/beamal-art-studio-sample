const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const inputValue = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;

function segmentMinutes(value) {
  if (typeof value === 'string' && !/^\d+$/.test(value)) return null;
  if (!['string', 'number'].includes(typeof value)) return null;
  const minutes = Number(value);
  return positiveInteger(minutes) && minutes <= 1440 ? minutes : null;
}

export function validatePackageContentDraft({components} = {}) {
  const rows = Array.isArray(components) ? components.map(row => ({id: row?.id, name: row?.name, minutes: row?.minutes})) : [];
  if (!rows.length) return {valid: false, components: rows, errors: {components: 'required'}, totalMinutes: null};
  const errors = {}, rowErrors = {}, ids = new Set();
  let totalMinutes = 0;
  rows.forEach((row, index) => {
    const fields = {};
    if (typeof row.id !== 'string' || !row.id.trim() || row.id !== row.id.trim()) fields.id = 'id';
    else if (ids.has(row.id)) fields.id = 'duplicate';
    else ids.add(row.id);
    if (typeof row.name !== 'string' || !row.name.trim()) fields.name = 'name';
    const minutes = segmentMinutes(row.minutes);
    if (minutes === null) fields.minutes = 'minutes';
    else totalMinutes += minutes;
    if (Object.keys(fields).length) rowErrors[index] = fields;
  });
  if (Object.keys(rowErrors).length) errors.rows = rowErrors;
  const valid = !Object.keys(errors).length && Number.isSafeInteger(totalMinutes);
  return {valid, components: rows, errors, totalMinutes: valid ? totalMinutes : null};
}

function helpers(context) {
  const t = typeof context?.t === 'function' ? context.t : (_zh, en) => en;
  const esc = typeof context?.esc === 'function' ? context.esc : escape;
  return {t, esc, text: (zh, en) => esc(t(zh, en)), unknown: () => esc(t('未提供', 'Not provided'))};
}

function provided(value, h) {
  return typeof value === 'string' && value.trim() ? h.esc(value) : h.unknown();
}

function definition(label, value) {
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}

function duration(minutes, h) {
  return h.esc(h.t(`${minutes} 分鐘`, `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`));
}

function savedContext(fee, courseNames, h) {
  const unit = fee.packageType === 'minutes' ? ['分鐘', 'minutes', 'minute'] : ['visits', 'lessons'].includes(fee.packageType) ? ['次', 'visits', 'visit'] : null;
  const quota = unit && positiveInteger(fee.packageTotal) ? h.esc(h.t(`${fee.packageTotal} ${unit[0]}`, `${fee.packageTotal} ${fee.packageTotal === 1 ? unit[2] : unit[1]}`)) : h.unknown();
  const names = Array.isArray(courseNames) ? courseNames.filter(name => typeof name === 'string' && name.trim()) : [];
  return `<section class="package-content-context"><h3>${provided(fee.feeName, h)}</h3><dl>${definition(h.text('費用編號', 'Fee code'), provided(fee.feeCode, h))}${definition(h.text('收費模式', 'Pricing model'), h.text('固定套票', 'Fixed package'))}${definition(h.text('已儲存方案額度', 'Saved package quota'), quota)}</dl><h4>${h.text('已儲存的關聯課程', 'Saved linked courses')}</h4>${names.length ? `<ul>${names.map(name => `<li>${h.esc(name)}</li>`).join('')}</ul>` : `<p class="package-content-note">${h.text('關聯課程資料暫未提供。', 'Linked course details are not available yet.')}</p>`}</section>`;
}

function rowMarkup(row, index, total, fields, loading, h) {
  const id = h.esc(inputValue(row.id));
  const position = h.t(`第 ${index + 1} 項`, `Segment ${index + 1}`);
  const nameError = fields?.name ? h.t('請輸入內容名稱。', 'Enter a content name.') : '';
  const minutesError = fields?.minutes ? h.t('請輸入 1 至 1440 的整數分鐘。', 'Enter a whole number of minutes from 1 to 1440.') : '';
  return `<li class="package-content-row" data-component-id="${id}">
    <div class="package-content-row-heading"><h4>${h.esc(position)}</h4><div class="package-content-row-actions">
      <button type="button" data-action="package-content-up" data-component-id="${id}" aria-label="${h.esc(h.t(`將第 ${index + 1} 項上移`, `Move segment ${index + 1} up`))}"${loading || index === 0 ? ' disabled' : ''}>${h.text('上移', 'Move up')}</button>
      <button type="button" data-action="package-content-down" data-component-id="${id}" aria-label="${h.esc(h.t(`將第 ${index + 1} 項下移`, `Move segment ${index + 1} down`))}"${loading || index === total - 1 ? ' disabled' : ''}>${h.text('下移', 'Move down')}</button>
      <button type="button" data-action="package-content-remove" data-component-id="${id}" aria-label="${h.esc(h.t(`移除第 ${index + 1} 項`, `Remove segment ${index + 1}`))}"${loading ? ' disabled' : ''}>${h.text('移除', 'Remove')}</button>
    </div></div>
    ${fields?.id ? `<p class="package-content-field-error">${h.text('此項內容無法識別，請移除後重新加入。', 'This segment could not be identified. Remove it and add it again.')}</p>` : ''}
    <div class="package-content-fields">
      <label for="package-component-name-${index}"><span>${h.esc(h.t(`第 ${index + 1} 項內容名稱`, `Segment ${index + 1} content name`))}</span><input id="package-component-name-${index}" name="packageComponentName" data-component-id="${id}" value="${h.esc(inputValue(row.name))}" required${loading ? ' disabled' : ''}${nameError ? ` aria-invalid="true" aria-describedby="package-component-name-error-${index}"` : ''}>${nameError ? `<small id="package-component-name-error-${index}" class="package-content-field-error">${h.esc(nameError)}</small>` : ''}</label>
      <label for="package-component-minutes-${index}"><span>${h.esc(h.t(`第 ${index + 1} 項時長（分鐘）`, `Segment ${index + 1} duration (minutes)`))}</span><input id="package-component-minutes-${index}" name="packageComponentMinutes" data-component-id="${id}" value="${h.esc(inputValue(row.minutes))}" type="text" inputmode="numeric" required${loading ? ' disabled' : ''}${minutesError ? ` aria-invalid="true" aria-describedby="package-component-minutes-error-${index}"` : ''}>${minutesError ? `<small id="package-component-minutes-error-${index}" class="package-content-field-error">${h.esc(minutesError)}</small>` : ''}</label>
    </div>
  </li>`;
}

export function packageContentMarkup({fee, courseNames = [], role, step = 'details', components = [], error = '', sourceError = '', stale = false, loading = false} = {}, context = {}) {
  const validFee = typeof fee?.id === 'string' && !!fee.id.trim() && fee.pricingModel === 'package';
  if (!['admin', 'teacher'].includes(role) || (!validFee && !sourceError)) return '';
  const h = helpers(context), validation = validatePackageContentDraft({components});
  const requestedStep = role === 'admin' && ['edit', 'review'].includes(step) ? step : 'details';
  const blocked = !!sourceError || !!stale || !!loading;
  const actualStep = requestedStep === 'review' && (!validation.valid || blocked) ? 'edit' : requestedStep;
  const showErrors = !!error || requestedStep === 'review' && !validation.valid;
  const message = sourceError || error || (stale ? h.t('費用資料已更新，請先返回查看，再繼續編排內容。', 'Fee details have changed. Return to check them before continuing.') : '') || (showErrors && !validation.valid ? h.t('請檢查內容名稱及分段時長。', 'Check the content names and segment durations.') : '');
  let content = !sourceError && validFee ? savedContext(fee, courseNames, h) : '';
  let footer;
  if (actualStep === 'details') {
    content += `<section class="package-content-section"><h3>${h.text('已儲存內容', 'Saved contents')}</h3><p class="package-content-note">${h.text('內容尚未提供。', 'Contents have not been provided.')}</p></section>`;
    footer = `<button type="button" class="package-content-secondary" data-action="package-content-close">${h.text('關閉', 'Close')}</button>${role === 'admin' && validFee && !sourceError ? `<button type="button" data-action="package-content-edit"${blocked ? ' disabled' : ''}>${h.text('編排內容', 'Edit contents')}</button>` : ''}`;
  } else if (actualStep === 'review') {
    content += `<section class="package-content-section"><h3>${h.text('核對編排內容', 'Review contents')}</h3><ol class="package-content-review-list">${validation.components.map(row => `<li data-component-id="${h.esc(row.id)}"><span>${h.esc(row.name)}</span><strong>${duration(segmentMinutes(row.minutes), h)}</strong></li>`).join('')}</ol><dl class="package-content-total">${definition(h.text('分段時長合計', 'Total segment duration'), duration(validation.totalMinutes, h))}</dl><p class="package-content-note">${h.text('分段時長與方案額度分開列示。', 'Segment durations and the package quota are shown separately.')}</p></section>`;
    footer = `<button type="button" class="package-content-secondary" data-action="package-content-back">${h.text('返回修改', 'Back to edit')}</button><div class="package-content-save"><button type="submit" disabled>${h.text('儲存內容', 'Save contents')}</button><small>${h.text('內容儲存尚未開放。', 'Saving contents is not available yet.')}</small></div>`;
  } else {
    content += `<section class="package-content-section"><h3>${h.text('編排內容', 'Edit contents')}</h3>${validation.components.length ? `<ol class="package-content-rows">${validation.components.map((row, index) => rowMarkup(row, index, validation.components.length, showErrors ? validation.errors.rows?.[index] : null, loading, h)).join('')}</ol>` : `<p class="package-content-note">${h.text('加入內容名稱及每項時長。', 'Add content names and the duration of each segment.')}</p>`}<button type="button" class="package-content-secondary" data-action="package-content-add"${loading ? ' disabled' : ''}>${h.text('加入內容', 'Add content')}</button></section>`;
    footer = `<button type="button" class="package-content-secondary" data-action="package-content-close">${h.text('取消', 'Cancel')}</button><button type="button" data-action="package-content-review"${blocked ? ' disabled' : ''}>${h.text('核對', 'Review')}</button>`;
  }
  if (actualStep !== 'details') content += `<p class="package-content-unsaved">${h.text('內容尚未儲存。', 'Contents have not been saved.')}</p>`;
  const body = `<div id="package-content-body" class="package-content-body" tabindex="0"><p id="package-content-error" class="package-content-error" role="alert" tabindex="-1"${message ? '' : ' hidden'}>${h.esc(message)}</p>${loading ? `<p class="package-content-loading" role="status">${h.text('正在重新讀取費用…', 'Reloading fee details…')}</p>` : ''}${sourceError ? `<button type="button" class="package-content-secondary package-content-retry" data-action="package-content-refresh"${loading ? ' disabled' : ''}>${h.text('重新讀取費用', 'Reload fee')}</button>` : ''}${content}</div>`;
  const shell = actualStep === 'details' ? `${body}<footer class="package-content-footer">${footer}</footer>` : `<form id="package-content-editor" data-step="${actualStep}" novalidate${loading ? ' aria-busy="true"' : ''}>${body}<footer class="package-content-footer">${footer}</footer></form>`;
  return `<div class="modal package-content-modal" role="dialog" aria-modal="true" aria-labelledby="package-content-title"${loading ? ' aria-busy="true"' : ''}><div class="dialog package-content-dialog"${validFee ? ` data-fee-id="${h.esc(fee.id)}" data-fee-version="${h.esc(inputValue(fee.version))}"` : ''}><header class="package-content-header"><h2 id="package-content-title">${h.text('套票內容', 'Package contents')}</h2><button type="button" data-action="package-content-close" aria-label="${h.text('關閉', 'Close')}">×</button></header>${shell}</div></div>`;
}
