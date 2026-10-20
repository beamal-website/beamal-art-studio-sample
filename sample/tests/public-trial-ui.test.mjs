import test from 'node:test';
import assert from 'node:assert/strict';
import * as trialUI from '../client/public-trial-ui.js';
const { createPublicTrialDraft, advancePublicTrial, publicTrialMarkup, publicTrialCanSubmit }=trialUI;

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ui = language => ({ t: (zh, en) => language === 'en' ? en : zh, esc });
const course = { id: 'course-second', courseName: 'Watercolour studio', category: 'Art', level: 'Beginner', remark: 'PRIVATE_COURSE', studentIds: ['private-student'] };
const slot = { id: 'slot-second', courseId: course.id, date: '2026-11-04', time: '15:30', duration: 45, teacherNames: ['Teacher Two'], roomNames: ['Studio Two'], remark: 'PRIVATE_SLOT', excludedStudentIds: ['private-excluded'] };
const create = () => createPublicTrialDraft({ course, slot, today: '2026-10-15' });
const fields = { localName: '  何悅晴 ', fullName: ' Chloe Fictional ', dateOfBirth: '2017-04-18', gender: 'female', school: ' School Two ', referrer: ' A friend ', parentName: ' Parent Two ', whatsapp: ' +852 0000 1234 ', email: ' parent@example.test ', remark: '  First line\nSecond line  ' };
const minimum = {localName: '陳小明', fullName: 'Ming Chan', dateOfBirth:'2018-01-02', gender: 'male', whatsapp: '+852 5555 1234'};
const button = (html, command) => html.match(new RegExp(`<button[^>]*data-command="${command}"[^>]*>`))?.[0] || '';

test('email and birthday corrections are next to the invalid input rather than below the whole form',()=>{
 for(const [key,value] of [['email','wrong'],['dateOfBirth','2027-01-01']]){
  const html=publicTrialMarkup(advancePublicTrial(create(),'review',{[key]:value}),ui('en'));
  const field=html.match(new RegExp(`<label[^>]*for="public-trial-${key}"[\\s\\S]*?<\\/label>`))?.[0]||'';
  assert.match(field,/aria-invalid="true"/);assert.match(field,/class="public-trial-field-error"/);assert.match(field,/role="alert"/);
  const described=field.match(/aria-describedby="([^"]+)"/)?.[1];assert.ok(described);assert.ok(field.includes(`id="${described}"`));
 }
});

test('trial draft starts blank for the exact public course and slot and snapshots only published facts', () => {
  const mutable = { ...slot, teacherNames: [...slot.teacherNames] }, state = createPublicTrialDraft({ course: { ...course }, slot: mutable, today: '2026-10-15' });
  assert.equal(state.publicCourse.id, course.id); assert.equal(state.slot.id, slot.id); assert.equal(state.step, 'details'); assert.equal(state.sourceStatus, 'ready');
  assert.deepEqual(Object.keys(state.draft).sort(), Object.keys(fields).sort()); assert.ok(Object.values(state.draft).every(value => value === ''));
  mutable.teacherNames[0] = 'Changed externally'; mutable.time = '20:00'; assert.deepEqual(state.slot.teacherNames, ['Teacher Two']); assert.equal(state.slot.time, '15:30');
  assert.doesNotMatch(JSON.stringify(state), /PRIVATE_|private-student|private-excluded|Chloe/);
  assert.equal(createPublicTrialDraft({ course, slot: { ...slot, courseId: 'wrong-course' }, today: '2026-10-15' }).sourceStatus, 'unavailable');
});

test('details show the selected public lesson and optional enrolment fields without a native input click trap', () => {
  const html = publicTrialMarkup(create(), ui('en'));
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="public-trial-title"/); assert.match(html, /class="dialog public-trial-dialog" tabindex="-1"/);
  assert.match(html, /<form id="public-trial-form"[^>]*>/); assert.doesNotMatch(html.match(/<form[^>]*>/)?.[0] || '', /data-action/);
  for (const name of Object.keys(fields)) assert.match(html, new RegExp(`name="${name}"`));
  for (const fact of ['Watercolour studio', '2026-11-04', '15:30', '45 minutes', 'Teacher Two']) assert.ok(html.includes(fact), fact);
  assert.match(button(html, 'review'), /data-action="public-trial-command"/); assert.doesNotMatch(button(html, 'review'), /disabled/);
  assert.match(html, /Trial applications are not yet open/); assert.doesNotMatch(html, /Chloe|PRIVATE_|type="hidden"|Application submitted|Demo|QA/);
});

