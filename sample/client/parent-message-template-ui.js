// Personal template facts and mutation receipts come from the host. This module
// renders drafts only: it never reads storage, saves, applies or sends a message.
const text = value => typeof value === 'string' ? value : '';
const identified = value => typeof value === 'string' && !!value && value === value.trim() && value.length <= 200;
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const helpers = supplied => ({t: typeof supplied?.t === 'function' ? supplied.t : (_zh, en) => en, esc: typeof supplied?.esc === 'function' ? supplied.esc : escape});
const validTimestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
const validText = (value, limit) => typeof value === 'string' && !!value.trim() && value.length <= limit;
const validRecord = record => !!record && identified(record.id) && positiveInteger(record.version) && typeof record.archived === 'boolean' && validText(record.title, 120) && validText(record.body, 2000) && validTimestamp(record.createdAt) && validTimestamp(record.updatedAt);

function draftError(draft, context) {
  const {t} = context;
  if (!validText(draft?.title, 120)) return {field: 'title', message: typeof draft?.title === 'string' && draft.title.length > 120 ? t('範本名稱最多 120 字。', 'Use up to 120 characters for the title.') : t('請輸入範本名稱。', 'Enter a title.')};
  if (!validText(draft.body, 2000)) return {field: 'body', message: typeof draft.body === 'string' && draft.body.length > 2000 ? t('訊息最多 2,000 字。', 'Use up to 2,000 characters for the message.') : t('請輸入訊息內容。', 'Enter a message.')};
  if (draft.id !== undefined && (!identified(draft.id) || !positiveInteger(draft.version))) return {field: '', message: t('這個範本的資料暫未提供，請重新讀取。', 'This template is unavailable. Reload it and try again.')};
  return null;
}

function button(action, label, context, {disabled = false, primary = false, extra = ''} = {}) {
  return `<button type="button" class="pmt-button${primary ? ' pmt-primary' : ''}" data-action="parent-template-${action}"${disabled ? ' disabled' : ''}${extra ? ' ' + extra : ''}>${context.esc(label)}</button>`;
}

function knownList(state) {
  const {records, total, page, pageSize} = state;
  if (state.status !== 'ready' || !Array.isArray(records) || !records.every(validRecord) || new Set(records.map(record => record.id)).size !== records.length || !Number.isSafeInteger(total) || total < 0 || !positiveInteger(page) || !positiveInteger(pageSize) || pageSize > 100 || records.length > pageSize || records.length > total || page > Math.max(1, Math.ceil(total / pageSize))) return false;
  const archived = state.mode === 'manage' && state.statusFilter === 'archived';
  return records.every(record => record.archived === archived);
}

function acknowledgement(state, context) {
  const ack = state.ack;
  if (state.step !== 'list' || state.mode !== 'manage' || state.canManage !== true || !validRecord(ack?.record)) return '';
  const labels = {create: context.t('範本已儲存。', 'Template saved.'), update: context.t('範本已儲存。', 'Template saved.'), archive: context.t('範本已封存。', 'Template archived.'), restore: context.t('範本已還原。', 'Template restored.')};
  if (!Object.hasOwn(labels, ack.operation) || ack.operation === 'create' && ack.record.archived || ack.operation === 'archive' && !ack.record.archived || ack.operation === 'restore' && ack.record.archived) return '';
  return `<p id="pmt-ack" class="pmt-ack" role="status" tabindex="-1">${context.esc(labels[ack.operation])}</p>`;
}

