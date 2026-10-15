import test from 'node:test';
import assert from 'node:assert/strict';
import * as feeUi from '../client/fee-pricing-ui.js';

const fee = {id: 'saved-fee', feeCode: 'FE-001', version: 3, feeName: 'Term fee', pricingModel: 'monthly-lessons', price: 850, duration: 60, months: 2, onlineStore: false, bookingExpiry: {value: 3, unit: 'months'}};
const values = {futurePrice: '950.50', effectiveDate: '2026-11-01'};
const zh = {t: chinese => chinese};
const render = options => feeUi.feePricingMarkup({fee, role: 'admin', courseNames: ['Drawing', 'Watercolour'], ...options});

test('package contents is reachable from the exact saved package for admin and teacher, without using course links as contents',()=>{
  for(const role of ['admin','teacher']){
    const packageFee={...fee,pricingModel:'package',packageType:'minutes',packageTotal:720,courseIds:['drawing','interview']};
    const markup=feeUi.feeOverviewMarkup({fee:packageFee,role,courseNames:['Drawing','Interview']});
    assert.match(markup,/data-action="package-content-open"/);
    assert.doesNotMatch(feeUi.feeOverviewMarkup({fee,role}),/data-action="package-content-open"/);
    assert.doesNotMatch(feeUi.feeOverviewMarkup({fee:packageFee,role,sourceError:'Reload needed'}),/data-action="package-content-open"/);
  }
  assert.equal(feeUi.feeOverviewMarkup({fee:{...fee,pricingModel:'package'},role:'student'}),'');
});

test('future price validation accepts service amount limits and real dates without inventing a backdate policy', () => {
  for (const [amount, expected] of [['0.01', .01], ['.50', .5], ['850', 850], ['950.50', 950.5], ['1000000.00', 1_000_000]]) {
    const result = feeUi.validateFeePricingDraft({futurePrice: amount, effectiveDate: '2000-02-29'});
    assert.deepEqual(result, {valid: true, values: {futurePrice: amount, effectiveDate: '2000-02-29'}, price: expected, effectiveDate: '2000-02-29', errors: {}});
  }
  for (const date of ['0001-01-01', '1999-01-01', '2024-02-29', '9999-12-31']) {
    assert.equal(feeUi.validateFeePricingDraft({...values, effectiveDate: date}).valid, true);
  }
});

test('future price validation rejects empty, exponent, nonfinite, out-of-range and fractional-cent amounts', () => {
  for (const amount of ['', ' ', ' 1.20', '1.20 ', '1\n', '1\r', '1\u2028', '0', '0.00', '-1', '+1', '1e2', '1E2', 'Infinity', 'NaN', '1.234', '1000000.01', '1,000', '1.', null, false, {}, []]) {
    const result = feeUi.validateFeePricingDraft({...values, futurePrice: amount});
    assert.equal(result.valid, false, String(amount));
    assert.equal(result.price, null);
    assert.deepEqual(result.errors, {futurePrice: 'amount'});
  }
});

test('future price validation rejects impossible and incomplete dates and reports both fields', () => {
  for (const date of ['', ' ', '2026-2-01', '2026-02-29', '1900-02-29', '2026-04-31', '0000-01-01', '2026-13-01', '2026-01-00', '2026-11-01\n', '2026-11-01\r', '2026-11-01T00:00:00Z', null]) {
    const result = feeUi.validateFeePricingDraft({...values, effectiveDate: date});
    assert.equal(result.valid, false, String(date));
    assert.deepEqual(result.errors, {effectiveDate: 'date'});
  }
  assert.deepEqual(feeUi.validateFeePricingDraft({}).errors, {futurePrice: 'amount', effectiveDate: 'date'});
});

