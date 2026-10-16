import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePackageContentDraft, packageContentMarkup} from '../client/package-content-ui.js';

const fee = {id: 'fee-package-a', feeCode: 'FE-003', version: 2, feeName: 'Junior + Interview', pricingModel: 'package', packageType: 'minutes', packageTotal: 1080};
const components = [{id: 'junior', name: ' Junior A ', minutes: '60'}, {id: 'interview', name: 'Interview', minutes: '30'}];
const state = {fee, role: 'admin', courseNames: ['Junior A', 'Interview'], components};
const zh = {t: chinese => chinese};

test('package validation preserves raw names, minutes, IDs and order while summing segment duration', () => {
  const raw = Object.freeze(components.map(row => Object.freeze({...row})));
  const result = validatePackageContentDraft({components: raw});
  assert.deepEqual(result, {valid: true, components, errors: {}, totalMinutes: 90});
  assert.notEqual(result.components, raw);
  assert.notEqual(result.components[0], raw[0]);
  assert.equal(result.components[0].name, ' Junior A ');
  assert.equal(result.components[0].minutes, '60');
  assert.equal(validatePackageContentDraft({components: [{id: 'one', name: 'Short', minutes: 1}, {id: 'two', name: 'Long', minutes: '1440'}]}).totalMinutes, 1441);
});

test('package validation requires a component and exact unique nonempty string IDs', () => {
  for (const value of [undefined, null, [], {}, 'Junior']) {
    const result = validatePackageContentDraft({components: value});
    assert.equal(result.valid, false);
    assert.equal(result.errors.components, 'required');
    assert.equal(result.totalMinutes, null);
  }
  for (const id of ['', ' ', ' one ', null, 1]) {
    const result = validatePackageContentDraft({components: [{id, name: 'Junior', minutes: '60'}]});
    assert.equal(result.valid, false);
    assert.equal(result.errors.rows[0].id, 'id');
  }
  const duplicate = validatePackageContentDraft({components: [{id: 'same', name: 'One', minutes: '60'}, {id: 'same', name: 'Two', minutes: '30'}]});
  assert.equal(duplicate.valid, false);
  assert.equal(duplicate.errors.rows[1].id, 'duplicate');
});

test('package validation rejects blank names and non-whole, missing or out-of-range duration without coercing it', () => {
  for (const minutes of ['', ' ', '0', 0, '-1', '1.5', '1e2', 'Infinity', NaN, false, null, '1441', ' 60 ', {}, []]) {
    const result = validatePackageContentDraft({components: [{id: 'row', name: '   ', minutes}]});
    assert.equal(result.valid, false);
    assert.equal(result.totalMinutes, null);
    assert.deepEqual(result.errors.rows[0], {name: 'name', minutes: 'minutes'});
    assert.equal(result.components[0].minutes, minutes);
    assert.equal(result.components[0].name, '   ');
  }
});

test('details describes unavailable saved content rather than turning linked courses or draft rows into components', () => {
  const html = packageContentMarkup({...state, step: 'details', fee: {...fee, courseIds: ['course-a', 'course-b'], components: [{id: 'fake', name: 'FALSE SAVED', minutes: 99}]}});
  assert.match(html, /Package contents/);
  assert.match(html, /Contents have not been provided/);
  assert.match(html, /FE-003/);
  assert.match(html, /1080 minutes/);
  assert.match(html, /Saved linked courses/);
  assert.match(html, /data-action="package-content-edit"/);
  assert.match(html, /data-action="package-content-close"/);
  assert.doesNotMatch(html, /FALSE SAVED|90 minutes|packageComponentName|packageComponentMinutes|Remaining/);
});

test('only saved package fees are eligible and a teacher remains readonly even if edit or review is requested', () => {
  for (const invalidFee of [null, {feeName: 'New package', pricingModel: 'package'}, {...fee, pricingModel: 'fixed-monthly'}, {...fee, pricingModel: 'monthly-lessons'}]) {
    assert.equal(packageContentMarkup({...state, fee: invalidFee}), '');
  }
  for (const role of ['student', undefined, 'Admin']) assert.equal(packageContentMarkup({...state, role}), '');
  for (const step of ['details', 'edit', 'review']) {
    const html = packageContentMarkup({...state, role: 'teacher', step});
    assert.match(html, /Contents have not been provided/);
    assert.match(html, /data-action="package-content-close"/);
    assert.doesNotMatch(html, /package-content-edit|package-content-review|packageComponentName|packageComponentMinutes|Save contents/);
  }
});