function listMarkup(state, context) {
  const {t, esc} = context, choose = state.mode === 'choose', locked = !!state.busy || state.unconfirmed === true, loading = state.status === 'loading', known = knownList(state), q = text(state.q), active = state.statusFilter !== 'archived';
  const tabs = choose ? '' : `<div class="pmt-tabs" role="group" aria-label="${esc(t('範本狀態', 'Template status'))}">${button('tab', t('使用中', 'Active'), context, {disabled: locked || loading, extra: `data-status="active" aria-pressed="${active}"`})}${button('tab', t('已封存', 'Archived'), context, {disabled: locked || loading, extra: `data-status="archived" aria-pressed="${!active}"`})}</div>`;
  let html = `${tabs}<form id="template-search" class="pmt-search" role="search"><label for="pmt-query">${esc(t('搜尋範本', 'Search templates'))}</label><div><input id="pmt-query" name="q" value="${esc(q)}" data-action="parent-template-search-draft" maxlength="200"${locked || loading ? ' disabled' : ''}><button type="submit" class="pmt-button" data-action="parent-template-search"${locked || loading ? ' disabled' : ''}>${esc(t('搜尋', 'Search'))}</button></div></form>`;
  if (!known) return html + `<p class="pmt-source" role="${state.status === 'error' ? 'alert' : 'status'}">${esc(loading ? t('正在載入範本…', 'Loading templates…') : state.status === 'error' ? t('未能讀取範本，請重試。', 'Could not load templates. Please retry.') : t('範本資料暫未提供。', 'Templates are unavailable.'))}</p>${loading ? '' : button('retry', t('重試', 'Retry'), context, {disabled: locked})}`;
  if (!choose) html += `<div class="pmt-new">${button('new', t('新增範本', 'New template'), context, {disabled: locked, primary: true})}</div>`;
  html += state.records.length ? `<ul class="pmt-list">${state.records.map(record => `<li class="pmt-card"><h3>${esc(record.title)}</h3><p class="pmt-excerpt">${esc(record.body.slice(0, 160))}${record.body.length > 160 ? '…' : ''}</p><div class="pmt-card-actions">${choose ? button('choose', t('查看並選擇', 'Review and choose'), context, {disabled: locked || !!state.stale, extra: `data-template-id="${esc(record.id)}"`}) : button('edit', t('編輯', 'Edit'), context, {disabled: locked || !!state.stale, extra: `data-template-id="${esc(record.id)}"`}) + button(record.archived ? 'restore-review' : 'archive-review', record.archived ? t('還原', 'Restore') : t('封存', 'Archive'), context, {disabled: locked || !!state.stale, extra: `data-template-id="${esc(record.id)}"`})}</div></li>`).join('')}</ul>` : `<p class="pmt-empty">${esc(q ? t('沒有符合的範本。', 'No matching templates.') : choose || active ? t('暫未有使用中的範本。', 'No active templates yet.') : t('暫未有已封存範本。', 'No archived templates.'))}</p>`;
  const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
  if (pages > 1) html += `<nav class="pmt-pagination" aria-label="${esc(t('範本分頁', 'Template pages'))}">${button('page', t('上一頁', 'Previous'), context, {disabled: locked || state.page === 1, extra: `data-page="${Math.max(1, state.page - 1)}"`})}<span>${esc(t(`第 ${state.page} / ${pages} 頁 · 共 ${state.total} 個`, `Page ${state.page} of ${pages} · ${state.total} templates`))}</span>${button('page', t('下一頁', 'Next'), context, {disabled: locked || state.page === pages, extra: `data-page="${Math.min(pages, state.page + 1)}"`})}</nav>`;
  return html;
}