test('validation preserves typed drafts and never mutates the input or saved fee', () => {
  const draft = Object.freeze({futurePrice: ' 0 ', effectiveDate: '2026-02-30', extra: 'ignored'});
  const result = feeUi.validateFeePricingDraft(draft);
  assert.deepEqual(result.values, {futurePrice: ' 0 ', effectiveDate: '2026-02-30'});
  assert.notEqual(result.values, draft);
  assert.equal(feeUi.validateFeePricingDraft({futurePrice: 0, effectiveDate: '2026-11-01'}).values.futurePrice, '0');
  const before = JSON.stringify(fee);
  render({values, step: 'review'});
  assert.equal(JSON.stringify(fee), before);
});

test('edit step provides an enabled Review and explicit labels without a false save or unverified pricing algorithm', () => {
  const html = render({values});
  assert.match(html, /<form id="fee-pricing-editor"[^>]*novalidate/);
  assert.match(html, /name="futurePrice"[^>]*type="text"[^>]*inputmode="decimal"/);
  assert.match(html, /name="effectiveDate"[^>]*type="date"/);
  assert.match(html, /<button type="submit"[^>]*>Review<\/button>/);
  assert.doesNotMatch(html, /<button type="submit"[^>]*disabled|order start date|Saved successfully|Pricing saved/);
  assert.match(html, /Existing orders keep their saved price snapshots/);
  assert.match(html, /data-action="fee-pricing-close"/);
});

test('review presents the exact saved fee and proposed draft with Back and disabled final saving', () => {
  const html = render({values, step: 'review'});
  assert.match(html, /<form id="fee-pricing-editor"/);
  for (const text of ['Term fee', 'HK$850.00', 'HK$950.50', '2026-11-01', 'Drawing', 'Watercolour', '60 minutes', '2 months']) assert.ok(html.includes(text), text);
  assert.match(html, /data-action="fee-pricing-back"/);
  assert.match(html, /<button type="submit"[^>]*disabled[^>]*>Save new pricing<\/button>/);
  assert.doesNotMatch(html, /name="futurePrice"[^>]*type="text"|Saved successfully|order start date/);
});

test('invalid review requests remain editable and show actionable errors; source errors keep drafts but stop review', () => {
  const invalid = render({values: {futurePrice: '0', effectiveDate: '2026-02-30'}, step: 'review'});
  assert.match(invalid, /name="futurePrice"[^>]*value="0"/);
  assert.match(invalid, /aria-invalid="true"/);
  assert.match(invalid, /id="fee-pricing-error"[^>]*role="alert"[^>]*tabindex="-1"/);
  assert.doesNotMatch(invalid, /data-action="fee-pricing-back"/);
  const sourceError = render({values, sourceError: 'Fee is no longer available'});
  assert.match(sourceError, /value="950.50"/);
  assert.match(sourceError, /value="2026-11-01"/);
  assert.match(sourceError, /Fee is no longer available/);
  assert.match(sourceError, /<button type="submit"[^>]*disabled[^>]*>Review<\/button>/);
  assert.match(sourceError, /data-action="fee-pricing-close"/);
});

test('pricing guard only permits a saved admin fee and renders translated escaped content', () => {
  for (const role of ['teacher', 'student', undefined, 'Admin']) assert.equal(render({role}), '');
  assert.equal(render({fee: {price: 100}}), '');
  const html = feeUi.feePricingMarkup({fee: {...fee, feeName: '<img src=x>'}, role: 'admin', courseNames: ['A & B'], values: {futurePrice: '" onfocus="alert(1)', effectiveDate: '2026-11-01'}, error: '<b>Fix & retry</b>'}, zh);
  assert.match(html, /核對/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /&quot; onfocus=&quot;alert\(1\)/);
  assert.match(html, /&lt;b&gt;Fix &amp; retry&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<img|<b>|" onfocus="/);
});