test('edit has uniquely labelled raw fields and stable exact row IDs for reorder/remove actions', () => {
  const html = packageContentMarkup({...state, step: 'edit'});
  assert.match(html, /<form id="package-content-editor"[^>]*novalidate/);
  assert.match(html, /name="packageComponentName"[^>]*data-component-id="junior"[^>]*value=" Junior A "/);
  assert.match(html, /name="packageComponentMinutes"[^>]*data-component-id="interview"[^>]*value="30"/);
  assert.match(html, /for="package-component-name-0"/);
  assert.match(html, /for="package-component-name-1"/);
  assert.match(html, /Segment 1 content name/);
  assert.match(html, /Segment 2 content name/);
  assert.match(html, /class="package-content-body"[^>]*tabindex="0"/);
  for (const action of ['remove', 'up', 'down']) {
    assert.match(html, new RegExp(`data-action="package-content-${action}"[^>]*data-component-id="junior"`));
    assert.match(html, new RegExp(`data-action="package-content-${action}"[^>]*data-component-id="interview"`));
  }
  assert.match(html, /data-action="package-content-add"/);
  assert.match(html, /data-action="package-content-review"/);
  assert.match(html, /Contents have not been saved/);
});

test('review renders ordered draft segments and duration separately from the saved Fee quota, with Back and disabled Save', () => {
  const reordered = [components[1], components[0]];
  const html = packageContentMarkup({...state, step: 'review', components: reordered});
  assert.match(html, /data-step="review"/);
  assert.ok(html.indexOf('data-component-id="interview"') < html.indexOf('data-component-id="junior"'));
  assert.match(html, /Total segment duration/);
  assert.match(html, /90 minutes/);
  assert.match(html, /1080 minutes/);
  assert.match(html, /data-action="package-content-back"/);
  assert.match(html, /<button type="button"[^>]*data-action="package-content-save"[^>]*disabled[^>]*>Save contents<\/button>/);
  assert.match(html, /Contents have not been saved/);
  assert.doesNotMatch(html, /Saved successfully|Contents saved|remaining|12 visits|12 lessons|name="packageComponentName"/i);
});

test('invalid review remains editable with an actionable error and no plausible total', () => {
  const html = packageContentMarkup({...state, step: 'review', components: [{id: 'bad', name: '', minutes: '0'}]});
  assert.match(html, /data-step="edit"/);
  assert.match(html, /id="package-content-error"[^>]*role="alert"[^>]*tabindex="-1"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /value="0"/);
  assert.doesNotMatch(html, />0 minutes<|Total segment duration|package-content-back/);
});

test('source errors and stale state preserve input but block progression and do not display unavailable source facts', () => {
  const error = packageContentMarkup({...state, step: 'edit', sourceError: 'Fee details cannot be read'});
  assert.match(error, /Fee details cannot be read/);
  assert.match(error, /value=" Junior A "/);
  assert.match(error, /data-action="package-content-review"[^>]*disabled/);
  assert.doesNotMatch(error, /FE-003|1080 minutes/);
  const stale = packageContentMarkup({...state, step: 'review', stale: true});
  assert.match(stale, /data-step="edit"/);
  assert.match(stale, /Fee details have changed/);
  assert.match(stale, /data-action="package-content-review"[^>]*disabled/);
  assert.match(stale, /value="30"/);
});

test('quota units remain Minutes or Visits without inferring amounts or translating course links into saved content', () => {
  for (const [type, label] of [['minutes', '720 minutes'], ['visits', '12 visits'], ['lessons', '12 visits']]) {
    const html = packageContentMarkup({...state, components: [], fee: {...fee, packageType: type, packageTotal: type === 'minutes' ? 720 : 12}});
    assert.ok(html.includes(label));
    assert.match(html, /Contents have not been provided/);
  }
  const html = packageContentMarkup({...state, fee: {...fee, packageType: 'unknown', packageTotal: null}});
  assert.match(html, /Not provided/);
  assert.doesNotMatch(html, /0 minutes|0 visits|1080 minutes/);
});

test('both languages escape long names, values, errors and row IDs without changing drafts', () => {
  const rows = [{id: 'row" data-evil="yes', name: '長名稱 <script> & '.repeat(10), minutes: '" onfocus="bad'}];
  const source = {...state, fee: {...fee, feeCode: 'FE-<img>', feeName: '課包 <svg>'}, courseNames: ['A & <B>'], step: 'edit', components: rows, error: '<b>請修正</b>'};
  const before = JSON.stringify(source);
  for (const context of [zh, {}]) {
    const html = packageContentMarkup(source, context);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&quot; data-evil=&quot;yes/);
    assert.match(html, /&lt;b&gt;請修正&lt;\/b&gt;/);
    assert.match(html, /FE-&lt;img&gt;/);
    assert.doesNotMatch(html, /<script|<img|<svg|<b>|" data-evil="|" onfocus="/);
  }
  assert.match(packageContentMarkup(state, zh), /套票內容/);
  assert.match(packageContentMarkup({...state, step: 'review'}, zh), /內容尚未儲存/);
  assert.equal(JSON.stringify(source), before);
});

