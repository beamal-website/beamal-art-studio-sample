import test from 'node:test';
import assert from 'node:assert/strict';
import {parentTemplateMarkup as markup} from '../client/parent-message-template-ui.js';

const en = {t: (_zh, en) => en}, zh = {t: zh => zh};
const record = (patch = {}) => ({id: 'template-second', title: 'Art materials', body: '  Please bring your sketchbook.\n請帶素描本。  ', version: 3, archived: false, createdAt: '2026-10-16T01:02:03.000Z', updatedAt: '2026-10-16T04:05:06.000Z', ...patch});
const library = (patch = {}) => ({mode: 'manage', step: 'list', status: 'ready', canManage: true, records: [record()], total: 1, page: 1, pageSize: 25, q: '', statusFilter: 'active', ...patch});
const edit = (patch = {}) => library({step: 'edit', draft: {id: record().id, version: record().version, title: record().title, body: record().body}, ...patch});
const action = (html, name) => html.match(new RegExp('<button\\b[^>]*data-action="parent-template-'+name+'"[^>]*>'))?.[0];
const disabled = node => !!node && /\sdisabled(?:\s|>)/.test(node);

test('personal Settings library provides exact-ID maintenance with bounded search tabs paging and no shared scope claim', () => {
  const state = library(), before = JSON.stringify(state), html = markup(state, en);
  assert.match(html, /class="dialog pmt-dialog"/); assert.match(html, /id="pmt-body"[^>]*tabindex="0"/); assert.match(html, /Preset Message to Parents/); assert.match(html, /Only you can use and edit these templates/); assert.match(html, /id="template-search"/); assert.match(html, /name="q"/); assert.match(html, /Art materials/);
  for (const name of ['new', 'edit', 'archive-review', 'tab', 'search', 'close']) assert.ok(action(html, name)); assert.match(action(html, 'edit'), /data-template-id="template-second"/); assert.match(action(html, 'archive-review'), /data-template-id="template-second"/); assert.doesNotMatch(html, /Shared templates|All teachers|parent-template-apply|Saved successfully/); assert.equal(JSON.stringify(state), before);
});

test('loading failed and malformed library sources never become an empty list or expose stale template bodies', () => {
  for (const status of ['loading', 'error', undefined]) {const html = markup(library({status}), en); assert.match(html, status === 'loading' ? /Loading templates/ : /Could not load templates|unavailable/); assert.doesNotMatch(html, /No templates|sketchbook|parent-template-edit|parent-template-new/); assert.ok(action(html, 'close')); if (status !== 'loading') assert.ok(action(html, 'retry'));}
  for (const records of [null, [record(), record()], [record({version: 0})], [record({archived: 'false'})], [record({body: null})]]) {const html = markup(library({records}), en); assert.match(html, /unavailable/); assert.doesNotMatch(html, /Art materials|No templates|parent-template-edit/);}
  const empty = markup(library({records: [], total: 0}), en); assert.match(empty, /No active templates yet/); assert.ok(action(empty, 'new'));
  const archived = markup(library({records: [], total: 0, statusFilter: 'archived'}), en); assert.match(archived, /No archived templates/); assert.doesNotMatch(archived, /No active templates yet/);
});

test('teacher chooser is active-only and cannot expose maintenance or choose an archived or ambiguous record', () => {
  const html = markup(library({mode: 'choose', canManage: false}), en); assert.match(html, /Choose a message template/); assert.match(action(html, 'choose'), /data-template-id="template-second"/); assert.doesNotMatch(html, /parent-template-new|parent-template-edit|parent-template-archive-review|parent-template-restore-review|data-status="archived"|Only you can use and edit/);
  const archived = markup(library({mode: 'choose', canManage: false, records: [record({archived: true})], statusFilter: 'archived'}), en); assert.doesNotMatch(archived, /Art materials|parent-template-choose|parent-template-apply/); assert.match(archived, /unavailable/);
  const forged = markup(edit({canManage: false}), en); assert.doesNotMatch(forged, /<input[^>]*name="title"|<textarea|parent-template-save|Art materials/); assert.ok(action(forged, 'close'));
});

