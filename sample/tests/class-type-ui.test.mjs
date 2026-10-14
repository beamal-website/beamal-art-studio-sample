import test from 'node:test';
import assert from 'node:assert/strict';
import { classTypeName, classTypeSelectionMarkup, classTypeDetailsMarkup, classTypesManagerMarkup, classTypeEditorMarkup } from '../client/class-type-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ui = language => ({ t: (zh, en) => language === 'en' ? en : zh, esc });
const regular = { id: 'type-regular', kind: 'regular', name: 'Regular Class', studentReschedulingAllowed: null, active: true, version: 1 };
const special = { id: 'type-special', kind: 'special', name: 'Special Class', studentReschedulingAllowed: null, active: true, version: 1 };
const custom = { id: 'type-art', kind: 'custom', name: 'Art workshop', studentReschedulingAllowed: true, active: true, version: 3 };
const inactive = { id: 'type-old', kind: 'custom', name: 'Old workshop', studentReschedulingAllowed: false, active: false, version: 5 };
const types = [regular, special, custom, inactive];
const tagById = (html, id) => html.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`))?.[0] || '';

test('only unchanged builtin seed names are localized while renamed and custom names remain plaintext', () => {
  assert.equal(classTypeName(regular, ui('en')), 'Regular Class');
  assert.equal(classTypeName(regular, ui('zh')), '常規課堂');
  assert.equal(classTypeName(special, ui('zh')), '特別課堂');
  assert.equal(classTypeName({ ...regular, name: 'Regular art club' }, ui('zh')), 'Regular art club');
  assert.equal(classTypeName({ ...custom, name: 'Regular Class' }, ui('zh')), 'Regular Class');
  assert.equal(classTypeName({ ...custom, name: '<Named class>' }, ui('en')), '<Named class>');
});

test('details preserve explicit three-state rules and never infer Special means prohibited', () => {
  for (const language of ['zh', 'en']) {
    const unknown = classTypeDetailsMarkup(special, ui(language));
    assert.match(unknown, /data-class-type-policy="unknown"/);
    assert.match(unknown, language === 'en' ? /Not set/ : /尚未設定/);
    assert.doesNotMatch(unknown, /data-class-type-policy="disallowed"|Full|teacher-colour/);
    assert.match(classTypeDetailsMarkup({ ...special, studentReschedulingAllowed: true }, ui(language)), /data-class-type-policy="allowed"/);
    assert.match(classTypeDetailsMarkup({ ...regular, studentReschedulingAllowed: false }, ui(language)), /data-class-type-policy="disallowed"/);
    assert.match(classTypeDetailsMarkup(null, ui(language)), /data-class-type-policy="unknown"/);
    assert.match(classTypeDetailsMarkup({ ...special, studentReschedulingAllowed: 'no' }, ui(language)), /data-class-type-policy="unknown"/);
  }
});

test('course selection defaults to no type or its actual course default and offers active ids once', () => {
  const empty = classTypeSelectionMarkup({ types, mode: 'course' }, ui('en'));
  assert.match(empty, /name="classTypeId" aria-label="Class type"/);
  assert.match(empty, /<option value="" selected>/);
  assert.doesNotMatch(empty, /value="__inherit"|value="__keep"|value="type-old"/);
  const chosen = classTypeSelectionMarkup({ types: [...types, custom], mode: 'course', courseDefaultId: custom.id }, ui('zh'));
  assert.match(chosen, /<option value="type-art" selected>/);
  assert.equal((chosen.match(/<option value="type-art"/g) || []).length, 1);
  assert.match(chosen, /aria-label="課堂類型"/);
  assert.match(chosen, /data-class-type-summary/);
});

test('new schedule inherits the frozen course default rather than silently selecting Regular', () => {
  const html = classTypeSelectionMarkup({ types, mode: 'schedule-create', courseDefaultId: custom.id }, ui('en'));
  assert.match(html, /<option value="__inherit" selected>/);
  assert.match(html, /Use course default/);
  assert.match(html, /Art workshop/);
  assert.match(html, /data-class-type-policy="allowed"/);
  assert.doesNotMatch(html, /<option value="type-regular" selected>/);
  const noDefault = classTypeSelectionMarkup({ types, mode: 'schedule-create' }, ui('en'));
  assert.match(noDefault, /<option value="__inherit" selected>/);
  assert.match(noDefault, /No class type/);
  assert.match(noDefault, /data-class-type-policy="unknown"/);
});

test('editing retains the historical snapshot even when its current catalogue policy differs or is inactive', () => {
  const snapshot = { id: inactive.id, kind: 'custom', name: 'Original workshop', studentReschedulingAllowed: true, version: 2 };
  const html = classTypeSelectionMarkup({ types, current: snapshot, mode: 'schedule-edit', courseDefaultId: special.id }, ui('en'));
  assert.match(html, /<option value="__keep" selected>/);
  assert.match(html, /Keep current type and rules/);
  assert.match(html, /Original workshop/);
  assert.match(html, /data-class-type-policy="allowed"/);
  assert.doesNotMatch(html, /data-class-type-policy="disallowed"/);
  const oldUnassigned = classTypeSelectionMarkup({ types, current: null, mode: 'schedule-edit', courseDefaultId: custom.id }, ui('en'));
  assert.match(oldUnassigned, /<option value="__keep" selected>/);
  assert.match(oldUnassigned, /data-class-type-policy="unknown"/);
});

test('inactive selected type is visible as disabled history while a deliberate blank selection clears the type', () => {
  const historical = classTypeSelectionMarkup({ types, mode: 'course', courseDefaultId: inactive.id }, ui('en'));
  assert.match(historical, /<option value="type-old" selected disabled>/);
  assert.match(historical, /Inactive/);
  const cleared = classTypeSelectionMarkup({ types, current: custom, mode: 'schedule-edit', selected: '' }, ui('en'));
  assert.match(cleared, /<option value="" selected>/);
  assert.match(cleared, /data-class-type-policy="unknown"/);
  const changed = classTypeSelectionMarkup({ types, current: custom, mode: 'schedule-edit', selected: special.id }, ui('en'));
  assert.match(changed, /<option value="type-special" selected>/);
  assert.match(changed, /data-class-type-policy="unknown"/);
});

test('selection and details escape names and ids without rewriting the supplied catalogue or snapshots', () => {
  const unsafe = { ...custom, id: 'id" onclick="bad', name: '<script>name()</script>' }, before = JSON.stringify(unsafe);
  const html = classTypeSelectionMarkup({ types: [unsafe], mode: 'course', selected: unsafe.id }, ui('en')) + classTypeDetailsMarkup(unsafe, ui('en'));
  assert.match(html, /value="id&quot; onclick=&quot;bad" selected/);
  assert.match(html, /&lt;script&gt;name\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>|onclick="bad/);
  assert.equal(JSON.stringify(unsafe), before);
});

test('manager includes active and inactive settings with create, edit and close actions', () => {
  const html = classTypesManagerMarkup({ types }, ui('en'));
  assert.match(html, /id="class-types-manager"/);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /class="dialog class-types-manager-dialog" tabindex="-1"/);
  assert.match(html, /data-action="class-type-new"/);
  for (const type of types) assert.match(html, new RegExp(`data-class-type-edit="${type.id}"`));
  assert.match(html, /Inactive/);
  assert.match(html, /Not set/);
  assert.match(html, /data-action="class-types-close"/);
  assert.doesNotMatch(html, /Delete|password|Full|teacher-colour/);
});

test('manager failure and busy states remain distinct from an empty successful catalogue', () => {
  assert.match(classTypesManagerMarkup({}, ui('en')), /No class types yet/);
  const failed = classTypesManagerMarkup({ error: 'Types <unavailable>' }, ui('en'));
  assert.match(failed, /role="alert"[^>]*>Types &lt;unavailable&gt;/);
  assert.doesNotMatch(failed, /No class types yet/);
  const busy = classTypesManagerMarkup({ types, busy: true }, ui('en'));
  assert.match(busy, /aria-busy="true"/);
  assert.match(busy, /data-action="class-type-new" disabled/);
  assert.equal((busy.match(/data-class-type-edit="[^"]+" disabled/g) || []).length, 4);
  assert.equal((busy.match(/data-action="class-types-close"[^>]* disabled/g) || []).length, 2);
});

test('new editor offers an explicit unknown rule without presuming a Special denial', () => {
  const html = classTypeEditorMarkup({}, ui('en'));
  assert.match(html, /<form id="class-type-editor" data-id="" data-version=""/);
  assert.match(html, /name="name" maxlength="200"[^>]+required/);
  assert.match(html, /name="studentReschedulingAllowed"/);
  assert.match(html, /<option value="" selected>Not set<\/option>/);
  assert.match(html, /<option value="yes">Allowed<\/option>/);
  assert.match(html, /<option value="no">Not allowed<\/option>/);
  assert.match(html, /type="checkbox" name="active" checked/);
  assert.match(html, /id="class-type-save"/);
  assert.match(html, /id="class-type-error"/);
  assert.doesNotMatch(html, /name="kind"|type="password"|type="file"/);
});

test('editor preserves opened identity, version and every explicit tri-state value', () => {
  for (const [value, expected] of [[null, ''], [true, 'yes'], [false, 'no']]) {
    const html = classTypeEditorMarkup({ current: { ...custom, active: false, studentReschedulingAllowed: value } }, ui('en'));
    assert.match(html, /data-id="type-art" data-version="3"/);
    assert.match(html, new RegExp(`<option value="${expected}" selected>`));
    assert.doesNotMatch(html, /type="checkbox" name="active" checked/);
  }
});

test('busy editor keeps inputs, save and cancellation locked while preserving escaped draft values', () => {
  const html = classTypeEditorMarkup({ current: { ...custom, name: 'Type <A>' }, busy: true, error: 'Save <conflict>' }, ui('en'));
  assert.match(html, /<fieldset class="class-type-editor-fields" disabled/);
  assert.match(html, /value="Type &lt;A&gt;"/);
  assert.match(html, /role="alert"[^>]*>Save &lt;conflict&gt;/);
  assert.match(tagById(html, 'class-type-save'), /disabled/);
  assert.equal((html.match(/data-action="class-type-cancel"[^>]* disabled/g) || []).length, 2);
  assert.match(html, /aria-busy="true"/);
});

test('legal custom names that match a translated seed remain distinguishable without changing ids or stored names', () => {
  const matchingCustom = { ...custom, id: 'type-local-name', name: '常規課堂', studentReschedulingAllowed: null };
  const html = classTypeSelectionMarkup({ types: [regular, matchingCustom], mode: 'course' }, ui('zh'));
  const regularLabel = html.match(/<option value="type-regular">([^<]+)<\/option>/)?.[1];
  const customLabel = html.match(/<option value="type-local-name">([^<]+)<\/option>/)?.[1];
  assert.notEqual(regularLabel, customLabel);
  assert.match(regularLabel, /常規課堂/);
  assert.match(customLabel, /常規課堂/);
  assert.equal(classTypeName(matchingCustom, ui('zh')), '常規課堂');
  const manager = classTypesManagerMarkup({ types: [regular, matchingCustom] }, ui('zh'));
  assert.match(manager, /常規類型/);
  assert.match(manager, /自訂類型/);
  const english = classTypeSelectionMarkup({ types: [regular, matchingCustom], mode: 'course' }, ui('en'));
  assert.match(english, /<option value="type-regular">Regular Class<\/option>/);
  assert.match(english, /<option value="type-local-name">常規課堂<\/option>/);
});

test('catalogue read failures offer a bilingual reload action, keep saved data visible, and lock duplicate retries while busy', () => {
  for (const language of ['zh', 'en']) {
    const failed = classTypesManagerMarkup({ error: 'Read failed' }, ui(language));
    assert.match(failed, /<button type="button"[^>]+data-action="class-types-refresh"/);
    assert.match(failed, language === 'en' ? />Reload<\/button>/ : />重新載入<\/button>/);
    assert.doesNotMatch(failed, /data-action="class-types-refresh" disabled/);
    const saved = classTypesManagerMarkup({ types: [custom], error: 'Refresh failed' }, ui(language));
    assert.match(saved, /Art workshop/);
    assert.match(saved, /data-class-type-edit="type-art"/);
    assert.match(saved, /data-action="class-types-refresh"/);
    const retrying = classTypesManagerMarkup({ error: 'Read failed', busy: true }, ui(language));
    assert.match(retrying, /data-action="class-types-refresh" disabled/);
    assert.doesNotMatch(classTypesManagerMarkup({ types }, ui(language)), /data-action="class-types-refresh"/);
  }
});