test('fee overview gives admin and teacher the same authoritative saved current details', () => {
  for (const role of ['admin', 'teacher']) {
    const html = feeUi.feeOverviewMarkup({fee, role, courseNames: ['Drawing', 'Watercolour']});
    for (const text of ['Term fee', 'FE-001', 'Version', '>3<', 'HK$850.00', 'Monthly fee by lesson count', '60 minutes', '2 months', '3 months', 'Hidden', 'Drawing', 'Watercolour']) assert.ok(html.includes(text), `${role}: ${text}`);
    assert.doesNotMatch(html, /saved-fee/);
    assert.match(html, /aria-labelledby="fee-overview-title"/);
    assert.match(html, /data-action="fee-overview-close"/);
    assert.equal(html.includes('data-action="fee-overview-edit"'), role === 'admin');
    assert.equal(html.includes('data-action="fee-overview-pricing"'), role === 'admin');
  }
  for (const role of ['student', undefined, 'Admin']) assert.equal(feeUi.feeOverviewMarkup({fee, role}), '');
  assert.equal(feeUi.feeOverviewMarkup({fee: {feeName: 'Unsaved'}, role: 'admin'}), '');
});

test('overview distinguishes every pricing model, Minutes versus Visits, and disabled versus unknown settings', () => {
  const fixed = feeUi.feeOverviewMarkup({fee: {...fee, pricingModel: 'fixed-monthly'}, role: 'admin'});
  assert.match(fixed, /Fixed monthly fee/);
  assert.doesNotMatch(fixed, /60 minutes/);
  for (const [type, label] of [['minutes', '720 minutes'], ['visits', '12 visits'], ['lessons', '12 visits']]) {
    const html = feeUi.feeOverviewMarkup({fee: {...fee, pricingModel: 'package', packageType: type, packageTotal: type === 'minutes' ? 720 : 12, bookingExpiry: null, onlineStore: true}, role: 'teacher'});
    assert.match(html, /Fixed package/);
    assert.ok(html.includes(label));
    assert.match(html, /No booking expiry/);
    assert.match(html, /Shown/);
    assert.doesNotMatch(html, /60 minutes|2 months/);
  }
  const unknown = feeUi.feeOverviewMarkup({fee: {id: 'fee-unknown', feeName: 'Unknown', pricingModel: 'other'}, role: 'admin'});
  assert.match(unknown, /Not provided/);
  assert.doesNotMatch(unknown, /HK\$0|No booking expiry|>Hidden<|>Shown<|Fixed package/);
});

test('overview does not turn unavailable or invalid numeric data into zero or a plausible pricing model', () => {
  for (const price of [undefined, null, '', false, NaN, Infinity, -10]) {
    const html = feeUi.feeOverviewMarkup({fee: {...fee, price}, role: 'teacher'});
    assert.match(html, /Not provided/);
    assert.doesNotMatch(html, /HK\$0|HK\$NaN|Infinity/);
  }
  const html = feeUi.feeOverviewMarkup({fee: {...fee, pricingModel: 'package', packageType: 'hours', packageTotal: 720, bookingExpiry: {value: 5, unit: 'unknown'}}, role: 'teacher'});
  assert.doesNotMatch(html, /720 minutes|720 visits|5 months|5 days/);
});

const record = {id: 'edit-3', version: 3, action: 'fee.update', recordedAt: '2026-10-15T10:45:00.000Z', feeName: 'Earlier term fee', pricing: {pricingModel: 'package', price: 700, packageType: 'minutes', packageTotal: 720, bookingExpiry: {value: 6, unit: 'weeks'}}, actorName: 'Maya Lam'};
test('admin recorded edits show actual recorded facts without claiming effective periods', () => {
  const html = feeUi.feeOverviewMarkup({fee, role: 'admin', history: {status: 'ready', records: [record]}});
  for (const text of ['Recorded edits', 'Earlier term fee', 'Maya Lam', 'HK$700.00', '720 minutes', '6 weeks', '2026-10-15 18:45', 'Updated']) assert.ok(html.includes(text), text);
  assert.match(html, /<time datetime="2026-10-15T10:45:00.000Z">/);
  assert.doesNotMatch(html, /edit-3|fee\.update|Record ID/);
  assert.doesNotMatch(html, /Effective from|Effective until|No pricing history|Never changed|Schedule saved/);
  assert.match(html, /Recorded times are edit times/);
});

