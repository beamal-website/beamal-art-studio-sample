const policyState = type => type?.studentReschedulingAllowed === true ? 'allowed' : type?.studentReschedulingAllowed === false ? 'disallowed' : 'unknown';
const policyLabel = (type, t) => ({ allowed: t('允許', 'Allowed'), disallowed: t('不允許', 'Not allowed'), unknown: t('尚未設定', 'Not set') })[policyState(type)];
const uniqueTypes = types => {
  const records = new Map();
  for (const type of Array.isArray(types) ? types : []) if (typeof type?.id === 'string' && type.id.trim() && !['__inherit', '__keep'].includes(type.id) && !records.has(type.id)) records.set(type.id, type);
  return [...records.values()];
};
const kindLabel = (type, t) => type.kind === 'regular' ? t('常規類型', 'Regular type') : type.kind === 'special' ? t('特別類型', 'Special type') : t('自訂類型', 'Custom type');
const catalogueLabels = (records, t) => {
  const counts = new Map();
  for (const type of records) { const name = classTypeName(type, { t }); counts.set(name, (counts.get(name) || 0) + 1); }
  return new Map(records.map(type => { const name = classTypeName(type, { t }); return [type.id, counts.get(name) > 1 ? `${name} · ${kindLabel(type, t)}` : name]; }));
};

export function classTypeName(type, { t }) {
  if (!type) return t('未指定課堂類型', 'No class type');
  if (type.kind === 'regular' && type.name === 'Regular Class') return t('常規課堂', 'Regular Class');
  if (type.kind === 'special' && type.name === 'Special Class') return t('特別課堂', 'Special Class');
  return typeof type.name === 'string' && type.name.trim() ? type.name : t('類型資料暫未提供', 'Type details unavailable');
}

export function classTypeDetailsMarkup(type, { t, esc }) {
  const label = t('學生自行申請調課', 'Student rescheduling requests') + t('：', ': ') + policyLabel(type, t);
  return `<div class="class-type-details"><span class="class-type-chip">${esc(classTypeName(type, { t }))}</span><span class="class-type-policy" data-class-type-policy="${policyState(type)}">${esc(label)}</span></div>`;
}

export function classTypeSelectionMarkup({ types = [], current = null, mode = 'course', courseDefaultId = null, selected = null } = {}, { t, esc }) {
  mode = ['course', 'schedule-create', 'schedule-edit'].includes(mode) ? mode : 'course';
  const records = uniqueTypes(types), labels = catalogueLabels(records, t), defaultValue = mode === 'schedule-edit' ? '__keep' : mode === 'schedule-create' ? '__inherit' : courseDefaultId || '';
  let value = typeof selected === 'string' ? selected : defaultValue;
  if (value === '__keep' && mode !== 'schedule-edit' || value === '__inherit' && mode !== 'schedule-create') value = defaultValue;
  const record = records.find(type => type.id === value), inherited = records.find(type => type.id === courseDefaultId);
  const target = value === '__keep' ? current : value === '__inherit' ? courseDefaultId ? inherited || { name: '' } : null : value ? record || (current?.id === value ? current : { name: '' }) : null;
  const historical = value && !['__keep', '__inherit'].includes(value) && record?.active !== true;
  const id = `class-type-selection-${mode}`;
  const choices = [
    ...(mode === 'schedule-create' ? [['__inherit', t('沿用課程預設', 'Use course default')]] : []),
    ...(mode === 'schedule-edit' ? [['__keep', t('保留目前類型及規則', 'Keep current type and rules')]] : []),
    ['', t('未指定課堂類型', 'No class type')],
  ];
  return `<div class="class-type-selection" data-class-type-mode="${mode}"><label class="class-type-field" for="${id}"><span>${esc(t('課堂類型', 'Class type'))}</span><select id="${id}" name="classTypeId" aria-label="${esc(t('課堂類型', 'Class type'))}">${choices.map(([key, label]) => `<option value="${key}"${value === key ? ' selected' : ''}>${esc(label)}</option>`).join('')}${records.filter(type => type.active === true).map(type => `<option value="${esc(type.id)}"${value === type.id ? ' selected' : ''}>${esc(labels.get(type.id) || classTypeName(type, { t }))}</option>`).join('')}${historical ? `<option value="${esc(value)}" selected disabled>${esc(classTypeName(record || (current?.id === value ? current : { name: '' }), { t }))} · ${esc(record?.active === false ? t('已停用（歷史設定）', 'Inactive (historical setting)') : t('資料暫未提供（歷史設定）', 'Details unavailable (historical setting)'))}</option>` : ''}</select></label><div class="class-type-rules-summary" data-class-type-summary>${classTypeDetailsMarkup(target, { t, esc })}</div><p class="class-type-note">${esc(mode === 'course' ? t('此預設供新的排課使用。', 'This default applies to new schedules.') : mode === 'schedule-edit' ? t('保留目前會沿用此堂已保存的類型及規則。', 'Keep current uses this lesson’s saved type and rules.') : t('選用類型時採用目前顯示的規則。', 'The selected type uses the rules shown here.'))}</p></div>`;
}

