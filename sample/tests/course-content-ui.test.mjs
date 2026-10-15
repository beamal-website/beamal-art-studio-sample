import test from 'node:test';
import assert from 'node:assert/strict';
import {courseContentPanelMarkup, courseContentEditorMarkup, readCourseContentDraft, validateCourseContentDraft, courseContentSourceKey} from '../client/course-content-ui.js';

const course = {id: 'course-a', version: 4, courseName: 'Creative explorers', category: 'Regular', level: 'Junior'};
const values = {descriptionZh: ' 從故事開始\n探索色彩。 ', descriptionEn: ' Explore colour\nthrough stories. ', minAgeYears: '2.5', maxAgeYears: '18'};
const zh = {t: chinese => chinese};

test('absent content opens a blank draft and raw draft values retain whitespace and line breaks', () => {
  assert.deepEqual(readCourseContentDraft(), {descriptionZh: '', descriptionEn: '', minAgeYears: '', maxAgeYears: ''});
  assert.deepEqual(readCourseContentDraft(null), readCourseContentDraft());
  assert.deepEqual(readCourseContentDraft(values), values);
  assert.deepEqual(readCourseContentDraft({descriptionEn: 'English only', minAgeYears: 2.5, maxAgeYears: null}), {descriptionZh: '', descriptionEn: 'English only', minAgeYears: '2.5', maxAgeYears: ''});
  assert.equal(readCourseContentDraft({minAgeYears: false}).minAgeYears, '');
});

test('typed source descriptions never become invented text while fractional numeric ages remain exact draft values', () => {
  const input = {descriptionZh: 42, descriptionEn: 0, minAgeYears: 2.5, maxAgeYears: 18};
  assert.deepEqual(readCourseContentDraft(input), {descriptionZh: '', descriptionEn: '', minAgeYears: '2.5', maxAgeYears: '18'});
  const html = courseContentEditorMarkup({course, role: 'admin', values: input});
  assert.match(html, /name="descriptionZh"[^>]*><\/textarea>/);
  assert.match(html, /name="descriptionEn"[^>]*><\/textarea>/);
  assert.match(html, /name="minAgeYears"[^>]*value="2.5"/);
  assert.doesNotMatch(html, />42<\/textarea>|>0<\/textarea>/);
  const strings = {descriptionZh: '42', descriptionEn: ' 0\n', minAgeYears: '2.50', maxAgeYears: ''};
  assert.deepEqual(readCourseContentDraft(strings), strings);
});

test('descriptions and each recommended age are independently optional without forcing bilingual or commercial age limits', () => {
  for (const input of [{}, {descriptionZh: '只有中文'}, {descriptionEn: 'English only'}, {minAgeYears: '2.5'}, {maxAgeYears: '18'}, {minAgeYears: '0', maxAgeYears: '0'}, {minAgeYears: '.5', maxAgeYears: '1.5'}, {minAgeYears: '200', maxAgeYears: '250'}]) {
    assert.deepEqual(validateCourseContentDraft(input), {values: readCourseContentDraft(input), error: '', field: ''});
  }
});

test('invalid or reversed ages return the exact raw draft and identify the field to correct', () => {
  for (const value of ['-1', ' ', ' 2.5 ', '2e1', 'Infinity', 'NaN', '+2', '2.', 'one', '12345678901234567']) {
    const input = {...values, minAgeYears: value};
    assert.deepEqual(validateCourseContentDraft(input), {values: input, error: 'age', field: 'minAgeYears'});
  }
  assert.deepEqual(validateCourseContentDraft({...values, maxAgeYears: '-1'}), {values: {...values, maxAgeYears: '-1'}, error: 'age', field: 'maxAgeYears'});
  assert.deepEqual(validateCourseContentDraft({...values, minAgeYears: '18', maxAgeYears: '2.5'}), {values: {...values, minAgeYears: '18', maxAgeYears: '2.5'}, error: 'range', field: 'maxAgeYears'});
});

