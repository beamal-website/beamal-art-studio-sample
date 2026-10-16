import test from 'node:test';
import assert from 'node:assert/strict';
import {parentMessageMarkup as dialog, parentMessageInboxMarkup as inbox} from '../client/lesson-parent-message-ui.js';

const en = {t: (_zh, en) => en}, zh = {t: zh => zh};
const source = () => ({sessionId: 'session-second', studentId: 'student-second', studentName: 'Isla <Second>', courseName: 'Print & colour', date: '2026-11-02', time: '15:15', duration: 45, teacherNames: ['Teacher B'], sender: {id: 'teacher-user-b', displayName: 'Leo & Chan'}, whatsApp: {name: 'Mrs Second', number: '+852 6123 4567'}, appRecipient: {userId: 'parent-user-second', displayName: 'Mrs Second Account'}, revision: 'source-revision-second'});
const model = (patch = {}) => ({context: source(), contextStatus: 'ready', step: 'edit', draft: {channel: 'app', message: '  Please bring your sketchbook.\n請帶素描本。  '}, ...patch});
const receipt = (patch = {}) => ({id: 'message-second', sessionId: 'session-second', studentId: 'student-second', studentName: 'Isla <Second>', senderId: 'teacher-user-b', senderName: 'Leo & Chan', recipientUserId: 'parent-user-second', recipientName: 'Mrs Second Account', courseName: 'Print & colour', date: '2026-11-02', time: '15:15', body: model().draft.message, createdAt: '2026-10-16T09:10:11.000Z', channel: 'app-test', ...patch});
const action = (html, name) => html.match(new RegExp('<button\\b[^>]*data-action="'+name+'"[^>]*>'))?.[0];
const disabled = node => !!node && /\sdisabled(?:\s|>)/.test(node);
const radio = (html, channel) => html.match(new RegExp('<input\\b[^>]*name="channel"[^>]*value="'+channel+'"[^>]*>'))?.[0];

test('parent message edit identifies exactly one student lesson sender and actual channel recipients', () => {
  const state = model(), before = JSON.stringify(state), html = dialog(state, en);
  assert.match(html, /class="dialog lpm-dialog"/); assert.match(html, /id="lpm-body"[^>]*tabindex="0"/); assert.match(html, /id="lpm-form"[^>]*novalidate/);
  assert.match(html, /Isla &lt;Second&gt;/); assert.match(html, /Print &amp; colour/); assert.match(html, /2026-11-02/); assert.match(html, /15:15/); assert.match(html, /45 min/); assert.match(html, /Leo &amp; Chan/); assert.match(html, /Teacher B/); assert.match(html, /Mrs Second Account/);
  assert.match(radio(html, 'app'), /checked/); assert.ok(radio(html, 'whatsapp')); assert.match(html, /<label[^>]*for="lpm-message"/); assert.match(html, /<textarea[^>]*id="lpm-message"[^>]*name="message"[^>]*maxlength="2000"/); assert.ok(action(html, 'parent-message-preview'));
  assert.doesNotMatch(html, /Chloe|Maya|Template|已發送|id="lpm-saved"/); assert.equal(JSON.stringify(state), before);
});

test('an App preview preserves the raw multiline body and only exposes the explicit host send button', () => {
  const state = model({step: 'preview'}), before = JSON.stringify(state), html = dialog(state, en), send = action(html, 'parent-message-send');
  assert.match(html, /  Please bring your sketchbook\.\n請帶素描本。  /); assert.match(html, /Mrs Second Account/); assert.match(html, /Local test notification/); assert.match(html, /Send to the parent account/); assert.equal(disabled(send), false); assert.match(send, /type="button"/); assert.ok(action(html, 'parent-message-back')); assert.doesNotMatch(html, /<textarea|id="lpm-saved"|WhatsApp sent|Message sent successfully/); assert.equal(JSON.stringify(state), before);
});

test('loading unknown and failed context never invent a recipient or expose an unrelated message form', () => {
  for (const contextStatus of ['loading', 'error', undefined, 'READY']) {
    const html = dialog(model({context: null, contextStatus}), en); assert.match(html, contextStatus === 'loading' ? /Loading lesson contacts/ : /Could not load lesson contacts|unavailable/); assert.doesNotMatch(html, /<textarea|Isla|Mrs Second|No contacts|No messages|id="lpm-saved"/); assert.ok(action(html, 'parent-message-close')); assert.equal(disabled(action(html, 'parent-message-close')), false); if (contextStatus !== 'loading') assert.ok(action(html, 'parent-message-retry'));
  }
  for (const context of [{...source(), sessionId: ''}, {...source(), studentId: ' '}, {...source(), date: '2026-02-30'}, {...source(), time: '25:00'}, {...source(), duration: 0}, {...source(), revision: ''}, {...source(), sender: {id: ''}}]) {
    const html = dialog(model({context}), en); assert.doesNotMatch(html, /Isla|Mrs Second|<textarea|parent-message-send|id="lpm-saved"/); assert.match(html, /unavailable/);
  }
});