test('history states are distinct, retryable on error, and an empty response does not invent never-changed history', () => {
  const html = status => feeUi.feeOverviewMarkup({fee, role: 'admin', history: {status, records: [], error: 'Read failed'}});
  assert.match(html('loading'), /Loading recorded edits/);
  assert.match(html('unavailable'), /Recorded edits are not available/);
  assert.match(html('error'), /Read failed/);
  assert.match(html('error'), /data-action="fee-history-refresh"/);
  assert.match(html('ready'), /No recorded edits were returned/);
  assert.doesNotMatch(html('ready'), /Never changed|No price changes|No pricing history/);
});

test('teacher overview never renders supplied private history or staff events', () => {
  const html = feeUi.feeOverviewMarkup({fee, role: 'teacher', history: {status: 'ready', records: [{...record, actorName: 'PRIVATE ACTOR'}], error: 'PRIVATE ERROR'}});
  assert.doesNotMatch(html, /Recorded edits|Earlier term fee|edit-3|PRIVATE ACTOR|PRIVATE ERROR|fee-history-refresh/);
  assert.match(html, /HK\$850.00/);
});

test('overview escapes fee, course and history fields in both languages and leaves sources unchanged', () => {
  const source = {...fee, feeCode: 'FE"><img>', feeName: 'Art & <print>'};
  const history = {status: 'ready', records: [{...record, id: '<script>', action: '<b>changed</b>', actorName: '" onclick="evil', feeName: 'A & B'}]};
  const before = JSON.stringify({source, history});
  const html = feeUi.feeOverviewMarkup({fee: source, role: 'admin', courseNames: ['<svg onload=evil>'], history}, zh);
  assert.match(html, /費用詳情/);
  assert.match(html, /修改記錄/);
  assert.match(html, /Art &amp; &lt;print&gt;/);
  assert.match(html, /&lt;svg onload=evil&gt;/);
  assert.doesNotMatch(html, /&lt;script&gt;|&lt;b&gt;changed/);
  assert.match(html, /&quot; onclick=&quot;evil/);
  assert.doesNotMatch(html, /<img|<script|<svg|" onclick="/);
  assert.equal(JSON.stringify({source, history}), before);
});

test('unavailable overview sources hide previous fee and history facts while retaining a safe way out', () => {
  for (const role of ['admin', 'teacher']) {
    for (const source of [fee, null]) {
      const html = feeUi.feeOverviewMarkup({fee: source, role, courseNames: ['OLD PRIVATE COURSE'], sourceError: 'Reload the fee to continue', history: {status: 'ready', records: [record]}});
      assert.match(html, /Fee details/);
      assert.match(html, /Reload the fee to continue/);
      assert.match(html, /data-action="fee-overview-close"/);
      assert.doesNotMatch(html, /Term fee|saved-fee|Earlier term fee|OLD PRIVATE COURSE|fee-overview-edit|fee-overview-pricing|fee-history-refresh/);
    }
  }
  assert.equal(feeUi.feeOverviewMarkup({role: 'admin', fee: null}), '');
  assert.equal(feeUi.feeOverviewMarkup({role: 'student', fee, sourceError: 'PRIVATE ERROR'}), '');
});

test('source-error pricing preserves an existing draft and offers reload without reviewing an invalid source', () => {
  for (const source of [fee, null]) {
    const html = render({fee: source, values, step: 'review', sourceError: 'Fee read failed'});
    assert.match(html, /value="950.50"/);
    assert.match(html, /value="2026-11-01"/);
    assert.match(html, /data-action="fee-pricing-refresh"/);
    assert.match(html, /data-step="edit"/);
    assert.match(html, /<button type="submit"[^>]*disabled[^>]*>Review<\/button>/);
    assert.doesNotMatch(html, /Term fee|saved-fee|Drawing|Watercolour|data-action="fee-pricing-back"/);
  }
});