test('description engineering limits do not silently truncate the original draft', () => {
  const max = '字'.repeat(10000), tooLong = max + '字';
  assert.equal(validateCourseContentDraft({descriptionZh: max}).error, '');
  for (const field of ['descriptionZh', 'descriptionEn']) {
    const result = validateCourseContentDraft({[field]: tooLong});
    assert.equal(result.error, 'description');
    assert.equal(result.field, field);
    assert.equal(result.values[field], tooLong);
  }
});

test('General panel reports unknown saved content and never borrows legacy ages descriptions or Fee durations', () => {
  const source = {...course, age: '8–14', description: 'LEGACY DESCRIPTION', duration: 60, fees: [{duration: 90, packageTotal: 720}], content: undefined};
  const html = courseContentPanelMarkup(source, {role: 'admin'});
  assert.match(html, /Course content/);
  assert.match(html, /Course descriptions and recommended ages have not been provided/);
  assert.match(html, /data-action="course-content-open"[^>]*data-course-id="course-a"/);
  assert.doesNotMatch(html, /8–14|LEGACY DESCRIPTION|60 minutes|90 minutes|720|No age restriction|All ages/);
  assert.equal(courseContentPanelMarkup(source, {role: 'public'}), '');
});

test('only valid canonical content displays readable descriptions and optional recommended ages, without eligibility controls', () => {
  const source = {...course, content: {...values, minAgeYears: 2.5, maxAgeYears: 18}};
  for (const role of ['admin', 'teacher', 'public']) {
    const html = courseContentPanelMarkup(source, {role});
    assert.match(html, /Explore colour\nthrough stories/);
    assert.match(html, /2\.5–18 years/);
    assert.match(html, /Recommended age/);
    assert.equal(html.includes('data-action="course-content-open"'), role === 'admin');
    assert.doesNotMatch(html, /Book now|Eligibility|type="checkbox"|Publish/);
  }
  assert.equal(courseContentPanelMarkup(source, {role: 'student'}), '');
  assert.match(courseContentPanelMarkup({...course, content: {minAgeYears: 0, maxAgeYears: 18}}), /0–18 years/);
  assert.match(courseContentPanelMarkup({...course, content: {minAgeYears: 2.5}}), /2\.5 years and above/);
  assert.match(courseContentPanelMarkup({...course, content: {maxAgeYears: 18}}), /Up to 18 years/);
});

test('invalid canonical content stays unknown, including incompatible fields and unvalidated values', () => {
  for (const content of [null, [], 'text', {descriptionEn: 42}, {minAgeYears: -1}, {minAgeYears: 18, maxAgeYears: 3}, {...values, duration: 90}, {descriptionEn: 'x'.repeat(10001)}]) {
    const html = courseContentPanelMarkup({...course, content}, {role: 'teacher'});
    assert.match(html, /Course descriptions and recommended ages have not been provided/);
    assert.doesNotMatch(html, /18–3|42|90 minutes|No age restriction/);
    assert.equal(courseContentPanelMarkup({...course, content}, {role: 'public'}), '');
  }
  assert.equal(courseContentPanelMarkup({...course, content: {}}, {role: 'public'}), '');
});

test('source errors hide canonical details and mutation entry while preserving a safe panel error', () => {
  const html = courseContentPanelMarkup({...course, content: values}, {role: 'admin', sourceError: 'Course <unavailable>'});
  assert.match(html, /Course &lt;unavailable&gt;/);
  assert.doesNotMatch(html, /Explore colour|2\.5–18|course-content-open/);
  assert.equal(courseContentPanelMarkup({...course, content: values}, {role: 'public', sourceError: 'PRIVATE ERROR'}), '');
  assert.doesNotMatch(courseContentPanelMarkup({...course, deletedAt: '2026-10-16'}, {role: 'admin'}), /course-content-open/);
});

