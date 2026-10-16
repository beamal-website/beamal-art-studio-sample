// The host supplies one authorized lesson contact source and owns sending,
// idempotent retries and navigation. These renderers perform no external action.
const text = value => typeof value === 'string' ? value : '';
const identified = value => typeof value === 'string' && !!value.trim() && value.length <= 200;
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const helpers = supplied => ({t: typeof supplied?.t === 'function' ? supplied.t : (_zh, en) => en, esc: typeof supplied?.esc === 'function' ? supplied.esc : escape});
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(text(value)) && value >= '0001-01-01' && value <= '9999-12-31' && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(text(value));
const validTimestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{1,3})?Z$/.test(value) && validDate(value.slice(0, 10)) && validTime(value.slice(11, 16)) && Number.isFinite(Date.parse(value));

function validContext(context) {
  return !!context && identified(context.sessionId) && identified(context.studentId) && identified(context.sender?.id) && identified(context.revision) && validDate(context.date) && validTime(context.time) && Number.isSafeInteger(context.duration) && context.duration > 0 && context.duration <= 1440 - Number(context.time.slice(0, 2)) * 60 - Number(context.time.slice(3));
}
const appRecipient = context => identified(context?.appRecipient?.userId) ? context.appRecipient : null;
const whatsappRecipient = context => typeof context?.whatsApp?.number === 'string' && !!context.whatsApp.number.trim() && context.whatsApp.number.length <= 80 ? context.whatsApp : null;
const recipient = (context, channel) => channel === 'app' ? appRecipient(context) : channel === 'whatsapp' ? whatsappRecipient(context) : null;
const messageValid = draft => ['app', 'whatsapp'].includes(draft?.channel) && typeof draft.message === 'string' && !!draft.message.trim() && draft.message.length <= 2000;

function draftIssue(state, context) {
  const draft = state.draft;
  if (!['app', 'whatsapp'].includes(draft?.channel)) return context.t('請選擇聯絡方式。', 'Choose a contact method.');
  if (!recipient(state.context, draft.channel)) return draft.channel === 'app' ? context.t('尚未連結家長帳戶，暫不能發送 App 訊息。', 'No linked parent account is available for App messages.') : context.t('尚未提供 WhatsApp 電話。', 'No WhatsApp number is provided.');
  if (typeof draft.message !== 'string' || !draft.message.trim()) return context.t('請輸入訊息內容。', 'Enter a message.');
  return draft.message.length > 2000 ? context.t('訊息最多可輸入 2,000 字。', 'Use up to 2,000 characters for the message.') : '';
}

function button(action, label, context, {disabled = false, primary = false, extra = ''} = {}) {
  return `<button type="button" class="lpm-button${primary ? ' lpm-primary' : ''}" data-action="parent-message-${action}"${disabled ? ' disabled' : ''}${extra ? ' ' + extra : ''}>${context.esc(label)}</button>`;
}
const provided = (value, context) => context.esc(text(value).trim() ? value : context.t('未提供', 'Not provided'));
function lessonContext(source, context) {
  const {t, esc} = context, teachers = Array.isArray(source.teacherNames) ? source.teacherNames.filter(name => typeof name === 'string' && !!name.trim()).join(t('、', ', ')) : '';
  return `<section class="lpm-context" aria-label="${esc(t('學生與課堂', 'Student and lesson'))}"><h3>${provided(source.studentName, context)}</h3><p>${provided(source.courseName, context)}</p><p><time datetime="${esc(source.date)}">${esc(source.date)}</time> · ${esc(source.time)} · ${esc(source.duration)} ${esc(t('分鐘', 'min'))}</p><p>${esc(t('任教老師：', 'Lesson teachers: '))}${provided(teachers, context)}</p><p>${esc(t('發訊人：', 'From: '))}${provided(source.sender.displayName, context)}</p></section>`;
}
function recipientMarkup(source, channel, context) {
  const {t, esc} = context, target = recipient(source, channel);
  if (!target) return `<p class="lpm-note">${esc(channel === 'app' ? t('尚未連結家長帳戶。', 'No linked parent account.') : t('尚未提供 WhatsApp 電話。', 'No WhatsApp number.'))}</p>`;
  return `<section class="lpm-recipient" aria-label="${esc(t('收件人', 'Recipient'))}"><h3>${esc(t('收件人', 'Recipient'))}</h3><p>${provided(channel === 'app' ? target.displayName : target.name, context)}</p>${channel === 'whatsapp' ? `<p class="lpm-number">${esc(target.number)}</p>` : `<p class="lpm-note">${esc(t('本機測試通知', 'Local test notification'))}</p>`}</section>`;
}