test('draft merges preserve original strings and cannot replace canonical identities or source readiness', () => {
  const state = create(), changed = advancePublicTrial(state, 'draft', { ...fields, publicCourse: { id: 'wrong' }, slot: { id: 'wrong' }, sourceStatus: 'ready', today: '2099-01-01' });
  assert.deepEqual(changed.draft, fields); assert.deepEqual(changed.publicCourse, state.publicCourse); assert.deepEqual(changed.slot, state.slot); assert.equal(changed.today, state.today);
  const next = advancePublicTrial(changed, 'draft', { remark: '新備註' }); assert.equal(next.draft.fullName, fields.fullName); assert.equal(next.draft.remark, '新備註'); assert.equal(state.draft.remark, '');
});

test('review accepts optional blank fields and all ages but validates email and real nonfuture birth dates', () => {
  assert.equal(advancePublicTrial(create(), 'review', minimum).step, 'review');
  for (const value of ['2025-10-14', '1940-02-29', '2000-02-29']) assert.equal(advancePublicTrial(create(), 'review', { ...minimum, dateOfBirth: value }).step, 'review', value);
  for (const invalid of [{ email: 'wrong' }, { dateOfBirth: '2026-02-30' }, { dateOfBirth: '2026-10-16' }]) {
    const state = advancePublicTrial(create(), 'review', invalid); assert.equal(state.step, 'details'); assert.ok(state.error); assert.deepEqual(Object.fromEntries(Object.keys(invalid).map(key => [key, state.draft[key]])), invalid);
    assert.match(publicTrialMarkup(state, ui('en')), /role="alert"/);
  }
  const state = advancePublicTrial(create(), 'review', fields); assert.equal(state.step, 'review'); assert.deepEqual(state.draft, fields);
});

test('birth date displays an explicit as-of age without inventing a zero age when context is unavailable', () => {
  const state = advancePublicTrial(create(), 'draft', { dateOfBirth: '2017-04-18' }), html = publicTrialMarkup(state, ui('en'));
  assert.match(html, /9 years 5 months/); assert.match(html, /2026-10-15/);
  const birthday = publicTrialMarkup(advancePublicTrial(create(), 'draft', { dateOfBirth: '2017-10-15' }), ui('zh')); assert.match(birthday, /9 歲 0 個月/);
  const unknown = { ...state, today: '' }; assert.doesNotMatch(publicTrialMarkup(unknown, ui('en')), /0 years|9 years/); assert.equal(advancePublicTrial(unknown, 'review', {}).step, 'details');
});

test('review and Back preserve every typed value and the same lesson and final Submit remains disabled', () => {
  const review = advancePublicTrial(create(), 'review', fields), html = publicTrialMarkup(review, ui('en'));
  for (const [key, value] of Object.entries(fields)) if (key !== 'gender') assert.ok(html.includes(esc(value)), value); assert.match(html, /<dt>Gender<\/dt><dd>Female<\/dd>/); assert.match(html, /Watercolour studio/); assert.match(html, /2026-11-04/);
  assert.match(button(html, 'submit'), /disabled/); assert.match(button(html, 'back'), /data-action="public-trial-command"/); assert.ok(button(html, 'close'));
  const back = advancePublicTrial(review, 'back'); assert.equal(back.step, 'details'); assert.deepEqual(back.draft, fields); assert.deepEqual(back.slot, review.slot); assert.equal(back.error, '');
  for (const command of ['submit', 'complete', 'save', 'approve']) { const result = advancePublicTrial(review, command, { ...fields, slotId: 'wrong' }); assert.deepEqual(result, review); assert.doesNotMatch(publicTrialMarkup(result, ui('en')), /Application submitted|成功|Thank you/); }
});