test('source-error recovery can reload without exposing old source details and loading leaves Close available', () => {
  const details = packageContentMarkup({...state, step: 'details', sourceError: 'Read failed'});
  assert.match(details, /data-action="package-content-refresh"/);
  assert.doesNotMatch(details, /data-action="package-content-edit"|FE-003|1080 minutes/);
  const error = packageContentMarkup({...state, step: 'edit', sourceError: 'Read failed'});
  assert.match(error, /data-action="package-content-refresh"/);
  assert.doesNotMatch(error, /FE-003|1080 minutes/);
  const loading = packageContentMarkup({...state, step: 'edit', sourceError: 'Read failed', loading: true});
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /name="packageComponentName"[^>]*value=" Junior A "[^>]*disabled/);
  assert.match(loading, /name="packageComponentMinutes"[^>]*value="30"[^>]*disabled/);
  for (const action of ['refresh', 'add', 'remove', 'up', 'down', 'review']) assert.match(loading, new RegExp(`data-action="package-content-${action}"[^>]*disabled`));
  assert.match(loading, /data-action="package-content-close"[^>]*>Cancel<\/button>/);
  assert.doesNotMatch(loading, /data-action="package-content-close"[^>]*disabled/);
});

const savedContents = (patch = {}) => ({feeId: fee.id, feeVersion: fee.version, version: 3, components: components.map(row => ({...row, minutes: Number(row.minutes)})), updatedAt: '2026-10-16T12:30:00.000Z', ...patch});
const readyState = (patch = {}) => ({...state, contentStatus: 'ready', savedContents: savedContents(), ...patch});
const actionTag = (html, action) => html.match(new RegExp('<button\\b[^>]*data-action="'+action+'"[^>]*>'))?.[0];

test('real saved contents show exact ordered segments and their own duration while quota remains unchanged', () => {
  const source = readyState({step: 'details', components: [{id: 'private-draft', name: 'UNSAVED DRAFT', minutes: '900'}], savedContents: savedContents({components: [savedContents().components[1], savedContents().components[0]]})}), before = JSON.stringify(source), html = packageContentMarkup(source);
  assert.ok(html.indexOf('data-component-id="interview"') < html.indexOf('data-component-id="junior"'));
  assert.match(html, /Saved contents/); assert.match(html, /90 minutes/); assert.match(html, /1080 minutes/);
  assert.doesNotMatch(html, /Contents have not been provided|UNSAVED DRAFT|900 minutes|remaining|lessons left/i);
  assert.ok(actionTag(html, 'package-content-edit')); assert.equal(JSON.stringify(source), before);
});

test('only ready exact current Fee contents distinguish a genuine empty record from loading error and malformed data', () => {
  const empty = packageContentMarkup(readyState({savedContents: savedContents({version: 0, components: [], updatedAt: null})}));
  assert.match(empty, /No contents have been set/); assert.doesNotMatch(empty, /Could not load|Loading contents|>90 minutes<|>0 minutes</);
  for (const contentStatus of ['loading', 'error']) {
    const html = packageContentMarkup(readyState({contentStatus}));
    assert.match(html, contentStatus === 'loading' ? /Loading contents/ : /Could not load contents/);
    assert.doesNotMatch(html, /No contents have been set|Contents have not been provided|90 minutes/);
    assert.equal(actionTag(html, 'package-content-edit'), undefined);
    assert.ok(actionTag(html, 'package-content-close')); if (contentStatus === 'error') assert.ok(actionTag(html, 'package-content-refresh'));
  }
  for (const saved of [null, savedContents({feeId: 'same-name-other-fee'}), savedContents({feeVersion: fee.version + 1}), savedContents({version: -1}), savedContents({version: '3'}), savedContents({components: null}), savedContents({updatedAt: null}), savedContents({components: [{id: 'one', name: 'INVALID CANONICAL', minutes: '60'}]})]) {
    const html = packageContentMarkup(readyState({savedContents: saved})); assert.match(html, /Could not load contents/); assert.doesNotMatch(html, /No contents have been set|90 minutes|INVALID CANONICAL/); assert.equal(actionTag(html, 'package-content-edit'), undefined);
  }
});