test('editor preserves literal raw title and body with native limits and a separate Review and host Save', () => {
  const draft = {id: 'template-second', version: 3, title: '  帶畫材 {studentName}  ', body: 'Dear {{parent}},\n原文 <script> & {lessonDate}'}, state = edit({draft}), before = JSON.stringify(state), html = markup(state, en);
  assert.match(html, /id="template-editor"[^>]*novalidate/); assert.match(html, /name="title"[^>]*value="  帶畫材 \{studentName\}  "[^>]*maxlength="120"/); assert.match(html, /<textarea[^>]*name="body"[^>]*maxlength="2000"/); assert.match(html, /Dear \{\{parent\}\},\n原文 &lt;script&gt; &amp; \{lessonDate\}/); assert.match(action(html, 'review'), /type="submit"/); assert.doesNotMatch(html, /<script>|Isla|Chloe|parent-template-save|Template saved/); assert.equal(JSON.stringify(state), before);
  const review = markup({...state, step: 'review'}, en); assert.match(review, /Review template/); assert.match(review, /Dear \{\{parent\}\}/); assert.match(action(review, 'save'), /type="button"/); assert.equal(disabled(action(review, 'save')), false); assert.ok(action(review, 'back')); assert.doesNotMatch(review, /<textarea|<input[^>]*name="title"|Template saved/);
});

test('invalid or overlong title and message remain raw with actionable fields and no enabled Save', () => {
  for (const patch of [{title: ''}, {title: ' '}, {title: 'x'.repeat(121)}, {body: ''}, {body: ' \n '}, {body: '字'.repeat(2001)}]) {const html = markup(edit({step: 'review', draft: {...edit().draft, ...patch}}), en); assert.match(html, /id="pmt-error"[^>]*role="alert"[^>]*tabindex="-1"/); assert.match(html, /Enter a title|120 characters|Enter a message|2,000 characters/); assert.ok(!action(html, 'save') || disabled(action(html, 'save'))); assert.match(html, /id="template-editor"/);}
  const html = markup(edit({step: 'review', draft: {title: '字'.repeat(120), body: '字'.repeat(2000)}}), en); assert.equal(disabled(action(html, 'save')), false);
});

test('source changes busy and uncertain mutation states preserve data while constraining exactly the original operation', () => {
  for (const patch of [{status: 'loading'}, {status: 'error'}, {stale: true}, {busy: true}]) {const html = markup(edit({step: 'review', ...patch}), en); assert.ok(disabled(action(html, 'save'))); assert.match(html, /sketchbook/);}
  for (const step of ['edit', 'review']) {const html = markup(edit({step, busy: true}), en); assert.match(html, /aria-busy="true"/); for (const tag of html.matchAll(/<(?:button|input|textarea)\b[^>]*>/g)) assert.ok(disabled(tag[0]), tag[0]);}
  const uncertain = markup(edit({step: 'review', status: 'error', unconfirmed: true}), en); assert.match(uncertain, /has not been confirmed/); assert.equal(disabled(action(uncertain, 'save')), false); assert.ok(disabled(action(uncertain, 'back'))); assert.equal(disabled(action(uncertain, 'close')), false);
  assert.ok(disabled(action(markup(edit({step: 'review', status: 'error', unconfirmed: true, stale: true}), en), 'save')));
});

test('archive and restore are explicit reversible review actions using the exact current record', () => {
  for (const archived of [false, true]) {const state = library({step: 'archive-review', selected: record({archived}), statusFilter: archived ? 'archived' : 'active'}), before = JSON.stringify(state), html = markup(state, en), command = archived ? 'restore' : 'archive'; assert.match(html, archived ? /Restore template/ : /Archive template/); assert.match(html, /Art materials/); assert.match(html, /sketchbook/); assert.match(action(html, command), /data-template-id="template-second"/); assert.equal(disabled(action(html, command)), false); assert.ok(action(html, 'back')); assert.equal(JSON.stringify(state), before);}
  const html = markup(library({step: 'archive-review', selected: null}), en); assert.match(html, /unavailable/); assert.doesNotMatch(html, /parent-template-archive"|parent-template-restore"|Art materials/);
});

