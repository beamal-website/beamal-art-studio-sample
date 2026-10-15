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
  assert.match(html, /<button type="submit"[^>]*disabled[^>]*>Save contents<\/button>/);
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
