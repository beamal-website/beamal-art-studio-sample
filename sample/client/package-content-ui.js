const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const inputValue = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;

function segmentMinutes(value) {
  if (typeof value === 'string' && !/^\d+$/.test(value)) return null;
  if (!['string', 'number'].includes(typeof value)) return null;
  const minutes = Number(value);
  return positiveInteger(minutes) && minutes <= 1440 ? minutes : null;
}

export function validatePackageContentDraft({components, allowEmpty = false} = {}) {
  const rows = Array.isArray(components) ? components.map(row => ({id: row?.id, name: row?.name, minutes: row?.minutes})) : [];
  if (!rows.length) return allowEmpty === true && Array.isArray(components) ? {valid: true, components: rows, errors: {}, totalMinutes: 0} : {valid: false, components: rows, errors: {components: 'required'}, totalMinutes: null};
  const errors = {}, rowErrors = {}, ids = new Set();
  if (rows.length > 50) errors.components = 'limit';
  let totalMinutes = 0;
  rows.forEach((row, index) => {
    const fields = {};
    if (typeof row.id !== 'string' || !row.id.trim() || row.id !== row.id.trim() || row.id.length > 200) fields.id = 'id';
    else if (ids.has(row.id)) fields.id = 'duplicate';
    else ids.add(row.id);
    if (typeof row.name !== 'string' || !row.name.trim()) fields.name = 'name';
    else if (row.name.length > 200) fields.name = 'length';
    const minutes = segmentMinutes(row.minutes);
    if (minutes === null) fields.minutes = 'minutes';
    else totalMinutes += minutes;
    if (Object.keys(fields).length) rowErrors[index] = fields;
  });
  if (Object.keys(rowErrors).length) errors.rows = rowErrors;
  const valid = !Object.keys(errors).length && Number.isSafeInteger(totalMinutes);
  return {valid, components: rows, errors, totalMinutes: valid ? totalMinutes : null};
}

function validSavedContents(contents, fee) {
  if (!contents || contents.feeId !== fee?.id || !positiveInteger(fee?.version) || contents.feeVersion !== fee.version || !Number.isSafeInteger(contents.version) || contents.version < 0 || !Array.isArray(contents.components) || contents.components.length > 50) return false;
  if (contents.version === 0 && (contents.components.length || contents.updatedAt !== null)) return false;
  if (contents.version > 0 && (typeof contents.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(contents.updatedAt) || !Number.isFinite(Date.parse(contents.updatedAt)))) return false;
  if (!contents.components.length) return true;
  return contents.components.every(row => positiveInteger(row?.minutes)) && validatePackageContentDraft({components: contents.components}).valid;
}

function sameComponents(first, second) {
  return Array.isArray(first) && Array.isArray(second) && first.length === second.length && first.every((row, index) => row.id === second[index]?.id && row.name === second[index]?.name && segmentMinutes(row.minutes) === segmentMinutes(second[index]?.minutes));
}