test('admin edit has natural optional fields, keyboard-scrolling body and raw values without enabling final saving', () => {
  const html = courseContentEditorMarkup({course, role: 'admin', values});
  assert.match(html, /<form id="course-content-editor"[^>]*novalidate/);
  assert.match(html, /id="course-content-body"[^>]*tabindex="0"/);
  assert.match(html, /name="descriptionZh"[^>]*maxlength="10000"/);
  assert.match(html, /name="descriptionEn"[^>]*maxlength="10000"/);
  assert.match(html, /name="minAgeYears"[^>]*value="2.5"/);
  assert.match(html, /name="maxAgeYears"[^>]*value="18"/);
  assert.match(html, /data-action="course-content-review"/);
  assert.match(html, /<button type="submit" id="course-content-review"/);
  assert.match(html, /Contents have not been saved/);
  assert.doesNotMatch(html, /required|data-action="publish"|Save complete|Saved successfully/);
});

test('review is explicitly an unpublished preview with the same draft, Back and an enabled final Save', () => {
  const html = courseContentEditorMarkup({course, role: 'admin', step: 'review', values});
  assert.match(html, /data-step="review"/);
  assert.match(html, /Preview \(not published\)/);
  assert.match(html, /Explore colour\nthrough stories/);
  assert.match(html, /2\.5–18 years/);
  assert.match(html, /data-action="course-content-back"/);
  assert.match(html, /<button type="submit" id="course-content-save">Save contents<\/button>/);
  assert.doesNotMatch(html, /<textarea|Published successfully|Contents saved/);
});

test('bad age review returns editable raw values and a localized actionable field error', () => {
  const input = {...values, minAgeYears: '18', maxAgeYears: '2.5'};
  const html = courseContentEditorMarkup({course, role: 'admin', step: 'review', values: input}, zh);
  assert.match(html, /data-step="edit"/);
  assert.match(html, /name="minAgeYears"[^>]*value="18"/);
  assert.match(html, /name="maxAgeYears"[^>]*value="2.5"[^>]*aria-invalid="true"/);
  assert.match(html, /id="course-content-error"[^>]*role="alert"[^>]*tabindex="-1"/);
  assert.match(html, /上限不可低於下限/);
  assert.doesNotMatch(html, /course-content-back|18–2.5/);
});

test('source retry and loading preserve drafts, block progression and leave Close available', () => {
  const html = courseContentEditorMarkup({course, role: 'admin', step: 'review', values, sourceError: 'Read failed', loading: true});
  assert.match(html, /data-step="edit"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /name="minAgeYears"[^>]*value="2.5"/);
  assert.doesNotMatch(html, /<textarea[^>]*disabled|name="minAgeYears"[^>]*disabled/);
  assert.match(html, /id="course-content-source-error"[^>]*role="alert"[^>]*tabindex="-1"/);
  assert.match(html, /id="course-content-refresh"[^>]*data-action="course-content-refresh"[^>]*disabled/);
  assert.match(html, /data-action="course-content-review"[^>]*disabled/);
  assert.doesNotMatch(html, /data-action="course-content-close"[^>]*disabled/);
  const stale = courseContentEditorMarkup({course, role: 'admin', step: 'review', values, stale: true});
  assert.match(stale, /Course details have changed/);
  assert.match(stale, /data-action="course-content-review"[^>]*disabled/);
});

test('editor and source key reject missing identity, nonpositive versions, deleted courses and non-admin roles', () => {
  for (const invalid of [null, {...course, id: ''}, {...course, version: 0}, {...course, version: '4'}, {...course, deletedAt: '2026-10-16'}]) {
    assert.equal(courseContentEditorMarkup({course: invalid, role: 'admin', values}), '');
    assert.equal(courseContentSourceKey(invalid), '');
  }
  for (const role of ['teacher', 'student', 'public', undefined]) assert.equal(courseContentEditorMarkup({course, role, values}), '');
});