test('source refresh states keep editable drafts while blocking both the visible and forged Review', () => {
  for (const sourceStatus of ['loading', 'error', 'unavailable']) {
    const state = { ...advancePublicTrial(create(), 'draft', fields), sourceStatus, error: 'RAW_PRIVATE_SOURCE_ERROR' }, html = publicTrialMarkup(state, ui('en'));
    assert.match(button(html, 'review'), /disabled/); assert.match(html, sourceStatus === 'loading' ? /Loading this time/ : sourceStatus === 'error' ? /Could not refresh this time/ : /This time is no longer available/);
    assert.doesNotMatch(html, /RAW_PRIVATE_SOURCE_ERROR/); assert.ok(button(html, 'close'));
    const changed = advancePublicTrial(state, 'draft', { email: 'fixed@example.test' }); assert.equal(changed.draft.email, 'fixed@example.test'); assert.equal(changed.draft.localName, fields.localName);
    const refused = advancePublicTrial(changed, 'review', {}); assert.equal(refused.step, 'details'); assert.equal(refused.sourceStatus, sourceStatus); assert.equal(refused.draft.email, 'fixed@example.test');
  }
});

test('the host source message is escaped and an unavailable identity cannot be revived through typed fields', () => {
  const state = { ...advancePublicTrial(create(), 'draft', fields), sourceStatus: 'error', sourceMessage: 'Please retry <this time>.' };
  const html = publicTrialMarkup(state, ui('en')); assert.match(html, /Please retry &lt;this time&gt;\./); assert.doesNotMatch(html, /<this time>/); assert.ok(button(html, 'retry'));
  const invalid = { ...state, sourceStatus: 'ready', slot: { ...state.slot, courseId: 'wrong-course' } };
  const result = advancePublicTrial(invalid, 'review', { ...fields, slot: slot, sourceStatus: 'ready' }); assert.equal(result.step, 'details'); assert.equal(result.error, 'source'); assert.equal(result.slot.courseId, 'wrong-course');
  assert.match(button(publicTrialMarkup(invalid, ui('en')), 'review'), /disabled/);
});

test('unrecognised source error and gender strings remain inert even when they match object property names', () => {
  for (const value of ['constructor', '__proto__', 'toString']) {
    const state = { ...create(), step: 'review', error: value, draft: { ...create().draft, gender: value } };
    const html = publicTrialMarkup(state, ui('en')); assert.match(html, /Review trial details/); assert.match(button(html, 'submit'), /disabled/); assert.doesNotMatch(html, /function Object|function toString/);
  }
});

test('technical size limits reject overlong inputs without inventing mandatory registration fields', () => {
  const long = '字'.repeat(2001), state = advancePublicTrial(create(), 'review', { remark: long }); assert.equal(state.step, 'details'); assert.equal(state.draft.remark, long); assert.equal(state.error, 'length');
  assert.match(publicTrialMarkup(state, ui('zh')), /role="alert"/); assert.equal(advancePublicTrial(create(), 'review', { ...minimum, gender: 'unspecified', whatsapp: 'x', parentName: '' }).step, 'review');
});

test('public and typed names and notes are escaped in both languages without exposing internal source fields', () => {
  for (const language of ['zh', 'en']) {
    const initial = createPublicTrialDraft({ course: { ...course, courseName: '<script>course</script>' }, slot: { ...slot, teacherNames: ['<Teacher>'] }, today: '2026-10-15' });
    const state = advancePublicTrial(initial, 'review', { ...fields, localName: '<Name>', remark: '</dd><script>note</script>' }), html = publicTrialMarkup(state, ui(language));
    assert.match(html, /&lt;script&gt;course&lt;\/script&gt;/); assert.match(html, /&lt;Teacher&gt;/); assert.match(html, /&lt;Name&gt;/); assert.match(html, /&lt;\/dd&gt;&lt;script&gt;note&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>|<Teacher>|<Name>|PRIVATE_|private-student|private-excluded/); assert.match(html, language === 'en' ? /Review trial details/ : /核對試課資料/);
  }
});