function savedAcknowledgement(state) {
  return state.step === 'saved' && state.role === 'admin' && validSavedContents(state.savedContents, state.fee) && positiveInteger(state.savedContents.version) && validSavedContents(state.saveAck, state.fee) && state.saveAck.version === state.savedContents.version && sameComponents(state.savedContents.components, state.saveAck.components) && validatePackageContentDraft({components: state.components, allowEmpty: true}).valid && sameComponents(state.saveAck.components, state.components);
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
  const nameError = fields?.name === 'length' ? h.t('內容名稱最多 200 字。', 'Content names can contain up to 200 characters.') : fields?.name ? h.t('請輸入內容名稱。', 'Enter a content name.') : '';
  const minutesError = fields?.minutes ? h.t('請輸入 1 至 1440 的整數分鐘。', 'Enter a whole number of minutes from 1 to 1440.') : '';
  return `<li class="package-content-row" data-component-id="${id}">
    <div class="package-content-row-heading"><h4>${h.esc(position)}</h4><div class="package-content-row-actions">
      <button type="button" data-action="package-content-up" data-component-id="${id}" aria-label="${h.esc(h.t(`將第 ${index + 1} 項上移`, `Move segment ${index + 1} up`))}"${loading || index === 0 ? ' disabled' : ''}>${h.text('上移', 'Move up')}</button>
      <button type="button" data-action="package-content-down" data-component-id="${id}" aria-label="${h.esc(h.t(`將第 ${index + 1} 項下移`, `Move segment ${index + 1} down`))}"${loading || index === total - 1 ? ' disabled' : ''}>${h.text('下移', 'Move down')}</button>
      <button type="button" data-action="package-content-remove" data-component-id="${id}" aria-label="${h.esc(h.t(`移除第 ${index + 1} 項`, `Remove segment ${index + 1}`))}"${loading ? ' disabled' : ''}>${h.text('移除', 'Remove')}</button>
    </div></div>
    ${fields?.id ? `<p class="package-content-field-error">${h.text('此項內容無法識別，請移除後重新加入。', 'This segment could not be identified. Remove it and add it again.')}</p>` : ''}
    <div class="package-content-fields">
      <label for="package-component-name-${index}"><span>${h.esc(h.t(`第 ${index + 1} 項內容名稱`, `Segment ${index + 1} content name`))}</span><input id="package-component-name-${index}" name="packageComponentName" data-component-id="${id}" value="${h.esc(inputValue(row.name))}" maxlength="200" required${loading ? ' disabled' : ''}${nameError ? ` aria-invalid="true" aria-describedby="package-component-name-error-${index}"` : ''}>${nameError ? `<small id="package-component-name-error-${index}" class="package-content-field-error">${h.esc(nameError)}</small>` : ''}</label>
      <label for="package-component-minutes-${index}"><span>${h.esc(h.t(`第 ${index + 1} 項時長（分鐘）`, `Segment ${index + 1} duration (minutes)`))}</span><input id="package-component-minutes-${index}" name="packageComponentMinutes" data-component-id="${id}" value="${h.esc(inputValue(row.minutes))}" type="text" inputmode="numeric" required${loading ? ' disabled' : ''}${minutesError ? ` aria-invalid="true" aria-describedby="package-component-minutes-error-${index}"` : ''}>${minutesError ? `<small id="package-component-minutes-error-${index}" class="package-content-field-error">${h.esc(minutesError)}</small>` : ''}</label>
    </div>
  </li>`;
}

function contentSegments(components, h) {
  const totalMinutes = components.reduce((sum, row) => sum + segmentMinutes(row.minutes), 0);
  return `<ol class="package-content-review-list">${components.map(row => `<li data-component-id="${h.esc(row.id)}"><span>${h.esc(row.name)}</span><strong>${duration(segmentMinutes(row.minutes), h)}</strong></li>`).join('')}</ol><dl class="package-content-total">${definition(h.text('分段時長合計', 'Total segment duration'), duration(totalMinutes, h))}</dl><p class="package-content-note">${h.text('分段時長與方案額度分開列示。', 'Segment durations and the package quota are shown separately.')}</p>`;
}