test('source keys distinguish current course identity version deletion and canonical content without borrowing legacy data', () => {
  const source = {...course, content: values}, key = courseContentSourceKey(source);
  assert.ok(key.length > 0);
  for (const patch of [{id: 'course-b'}, {version: 5}, {content: {...values, descriptionEn: 'Changed'}}, {content: {...values, minAgeYears: '3'}}]) assert.notEqual(courseContentSourceKey({...source, ...patch}), key);
  assert.equal(courseContentSourceKey({...source, age: '3–18', duration: 60, fee: {packageTotal: 720}}), key);
  assert.equal(courseContentSourceKey({...course, content: undefined}), courseContentSourceKey(course));
});

test('both languages escape content names, description markup, age input and supplied errors without changing the draft', () => {
  const source = {...course, courseName: 'Art & <print>'}, draft = {...values, descriptionZh: '<script>bad()</script>\n中文', descriptionEn: '</textarea><img src=x>', minAgeYears: '" autofocus="yes'}, before = JSON.stringify({source, draft});
  for (const context of [{}, zh]) {
    const html = courseContentEditorMarkup({course: source, role: 'admin', values: draft, error: '<b>Fix & retry</b>'}, context);
    assert.match(html, /Art &amp; &lt;print&gt;/);
    assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
    assert.match(html, /&lt;\/textarea&gt;&lt;img src=x&gt;/);
    assert.match(html, /&quot; autofocus=&quot;yes/);
    assert.match(html, /&lt;b&gt;Fix &amp; retry&lt;\/b&gt;/);
    assert.doesNotMatch(html, /<script>|<img|<b>|" autofocus="/);
  }
  assert.match(courseContentPanelMarkup(course, {role: 'teacher'}, zh), /課程內容/);
  assert.equal(JSON.stringify({source, draft}), before);
});

test('public canonical content has no dependency on internal course versions and source hooks exist while hidden', () => {
  const html = courseContentPanelMarkup({id: 'public-course', courseName: 'Drawing', content: {descriptionEn: 'Public supplied content', minAgeYears: 2.5}}, {role: 'public'});
  assert.match(html, /Public supplied content/);
  assert.match(html, /2.5 years and above/);
  assert.doesNotMatch(html, /course-content-open/);
  const editor = courseContentEditorMarkup({course, role: 'admin', values});
  assert.match(editor, /id="course-content-source-error"[^>]*hidden/);
  assert.match(editor, /id="course-content-refresh"[^>]*hidden/);
});

test('public descriptions use the visitor language, fall back to available text and never list empty language rows', () => {
  const source = {id: 'public-course', content: {descriptionZh: '中文課程介紹', descriptionEn: 'English course introduction', minAgeYears: 2.5}};
  const chinese = courseContentPanelMarkup(source, {role: 'public'}, zh);
  assert.match(chinese, /中文課程介紹/);
  assert.doesNotMatch(chinese, /English course introduction|英文介紹|未提供/);
  const english = courseContentPanelMarkup(source, {role: 'public'});
  assert.match(english, /English course introduction/);
  assert.doesNotMatch(english, /中文課程介紹|Description \(Chinese\)|Not provided/);
  const englishFallback = courseContentPanelMarkup({...source, content: {...source.content, descriptionZh: ''}}, {role: 'public'}, zh);
  assert.match(englishFallback, /<p lang="en">English course introduction<\/p>/);
  assert.doesNotMatch(englishFallback, /未提供/);
  const chineseFallback = courseContentPanelMarkup({...source, content: {...source.content, descriptionEn: ''}}, {role: 'public'});
  assert.match(chineseFallback, /<p lang="zh-Hant">中文課程介紹<\/p>/);
  assert.doesNotMatch(chineseFallback, /Not provided/);
  const ageOnly = courseContentPanelMarkup({id: source.id, content: {minAgeYears: 0}}, {role: 'public'});
  assert.match(ageOnly, /0 years and above/);
  assert.doesNotMatch(ageOnly, /<p|Description|Not provided/);
});