test('missing historical prices and models stay unknown instead of borrowing the current fee', () => {
  const unknown = {id: 'legacy-row', version: 1, action: 'created', recordedAt: '2026-01-01T00:00:00Z', feeName: 'Old fee', pricing: {price: null, pricingModel: null}};
  const html = feeUi.feeOverviewMarkup({fee, role: 'admin', history: {status: 'ready', records: [unknown]}});
  const historyHtml = html.slice(html.indexOf('<ol class="fee-ui-history">'));
  assert.match(historyHtml, /Old fee/);
  assert.match(historyHtml, /Not provided/);
  assert.doesNotMatch(historyHtml, /HK\$850.00|Monthly fee by lesson count|60 minutes|2 months/);
});

test('overview does not show internal identifiers when a customer fee code is missing', () => {
  const html = feeUi.feeOverviewMarkup({fee: {...fee, feeCode: null}, role: 'admin', history: {status: 'ready', records: [record]}});
  assert.match(html, /<dt>Fee code<\/dt><dd>Not provided<\/dd>/);
  assert.doesNotMatch(html, /saved-fee|edit-3|Record ID/);
});

test('recorded edit actions use understandable labels and malformed timestamps stay unavailable', () => {
  for (const [action, label] of [['fee.create', 'Created'], ['fee.update', 'Updated'], ['course.create', 'Created'], ['course.update', 'Updated']]) {
    const html = feeUi.feeOverviewMarkup({fee, role: 'admin', history: {status: 'ready', records: [{...record, action}]}});
    assert.ok(html.includes(`<dt>Action</dt><dd>${label}</dd>`));
    assert.ok(!html.includes(action));
  }
  for (const time of [null, '', 'not a date', '2026-02-30T10:00:00.000Z', '2026-10-15', '2026-10-15T99:00:00Z', '2026-10-15T10:00:00Z" onclick="bad']) {
    const html = feeUi.feeOverviewMarkup({fee, role: 'admin', history: {status: 'ready', records: [{...record, recordedAt: time}]}});
    assert.match(html, /<dt>Recorded at<\/dt><dd>Not provided<\/dd>/);
    assert.doesNotMatch(html, /Invalid Date|<time|onclick/);
  }
  const unknownAction = feeUi.feeOverviewMarkup({fee, role: 'admin', history: {status: 'ready', records: [{...record, action: 'internal.engine.action'}]}});
  assert.match(unknownAction, /<dt>Action<\/dt><dd>Not provided<\/dd>/);
  assert.doesNotMatch(unknownAction, /internal.engine.action/);
});

test('known saved and historical prices remain visible beyond the new-price input limits', () => {
  for (const [price, label] of [[0, 'HK$0.00'], [1_500_000, 'HK$1,500,000.00']]) {
    const html = feeUi.feeOverviewMarkup({fee: {...fee, price}, role: 'admin', history: {status: 'ready', records: [{...record, pricing: {...record.pricing, price}}]}});
    assert.ok(html.includes(`<dt>Saved current price</dt><dd>${label}</dd>`), `saved ${price}`);
    assert.ok(html.includes(`<dt>Recorded price</dt><dd>${label}</dd>`), `history ${price}`);
    assert.equal(feeUi.validateFeePricingDraft({...values, futurePrice: String(price)}).valid, false, `new input ${price}`);
  }
  const html = feeUi.feeOverviewMarkup({fee, role: 'admin', history: {status: 'ready', records: [{...record, pricing: {...record.pricing, price: null}}]}});
  assert.match(html, /<dt>Recorded price<\/dt><dd>Not provided<\/dd>/);
});

test('both fee reading bodies provide a keyboard scroll stop',()=>{
 assert.match(feeUi.feeOverviewMarkup({fee,role:'admin'}),/class="fee-overview-body" tabindex="0"/);
 assert.match(feeUi.feePricingMarkup({fee,role:'admin',values,step:'review'}),/class="create-course-body fee-pricing-body" tabindex="0"/);
});