test('missing channel recipients are unavailable rather than borrowing a contact or allowing a forged preview', () => {
  const context = {...source(), appRecipient: null, whatsApp: null}, html = dialog(model({context}), en);
  assert.ok(disabled(radio(html, 'app'))); assert.ok(disabled(radio(html, 'whatsapp'))); assert.match(html, /No linked parent account/); assert.match(html, /No WhatsApp number/); assert.ok(disabled(action(html, 'parent-message-preview')));
  for (const channel of ['app', 'whatsapp']) {const preview = dialog(model({context, step: 'preview', draft: {channel, message: 'Still a local draft'}}), en); assert.ok(!action(preview, 'parent-message-send') || disabled(action(preview, 'parent-message-send'))); assert.doesNotMatch(preview, /href="https:\/\/wa\.me/);}
});

test('blank invalid channel and oversized raw messages cannot progress or enable Send', () => {
  for (const message of ['', ' \n\t ', null, undefined, 'x'.repeat(2001)]) {
    const html = dialog(model({step: 'preview', draft: {channel: 'app', message}}), en); assert.ok(!action(html, 'parent-message-send') || disabled(action(html, 'parent-message-send'))); assert.match(html, /Enter a message|2,000 characters/); assert.doesNotMatch(html, /id="lpm-saved"/);
  }
  for (const channel of ['', undefined, 'email', 'APP', {}]) assert.ok(disabled(action(dialog(model({draft: {channel, message: 'Message'}}), en), 'parent-message-preview')));
  assert.equal(disabled(action(dialog(model({step: 'preview', draft: {channel: 'app', message: '字'.repeat(2000)}}), en), 'parent-message-send')), false);
});

test('source loading failure and stale context preserve draft but prevent a new Send', () => {
  for (const patch of [{contextStatus: 'loading'}, {contextStatus: 'error'}, {stale: true}]) {
    const state = model({step: 'preview', ...patch}), html = dialog(state, en); assert.ok(disabled(action(html, 'parent-message-send'))); assert.match(html, /sketchbook/); assert.equal(disabled(action(html, 'parent-message-back')), false); assert.equal(disabled(action(html, 'parent-message-close')), false); assert.doesNotMatch(html, /id="lpm-saved"/);
  }
  const stale = dialog(model({step: 'preview', stale: true}), en); assert.match(stale, /changed/); assert.ok(action(stale, 'parent-message-retry'));
});

test('busy locks all controls and Close while an unconfirmed result preserves identical-send retry and allows Close', () => {
  for (const step of ['edit', 'preview']) {
    const html = dialog(model({step, busy: true}), en); assert.match(html, /aria-busy="true"/); for (const tag of html.matchAll(/<(?:button|input|textarea)\b[^>]*>/g)) assert.ok(disabled(tag[0]), tag[0]);
  }
  const uncertain = dialog(model({step: 'preview', contextStatus: 'error', unconfirmed: true}), en); assert.match(uncertain, /has not been confirmed/); assert.equal(disabled(action(uncertain, 'parent-message-send')), false); assert.ok(disabled(action(uncertain, 'parent-message-back'))); assert.equal(disabled(action(uncertain, 'parent-message-close')), false);
  const edit = dialog(model({unconfirmed: true}), en); assert.ok(disabled(radio(edit, 'app'))); assert.match(edit, /<textarea[^>]*disabled/); assert.ok(disabled(action(edit, 'parent-message-preview')));
  assert.ok(disabled(action(dialog(model({step: 'preview', contextStatus: 'error', unconfirmed: true, stale: true}), en), 'parent-message-send')));
});

test('only an exact App receipt displays saved test notification and never claims external delivery', () => {
  const state = model({step: 'saved', ack: receipt()}), before = JSON.stringify(state), html = dialog(state, en);
  assert.match(html, /id="lpm-saved"[^>]*role="status"[^>]*tabindex="-1"/); assert.match(html, /Saved to the parent account notification centre/); assert.match(html, /Local test notification/); assert.doesNotMatch(html, /parent-message-send|parent-message-back|<textarea|Push delivered|WhatsApp sent|read receipt/i); assert.equal(JSON.stringify(state), before);
  for (const ack of [null, undefined, receipt({sessionId: 'other-session'}), receipt({studentId: 'same-name-other-student'}), receipt({senderId: 'other-teacher'}), receipt({recipientUserId: 'other-family'}), receipt({body: 'Different body'}), receipt({channel: 'whatsapp'}), receipt({id: ''}), receipt({createdAt: 'not-a-time'})]) assert.doesNotMatch(dialog({...state, ack}, en), /id="lpm-saved"|Saved to the parent account/);
  assert.doesNotMatch(dialog({...state, draft: {...state.draft, channel: 'whatsapp'}}, en), /id="lpm-saved"|Saved to the parent account/);
});

test('the saved App receipt labels the actual recipient as a local test notification only once in each language', () => {
  const state = model({step: 'saved', ack: receipt()});
  for (const [locale, label] of [[en, 'Local test notification'], [zh, '本機測試通知']]) {
    const html = dialog(state, locale); assert.equal(html.split(label).length - 1, 1); assert.match(html, /id="lpm-saved"/); assert.match(html, /Mrs Second Account/);
  }
});

test('WhatsApp preview provides manual copying and an explicit safe international link without a Send claim', () => {
  const state = model({step: 'preview', draft: {channel: 'whatsapp', message: '  Hello & 你好?\nNext line  '}}), before = JSON.stringify(state), html = dialog(state, en);
  assert.match(html, /Mrs Second/); assert.match(html, /\+852 6123 4567/); assert.ok(action(html, 'parent-message-copy-number')); assert.ok(action(html, 'parent-message-copy-message')); assert.match(html, /href="https:\/\/wa\.me\/85261234567\?text=%20%20Hello%20%26%20%E4%BD%A0%E5%A5%BD%3F%0ANext%20line%20%20"/); assert.match(html, /rel="noopener noreferrer"/); assert.match(html, /Open WhatsApp/); assert.doesNotMatch(html, /parent-message-send|id="lpm-saved"|Message sent|WhatsApp sent/); assert.equal(JSON.stringify(state), before);
});

test('WhatsApp never guesses a country code or creates a URL from unsafe ambiguous short or malformed numbers', () => {
  for (const number of ['61234567', '85261234567', '+123456789', '+1234567890123456', '+01234567890', '+85261234567;bad', '+852<script>', 'javascript:bad', 'https://evil.test', '+852\n61234567']) {
    const html = dialog(model({step: 'preview', context: {...source(), whatsApp: {name: 'Contact', number}}, draft: {channel: 'whatsapp', message: 'Original raw body'}}), en); assert.doesNotMatch(html, /href="https:\/\/wa\.me/); assert.ok(action(html, 'parent-message-copy-number')); assert.ok(action(html, 'parent-message-copy-message')); assert.doesNotMatch(html, /<script>|WhatsApp sent/);
  }
  assert.match(dialog(model({step: 'preview', context: {...source(), whatsApp: {name: 'Contact', number: '+1 (202) 555-0100'}}, draft: {channel: 'whatsapp', message: 'Body'}}), en), /wa\.me\/12025550100/);
});

test('long private names raw body and feedback are escaped in both languages with stable focus markers', () => {
  const state = model({error: '<script>Could not send</script>', context: {...source(), studentName: '學生 <img> '.repeat(30), sender: {...source().sender, displayName: '<svg>老師'}, appRecipient: {...source().appRecipient, displayName: '<b>家長'}}, draft: {channel: 'app', message: '</textarea><script>Body</script>\n& "quoted"'}}), before = JSON.stringify(state);
  for (const locale of [en, zh]) {const html = dialog(state, locale); assert.match(html, /id="lpm-error"[^>]*role="alert"[^>]*tabindex="-1"/); assert.match(html, /&lt;script&gt;Could not send&lt;\/script&gt;/); assert.match(html, /&lt;\/textarea&gt;&lt;script&gt;Body/); assert.doesNotMatch(html, /<img|<script|<svg|<b>/); assert.ok(action(html, 'parent-message-close'));}
  assert.match(dialog(state, zh), /聯絡家長/); assert.equal(JSON.stringify(state), before);
});

test('the student inbox separates unavailable system notifications from canonical teacher message records', () => {
  const item = receipt({body: 'First line\n第二行 <script> &'}), state = {status: 'ready', records: [item], total: 1, page: 1, pageSize: 20}, before = JSON.stringify(state), html = inbox(state, en);
  assert.match(html, /System notifications/); assert.match(html, /System notifications are not available yet\./); assert.match(html, /Teacher messages/); assert.match(html, /Leo &amp; Chan/); assert.match(html, /Isla &lt;Second&gt;/); assert.match(html, /Print &amp; colour/); assert.match(html, /2026-11-02/); assert.match(html, /15:15/); assert.match(html, /First line\n第二行 &lt;script&gt; &amp;/); assert.match(html, /<time datetime="2026-10-16T09:10:11.000Z"/); assert.doesNotMatch(html, /Mark as read|Unread|Preview|<script>|No teacher messages yet|parent-message-send|No system notifications yet/); assert.equal(JSON.stringify(state), before);
  const chinese = inbox(state, zh); assert.match(chinese, /系統通知暫未提供。/); assert.doesNotMatch(chinese, /暫未有系統通知/);
});

test('the inbox distinguishes ready empty from loading error unknown and rejects malformed or duplicate records', () => {
  const empty = inbox({status: 'ready', records: [], total: 0, page: 1, pageSize: 20}, en); assert.match(empty, /No teacher messages yet/);
  for (const status of ['loading', 'error', undefined]) {const html = inbox({status, error: 'PRIVATE SQL STACK', records: [receipt()], total: 1, page: 1, pageSize: 20}, en); assert.match(html, status === 'loading' ? /Loading teacher messages/ : /Could not load teacher messages|unavailable/); assert.doesNotMatch(html, /No teacher messages yet|PRIVATE SQL|sketchbook|Leo/); if (status !== 'loading') assert.ok(action(html, 'parent-inbox-retry'));}
  for (const records of [null, [receipt({recipientUserId: ''})], [receipt(), receipt({body: 'Different student body'})], [receipt({channel: 'whatsapp'})]]) {const html = inbox({status: 'ready', records, total: 2, page: 1, pageSize: 20}, en); assert.match(html, /unavailable/); assert.doesNotMatch(html, /sketchbook|Leo|No teacher messages yet/);}
});

test('inbox pagination is bounded by actual total with no invented read state or hidden personal metadata', () => {
  const item = receipt({privatePhone: 'PRIVATE PHONE', dateOfBirth: 'PRIVATE DOB', familyId: 'PRIVATE FAMILY'}), state = {status: 'ready', records: [item], total: 41, page: 3, pageSize: 20}, html = inbox(state, en);
  assert.match(action(html, 'parent-inbox-prev'), /data-page="2"/); assert.equal(disabled(action(html, 'parent-inbox-prev')), false); assert.match(action(html, 'parent-inbox-next'), /data-page="3"/); assert.ok(disabled(action(html, 'parent-inbox-next'))); assert.match(html, /Page 3 of 3/); assert.doesNotMatch(html, /PRIVATE PHONE|PRIVATE DOB|PRIVATE FAMILY|data-page="4"|Mark as read|Unread/);
  const first = inbox({...state, total: 21, page: 1}, en); assert.ok(disabled(action(first, 'parent-inbox-prev'))); assert.match(action(first, 'parent-inbox-next'), /data-page="2"/);
  for (const patch of [{total: '41'}, {page: 4}, {page: 0}, {pageSize: 0}, {pageSize: 101}, {records: [receipt(), receipt({id: 'other'})], total: 1}]) assert.match(inbox({...state, ...patch}, en), /unavailable/);
  assert.match(inbox({status: 'ready', records: [], total: 0, page: 1, pageSize: 20}, zh), /系統通知/);
});

test('unencodable raw text cannot crash WhatsApp Preview or be silently replaced to manufacture a link', () => {
  const state = model({step: 'preview', draft: {channel: 'whatsapp', message: 'Original \uD800 raw message'}}), before = JSON.stringify(state);
  let html; assert.doesNotThrow(() => {html = dialog(state, en);}); assert.ok(action(html, 'parent-message-copy-message')); assert.doesNotMatch(html, /href="https:\/\/wa\.me|parent-message-send|id="lpm-saved"/); assert.equal(JSON.stringify(state), before);
});

test('an in-progress context Reload cannot offer another active Retry even when stale feedback is still shown', () => {
  const html = dialog(model({contextStatus: 'loading', stale: true}), en); assert.ok(action(html, 'parent-message-retry')); assert.ok(disabled(action(html, 'parent-message-retry'))); assert.equal(disabled(action(html, 'parent-message-close')), false); assert.ok(disabled(action(html, 'parent-message-preview')));
});

test('an initial context failure shows its reason once rather than duplicating the same alert inside the reading body', () => {
  const html = dialog(model({context: null, contextStatus: 'error'}), en); assert.equal((html.match(/Could not load lesson contacts/g) || []).length, 1); assert.ok(action(html, 'parent-message-retry')); assert.doesNotMatch(html, /<textarea|No contacts/);
});