const submitting=(policy='name-whatsapp')=>advancePublicTrial({...createPublicTrialDraft({course,slot,today:'2026-10-15',policy}),capabilities:{submit:true}},'review',fields);
test('real submission requires a named explicit policy capability valid Review and a ready public source',()=>{
 assert.equal(create().policy,null);for(const policy of ['name-birth-whatsapp','name-whatsapp','name-contact']){const state=submitting(policy),html=publicTrialMarkup(state,ui('en'));assert.equal(state.step,'review');assert.equal(publicTrialCanSubmit(state),true);assert.doesNotMatch(button(html,'submit'),/disabled/);assert.doesNotMatch(html,/applications are not yet open/);assert.match(html,/not been submitted/);}
 for(const patch of [{policy:null},{policy:'constructor'},{capabilities:{submit:'true'}},{capabilities:{submit:false}},{step:'details'},{sourceStatus:'loading'},{sourceStatus:'error'},{sourceStatus:'unavailable'},{busy:true},{stale:true},{draft:{...fields,email:'invalid'}}])assert.equal(publicTrialCanSubmit({...submitting(),...patch}),false,JSON.stringify(patch));
});
test('all configured submission policies use the same five required fields and preserve optional blanks',()=>{
 for(const policy of ['name-birth-whatsapp','name-whatsapp','name-contact']) {
  const ready={...createPublicTrialDraft({course,slot,today:'2026-10-15',policy}),capabilities:{submit:true}};
  assert.equal(advancePublicTrial(ready,'review',{}).error,'local-name-required');
  const review=advancePublicTrial(ready,'review',minimum);assert.equal(review.step,'review');assert.equal(publicTrialCanSubmit(review),true);
  assert.equal(advancePublicTrial(ready,'review',{...minimum,whatsapp:'',email:'parent@example.test'}).error,'whatsapp-required');
  assert.equal(advancePublicTrial(ready,'review',{...minimum,whatsapp:'x'.repeat(81)}).error,'length');
 }
});
test('busy public submission locks native fields all exits and reducer commands without changing its payload',()=>{
 for(const step of ['details','review']){const state={...submitting(),step,busy:true},before=JSON.stringify(state),html=publicTrialMarkup(state,ui('en'));assert.match(html,/aria-busy="true"/);for(const node of html.match(/<button\b[^>]*>/g)||[])assert.match(node,/\sdisabled(?:\s|>)/);if(step==='details')for(const node of html.match(/<(?:input|select|textarea)\b[^>]*>/g)||[])assert.match(node,/\sdisabled(?:\s|>)/);else assert.match(html,/Submitting/);for(const command of ['draft','review','back','submit','complete'])assert.equal(advancePublicTrial(state,command,{fullName:'Overwritten'}),state);assert.equal(JSON.stringify(state),before);}
});
test('uncertain submission permits same-payload retry despite its own now-full source without manufacturing success',()=>{
 const state={...submitting(),uncertain:true,sourceStatus:'unavailable',sourceMessage:'This time is no longer available.',slot:{...submitting().slot,trialRemaining:0,trialStatus:'full'}};assert.equal(publicTrialCanSubmit(state),true);const html=publicTrialMarkup(state,ui('en'));assert.match(html,/not been confirmed/);assert.match(html,/Retry submission/);assert.doesNotMatch(button(html,'submit'),/disabled/);assert.match(button(html,'back'),/disabled/);assert.doesNotMatch(button(html,'close'),/disabled/);assert.doesNotMatch(html,/Please choose another time|Application received/);for(const command of ['draft','review','back','submit','complete'])assert.equal(advancePublicTrial(state,command,fields),state);assert.equal(publicTrialCanSubmit({...state,policy:null}),false);
});
test('only the host acknowledgement renders a received application with a safe reference and no booking payment or student claims',()=>{
 const state={...submitting(),sourceStatus:'unavailable',submission:{reference:'TR-<second>',outcome:'received'}},before=JSON.stringify(state),html=publicTrialMarkup(state,ui('en'));assert.match(html,/Application received/);assert.match(html,/TR-&lt;second&gt;/);assert.match(html,/contact you/);assert.doesNotMatch(html,/data-command="submit"|data-command="back"|<form\b|<input\b|Confirmed booking|Payment confirmed|Converted to student/);assert.match(html,/id="public-trial-body"[^>]*tabindex="0"/);assert.ok(button(html,'close'));assert.equal(publicTrialCanSubmit(state),false);for(const command of ['draft','review','back','submit','complete'])assert.equal(advancePublicTrial(state,command,{}),state);assert.equal(JSON.stringify(state),before);
 for(const submission of [null,{reference:'',outcome:'received'},{reference:'TR-1',outcome:'confirmed'},{reference:'x'.repeat(101),outcome:'received'}])assert.doesNotMatch(publicTrialMarkup({...submitting(),step:'success',submission},ui('en')),/Application received/);
});
test('submission errors are escaped focusable feedback outside the reading body and preserve every raw value',()=>{
 const state={...submitting(),submitError:'Could not submit <script>private</script> & retry.'},before=JSON.stringify(state),html=publicTrialMarkup(state,ui('en'));assert.match(html,/id="public-trial-submit-error"[^>]*role="alert"[^>]*tabindex="-1"/);assert.match(html,/Could not submit &lt;script&gt;private&lt;\/script&gt; &amp; retry/);assert.doesNotMatch(html,/<script>/);assert.ok(html.indexOf('id="public-trial-submit-error"')<html.indexOf('id="public-trial-body"'));assert.equal(JSON.stringify(state),before);assert.match(publicTrialMarkup(submitting(),ui('en')),/id="public-trial-submit-error"[^>]*hidden/);
});
test('required fields are marked consistently while birthdays are mandatory and acknowledgement stays accessible',()=>{
 for(const policy of [null,'name-birth-whatsapp','name-whatsapp','name-contact']) {
  const html=publicTrialMarkup({...create(),policy},ui('en'));
  for(const key of Object.keys(minimum))assert.match(html,new RegExp(`name="${key}"[^>]*aria-required="true"`));
  assert.match(html,/<input[^>]*name="dateOfBirth"[^>]*aria-required="true"/);
  assert.doesNotMatch(html,/Chinese or English name|WhatsApp number or email|Choose \(optional\)/);
 }
 const success=publicTrialMarkup({...submitting(),submission:{reference:'TR-123',outcome:'received'}},ui('en'));assert.match(success,/id="public-trial-success"[^>]*tabindex="-1"/);assert.match(success,/<button[^>]*data-command="close"[^>]*aria-label="Close"/);
});