test('chooser always previews the exact literal body before use and makes replacing any nonempty draft explicit', () => {
  for (const currentMessage of ['Already typed\nKeep on Cancel', ' \n ']) {const state = library({mode: 'choose', canManage: false, step: 'apply-review', selected: record(), currentMessage}), before = JSON.stringify(state), html = markup(state, en); assert.match(html, /sketchbook/); assert.match(html, /replace your current message/); assert.match(action(html, 'apply'), /data-template-id="template-second"/); assert.equal(disabled(action(html, 'apply')), false); assert.ok(action(html, 'back')); assert.doesNotMatch(html, /parent-template-save|Template saved|Message sent/); assert.equal(JSON.stringify(state), before);}
  const empty = markup(library({mode: 'choose', canManage: false, step: 'apply-review', selected: record(), currentMessage: ''}), en); assert.match(empty, /Use this message/); assert.doesNotMatch(empty, /replace your current message/);
  for (const patch of [{status: 'loading'}, {status: 'error'}, {stale: true}, {busy: true}, {unconfirmed: true}, {selected: record({archived: true})}]) {const html = markup(library({mode: 'choose', step: 'apply-review', selected: record(), currentMessage: 'Original', ...patch}), en); assert.ok(!action(html, 'apply') || disabled(action(html, 'apply')), JSON.stringify(patch));}
});

test('unknown or malformed ACKs never claim saved archive or restore success', () => {
  const state = library({draft: edit().draft}), before = JSON.stringify(state);
  for (const ack of [null, {}, {operation: 'confirm', record: record()}, {operation: 'update', record: record({version: 0})}, {operation: 'archive', record: record({archived: false})}]) assert.doesNotMatch(markup({...state, ack}, en), /id="pmt-ack"|Template saved|Template archived|Template restored/);
  for (const [operation, archived, label] of [['create', false, /Template saved/], ['update', false, /Template saved/], ['archive', true, /Template archived/], ['restore', false, /Template restored/]]) {const html = markup({...state, ack: {operation, record: record({archived})}}, en); assert.match(html, /id="pmt-ack"[^>]*role="status"[^>]*tabindex="-1"/); assert.match(html, label);}
  assert.equal(JSON.stringify(state), before);
});

test('pagination is bounded and search text long private labels and feedback are escaped without extra actions', () => {
  const state = library({records: [record({title: '<img> 私人範本', body: '正文 <script> & {{literal}}'})], total: 51, page: 3, q: '<query>', error: '<b>Keep draft</b>'}), before = JSON.stringify(state), html = markup(state, en);
  assert.match(action(html, 'page'), /data-page="2"/); const pages = [...html.matchAll(/<button\b[^>]*data-action="parent-template-page"[^>]*>/g)].map(match => match[0]); assert.match(pages.at(-1), /data-page="3"/); assert.ok(disabled(pages.at(-1))); assert.match(html, /Page 3 of 3/); assert.match(html, /value="&lt;query&gt;"/); assert.match(html, /&lt;img&gt; 私人範本/); assert.match(html, /&lt;b&gt;Keep draft&lt;\/b&gt;/); assert.doesNotMatch(html, /<img|<script>|<b>|data-page="4"/); assert.equal(JSON.stringify(state), before);
  for (const patch of [{page: 4}, {total: '51'}, {pageSize: 0}, {pageSize: 101}]) assert.match(markup({...state, ...patch}, en), /unavailable/);
  assert.match(markup(library(), zh), /常用家長訊息/); assert.match(markup(library(), zh), /只有你可以使用和修改/);
});

test('recovery uses the controller Reload command and never silently reverses the requested archive operation', () => {
  for (const state of [edit({stale: true}), library({mode: 'choose', step: 'apply-review', selected: record(), currentMessage: 'Keep', stale: true}), library({step: 'archive-review', selected: record(), archiveAction: 'archive', stale: true})]) {const html = markup(state, en); assert.ok(action(html, 'reload')); assert.equal(disabled(action(html, 'reload')), false); assert.equal(action(html, 'retry'), undefined);}
  for (const [archiveAction, archived] of [['archive', true], ['restore', false]]) {const html = markup(library({step: 'archive-review', selected: record({archived}), archiveAction}), en); assert.ok(!action(html, 'archive') || disabled(action(html, 'archive'))); assert.ok(!action(html, 'restore') || disabled(action(html, 'restore'))); assert.match(html, /changed|unavailable/);}
  const unknownDraft = markup(library({mode: 'choose', step: 'apply-review', selected: record()}), en); assert.ok(disabled(action(unknownDraft, 'apply'))); assert.match(unknownDraft, /current message draft is unavailable/);
});