export function classTypesManagerMarkup({ types = [], busy = false, error = '' } = {}, { t, esc }) {
  const labels = catalogueLabels(uniqueTypes(types), t);
  const retry = error ? `<button type="button" class="ghost class-type-retry" data-action="class-types-refresh"${busy ? ' disabled' : ''}>${esc(t('重新載入', 'Reload'))}</button>` : '';
  return `<div id="class-types-manager" class="modal class-type-modal" role="dialog" aria-modal="true" aria-labelledby="class-types-manager-title"><div class="dialog class-types-manager-dialog" tabindex="-1"><header class="class-type-header"><h2 id="class-types-manager-title">${esc(t('課堂類型設定', 'Class type settings'))}</h2><button type="button" class="class-type-close" data-action="class-types-close" aria-label="${esc(t('關閉', 'Close'))}"${busy ? ' disabled' : ''}>×</button></header><div class="class-type-body" aria-busy="${busy}"><p class="class-type-note">${esc(t('管理課堂類型及學生自行申請調課的設定。', 'Manage class types and their student rescheduling rules.'))}</p><p class="class-type-note">${esc(t('尚未設定表示沒有指定調課規則。', 'Not set means no rescheduling rule has been specified.'))}</p><div class="class-type-manager-actions"><button type="button" data-action="class-type-new"${busy ? ' disabled' : ''}>${esc(t('新增自訂類型', 'Add custom type'))}</button></div><p id="class-types-error" class="class-type-error" role="alert">${esc(error)}</p>${retry}${busy ? `<p class="class-type-loading" role="status">${esc(t('載入中…', 'Loading…'))}</p>` : ''}${types.length ? `<div class="class-type-table-scroll" tabindex="0" role="region" aria-label="${esc(t('課堂類型設定清單', 'Class type settings list'))}"><table><thead><tr><th scope="col">${esc(t('名稱', 'Name'))}</th><th scope="col">${esc(t('學生自行申請調課', 'Student rescheduling'))}</th><th scope="col">${esc(t('狀態', 'Status'))}</th><th scope="col">${esc(t('操作', 'Action'))}</th></tr></thead><tbody>${types.map(type => `<tr><td class="class-type-long-name">${esc(labels.get(type.id) || classTypeName(type, { t }))}</td><td>${esc(policyLabel(type, t))}</td><td>${esc(type.active === false ? t('停用', 'Inactive') : t('啟用', 'Active'))}</td><td><button type="button" class="ghost" data-action="class-type-edit" data-class-type-edit="${esc(type.id)}"${busy ? ' disabled' : ''}>${esc(t('修改', 'Edit'))}</button></td></tr>`).join('')}</tbody></table></div>` : !busy && !error ? `<p class="class-type-empty" role="status">${esc(t('尚未有課堂類型。', 'No class types yet.'))}</p>` : ''}</div><footer class="class-type-footer"><button type="button" class="ghost" data-action="class-types-close"${busy ? ' disabled' : ''}>${esc(t('關閉', 'Close'))}</button></footer></div></div>`;
}

export function classTypeEditorMarkup({ current = null, busy = false, error = '' } = {}, { t, esc }) {
  const rule = current?.studentReschedulingAllowed === true ? 'yes' : current?.studentReschedulingAllowed === false ? 'no' : '';
  return `<div class="modal class-type-modal class-type-editor-modal" role="dialog" aria-modal="true" aria-labelledby="class-type-editor-title"><div class="dialog class-type-editor-dialog" tabindex="-1"><header class="class-type-header"><h2 id="class-type-editor-title">${esc(current?.id ? t('修改課堂類型', 'Edit class type') : t('新增自訂課堂類型', 'Add custom class type'))}</h2><button type="button" class="class-type-close" data-action="class-type-cancel" aria-label="${esc(t('關閉', 'Close'))}"${busy ? ' disabled' : ''}>×</button></header><form id="class-type-editor" data-id="${esc(current?.id || '')}" data-version="${esc(current?.version ?? '')}" aria-busy="${busy}"><div class="class-type-body"><p id="class-type-rule-note" class="class-type-note">${esc(t('尚未設定表示沒有指定調課規則。', 'Not set means no rescheduling rule has been specified.'))}</p><fieldset class="class-type-editor-fields"${busy ? ' disabled' : ''}><legend class="class-type-sr-only">${esc(t('課堂類型資料', 'Class type details'))}</legend><label class="class-type-field" for="class-type-name"><span>${esc(t('名稱 *', 'Name *'))}</span><input id="class-type-name" name="name" maxlength="200" value="${esc(current?.name || '')}" required></label><label class="class-type-field" for="class-type-rescheduling"><span>${esc(t('學生自行申請調課', 'Student rescheduling requests'))}</span><select id="class-type-rescheduling" name="studentReschedulingAllowed" aria-describedby="class-type-rule-note">${[['', t('尚未設定', 'Not set')], ['yes', t('允許', 'Allowed')], ['no', t('不允許', 'Not allowed')]].map(([value, label]) => `<option value="${value}"${rule === value ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select></label><label class="class-type-checkbox"><input type="checkbox" name="active"${current?.active === false ? '' : ' checked'}><span>${esc(t('啟用', 'Active'))}</span></label></fieldset><p class="class-type-note">${esc(t('停用後可保留已有課堂設定；新選用須使用啟用類型。', 'Inactive types remain in existing lesson settings. New selections require an active type.'))}</p><p id="class-type-error" class="class-type-error" role="alert">${esc(error)}</p>${busy ? `<p class="class-type-loading" role="status">${esc(t('正在儲存…', 'Saving…'))}</p>` : ''}</div><footer class="class-type-footer"><button type="button" class="ghost" data-action="class-type-cancel"${busy ? ' disabled' : ''}>${esc(t('取消', 'Cancel'))}</button><button type="submit" id="class-type-save"${busy ? ' disabled' : ''}>${esc(t('儲存', 'Save'))}</button></footer></form></div></div>`;
}
