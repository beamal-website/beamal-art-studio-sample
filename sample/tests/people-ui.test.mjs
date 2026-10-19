import test from 'node:test';
import assert from 'node:assert/strict';
import {
  peopleDirectoryMarkup, peopleProfileMarkup, peopleEditorMarkup, peopleConversionMarkup,
} from '../client/people-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ui = language => ({ t: (zh, en) => language === 'en' ? en : zh, esc, today: '2026-10-15' });
const person = {
  id: 'person-a', kind: 'applicant', displayName: 'Avery Chan', dateOfBirth: '2020-10-16',
  parentName: 'Parent Chan', whatsApp: '+852 9000 0000', email: 'avery@example.test',
  school: 'Fictional Primary', referrer: 'Family friend', localName: '陳小畫', firstName: 'Avery',
  lastName: 'Chan', phone: '', address: 'Fictional address', level: 'Primary 1', remark: 'Call after 5 pm',
  version: 3, createdAt: '2026-10-14T01:00:00.000Z', updatedAt: '2026-10-15T01:00:00.000Z',
  convertedAt: null, convertedBy: null,
};
const tagById = (html, id) => html.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`))?.[0] || '';

test('directory offers controlled segments, search, sorting and profile actions in both languages', () => {
  for (const language of ['zh', 'en']) {
    const html = peopleDirectoryMarkup({ people: [person], total: 45, page: 2, pageSize: 20, kind: 'applicant', q: 'Chan', sort: 'createdAt', direction: 'desc' }, ui(language));
    assert.match(html, /id="people-kind-filter"/);assert.match(html, /<option value="student">/);
    assert.match(html, /<option value="applicant" selected>/);
    assert.match(html, /<form[^>]+id="people-search"/);
    assert.match(tagById(html, 'people-search-query'), /name="q"[^>]+value="Chan"/);
    assert.match(html, /<option value="createdAt" selected>/);
    assert.match(html, /<option value="desc" selected>/);
    assert.match(html, /data-action="people-create"/);
    assert.match(html, /data-action="people-open" data-person-id="person-a"/);
    assert.match(html, /data-action="people-page" data-page="1"/);
    assert.match(html, /data-action="people-page" data-page="3"/);
    assert.match(html, /people-table-scroll/);
    assert.match(html, language === 'en' ? /Applicants/ : /申請者/);
    assert.match(html, /Avery Chan/);
  }
});

test('directory pagination disables unavailable pages and never creates a fictional row', () => {
  const html = peopleDirectoryMarkup({ people: [person], total: 1, page: 1, pageSize: 20, kind: 'applicant' }, ui('en'));
  assert.match(html, /data-action="people-page" data-page="1"[^>]* disabled/);
  assert.equal((html.match(/data-action="people-open"/g) || []).length, 1);
  assert.doesNotMatch(html, /Enrolled|Paid|Attendance|Courses taken/);
});

test('directory distinguishes no records, no search matches, loading and failure', () => {
  const empty = peopleDirectoryMarkup({ kind: 'student' }, ui('en'));
  assert.match(empty, /No student records yet/);
  assert.doesNotMatch(empty, /data-action="people-open"/);
  const searched = peopleDirectoryMarkup({ kind: 'applicant', q: 'Nobody' }, ui('en'));
  assert.match(searched, /No records match your search/);
  const loading = peopleDirectoryMarkup({ loading: true }, ui('en'));
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Loading records/);
  assert.doesNotMatch(loading, /No student records yet|No applicant records yet/);
  assert.doesNotMatch(loading, /0 records · Page/);
  const failed = peopleDirectoryMarkup({ error: 'Could not load records' }, ui('en'));
  assert.match(failed, /role="alert"[^>]*>Could not load records/);
  assert.match(failed, /data-action="people-refresh"/);
  assert.doesNotMatch(failed, /No student records yet|No applicant records yet/);
  assert.doesNotMatch(failed, /0 records · Page/);
});

test('all untrusted directory fields and ids are escaped instead of becoming markup', () => {
  const unsafe = { ...person, id: '\" data-go=\"/leak', displayName: '<img src=x onerror=alert(1)>', contact1Name: '<script>bad()</script>', email: '<bad@example.test>' };
  const html = peopleDirectoryMarkup({ people: [unsafe], total: 1, q: '\"><script>search()</script>' }, ui('en'));
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.match(html, /data-person-id="&quot; data-go=&quot;\/leak"/);
  assert.doesNotMatch(html, /<script>|<img|data-go="\/leak/);
});

test('profile groups real fields and shows an unknown optional birth date as a dash', () => {
  const html = peopleProfileMarkup({ person: { ...person, dateOfBirth: null, parentName: '', phone: '', address: '' }, history: [] }, ui('en'));
  assert.match(html, /Personal information/);
  assert.match(html, /Contact information/);
  assert.match(html, /School and referral/);
  assert.match(html, /Notes/);
  assert.match(html, /data-action="people-back"/);
  assert.match(html, /data-action="people-edit" data-person-id="person-a"/);
  assert.match(html, /<dt>Date of birth<\/dt><dd>—<\/dd>/);
  assert.match(html, /<dt>Age<\/dt><dd>—<\/dd>/);
  assert.match(html, /<dt>Phone<\/dt><dd>—<\/dd>/);
  assert.doesNotMatch(html, /<dd>0<\/dd>|data-action="people-convert"|Student no|Attendance|Paid/);
});

test('profile age uses the actual birthday, handles leap years, and imposes no three-to-eighteen rule', () => {
  const age = (dateOfBirth, today = '2026-10-15') => peopleProfileMarkup({ person: { ...person, dateOfBirth } }, { ...ui('en'), today });
  assert.match(age('2020-10-16'), /<dt>Age<\/dt><dd>5 years<\/dd>/);
  assert.match(age('2020-10-15'), /<dt>Age<\/dt><dd>6 years<\/dd>/);
  assert.match(age('2020-02-29', '2026-02-28'), /<dt>Age<\/dt><dd>5 years<\/dd>/);
  assert.match(age('2020-02-29', '2026-03-01'), /<dt>Age<\/dt><dd>6 years<\/dd>/);
  assert.match(age('2000-10-15'), /<dt>Age<\/dt><dd>26 years<\/dd>/);
  assert.match(age('2026-10-15'), /<dt>Age<\/dt><dd>0 years<\/dd>/);
  assert.match(age('2026-10-16'), /<dt>Age<\/dt><dd>—<\/dd>/);
  assert.match(age('2020-02-30'), /<dt>Age<\/dt><dd>—<\/dd>/);
});

test('history shows audited action, actor, time and version without exposing snapshots as JSON', () => {
  const history = ['person.create', 'person.update', 'person.convert'].map((action, index) => ({ id: index + 1, action, version: index + 1, actor: { id: 'admin-a', displayName: 'Administrator <A>' }, createdAt: '2026-10-15T01:30:00.000Z', snapshot: { ...person, privateSentinel: 'DO_NOT_PRINT_RAW_SNAPSHOT' } }));
  const html = peopleProfileMarkup({ person, history, profileTab: 'logs' }, ui('en'));
  assert.match(html, /Record created/);
  assert.match(html, /Details updated/);
  assert.match(html, /Converted to student/);
  assert.match(html, /Administrator &lt;A&gt;/);
  assert.match(html, /datetime="2026-10-15T01:30:00.000Z"/);
  assert.match(html, /Version 3/);
  assert.doesNotMatch(html, /DO_NOT_PRINT_RAW_SNAPSHOT|privateSentinel|"snapshot"|admin-a/);
  const historyFailed = peopleProfileMarkup({ person, profileTab: 'logs', historyError: 'History unavailable' }, ui('en'));
  assert.match(historyFailed, /role="alert"[^>]*>History unavailable/);
  assert.doesNotMatch(historyFailed, /No history yet/);
  const historyLoading = peopleProfileMarkup({ person, profileTab: 'logs', historyLoading: true }, ui('en'));
  assert.match(historyLoading, /Loading history/);
  assert.doesNotMatch(historyLoading, /No history yet/);
});

test('conversion action requires an applicant and the explicit capability', () => {
  assert.doesNotMatch(peopleProfileMarkup({ person, canConvert: false }, ui('en')), /data-action="people-convert"/);
  assert.match(peopleProfileMarkup({ person, canConvert: true }, ui('en')), /data-action="people-convert" data-person-id="person-a"/);
  assert.doesNotMatch(peopleProfileMarkup({ person: { ...person, kind: 'student' }, canConvert: true }, ui('en')), /data-action="people-convert"/);
});

test('related profile actions retain the exact selected person and offer conversion only for an applicant', () => {
  for (const language of ['zh', 'en']) for (const kind of ['applicant', 'student']) {
    const selected = { ...person, id: 'person-second', kind, displayName: 'Avery Chan' };
    const html = peopleProfileMarkup({ person: selected, relatedActions: true }, ui(language));
    const actions = [...html.matchAll(/<button[^>]+data-action="ui-(?:lesson|account-actions)"[^>]*>/g)].map(match => match[0]);
    assert.equal(actions.length, kind === 'applicant' ? 4 : 3);
    for (const tag of actions) {
      assert.match(tag, /data-person-id="person-second"/);
      assert.match(tag, /data-ui-command="launch"/);
      assert.doesNotMatch(tag, /person-a/);
    }
    for (const view of ['applicant', 'family', 'activation']) assert.ok(actions.some(tag => tag.includes(`data-ui-view="${view}"`)));
    assert.equal(actions.some(tag => tag.includes('data-ui-view="convert"')), kind === 'applicant');
    assert.match(html, language === 'en' ? /Related actions/ : /相關操作/);
  }
});

test('related actions are explicitly enabled only on a valid loaded profile, never the directory or a failed record', () => {
  const unavailable = [{ person }, { person, relatedActions: false }, { person, relatedActions: true, loading: true }, { person, relatedActions: true, error: 'Access changed' }, { relatedActions: true, loading: true }, { relatedActions: true, error: 'Not found' }, { person: { ...person, id: '' }, relatedActions: true }, { person: { ...person, kind: 'unknown' }, relatedActions: true }];
  for (const state of unavailable) assert.doesNotMatch(peopleProfileMarkup(state, ui('en')), /data-action="ui-(?:lesson|account-actions)"/);
  assert.doesNotMatch(peopleDirectoryMarkup({ people: [person], relatedActions: true }, ui('en')), /data-action="ui-(?:lesson|account-actions)"/);
  const unsafe = peopleProfileMarkup({ person: { ...person, id: '\" data-go=\"/other' }, relatedActions: true }, ui('en'));
  assert.match(unsafe, /data-person-id="&quot; data-go=&quot;\/other"/);
  assert.doesNotMatch(unsafe, /data-go="\/other/);
});

test('profile loading and errors never offer an edit on a missing record', () => {
  const loading = peopleProfileMarkup({ loading: true }, ui('en'));
  assert.match(loading, /Loading record/);
  assert.doesNotMatch(loading, /data-action="people-edit"|data-action="people-convert"|No history yet/);
  const failed = peopleProfileMarkup({ error: 'Record unavailable' }, ui('en'));
  assert.match(failed, /role="alert"[^>]*>Record unavailable/);
  assert.doesNotMatch(failed, /data-action="people-edit"/);
});

test('new editor creates an applicant and only its administrative display name is required', () => {
  const html = peopleEditorMarkup({}, ui('en'));
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="people-editor-title"/);
  assert.match(html, /class="dialog people-editor-dialog" tabindex="-1"/);
  assert.match(html, /<h2 id="people-editor-title">Add applicant<\/h2>/);
  assert.match(html, /<form id="people-editor"[^>]+data-id=""[^>]+data-version=""/);
  assert.match(tagById(html, 'people-display-name'), /name="displayName"[^>]+maxlength="200"[^>]+required/);
  assert.equal((html.match(/\brequired(?:\s|>)/g) || []).length, 1);
  for (const name of ['dateOfBirth', 'localName', 'firstName', 'lastName', 'parentName', 'whatsApp', 'email', 'phone', 'address', 'school', 'level', 'referrer', 'remark']) {
    assert.match(html, new RegExp(`name="${name}"`));
  }
  assert.match(html, /name="dateOfBirth"[^>]+type="date"/);
  assert.doesNotMatch(html, /name="kind"|type="password"|type="file"|name="studentNumber"|min="3"|max="18"/);
  assert.match(html, /id="people-save"/);
  assert.match(html, /id="people-editor-error"/);
  assert.match(html, /people-editor-body/);
  assert.match(html, /people-footer/);
});

test('editing preserves exact record identity, current version and field length limits', () => {
  const html = peopleEditorMarkup({ person: { ...person, remark: 'Keep <these> notes', displayName: 'Avery "A"' } }, ui('en'));
  assert.match(html, /data-id="person-a" data-version="3"/);
  assert.match(html, /value="Avery &quot;A&quot;"/);
  assert.match(html, /Keep &lt;these&gt; notes/);
  for (const name of ['localName', 'firstName', 'lastName', 'parentName', 'school', 'referrer', 'level']) assert.match(html, new RegExp(`name="${name}"[^>]+maxlength="200"`));
  for (const name of ['whatsApp', 'phone']) assert.match(html, new RegExp(`name="${name}"[^>]+maxlength="80"`));
  assert.match(html, /name="email"[^>]+maxlength="254"/);
  assert.match(html, /name="address"[^>]+maxlength="1000"/);
  assert.match(html, /name="remark"[^>]+maxlength="2000"/);
});

test('busy editor locks fields, close, cancel and save while retaining the user-entered error', () => {
  const html = peopleEditorMarkup({ person, busy: true, error: 'Save <failed>' }, ui('en'));
  assert.match(html, /<fieldset class="people-editor-fields" disabled/);
  assert.equal((html.match(/data-action="people-editor-cancel"[^>]* disabled/g) || []).length, 2);
  assert.match(tagById(html, 'people-save'), /disabled/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="alert"[^>]*>Save &lt;failed&gt;/);
});

test('conversion confirmation preserves identity and describes manual roster classification', () => {
  for (const language of ['zh', 'en']) {
    const html = peopleConversionMarkup({ person }, ui(language));
    assert.match(html, /<form id="people-convert-editor" data-id="person-a" data-version="3"/);
    assert.match(html, /id="people-convert-save"/);
    assert.match(html, /data-action="people-editor-cancel"/);
    assert.match(html, language === 'en' ? /Changes the directory classification to student/ : /把名冊分類改為學生/);
    assert.doesNotMatch(html, /Paid student|Enrolled successfully|Login created/);
  }
  const busy = peopleConversionMarkup({ person, busy: true, error: 'Please retry' }, ui('en'));
  assert.equal((busy.match(/data-action="people-editor-cancel"[^>]* disabled/g) || []).length, 2);
  assert.match(tagById(busy, 'people-convert-save'), /disabled/);
  assert.match(busy, /role="alert"[^>]*>Please retry/);
  assert.match(tagById(peopleConversionMarkup({ person: { ...person, kind: 'student' } }, ui('en')), 'people-convert-save'), /disabled/);
});

test('editor includes the observed optional SchoolTracs fields without opting a person into promotions', () => {
  const html = peopleEditorMarkup({}, ui('en'));
  const names200 = ['citizenId', 'fullName', 'gender', 'district', 'contact1Name', 'contact2Name', 'occupation', 'billName'];
  const names80 = ['mobile', 'contact1Phone', 'contact2Phone'];
  const names254 = ['contact1Email', 'contact2Email'];
  for (const name of names200) assert.match(html, new RegExp(`name="${name}"[^>]+maxlength="200"`));
  for (const name of names80) assert.match(html, new RegExp(`name="${name}"[^>]+maxlength="80"`));
  for (const name of names254) assert.match(html, new RegExp(`name="${name}"[^>]+maxlength="254"`));
  assert.match(html, /name="detail"[^>]+maxlength="2000"/);
  for (const name of ['enrollmentDate', 'quitDate']) assert.match(html, new RegExp(`name="${name}"[^>]+type="date"`));
  assert.match(html, /<select id="people-promotion" name="promotion">/);
  assert.match(html, /<option value="" selected>—<\/option>/);
  assert.match(html, /<option value="true">Yes<\/option>/);
  assert.match(html, /<option value="false">No<\/option>/);
  assert.equal((html.match(/\brequired(?:\s|>)/g) || []).length, 1);
  assert.match(html, /Record dates \(manual\)/);
});

test('extended profile data is escaped and preserves a recorded promotion choice separately from unknown', () => {
  const extended = { ...person, citizenId: '<ID>', fullName: 'Avery <Chan>', gender: '', mobile: '+852 9111 1111', district: '<District>', contact1Name: 'Contact <One>', contact1Phone: '8000 0001', contact1Email: 'one@example.test', contact2Name: 'Contact Two', contact2Phone: '', contact2Email: '', occupation: 'Student artist', detail: '<Detailed note>', billName: '<Billing name>', enrollmentDate: '2026-10-01', quitDate: null, promotion: null };
  const html = peopleProfileMarkup({ person: extended }, ui('en'));
  assert.match(html, /&lt;ID&gt;/);
  assert.match(html, /Avery &lt;Chan&gt;/);
  assert.match(html, /Contact &lt;One&gt;/);
  assert.match(html, /&lt;Detailed note&gt;/);
  assert.match(html, /&lt;Billing name&gt;/);
  assert.match(html, /<dt>Receive promotional email<\/dt><dd>—<\/dd>/);
  assert.match(html, /<dt>Quit date<\/dt><dd>—<\/dd>/);
  assert.match(html, /<dt>Enrollment date<\/dt><dd>2026-10-01<\/dd>/);
  assert.doesNotMatch(html, /<ID>|<Detailed note>|<Billing name>/);
  const optedOut = peopleProfileMarkup({ person: { ...extended, promotion: false } }, ui('en'));
  assert.match(optedOut, /<dt>Receive promotional email<\/dt><dd>No<\/dd>/);
  const optedInEditor = peopleEditorMarkup({ person: { ...extended, promotion: true } }, ui('en'));
  assert.match(optedInEditor, /<option value="true" selected>Yes<\/option>/);
  assert.doesNotMatch(optedInEditor, /<option value="" selected>/);
  assert.match(optedInEditor, /value="&lt;ID&gt;"/);
  assert.match(optedInEditor, /&lt;Detailed note&gt;/);
});

test('student list shows the reference contact columns using real fields and never invents student numbers',()=>{
 const html=peopleDirectoryMarkup({people:[{...person,citizenId:'ID-actual',phone:'20000000',mobile:'90000000',contact1Name:'Guardian one',contact1Phone:'91111111',contact2Name:'Guardian two',contact2Phone:'92222222'}]},ui('en'));
 for(const label of ['Name','Student no.','Citizen ID','Phone','Mobile','Contact 1','Contact 1 phone','Contact 2','Contact 2 phone'])assert.ok(html.includes('>'+label+'</th>'));
 for(const value of ['ID-actual','20000000','90000000','Guardian one','91111111','Guardian two','92222222'])assert.ok(html.includes(value));
 assert.match(html,/<\/button><\/td><td>—<\/td>/);assert.doesNotMatch(html,/AI Assistant/);
});
