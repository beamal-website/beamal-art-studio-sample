import test from 'node:test';
import assert from 'node:assert/strict';
import { schedulingResourcesMarkup, schedulingResourceEditorMarkup } from '../client/scheduling-resources-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ui = language => ({ t: (zh, en) => language === 'en' ? en : zh, esc });
const teacher = { id: 'teacher-a', kind: 'teacher', displayName: 'Fictional teacher A', active: true, representativeColor: '#ABCDEF', version: 4 };
const tagById = (html, id) => html.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`))?.[0] || '';

test('teacher editor opens the stored representative colour with a separate enable checkbox', () => {
  for (const language of ['zh', 'en']) {
    const html = schedulingResourceEditorMarkup({ kind: 'teacher', record: teacher, canEdit: true }, ui(language));
    assert.match(tagById(html, 'resource-color-enabled'), /name="useRepresentativeColor" checked/);
    assert.match(tagById(html, 'resource-representative-color'), /type="color" name="representativeColor" value="#abcdef"/);
    assert.doesNotMatch(tagById(html, 'resource-representative-color'), /disabled/);
    assert.match(html, /data-resource-id="teacher-a" data-resource-kind="teacher" data-version="4"/);
    assert.match(html, language === 'en' ? /Representative colour/ : /老師代表色/);
  }
});

test('unset and invalid representative colours remain unchecked with a disabled neutral picker', () => {
  for (const record of [null, { ...teacher, representativeColor: null }, { ...teacher, representativeColor: '#abc;display:none' }]) {
    const html = schedulingResourceEditorMarkup({ kind: 'teacher', record, canEdit: true }, ui('en'));
    assert.doesNotMatch(tagById(html, 'resource-color-enabled'), /checked/);
    assert.match(tagById(html, 'resource-representative-color'), /value="#27777b"[^>]* disabled/);
    assert.doesNotMatch(html, /display:none/);
  }
});

test('readonly and pending editors keep colour controls and save locked', () => {
  for (const state of [{ canEdit: false, busy: false }, { canEdit: true, busy: true }]) {
    const html = schedulingResourceEditorMarkup({ kind: 'teacher', record: teacher, ...state }, ui('en'));
    assert.match(html, /<fieldset class="resource-editor-fields" disabled/);
    assert.match(tagById(html, 'resource-representative-color'), /disabled/);
    assert.match(tagById(html, 'resource-editor-save'), /disabled/);
    if (state.busy) assert.equal((html.match(/data-action="resource-editor-cancel"[^>]* disabled/g) || []).length, 2);
  }
});

test('teacher list renders an encoded colour sample or an explicit unset label', () => {
  const html = schedulingResourcesMarkup({ kind: 'teacher', resources: [teacher, { ...teacher, id: 'teacher-b', displayName: '<Teacher B>', representativeColor: null }], canEdit: false }, ui('en'));
  assert.match(html, /<th scope="col">Representative colour<\/th>/);
  assert.match(html, /resource-list-teacher-colour/);
  assert.match(html, /--teacher-colour:#abcdef/);
  assert.match(html, /#abcdef/);
  assert.match(html, /Unset/);
  assert.match(html, /&lt;Teacher B&gt;/);
  assert.doesNotMatch(html, /<Teacher B>/);
  assert.equal((html.match(/data-action="resource-edit"[^>]* disabled/g) || []).length, 2);
});

test('rooms keep all existing metadata fields and never receive a teacher colour control or column', () => {
  const room = { id: 'room-a', displayName: 'Room A', kind: 'room', representativeColor: '#123456', capacity: 12, detail: 'Detail', remark: 'Remark', externalLocation: true, version: 2 };
  const editor = schedulingResourceEditorMarkup({ kind: 'room', record: room, canEdit: true }, ui('en'));
  for (const name of ['capacity', 'detail', 'remark', 'externalLocation']) assert.match(editor, new RegExp(`name="${name}"`));
  assert.doesNotMatch(editor, /representativeColor|resource-color-enabled|resource-representative-color|Representative colour/);
  const table = schedulingResourcesMarkup({ kind: 'room', resources: [room] }, ui('en'));
  assert.match(table, /Capacity/);
  assert.doesNotMatch(table, /Representative colour|teacher-colour|#123456/);
});

test('staff editor exposes teaching eligibility separately from active state and preserves a revoked setting',()=>{
 for(const language of ['zh','en']){const html=schedulingResourceEditorMarkup({kind:'teacher',record:{...teacher,teachingAllowed:false},canEdit:true},ui(language));assert.match(html,/name="teachingAllowed"/);assert.doesNotMatch(tagById(html,'resource-teaching-allowed'),/checked/);assert.match(html,language==='en'?/Allowed to teach/:/獲准授課/);}
 assert.doesNotMatch(schedulingResourceEditorMarkup({kind:'room',canEdit:true},ui('en')),/name="teachingAllowed"/);
});