test('teacher follow-up guidance appears only after Review details and before Submit application',()=>{
 const draft=create(),review=advancePublicTrial(draft,'review',fields);
 for(const language of ['en','zh']){const details=publicTrialMarkup(draft,ui(language)),html=publicTrialMarkup(review,ui(language));assert.doesNotMatch(details,/public-trial-contact-note/);assert.match(html,/public-trial-contact-note/);assert.ok(html.indexOf('public-trial-contact-note')<html.indexOf('data-command="submit"'));}
});

test('Trial details requires both names birthday gender and WhatsApp even in preview, with optional fields below',()=>{
 const required={localName:'陳小明',fullName:'Ming Chan',dateOfBirth:'2018-01-02',gender:'male',whatsapp:'+852 5555 1234'};
 for(const [key,error] of [['localName','local-name-required'],['fullName','full-name-required'],['dateOfBirth','birth-required'],['gender','gender-required'],['whatsapp','whatsapp-required']]){
  const state=advancePublicTrial(create(),'review',{...required,[key]:'  '.trim()});
  assert.equal(state.step,'details');assert.equal(state.error,error);
  assert.match(publicTrialMarkup(state,ui('en')),new RegExp(`name="${key}"[^>]*aria-invalid="true"`));
 }
 assert.equal(advancePublicTrial(create(),'review',required).step,'review');
 const html=publicTrialMarkup(create(),ui('en'));
 const groups=[...html.matchAll(/<section class="public-trial-field-group"[\s\S]*?<\/section>/g)].map(match=>match[0]);
 assert.equal(groups.length,2);assert.match(groups[0],/Required information/);assert.match(groups[1],/Optional information/);
 for(const key of Object.keys(required)){assert.match(groups[0],new RegExp(`name="${key}"[^>]*aria-required="true"`));assert.doesNotMatch(groups[1],new RegExp(`name="${key}"`));}
 for(const key of ['school','referrer','parentName','email','remark'])assert.match(groups[1],new RegExp(`name="${key}"`));
 assert.doesNotMatch(groups[1],/aria-required="true"/);
});
