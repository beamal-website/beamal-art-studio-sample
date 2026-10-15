const kindLabel = (kind, t) => kind === 'student' ? t('學生', 'Student') : t('申請者', 'Applicant');
const optionalValue = value => typeof value === 'string' && value.trim() ? value : '—';
const promotionLabel = (value, t) => value === true ? t('是', 'Yes') : value === false ? t('否', 'No') : '—';
const dateParts = value => {
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] ? { year, month, day } : null;
};
const ageLabel = (birthDate, today, t) => {
  const birth = dateParts(birthDate), current = dateParts(today);
  if (!birth || !current || birthDate > today) return '—';
  const years = current.year - birth.year - (current.month < birth.month || current.month === birth.month && current.day < birth.day ? 1 : 0);
  return t(`${years} 歲`, `${years} years`);
};
const currentDate = today => today || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
const displayTimestamp = (value, t) => {
  if (!value || !Number.isFinite(new Date(value).getTime())) return '—';
  return new Intl.DateTimeFormat(t('zh-HK', 'en-HK'), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }).format(new Date(value));
};
const timestampMarkup = (value, { t, esc }) => value && Number.isFinite(new Date(value).getTime()) ? `<time datetime="${esc(value)}">${esc(displayTimestamp(value, t))}</time>` : '—';
const detailsMarkup = (title, fields, { esc }) => `<section class="people-profile-section"><h2>${esc(title)}</h2><dl class="people-details">${fields.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(optionalValue(value))}</dd></div>`).join('')}</dl></section>`;

export function peopleDirectoryMarkup({ people = [], total = people.length, page = 1, pageSize = 20, kind = 'student', q = '', sort = 'displayName', direction = 'asc', loading = false, error = '' } = {}, { t, esc, today }) {
  kind = kind === 'applicant' ? 'applicant' : 'student';
  const count = Math.max(0, Number.isFinite(Number(total)) ? Math.floor(Number(total)) : 0);
  const size = Math.max(1, Number.isFinite(Number(pageSize)) ? Math.floor(Number(pageSize)) : 20);
  const pages = Math.max(1, Math.ceil(count / size)), currentPage = Math.min(pages, Math.max(1, Math.floor(Number(page) || 1)));
  const title = kind === 'student' ? t('學生名冊', 'Student directory') : t('申請者名冊', 'Applicant directory');
  const busy = loading ? ' disabled' : '', day = currentDate(today);
  const rows = people.map(record => `<tr><td><button type="button" class="people-name-link" data-action="people-open" data-person-id="${esc(record.id)}"${busy}>${esc(record.displayName)}</button></td><td>${esc(optionalValue(record.dateOfBirth))}<small>${esc(ageLabel(record.dateOfBirth, day, t))}</small></td><td>${esc(optionalValue(record.parentName))}</td><td>${esc(optionalValue(record.whatsApp))}</td><td>${esc(optionalValue(record.email))}</td><td>${esc(optionalValue(record.school))}</td><td>${timestampMarkup(record.createdAt, { t, esc })}</td></tr>`).join('');
  const empty = q.trim() ? t('沒有符合搜尋條件的資料。', 'No records match your search.') : kind === 'student' ? t('尚未有學生資料。', 'No student records yet.') : t('尚未有申請者資料。', 'No applicant records yet.');
  return `<section class="people-directory" aria-labelledby="people-directory-title" aria-busy="${loading}">
    <header class="people-page-header"><div><h1 id="people-directory-title">${esc(title)}</h1></div><button type="button" data-action="people-create"${busy}>${esc(t('新增申請者', 'Add applicant'))}</button></header>
    <nav class="people-tabs" aria-label="${esc(t('名冊分類', 'Directory classification'))}">${[['student', t('學生', 'Students')], ['applicant', t('申請者', 'Applicants')]].map(([value, label]) => `<button type="button" data-action="people-kind" data-people-kind="${value}" aria-pressed="${kind === value}"${busy}>${esc(label)}</button>`).join('')}</nav>
    <div class="people-controls"><form id="people-search" class="people-search"><label for="people-search-query">${esc(t('搜尋名冊', 'Search directory'))}</label><div><input id="people-search-query" name="q" type="search" value="${esc(q)}" maxlength="200" autocomplete="off"${busy}><button type="submit" class="ghost"${busy}>${esc(t('搜尋', 'Search'))}</button></div></form><label class="people-control-label" for="people-sort"><span>${esc(t('排序欄位', 'Sort by'))}</span><select id="people-sort" name="sort"${busy}>${[['displayName', t('顯示名稱', 'Display name')], ['createdAt', t('建立時間', 'Created date')]].map(([value, label]) => `<option value="${value}"${sort === value ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select></label><label class="people-control-label" for="people-direction"><span>${esc(t('排列方向', 'Order'))}</span><select id="people-direction" name="direction"${busy}>${[['asc', sort === 'createdAt' ? t('最舊在先', 'Oldest first') : t('名稱升序', 'Name ascending')], ['desc', sort === 'createdAt' ? t('最新在先', 'Newest first') : t('名稱降序', 'Name descending')]].map(([value, label]) => `<option value="${value}"${direction === value ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select></label></div>
    ${error ? `<div class="people-error-state"><p class="people-error" role="alert">${esc(error)}</p><button type="button" class="ghost" data-action="people-refresh"${busy}>${esc(t('重新載入', 'Reload'))}</button></div>` : ''}${loading ? `<p class="people-loading" role="status">${esc(t('正在載入名冊…', 'Loading records…'))}</p>` : ''}
    ${people.length ? `<div class="people-table-scroll" tabindex="0" role="region" aria-label="${esc(t('名冊資料表', 'Directory table'))}"><table><caption class="people-sr-only">${esc(title)}</caption><thead><tr>${[t('顯示名稱', 'Display name'), t('生日／年齡', 'Birth date / age'), t('家長姓名', 'Parent name'), 'WhatsApp', t('電郵', 'Email'), t('學校', 'School'), t('建立時間', 'Created date')].map(label => `<th scope="col">${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>` : !loading && !error ? `<div class="people-empty" role="status"><p>${esc(empty)}</p></div>` : ''}
    ${!loading && !error || people.length ? `<footer class="people-pagination"><p>${esc(t(`共 ${count} 筆資料 · 第 ${currentPage}／${pages} 頁`, `${count} records · Page ${currentPage} of ${pages}`))}</p><div><button type="button" class="ghost" data-action="people-page" data-page="${Math.max(1, currentPage - 1)}"${loading || currentPage <= 1 ? ' disabled' : ''}>${esc(t('上一頁', 'Previous'))}</button><button type="button" class="ghost" data-action="people-page" data-page="${Math.min(pages, currentPage + 1)}"${loading || currentPage >= pages ? ' disabled' : ''}>${esc(t('下一頁', 'Next'))}</button></div></footer>` : ''}
  </section>`;
}

export function peopleProfileMarkup({ person = null, loading = false, error = '', history = [], historyLoading = false, historyError = '', canConvert = false, relatedActions = false } = {}, { t, esc, today }) {
  const back = `<button type="button" class="ghost people-back" data-action="people-back">← ${esc(t('返回名冊', 'Back to directory'))}</button>`;
  if (!person) return `<section class="people-profile" aria-busy="${loading}">${back}${loading ? `<p class="people-loading" role="status">${esc(t('正在載入資料…', 'Loading record…'))}</p>` : `<p class="people-error" role="alert">${esc(error || t('未能載入此資料。', 'This record is unavailable.'))}</p>`}</section>`;
  const groups = [
    [t('個人資料', 'Personal information'), [[t('顯示名稱', 'Display name'), person.displayName], [t('身份證明號碼', 'Citizen ID'), person.citizenId], [t('本地姓名', 'Local name'), person.localName], [t('名字', 'First name'), person.firstName], [t('姓氏', 'Last name'), person.lastName], [t('全名', 'Full name'), person.fullName], [t('性別', 'Gender'), person.gender], [t('出生日期', 'Date of birth'), person.dateOfBirth], [t('年齡', 'Age'), ageLabel(person.dateOfBirth, currentDate(today), t)]]],
    [t('聯絡資料', 'Contact information'), [[t('家長姓名', 'Parent name'), person.parentName], ['WhatsApp', person.whatsApp], [t('電郵', 'Email'), person.email], [t('接收推廣電郵', 'Receive promotional email'), promotionLabel(person.promotion, t)], [t('電話', 'Phone'), person.phone], [t('手提電話', 'Mobile'), person.mobile], [t('地址', 'Address'), person.address], [t('地區', 'District'), person.district]]],
    ...[1, 2].map(number => [t(`聯絡人 ${number}`, `Contact ${number}`), [[t('姓名', 'Name'), person[`contact${number}Name`]], [t('電話', 'Phone'), person[`contact${number}Phone`]], [t('電郵', 'Email'), person[`contact${number}Email`]]]]),
    [t('學校與推薦', 'School and referral'), [[t('學校', 'School'), person.school], [t('程度', 'Level'), person.level], [t('職業', 'Occupation'), person.occupation], [t('推薦人／來源', 'Referrer'), person.referrer], [t('帳單名稱', 'Bill name'), person.billName]]],
    [t('記錄日期（手動填寫）', 'Record dates (manual)'), [[t('入學日期', 'Enrollment date'), person.enrollmentDate], [t('離校日期', 'Quit date'), person.quitDate]]],
    [t('備註', 'Notes'), [[t('詳細資料', 'Detail'), person.detail], [t('備註', 'Remark'), person.remark]]],
  ];
  const actions = { 'person.create': t('資料建立', 'Record created'), 'person.update': t('資料修改', 'Details updated'), 'person.convert': t('轉為學生', 'Converted to student') };
  const audit = history.map(entry => `<li><div><strong>${esc(actions[entry.action] || t('資料變更', 'Record changed'))}</strong><span>${esc(t(`版本 ${entry.version}`, `Version ${entry.version}`))}</span></div><p>${esc(optionalValue(entry.actor?.displayName))}</p>${timestampMarkup(entry.createdAt, { t, esc })}</li>`).join('');
  const related = relatedActions === true && !loading && !error && typeof person.id === 'string' && person.id.trim() && typeof person.displayName === 'string' && person.displayName.trim() && ['applicant', 'student'].includes(person.kind)
    ? `<section class="people-profile-section people-profile-related" aria-labelledby="people-related-title"><h2 id="people-related-title">${esc(t('相關操作', 'Related actions'))}</h2><div class="people-profile-actions">${[
      ['ui-lesson', 'applicant', t('試課記錄', 'Trial records')],
      ...(person.kind === 'applicant' && !canConvert ? [['ui-lesson', 'convert', t('學生轉換', 'Student conversion')]] : []),
      ['ui-lesson', 'family', t('家庭成員', 'Family members')],
      ['ui-account-actions', 'activation', t('帳戶啟用與密碼', 'Account activation & password')],
    ].map(([action, view, label]) => `<button type="button" class="ghost" data-action="${action}" data-ui-command="launch" data-ui-view="${view}" data-person-id="${esc(person.id)}">${esc(label)}</button>`).join('')}</div></section>` : '';
  return `<section class="people-profile" aria-labelledby="people-profile-title" aria-busy="${loading}">${back}
    <header class="people-page-header"><div><span class="people-kind-badge">${esc(kindLabel(person.kind, t))}</span><h1 id="people-profile-title">${esc(person.displayName)}</h1></div><div class="people-profile-actions"><button type="button" data-action="people-edit" data-person-id="${esc(person.id)}"${loading ? ' disabled' : ''}>${esc(t('修改資料', 'Edit details'))}</button>${canConvert && person.kind === 'applicant' ? `<button type="button" class="ghost" data-action="people-convert" data-person-id="${esc(person.id)}"${loading ? ' disabled' : ''}>${esc(t('轉為學生', 'Convert to student'))}</button>` : ''}</div></header>
    ${error ? `<p class="people-error" role="alert">${esc(error)}</p>` : ''}${loading ? `<p class="people-loading" role="status">${esc(t('正在載入資料…', 'Loading record…'))}</p>` : ''}${related}
    <div class="people-profile-layout"><div class="people-profile-details">${groups.map(([title, fields]) => detailsMarkup(title, fields, { esc })).join('')}<p class="people-record-meta">${esc(t(`目前版本 ${person.version}`, `Current version ${person.version}`))} · ${esc(t('最後更新', 'Last updated'))} ${timestampMarkup(person.updatedAt, { t, esc })}</p></div>
    <section class="people-history" aria-labelledby="people-history-title" aria-busy="${historyLoading}"><h2 id="people-history-title">${esc(t('修改記錄', 'Record history'))}</h2><p class="people-note">${esc(t('時間以香港時間顯示。', 'Times are shown in Hong Kong time.'))}</p>${historyError ? `<p class="people-error" role="alert">${esc(historyError)}</p>` : ''}${historyLoading ? `<p class="people-loading" role="status">${esc(t('正在載入修改記錄…', 'Loading history…'))}</p>` : ''}${history.length ? `<ol class="people-history-list">${audit}</ol>` : !historyLoading && !historyError ? `<p class="people-empty">${esc(t('尚未有修改記錄。', 'No history yet.'))}</p>` : ''}</section></div>
  </section>`;
}

const editorField = (person, name, label, options, { esc }) => {
  const id = name === 'displayName' ? 'people-display-name' : `people-${name}`;
  const value = person?.[name] ?? '', { type = 'text', max, multiline = false, required = false } = options;
  const control = multiline ? `<textarea id="${id}" name="${name}" maxlength="${max}" rows="${name === 'remark' ? 4 : 3}">${esc(value)}</textarea>` : `<input id="${id}" name="${name}" type="${type}"${max ? ` maxlength="${max}"` : ''} value="${esc(value)}"${required ? ' required aria-describedby="people-name-note"' : ''}>`;
  return `<label class="people-field${multiline ? ' people-field-wide' : ''}" for="${id}"><span>${esc(label)}${required ? ' *' : ''}</span>${control}</label>`;
};

export function peopleEditorMarkup({ person = null, busy = false, error = '' } = {}, { t, esc }) {
  const editing = !!person?.id, title = editing ? t('修改資料', 'Edit details') : t('新增申請者', 'Add applicant');
  const field = (name, zh, en, options = { max: 200 }) => editorField(person, name, t(zh, en), options, { esc });
  const groups = [
    [t('個人資料', 'Personal information'), field('displayName', '顯示名稱', 'Display name', { max: 200, required: true }) + field('localName', '本地姓名', 'Local name') + field('citizenId', '身份證明號碼', 'Citizen ID') + field('firstName', '名字', 'First name') + field('lastName', '姓氏', 'Last name') + field('fullName', '全名', 'Full name') + field('gender', '性別', 'Gender') + field('dateOfBirth', '出生日期', 'Date of birth', { type: 'date' })],
    [t('聯絡資料', 'Contact information'), field('parentName', '家長姓名', 'Parent name') + field('whatsApp', 'WhatsApp', 'WhatsApp', { type: 'tel', max: 80 }) + field('phone', '電話', 'Phone', { type: 'tel', max: 80 }) + field('email', '電郵', 'Email', { type: 'email', max: 254 }) + field('mobile', '手提電話', 'Mobile', { type: 'tel', max: 80 }) + `<label class="people-field" for="people-promotion"><span>${esc(t('接收推廣電郵', 'Receive promotional email'))}</span><select id="people-promotion" name="promotion">${[[null, '', '—'], [true, 'true', t('是', 'Yes')], [false, 'false', t('否', 'No')]].map(([value, key, label]) => `<option value="${key}"${(person?.promotion ?? null) === value ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select></label>` + field('district', '地區', 'District') + field('address', '地址', 'Address', { max: 1000, multiline: true })],
    ...[1, 2].map(number => [t(`聯絡人 ${number}`, `Contact ${number}`), field(`contact${number}Name`, `姓名（聯絡人 ${number}）`, `Name (Contact ${number})`) + field(`contact${number}Phone`, `電話（聯絡人 ${number}）`, `Phone (Contact ${number})`, { type: 'tel', max: 80 }) + field(`contact${number}Email`, `電郵（聯絡人 ${number}）`, `Email (Contact ${number})`, { type: 'email', max: 254 })]),
    [t('學校與推薦', 'School and referral'), field('school', '學校', 'School') + field('level', '程度', 'Level') + field('occupation', '職業', 'Occupation') + field('referrer', '推薦人／來源', 'Referrer') + field('billName', '帳單名稱', 'Bill name')],
    [t('記錄日期（手動填寫）', 'Record dates (manual)'), field('enrollmentDate', '入學日期', 'Enrollment date', { type: 'date' }) + field('quitDate', '離校日期', 'Quit date', { type: 'date' })],
    [t('備註', 'Notes'), field('detail', '詳細資料', 'Detail', { max: 2000, multiline: true }) + field('remark', '備註', 'Remark', { max: 2000, multiline: true })],
  ];
  return `<div class="modal people-editor-modal" role="dialog" aria-modal="true" aria-labelledby="people-editor-title" aria-describedby="people-editor-note"><div class="dialog people-editor-dialog" tabindex="-1"><header class="people-dialog-header"><h2 id="people-editor-title">${esc(title)}</h2><button type="button" class="people-close" data-action="people-editor-cancel" aria-label="${esc(t('關閉', 'Close'))}"${busy ? ' disabled' : ''}>×</button></header>
    <form id="people-editor" data-id="${esc(person?.id || '')}" data-version="${esc(person?.version ?? '')}" aria-busy="${busy}"><div class="people-editor-body"><p id="people-editor-note" class="people-note">${esc(editing ? t('儲存此人的個人與聯絡資料。', 'Save this person’s personal and contact details.') : t('新增一筆申請者名冊資料。', 'Add an applicant record to the directory.'))}</p><p id="people-name-note" class="people-note">${esc(t('顯示名稱供管理員辨識這筆資料；其他欄位可留空。', 'The display name identifies this record for administrators. Other fields are optional.'))}</p>
    <fieldset class="people-editor-fields"${busy ? ' disabled' : ''}><legend class="people-sr-only">${esc(t('名冊資料', 'Directory details'))}</legend>${groups.map(([label, fields]) => `<section class="people-field-section"><h3>${esc(label)}</h3><div class="people-field-grid">${fields}</div></section>`).join('')}</fieldset><p id="people-editor-error" class="people-error" role="alert">${esc(error)}</p>${busy ? `<p class="people-loading" role="status">${esc(t('正在儲存…', 'Saving…'))}</p>` : ''}</div>
    <footer class="people-footer"><button type="button" class="ghost" data-action="people-editor-cancel"${busy ? ' disabled' : ''}>${esc(t('取消', 'Cancel'))}</button><button type="submit" id="people-save"${busy ? ' disabled' : ''}>${esc(editing ? t('儲存', 'Save') : t('新增申請者', 'Add applicant'))}</button></footer></form></div></div>`;
}

export function peopleConversionMarkup({ person = null, busy = false, error = '' } = {}, { t, esc }) {
  const valid = !!person?.id && person.kind === 'applicant';
  return `<div class="modal people-editor-modal" role="dialog" aria-modal="true" aria-labelledby="people-convert-title" aria-describedby="people-convert-note"><div class="dialog people-editor-dialog people-convert-dialog" tabindex="-1"><header class="people-dialog-header"><h2 id="people-convert-title">${esc(t('轉為學生', 'Convert to student'))}</h2><button type="button" class="people-close" data-action="people-editor-cancel" aria-label="${esc(t('關閉', 'Close'))}"${busy ? ' disabled' : ''}>×</button></header>
    <form id="people-convert-editor" data-id="${esc(person?.id || '')}" data-version="${esc(person?.version ?? '')}" aria-busy="${busy}"><div class="people-editor-body"><p class="people-convert-name">${esc(person?.displayName || '—')}</p><p id="people-convert-note" class="people-note">${esc(t('把名冊分類改為學生，保留現有資料及修改記錄。報名、付款及登入帳戶另行處理。', 'Changes the directory classification to student while keeping existing details and history. Enrolment, payments and login accounts are handled separately.'))}</p><p id="people-editor-error" class="people-error" role="alert">${esc(error)}</p>${busy ? `<p class="people-loading" role="status">${esc(t('正在儲存…', 'Saving…'))}</p>` : ''}</div>
    <footer class="people-footer"><button type="button" class="ghost" data-action="people-editor-cancel"${busy ? ' disabled' : ''}>${esc(t('取消', 'Cancel'))}</button><button type="submit" id="people-convert-save"${busy || !valid ? ' disabled' : ''}>${esc(t('確認轉為學生', 'Confirm conversion'))}</button></footer></form></div></div>`;
}