test('empty internal course content is one compact truthful message above daily schedule rather than three empty facts', () => {
  for (const content of [undefined, null, {}, {descriptionZh: '', descriptionEn: ' ', minAgeYears: '', maxAgeYears: ''}]) {
    for (const [context, message] of [[{}, 'Course descriptions and recommended ages have not been provided.'], [zh, '課程介紹及建議年齡尚未提供。']]) {
      const html = courseContentPanelMarkup({...course, content}, {role: 'admin'}, context);
      assert.ok(html.includes(message));
      assert.match(html, /<h2>/);
      assert.match(html, /data-action="course-content-open"/);
      assert.equal((html.match(/<p\b/g) || []).length, 1);
      assert.doesNotMatch(html, /<h3\b|<dl\b|<dt\b|<dd\b/);
    }
    assert.equal(courseContentPanelMarkup({...course, content}, {role: 'public'}), '');
  }
  const partial = courseContentPanelMarkup({...course, content: {descriptionEn: 'Existing course description'}}, {role: 'teacher'});
  assert.match(partial, /Existing course description/);
  assert.match(partial, /<h3\b/);
  assert.doesNotMatch(partial, /Course descriptions and recommended ages have not been provided/);
});

test('identified field errors appear immediately below that field and outside its accessible label', () => {
  for (const [field, draft, error] of [
    ['maxAgeYears', {...values, minAgeYears: '6', maxAgeYears: '2.5'}, 'range'],
    ['minAgeYears', {...values, minAgeYears: '-1'}, 'age'],
    ['descriptionEn', {...values, descriptionEn: 'x'.repeat(10001)}, 'description'],
  ]) {
    const html = courseContentEditorMarkup({course, role: 'admin', values: draft, error, field});
    assert.equal((html.match(/id="course-content-error"/g) || []).length, 1);
    assert.match(html, new RegExp(`data-course-content-field="${field}"[\\s\\S]*?name="${field}"[^>]*aria-describedby="course-content-error"[\\s\\S]*?<\\/label><p id="course-content-error"[^>]*role="alert"`));
    const label = html.match(new RegExp(`<label for="course-content-${field}">[\\s\\S]*?<\\/label>`))[0];
    assert.doesNotMatch(label, /id="course-content-error"|role="alert"/);
    assert.ok(html.indexOf('id="course-content-error"') > html.indexOf(`name="${field}"`));
  }
  const general = courseContentEditorMarkup({course, role: 'admin', values, error: 'Please try again'});
  assert.match(general, /id="course-content-error"[^>]*>Please try again<\/p>/);
  assert.ok(general.indexOf('id="course-content-error"') < general.indexOf('class="course-content-fields"'));
});

test('source failure and Retry stay outside the scrolling form so a bottom-field correction does not hide recovery', () => {
  const html = courseContentEditorMarkup({course, role: 'admin', values, sourceError: 'Course read failed'});
  const headerEnd = html.indexOf('</header>'), formStart = html.indexOf('<form id="course-content-editor"'), bodyStart = html.indexOf('id="course-content-body"');
  for (const id of ['course-content-source-error', 'course-content-refresh']) {
    const position = html.indexOf(`id="${id}"`);
    assert.ok(position > headerEnd && position < formStart, `${id} stays between header and form`);
    assert.equal(html.slice(bodyStart).includes(`id="${id}"`), false);
  }
  assert.match(html, /name="descriptionZh"/);
  assert.doesNotMatch(html, /<textarea[^>]*disabled/);
});


test('saving content blocks repeated submission and editor exits while the server acknowledgement is pending',()=>{
 const html=courseContentEditorMarkup({course,role:'admin',step:'review',values,saving:true});
 assert.match(html,/aria-busy="true"/);assert.match(html,/id="course-content-save" disabled>Saving/);assert.match(html,/data-action="course-content-back" disabled/);assert.match(html,/data-action="course-content-close" disabled/);assert.doesNotMatch(html,/Saving course contents is not available yet/);
});