export function parentTemplateMarkup(state = {}, suppliedContext = {}) {
  if (!['manage', 'choose'].includes(state.mode)) return '';
  const context = helpers(suppliedContext), {t, esc} = context, choose = state.mode === 'choose', allowed = choose || state.canManage === true, busy = !!state.busy, uncertain = state.unconfirmed === true, loading = state.status === 'loading', ready = state.status === 'ready', stale = !!state.stale;
  const requestedStep = ['list', 'edit', 'review', 'archive-review', 'apply-review'].includes(state.step) ? state.step : 'list', issue = draftError(state.draft, context), step = requestedStep === 'review' && issue ? 'edit' : requestedStep;
  const editor = !choose && allowed && ['edit', 'review'].includes(step), selected = validRecord(state.selected) ? state.selected : null, applying = choose && step === 'apply-review', archiving = !choose && step === 'archive-review', archiveMatches = !archiving || state.archiveAction === undefined || state.archiveAction === (selected?.archived ? 'restore' : 'archive'), validSelected = !!selected && (!applying || !selected.archived) && archiveMatches, currentKnown = typeof state.currentMessage === 'string', replacing = currentKnown && state.currentMessage !== '';
  const title = choose ? t('選擇家長訊息範本', 'Choose a message template') : t('常用家長訊息', 'Preset Message to Parents');
  const header = `<header class="pmt-header"><h2 id="pmt-title">${esc(title)}</h2>${button('close', '×', context, {disabled: busy, extra: `aria-label="${esc(t('關閉', 'Close'))}"`})}</header>`;
  const error = stale ? t('這個範本已更新，請重新讀取後核對。已填內容會保留。', 'This template changed. Reload to check it. Your entries are kept.') : uncertain ? t('尚未確認儲存結果。請重試相同操作，或關閉後再查看。', 'The saving result has not been confirmed. Retry the same operation, or close and check again later.') : text(state.error) || (requestedStep === 'review' ? issue?.message : '') || (applying && !currentKnown ? t('目前的訊息草稿暫未提供，請關閉後再試。', 'The current message draft is unavailable. Close and try again.') : '');
  const feedback = `<p id="pmt-error" class="pmt-error" role="alert" tabindex="-1"${error ? '' : ' hidden'}>${esc(error)}</p>`;
  const locked = busy || uncertain || loading, canMutate = allowed && !choose && !busy && !stale && (ready || uncertain && state.status === 'error');
  let content = '', footer;
  if (!allowed) {
    content = `<p class="pmt-source" role="status">${esc(t('範本管理暫未提供。', 'Template management is unavailable.'))}</p>`;
    footer = button('close', t('關閉', 'Close'), context, {disabled: busy});
  } else if (editor) {
    if (state.status !== 'ready') content += `<p class="pmt-source" role="${state.status === 'error' ? 'alert' : 'status'}">${esc(loading ? t('正在載入範本…', 'Loading templates…') : t('未能讀取範本，已填內容保留。', 'Could not load templates. Your entries are kept.'))}</p>`;
    if (step === 'review') {
      content += `<section class="pmt-review"><h3>${esc(t('核對範本', 'Review template'))}</h3><h4>${esc(text(state.draft?.title))}</h4><div class="pmt-message-text">${esc(text(state.draft?.body))}</div><p class="pmt-note">${esc(t('範本尚未儲存。', 'This template has not been saved.'))}</p></section>`;
      footer = button('back', t('返回修改', 'Back to edit'), context, {disabled: busy || uncertain}) + button('save', busy ? t('正在儲存…', 'Saving…') : t('儲存範本', 'Save template'), context, {disabled: !canMutate || !!issue, primary: true});
    } else {
      const shownIssue = requestedStep === 'review' ? issue : null;
      content += `<label class="pmt-field" for="pmt-draft-title"><span>${esc(t('範本名稱', 'Template title'))}</span><input id="pmt-draft-title" name="title" value="${esc(text(state.draft?.title))}" maxlength="120" data-action="parent-template-draft" required${locked ? ' disabled' : ''}${shownIssue?.field === 'title' ? ' aria-invalid="true" aria-describedby="pmt-error"' : ''}></label><label class="pmt-field" for="pmt-draft-body"><span>${esc(t('訊息內容', 'Message'))}</span><textarea id="pmt-draft-body" name="body" maxlength="2000" rows="8" data-action="parent-template-draft" required${locked ? ' disabled' : ''}${shownIssue?.field === 'body' ? ' aria-invalid="true" aria-describedby="pmt-error"' : ''}>${esc(text(state.draft?.body))}</textarea></label><p class="pmt-note">${esc(t('最多 2,000 字。', 'Up to 2,000 characters.'))}</p>`;
      footer = button('back', t('返回範本', 'Back to templates'), context, {disabled: busy || uncertain}) + `<button type="submit" class="pmt-button pmt-primary" data-action="parent-template-review"${!ready || locked || stale ? ' disabled' : ''}>${esc(t('核對', 'Review'))}</button>`;
    }
  } else if (applying || archiving) {
    if (!validSelected) {
      content = `<p class="pmt-source" role="status">${esc(t('這個範本暫未提供，請重新讀取。', 'This template is unavailable. Reload and try again.'))}</p>`;
      footer = button('back', t('返回範本', 'Back to templates'), context, {disabled: busy || uncertain});
    } else {
      content = `<section class="pmt-review"><h3>${esc(applying ? t('核對範本訊息', 'Review template message') : selected.archived ? t('還原範本', 'Restore template') : t('封存範本', 'Archive template'))}</h3><h4>${esc(selected.title)}</h4><div class="pmt-message-text">${esc(selected.body)}</div></section>`;
      if (applying && replacing) content += `<section class="pmt-current"><h3>${esc(t('目前的訊息', 'Current message'))}</h3><div class="pmt-message-text">${esc(state.currentMessage)}</div><p class="pmt-replace">${esc(t('使用範本會取代目前的訊息。你仍可在發送前修改內容。', 'Using this template will replace your current message. You can still edit it before sending.'))}</p></section>`;
      else if (archiving) content += `<p class="pmt-note">${esc(selected.archived ? t('還原後，這個範本會重新出現在可選範本中。', 'Restoring makes this template available to choose again.') : t('封存後，這個範本不會出現在可選範本中。你日後可以還原。', 'Archived templates are hidden from the chooser. You can restore them later.'))}</p>`;
      const command = applying ? 'apply' : selected.archived ? 'restore' : 'archive', label = applying ? replacing ? t('取代目前訊息', 'Replace current message') : t('使用這段訊息', 'Use this message') : selected.archived ? t('還原範本', 'Restore template') : t('封存範本', 'Archive template');
      footer = button('back', t('返回範本', 'Back to templates'), context, {disabled: busy || uncertain}) + button(command, busy && !applying ? t('正在儲存…', 'Saving…') : label, context, {disabled: applying ? !ready || locked || stale || !currentKnown : !canMutate, primary: true, extra: `data-template-id="${esc(selected.id)}"`});
    }
  } else {
    if (!choose) content += `<p class="pmt-private">${esc(t('只有你可以使用和修改這些範本。', 'Only you can use and edit these templates.'))}</p>`;
    content += listMarkup(state, context);
    footer = button('close', choose ? t('取消', 'Cancel') : t('關閉', 'Close'), context, {disabled: busy});
  }
  if (allowed && step !== 'list' && (stale || state.status !== 'ready' || (applying || archiving) && !validSelected) && !loading) content += `<div class="pmt-retry">${button('reload', t('重新讀取', 'Reload'), context, {disabled: busy || uncertain && !stale})}</div>`;
  const body = `<div id="pmt-body" class="pmt-body" tabindex="0">${content}</div><footer class="pmt-footer">${footer}</footer>`;
  const shell = editor ? `<form id="template-editor" data-step="${step}" novalidate${busy ? ' aria-busy="true"' : ''}>${body}</form>` : `<div class="pmt-content">${body}</div>`;
  return `<div class="modal pmt-modal" role="dialog" aria-modal="true" aria-labelledby="pmt-title"${busy ? ' aria-busy="true"' : ''}><div class="dialog pmt-dialog" tabindex="-1">${header}${feedback}${acknowledgement(state, context)}${shell}</div></div>`;
}