export function packageContentMarkup(state = {}, context = {}) {
  const {fee, courseNames = [], role, step = 'details', components = [], error = '', sourceError = '', stale = false, loading = false, contentStatus, savedContents, saving = false, unconfirmed = false, saveError = ''} = state;
  const validFee = typeof fee?.id === 'string' && !!fee.id.trim() && fee.pricingModel === 'package';
  if (!['admin', 'teacher'].includes(role) || (!validFee && !sourceError)) return '';
  const h = helpers(context);
  const serviceProvided = Object.hasOwn(state, 'contentStatus'), canonical = validSavedContents(savedContents, fee), reading = !!loading || contentStatus === 'loading', ready = contentStatus === 'ready' && canonical;
  const validation = validatePackageContentDraft({components, allowEmpty: canonical && savedContents.version > 0});
  const failedRead = serviceProvided && !reading && !ready, saved = !sourceError && !stale && ready && savedAcknowledgement(state);
  const requestedStep = role === 'admin' && ['edit', 'review', 'saved'].includes(step) ? step : 'details';
  const blocked = !!sourceError || !!stale || reading || saving || unconfirmed || serviceProvided && !ready;
  const actualStep = requestedStep === 'saved' ? saved ? 'saved' : 'details' : requestedStep === 'review' && (!validation.valid || !serviceProvided && blocked) ? 'edit' : requestedStep;
  const showErrors = !!error || requestedStep === 'review' && !validation.valid;
  const changedMessage = serviceProvided ? h.t('課包內容已更新，請重新讀取後核對。你已填寫的內容會保留。', 'Package contents have changed. Reload to check them. Your entries are kept.') : h.t('費用資料已更新，請先返回查看，再繼續編排內容。', 'Fee details have changed. Return to check them before continuing.');
  const message = sourceError || (!serviceProvided && stale ? changedMessage : '') || error || (showErrors && !validation.valid ? validation.errors.components === 'limit' ? h.t('最多可編排 50 項內容。', 'You can arrange up to 50 segments.') : h.t('請檢查內容名稱及分段時長。', 'Check the content names and segment durations.') : '');
  let content = !sourceError && validFee ? savedContext(fee, courseNames, h) : '';
  let footer;
  if (actualStep === 'details') {
    const savedMarkup = !sourceError && ready ? savedContents.components.length ? contentSegments(savedContents.components, h) : `<p class="package-content-note">${h.text('尚未設定內容。', 'No contents have been set.')}</p>` : `<p class="package-content-note"${reading || failedRead ? ' role="status"' : ''}>${h.text(reading ? '正在載入內容…' : failedRead ? '未能讀取內容，請重試。' : '內容尚未提供。', reading ? 'Loading contents…' : failedRead ? 'Could not load contents. Try again.' : 'Contents have not been provided.')}</p>`;
    content += `<section class="package-content-section"><h3>${h.text('已儲存內容', 'Saved contents')}</h3>${savedMarkup}</section>`;
    footer = `<button type="button" class="package-content-secondary" data-action="package-content-close"${saving ? ' disabled' : ''}>${h.text('關閉', 'Close')}</button>${role === 'admin' && validFee && !sourceError && (!serviceProvided || ready) ? `<button type="button" data-action="package-content-edit"${blocked ? ' disabled' : ''}>${h.text('編排內容', 'Edit contents')}</button>` : ''}`;
  } else if (actualStep === 'saved') {
    content += `<section id="package-content-saved" class="package-content-section package-content-saved" role="status" tabindex="-1"><h3>${h.text('內容已儲存', 'Contents saved')}</h3>${savedContents.components.length ? contentSegments(savedContents.components, h) : `<p class="package-content-note">${h.text('已清除全部已保存內容。', 'All saved contents have been cleared.')}</p>`}</section>`;
    footer = `<button type="button" class="package-content-secondary" data-action="package-content-close"${saving ? ' disabled' : ''}>${h.text('關閉', 'Close')}</button><button type="button" class="package-content-secondary" data-action="package-content-details"${saving ? ' disabled' : ''}>${h.text('查看已儲存內容', 'View saved contents')}</button><button type="button" data-action="package-content-edit"${blocked ? ' disabled' : ''}>${h.text('繼續編排', 'Continue editing')}</button>`;
  } else if (actualStep === 'review') {
    const canSave = validFee && validation.valid && canonical && !sourceError && !stale && !reading && !saving && (ready || unconfirmed && contentStatus === 'error');
    content += `<section class="package-content-section"><h3>${h.text('核對編排內容', 'Review contents')}</h3>${validation.components.length ? contentSegments(validation.components, h) : `<p class="package-content-note">${h.text('儲存後將清除全部已保存內容。', 'All saved contents will be cleared.')}</p>`}</section>`;
    footer = `<button type="button" class="package-content-secondary" data-action="package-content-back"${saving || unconfirmed ? ' disabled' : ''}>${h.text('返回修改', 'Back to edit')}</button><div class="package-content-save"><button type="button" data-action="package-content-save"${canSave ? '' : ' disabled'}>${h.text(saving ? '正在儲存…' : '儲存內容', saving ? 'Saving…' : 'Save contents')}</button>${!serviceProvided ? `<small>${h.text('內容儲存尚未開放。', 'Saving contents is not available yet.')}</small>` : ''}</div>`;
  } else {
    const locked = reading || saving || unconfirmed;
    content += `<section class="package-content-section"><h3>${h.text('編排內容', 'Edit contents')}</h3>${validation.components.length ? `<ol class="package-content-rows">${validation.components.map((row, index) => rowMarkup(row, index, validation.components.length, showErrors ? validation.errors.rows?.[index] : null, locked, h)).join('')}</ol>` : `<p class="package-content-note">${h.text('加入內容名稱及每項時長。', 'Add content names and the duration of each segment.')}</p>`}<button type="button" class="package-content-secondary" data-action="package-content-add"${locked || validation.components.length >= 50 ? ' disabled' : ''}>${h.text('加入內容', 'Add content')}</button></section>`;
    footer = `<button type="button" class="package-content-secondary" data-action="package-content-close"${saving ? ' disabled' : ''}>${h.text('取消', 'Cancel')}</button><button type="button" data-action="package-content-review"${blocked ? ' disabled' : ''}>${h.text('核對', 'Review')}</button>`;
  }
  if (['edit', 'review'].includes(actualStep)) content += `<p class="package-content-unsaved">${h.text('內容尚未儲存。', 'Contents have not been saved.')}</p>`;
  const saveMessage = stale && serviceProvided ? typeof saveError === 'string' && saveError ? saveError : changedMessage : unconfirmed ? h.t('尚未確認儲存結果。請重試儲存相同內容，或關閉後再查閱。', 'The saving result has not been confirmed. Retry saving the same contents, or close and check again later.') : typeof saveError === 'string' ? saveError : '';
  const feedback = `<p id="package-content-save-error" class="package-content-error package-content-save-error" role="alert" tabindex="-1"${saveMessage ? '' : ' hidden'}>${h.esc(saveMessage)}</p>`;
  const body = `<div id="package-content-body" class="package-content-body" tabindex="0"><p id="package-content-error" class="package-content-error" role="alert" tabindex="-1"${message ? '' : ' hidden'}>${h.esc(message)}</p>${reading && actualStep !== 'details' ? `<p class="package-content-loading" role="status">${h.text('正在載入內容…', 'Loading contents…')}</p>` : ''}${failedRead && actualStep !== 'details' ? `<p class="package-content-loading" role="status">${h.text('未能讀取內容，已填資料已保留。', 'Could not load contents. Your entries are kept.')}</p>` : ''}${sourceError || failedRead || stale ? `<button type="button" class="package-content-secondary package-content-retry" data-action="package-content-refresh"${reading || saving || unconfirmed && !stale ? ' disabled' : ''}>${h.text('重新讀取', 'Reload')}</button>` : ''}${content}</div>`;
  const shell = ['details', 'saved'].includes(actualStep) ? `${body}<footer class="package-content-footer">${footer}</footer>` : `<form id="package-content-editor" data-step="${actualStep}" novalidate${reading || saving ? ' aria-busy="true"' : ''}>${body}<footer class="package-content-footer">${footer}</footer></form>`;
  return `<div class="modal package-content-modal" role="dialog" aria-modal="true" aria-labelledby="package-content-title"${reading || saving ? ' aria-busy="true"' : ''}><div class="dialog package-content-dialog"${validFee ? ` data-fee-id="${h.esc(fee.id)}" data-fee-version="${h.esc(inputValue(fee.version))}"` : ''}><header class="package-content-header"><h2 id="package-content-title">${h.text('套票內容', 'Package contents')}</h2><button type="button" data-action="package-content-close" aria-label="${h.text('關閉', 'Close')}"${saving ? ' disabled' : ''}>×</button></header>${feedback}${shell}</div></div>`;
}