function whatsappUrl(number, message) {
  const raw = text(number).trim();
  if (!/^\+[0-9 ()-]+$/.test(raw)) return '';
  const digits = raw.slice(1).replace(/[ ()-]/g, '');
  if (!/^[1-9]\d{9,14}$/.test(digits)) return '';
  try { return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`; }
  catch { return ''; }
}

function validMessage(record) {
  return !!record && identified(record.id) && identified(record.sessionId) && identified(record.studentId) && identified(record.senderId) && identified(record.recipientUserId) && record.channel === 'app-test' && typeof record.body === 'string' && !!record.body.trim() && record.body.length <= 2000 && validDate(record.date) && validTime(record.time) && validTimestamp(record.createdAt);
}
function acknowledged(state) {
  const source = state.context, ack = state.ack;
  return state.step === 'saved' && state.draft?.channel === 'app' && !state.stale && validContext(source) && validMessage(ack) && ack.sessionId === source.sessionId && ack.studentId === source.studentId && ack.senderId === source.sender.id && ack.recipientUserId === appRecipient(source)?.userId && ack.body === state.draft.message;
}

export function parentMessageMarkup(state = {}, suppliedContext = {}) {
  const context = helpers(suppliedContext), {t, esc} = context, known = validContext(state.context), ready = known && state.contextStatus === 'ready', loading = state.contextStatus === 'loading', busy = !!state.busy, uncertain = state.unconfirmed === true, stale = !!state.stale, saved = acknowledged(state), draft = state.draft || {}, issue = known ? draftIssue(state, context) : '', preview = state.step === 'preview' && !issue;
  const title = t('聯絡家長', 'Contact parent');
  const header = `<header class="lpm-header"><h2 id="lpm-title">${esc(title)}</h2>${button('close', '×', context, {disabled: busy, extra: `aria-label="${esc(t('關閉', 'Close'))}"`})}</header>`;
  const sourceMessage = ready || saved ? '' : loading ? t('正在載入課堂聯絡資料…', 'Loading lesson contacts…') : known || state.contextStatus === 'error' ? t('未能讀取課堂聯絡資料，請重試。', 'Could not load lesson contacts. Please retry.') : t('課堂聯絡資料暫未提供。', 'Lesson contacts are unavailable.');
  const error = stale ? t('這堂課或收件人資料已更新，請重新讀取後核對。已填內容會保留。', 'This lesson or recipient changed. Reload to check the details. Your entries are kept.') : uncertain ? t('尚未確認發送結果。請重試發送相同訊息，或關閉後查閱通知中心。', 'The sending result has not been confirmed. Retry the same message, or close and check the notification centre.') : text(state.error) || (state.step === 'preview' ? issue : '') || (!known && !loading ? sourceMessage : '');
  const feedback = `<p id="lpm-error" class="lpm-error" role="alert" tabindex="-1"${error ? '' : ' hidden'}>${esc(error)}</p>`;
  let content = known ? lessonContext(state.context, context) : '', footer, editable = known && !saved;
  if (sourceMessage && (known || loading)) content += `<p class="lpm-source" role="${loading ? 'status' : 'alert'}">${esc(sourceMessage)}</p>`;
  if (!known) {
    footer = button('close', t('關閉', 'Close'), context, {disabled: busy}) + (!loading ? button('retry', t('重試', 'Retry'), context, {disabled: busy}) : '');
  } else if (saved) {
    content += `<section id="lpm-saved" class="lpm-saved" role="status" tabindex="-1"><h3>${esc(t('已保存至家長帳戶的通知中心', 'Saved to the parent account notification centre'))}</h3>${recipientMarkup(state.context, 'app', context)}<div class="lpm-message-text">${esc(draft.message)}</div></section>`;
    footer = button('close', t('關閉', 'Close'), context, {disabled: busy});
  } else if (preview) {
    const canSend = draft.channel === 'app' && messageValid(draft) && !!appRecipient(state.context) && !busy && !stale && (ready || uncertain && state.contextStatus === 'error');
    content += recipientMarkup(state.context, draft.channel, context) + `<section class="lpm-preview"><h3>${esc(t('訊息內容', 'Message'))}</h3><div class="lpm-message-text">${esc(draft.message)}</div></section>`;
    if (draft.channel === 'whatsapp') {
      const target = whatsappRecipient(state.context), url = whatsappUrl(target.number, draft.message), active = ready && !busy && !uncertain && !stale;
      content += `<section class="lpm-whatsapp-actions"><p class="lpm-note">${esc(t('你可以複製電話及訊息，再自行在 WhatsApp 發送。', 'Copy the number and message, then send it yourself in WhatsApp.'))}</p><div>${button('copy-number', t('複製電話', 'Copy number'), context, {disabled: !active})}${button('copy-message', t('複製訊息', 'Copy message'), context, {disabled: !active})}${url && active ? `<a class="lpm-button lpm-primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(t('開啟 WhatsApp', 'Open WhatsApp'))}</a>` : ''}</div></section>`;
    }
    footer = button('back', t('返回修改', 'Back to edit'), context, {disabled: busy || uncertain}) + (draft.channel === 'app' ? button('send', busy ? t('正在發送…', 'Sending…') : t('發送到家長帳戶', 'Send to the parent account'), context, {disabled: !canSend, primary: true}) : button('close', t('關閉', 'Close'), context, {disabled: busy}));
  } else {
    const locked = busy || uncertain || loading, availableApp = !!appRecipient(state.context), availableWhatsapp = !!whatsappRecipient(state.context);
    content += `<fieldset class="lpm-channels"><legend>${esc(t('聯絡方式', 'Contact method'))}</legend>${[['app', t('App 通知', 'App notification'), availableApp], ['whatsapp', 'WhatsApp', availableWhatsapp]].map(([channel, label, available]) => `<label class="lpm-channel"><input type="radio" name="channel" value="${channel}" data-action="parent-message-channel"${draft.channel === channel ? ' checked' : ''}${locked || !available ? ' disabled' : ''}><span>${esc(label)}</span></label>`).join('')}</fieldset>${!availableApp ? `<p class="lpm-note">${esc(t('尚未連結家長帳戶。', 'No linked parent account.'))}</p>` : ''}${!availableWhatsapp ? `<p class="lpm-note">${esc(t('尚未提供 WhatsApp 電話。', 'No WhatsApp number.'))}</p>` : ''}${['app', 'whatsapp'].includes(draft.channel) ? recipientMarkup(state.context, draft.channel, context) : ''}<label class="lpm-field" for="lpm-message"><span>${esc(t('訊息內容', 'Message'))}</span><textarea id="lpm-message" name="message" data-action="parent-message-draft" maxlength="2000" rows="7" aria-describedby="lpm-message-limit${issue && state.step === 'preview' ? ' lpm-error' : ''}"${locked ? ' disabled' : ''}${issue && state.step === 'preview' ? ' aria-invalid="true"' : ''}>${esc(text(draft.message))}</textarea></label><p id="lpm-message-limit" class="lpm-note">${esc(t('最多 2,000 字。', 'Up to 2,000 characters.'))}</p>`;
    footer = button('close', t('取消', 'Cancel'), context, {disabled: busy}) + `<button type="submit" class="lpm-button lpm-primary" data-action="parent-message-preview"${!ready || locked || stale || !!issue ? ' disabled' : ''}>${esc(t('核對訊息', 'Preview message'))}</button>`;
  }
  if (known && !saved && (stale || !ready && !loading)) content += `<div class="lpm-retry">${button('retry', t('重新讀取', 'Reload'), context, {disabled: busy || loading || uncertain && !stale})}</div>`;
  const body = `<div id="lpm-body" class="lpm-body" tabindex="0">${content}</div><footer class="lpm-footer">${footer}</footer>`;
  const shell = editable ? `<form id="lpm-form" novalidate data-step="${preview ? 'preview' : 'edit'}"${busy ? ' aria-busy="true"' : ''}>${body}</form>` : `<div class="lpm-content">${body}</div>`;
  return `<div class="modal lpm-modal" role="dialog" aria-modal="true" aria-labelledby="lpm-title"${busy ? ' aria-busy="true"' : ''}><div class="dialog lpm-dialog" tabindex="-1">${header}${feedback}${shell}</div></div>`;
}

function timestamp(value, context) {
  if (!validTimestamp(value)) return context.esc(context.t('未提供', 'Not provided'));
  const formatted = new Intl.DateTimeFormat(context.t('zh-HK', 'en-GB'), {timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false}).format(new Date(value));
  return `<time datetime="${context.esc(value)}">${context.esc(formatted)}</time>`;
}

export function parentMessageInboxMarkup(model = {}, suppliedContext = {}) {
  const context = helpers(suppliedContext), {t, esc} = context, {records, total, page, pageSize} = model;
  const loading = model.status === 'loading', pages = Number.isSafeInteger(total) && total >= 0 && Number.isSafeInteger(pageSize) && pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const known = model.status === 'ready' && Array.isArray(records) && records.every(validMessage) && new Set(records.map(record => record.id)).size === records.length && Number.isSafeInteger(total) && total >= 0 && records.length <= total && Number.isSafeInteger(page) && page > 0 && page <= pages && Number.isSafeInteger(pageSize) && pageSize > 0 && pageSize <= 100 && records.length <= pageSize;
  const systems = `<section class="lpm-inbox-section" aria-labelledby="lpm-system-title"><h2 id="lpm-system-title">${esc(t('系統通知', 'System notifications'))}</h2><p class="lpm-inbox-empty">${esc(t('系統通知暫未提供。', 'System notifications are not available yet.'))}</p></section>`;
  let content;
  if (!known) content = `<p class="lpm-inbox-source" role="${model.status === 'error' ? 'alert' : 'status'}">${esc(loading ? t('正在載入老師訊息…', 'Loading teacher messages…') : model.status === 'error' ? t('未能讀取老師訊息，請重試。', 'Could not load teacher messages. Please retry.') : t('老師訊息資料暫未提供。', 'Teacher messages are unavailable.'))}</p>${loading ? '' : `<button type="button" class="lpm-inbox-button" data-action="parent-inbox-retry">${esc(t('重試', 'Retry'))}</button>`}`;
  else {
    content = records.length ? `<div class="lpm-inbox-list">${records.map(record => `<article class="lpm-inbox-message" data-message-id="${esc(record.id)}"><header><h3>${provided(record.senderName, context)}</h3>${timestamp(record.createdAt, context)}</header><p class="lpm-inbox-lesson">${provided(record.studentName, context)} · ${provided(record.courseName, context)}</p><p class="lpm-inbox-lesson"><time datetime="${esc(record.date)}">${esc(record.date)}</time> · ${esc(record.time)}</p><div class="lpm-inbox-message-text">${esc(record.body)}</div><p class="lpm-inbox-label">${esc(t('本機測試通知', 'Local test notification'))}</p></article>`).join('')}</div>` : `<p class="lpm-inbox-empty">${esc(total === 0 ? t('暫未有老師訊息。', 'No teacher messages yet.') : t('這一頁暫未有老師訊息。', 'No teacher messages on this page.'))}</p>`;
    if (pages > 1) content += `<nav class="lpm-inbox-pagination" aria-label="${esc(t('老師訊息分頁', 'Teacher message pages'))}"><button type="button" class="lpm-inbox-button" data-action="parent-inbox-prev" data-page="${Math.max(1, page - 1)}"${page === 1 ? ' disabled' : ''}>${esc(t('上一頁', 'Previous'))}</button><span>${esc(t(`第 ${page} / ${pages} 頁 · 共 ${total} 則`, `Page ${page} of ${pages} · ${total} messages`))}</span><button type="button" class="lpm-inbox-button" data-action="parent-inbox-next" data-page="${Math.min(pages, page + 1)}"${page === pages ? ' disabled' : ''}>${esc(t('下一頁', 'Next'))}</button></nav>`;
  }
  return `<div class="lpm-inbox" aria-busy="${loading}">${systems}<section class="lpm-inbox-section" aria-labelledby="lpm-teacher-title"><h2 id="lpm-teacher-title">${esc(t('老師訊息', 'Teacher messages'))}</h2>${content}</section></div>`;
}