test('explicit ready matching contents enable the host Save action only for a valid Admin Review', () => {
  const source = readyState({step: 'review'}), before = JSON.stringify(source), html = packageContentMarkup(source), save = actionTag(html, 'package-content-save');
  assert.ok(save); assert.match(save, /type="button"/); assert.doesNotMatch(save, /disabled/); assert.match(html, /data-step="review"/); assert.doesNotMatch(html, /Saving contents is not available yet/);
  for (const patch of [{contentStatus: 'loading'}, {contentStatus: 'error'}, {contentStatus: undefined}, {stale: true}, {sourceError: 'Fee relation changed'}, {saving: true}, {savedContents: savedContents({feeVersion: 99})}, {components: [{id: 'one', name: '', minutes: '0'}]}]) {
    const blocked = packageContentMarkup({...source, ...patch}), save = actionTag(blocked, 'package-content-save'); assert.ok(!save || /disabled/.test(save), JSON.stringify(patch)); assert.doesNotMatch(blocked, /id="package-content-saved"/);
  }
  const teacher = packageContentMarkup({...source, role: 'teacher'}); assert.match(teacher, /90 minutes/); assert.equal(actionTag(teacher, 'package-content-save'), undefined); assert.equal(actionTag(teacher, 'package-content-edit'), undefined); assert.doesNotMatch(teacher, /packageComponentName/); assert.equal(JSON.stringify(source), before);
});

test('a saved confirmation needs the host ACK with matching Fee versions order and exact draft contents', () => {
  const source = readyState({step: 'saved', saveAck: savedContents()}), before = JSON.stringify(source);
  for (const context of [{}, zh]) {
    const html = packageContentMarkup(source, context); assert.match(html, /id="package-content-saved"[^>]*role="status"[^>]*tabindex="-1"/); assert.match(html, /Contents saved|內容已儲存/); assert.ok(actionTag(html, 'package-content-details')); assert.ok(actionTag(html, 'package-content-edit')); assert.doesNotMatch(html, /Contents have not been saved|package-content-save"|packageComponentName/);
  }
  for (const saveAck of [undefined, null, savedContents({feeId: 'other-fee'}), savedContents({feeVersion: 1}), savedContents({version: 0}), savedContents({version: 4}), savedContents({components: [...savedContents().components].reverse()}), savedContents({components: [{...savedContents().components[0], name: 'Other contents'}, savedContents().components[1]]})]) assert.doesNotMatch(packageContentMarkup({...source, saveAck}), /id="package-content-saved"|Contents saved/);
  assert.doesNotMatch(packageContentMarkup({...source, components: [{id: 'new', name: 'New draft', minutes: '2'}]}), /id="package-content-saved"|Contents saved/); assert.equal(JSON.stringify(source), before);
});

test('saving locks closing and mutations while an unconfirmed result retries identical contents without allowing Back', () => {
  const source = readyState({step: 'review', saving: true}), html = packageContentMarkup(source); assert.match(html, /aria-busy="true"/);
  for (const action of ['package-content-close', 'package-content-back', 'package-content-save']) assert.match(actionTag(html, action), /disabled/);
  const editing = packageContentMarkup({...source, step: 'edit'}); assert.match(editing, /name="packageComponentName"[^>]*disabled/); assert.match(editing, /name="packageComponentMinutes"[^>]*disabled/);
  for (const action of ['package-content-add', 'package-content-up', 'package-content-down', 'package-content-remove', 'package-content-review']) assert.match(actionTag(editing, action), /disabled/);
  const uncertain = packageContentMarkup(readyState({step: 'review', contentStatus: 'error', unconfirmed: true})); assert.match(uncertain, /has not been confirmed/); assert.doesNotMatch(actionTag(uncertain, 'package-content-save'), /disabled/); assert.match(actionTag(uncertain, 'package-content-back'), /disabled/); assert.doesNotMatch(actionTag(uncertain, 'package-content-close'), /disabled/); assert.match(uncertain, /90 minutes/);
  const stale = packageContentMarkup(readyState({step: 'review', contentStatus: 'error', unconfirmed: true, stale: true})); assert.match(actionTag(stale, 'package-content-save'), /disabled/); assert.match(stale, /changed/); assert.doesNotMatch(stale, /id="package-content-saved"/);
});

test('save failure feedback is visible focusable and escaped without losing raw content or enabling an invalid retry', () => {
  const source = readyState({step: 'review', saveError: 'Could not save <script> & retry.', components: [{id: 'raw', name: '  保留\n<name>  ', minutes: '060'}]}), before = JSON.stringify(source), html = packageContentMarkup(source);
  assert.match(html, /id="package-content-save-error"[^>]*role="alert"[^>]*tabindex="-1"/); assert.match(html, /Could not save &lt;script&gt; &amp; retry/); assert.doesNotMatch(html, /<script>/); assert.match(html, /保留\n&lt;name&gt;/); assert.doesNotMatch(actionTag(html, 'package-content-save'), /disabled/); assert.equal(JSON.stringify(source), before);
  const editing = packageContentMarkup({...source, step: 'edit', contentStatus: 'error'}); assert.match(editing, /value="  保留\n&lt;name&gt;  "/); assert.match(editing, /value="060"/); assert.match(actionTag(editing, 'package-content-review'), /disabled/);
});

test('new save limits allow exactly 50 segments and 200 raw name characters without imposing a quota conversion', () => {
  const rows = Array.from({length: 50}, (_, index) => ({id: `row-${index}`, name: '長'.repeat(200), minutes: '1440'}));
  assert.equal(validatePackageContentDraft({components: rows}).valid, true); assert.equal(validatePackageContentDraft({components: rows}).totalMinutes, 72000);
  const tooMany = validatePackageContentDraft({components: [...rows, {id: 'row-50', name: '51', minutes: '1'}]}); assert.equal(tooMany.valid, false); assert.equal(tooMany.errors.components, 'limit'); assert.equal(tooMany.totalMinutes, null);
  const tooLong = validatePackageContentDraft({components: [{id: 'one', name: '長'.repeat(201), minutes: '1'}]}); assert.equal(tooLong.valid, false); assert.equal(tooLong.errors.rows[0].name, 'length');
  const html = packageContentMarkup(readyState({step: 'edit', components: rows})); assert.match(html, /name="packageComponentName"[^>]*maxlength="200"/); assert.match(actionTag(html, 'package-content-add'), /disabled/);
});

test('a known save conflict exposes an enabled Reload and focusable explanation while preserving the Review draft', () => {
  const source = readyState({step: 'review', stale: true, saveError: 'Someone changed these contents. Reload to check them.', sourceError: ''}), before = JSON.stringify(source), html = packageContentMarkup(source);
  assert.match(html, /data-step="review"/); assert.match(html, /id="package-content-save-error"[^>]*role="alert"[^>]*tabindex="-1"[^>]*>Someone changed these contents/);
  assert.ok(actionTag(html, 'package-content-refresh')); assert.doesNotMatch(actionTag(html, 'package-content-refresh'), /disabled/); assert.match(actionTag(html, 'package-content-save'), /disabled/); assert.match(html, /90 minutes/); assert.equal(JSON.stringify(source), before);
  assert.match(packageContentMarkup({...source, saveError: ''}), /have changed/);
});

test('clearing an existing saved package is explicit in Review but an unset empty package cannot be saved', () => {
  assert.deepEqual(validatePackageContentDraft({components: [], allowEmpty: true}), {valid: true, components: [], errors: {}, totalMinutes: 0});
  assert.equal(validatePackageContentDraft({components: [], allowEmpty: 'true'}).valid, false); assert.equal(validatePackageContentDraft({components: null, allowEmpty: true}).valid, false);
  const source = readyState({step: 'review', components: []}), html = packageContentMarkup(source);
  assert.match(html, /data-step="review"/); assert.match(html, /All saved contents will be cleared/); assert.doesNotMatch(actionTag(html, 'package-content-save'), /disabled/); assert.doesNotMatch(html, />0 minutes<|0 visits|Remaining balance/); assert.match(html, /1080 minutes/);
  const empty = packageContentMarkup({...source, savedContents: savedContents({version: 0, components: [], updatedAt: null})}); assert.match(empty, /data-step="edit"/); assert.equal(actionTag(empty, 'package-content-save'), undefined);
  const ack = savedContents({version: 4, components: []}), saved = packageContentMarkup({...source, step: 'saved', savedContents: ack, saveAck: ack}); assert.match(saved, /id="package-content-saved"/); assert.match(saved, /All saved contents have been cleared/); assert.doesNotMatch(saved, />0 minutes<|Contents have not been saved/);
});

test('component IDs follow the same 200-character boundary as the service without trimming or replacing them', () => {
  assert.equal(validatePackageContentDraft({components: [{id: 'x'.repeat(200), name: 'Segment', minutes: '1'}]}).valid, true);
  const result = validatePackageContentDraft({components: [{id: 'x'.repeat(201), name: 'Segment', minutes: '1'}]}); assert.equal(result.valid, false); assert.equal(result.errors.rows[0].id, 'id'); assert.equal(result.components[0].id.length, 201);
});
