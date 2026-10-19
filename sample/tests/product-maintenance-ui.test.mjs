import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceOperationsPreview, getOperationsPreviewData, operationsDialogMarkup, operationsPageMarkup} from '../client/operations-ui.js';

const en = {t: (_zh, english) => english}, zh = {t: chinese => chinese};
const product = {id: 'second-product', nameZh: '畫筆', nameEn: 'Brush', sku: 'B-02', category: 'custom-category', price: 0, cost: null, stock: 0, threshold: null, status: 'active', location: 'Shelf B', description: 'Detail text', descriptionEn: 'English details', remark: 'Separate remark'};
const first = {...product, id: 'first-product', sku: 'B-01', nameZh: '畫筆', nameEn: 'Brush'};
const source = () => ({lang: 'en', data: {...getOperationsPreviewData(), products: [{...first}, {...product}]}, query: 'brush', category: 'all', status: 'active', productSort: 'price', productDirection: 'desc', productPageSize: 10, productPage: 1});
const open = (state = source()) => advanceOperationsPreview(advanceOperationsPreview(state, 'view-product', {id: product.id}), 'edit-product', {id: product.id});
const draft = {nameZh: ' Brush revised ', nameEn: '', sku: '', category: '', price: '12.50', cost: '', stock: '', threshold: '', status: '', location: ' Shelf C ', description: ' Long\nnew details ', descriptionEn: '', remark: ' Separate\nremark '};
const submit = (state, values = draft) => advanceOperationsPreview(state, 'submit', {formKind: state.dialog.type, formSection: 'products', recordId: state.dialog.id || '', ...values});

test('exact detail shows optional metadata, known zero and unknown separately without borrowing the same-name first record', () => {
  const html = operationsDialogMarkup(advanceOperationsPreview(source(), 'view-product', {id: product.id}), en);
  assert.match(html, /B-02/); assert.doesNotMatch(html, /B-01/);
  assert.match(html, /HK\$0.00/); assert.match(html, /Not provided/);
  for (const value of ['Shelf B', 'Detail text', 'Separate remark']) assert.ok(html.includes(value));
});

test('unknown or duplicate existing product identities fail closed instead of opening an empty Create form', () => {
  for (const command of ['view-product', 'edit-product', 'stock-product']) {
    const state = advanceOperationsPreview(source(), command, {id: 'missing-product'}), html = operationsDialogMarkup(state, en);
    assert.doesNotMatch(html, /name="nameZh"|Create product|name="quantity"/);
    assert.match(html, /unavailable|cannot be read|not available/i);
    const duplicate = source(); duplicate.data.products.push({...product});
    assert.doesNotMatch(operationsDialogMarkup(advanceOperationsPreview(duplicate, command, {id: product.id}), en), /name="nameZh"|name="quantity"/);
  }
});

test('explicit Create starts with blank optional fields and no assumed inventory, category or status defaults', () => {
  const state = advanceOperationsPreview(source(), 'create-product'), html = operationsDialogMarkup(state, en);
  assert.match(html, /name="price"[^>]*value=""/);
  for (const name of ['nameZh', 'nameEn', 'sku', 'cost', 'stock', 'threshold', 'location']) assert.match(html, new RegExp(`name="${name}"[^>]*value=""`));
  assert.match(html, /id="ui-operations-form"[^>]*novalidate/);
  assert.match(html, /ops-product-body[^>]*tabindex="0"/);
  assert.doesNotMatch(html, /name="stock"[^>]*value="0"|value="materials" selected|value="draft" selected/);
});

test('a single product name and price can reach Review with every optional raw field retained and no source mutation', () => {
  const initial = source(), before = JSON.stringify(initial), opened = open(initial), reviewed = submit(opened);
  assert.equal(reviewed.dialog.type, 'product-review');
  assert.equal(reviewed.dialog.id, product.id);
  assert.equal(reviewed.dialog.returnTo.type, 'edit-product');
  assert.equal(reviewed.dialog.returnTo.returnTo.id, product.id);
  assert.deepEqual(reviewed.dialog.values, draft);
  assert.deepEqual(reviewed.data.products, initial.data.products);
  assert.equal(JSON.stringify(initial), before);
  const html = operationsDialogMarkup(reviewed, en);
  assert.match(html, /Review product/); assert.match(html, /data-ui-command="product-back"/);
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled|<button type="submit"[^>]*disabled/);
  assert.match(html, /Product has not been saved/);
  assert.doesNotMatch(reviewed.notice, /updated|created|saved|成功/i);
});

test('Back preserves the entire raw draft and Cancel restores the exact detail or original list context', () => {
  let reviewed = submit(open()), back = advanceOperationsPreview(reviewed, 'product-back');
  assert.equal(back.dialog.type, 'edit-product'); assert.deepEqual(back.dialog.values, draft);
  assert.match(operationsDialogMarkup(back, en), /value=" Shelf C "/);
  assert.equal(advanceOperationsPreview(back, 'cancel-product').dialog.id, product.id);
  assert.equal(advanceOperationsPreview(reviewed, 'cancel-product').dialog.id, product.id);
  const direct = submit(advanceOperationsPreview(source(), 'edit-product', {id: product.id}));
  assert.equal(advanceOperationsPreview(direct, 'cancel-product').dialog, null);
  const create = submit(advanceOperationsPreview(source(), 'create-product'));
  assert.equal(advanceOperationsPreview(create, 'cancel-product').dialog, null);
  for (const key of ['query', 'category', 'status', 'productSort', 'productDirection', 'productPageSize', 'productPage']) assert.equal(back[key], source()[key]);
});

test('native draft updates patch known raw fields without advancing, inventing defaults or accepting identity fields', () => {
  const opened = open(), changed = advanceOperationsPreview(opened, 'product-draft', {location: 'New shelf', price: '', recordId: first.id, id: first.id, nameZh: '新名稱', unknownField: 'ignored'});
  assert.equal(changed.dialog.type, 'edit-product'); assert.equal(changed.dialog.id, product.id);
  assert.equal(changed.dialog.values.location, 'New shelf'); assert.equal(changed.dialog.values.price, '');
  assert.equal(changed.dialog.values.nameZh, '新名稱'); assert.equal(changed.dialog.values.nameEn, 'Brush');
  assert.equal(changed.dialog.values.unknownField, undefined);
  assert.deepEqual(changed.data.products, opened.data.products);
});

test('validation accepts optional translations and explicit zero but retains invalid field input for correction', () => {
  const opened = open();
  assert.equal(submit(opened, {...draft, nameZh: '', nameEn: 'English only', price: '0', cost: '0', stock: '0', threshold: '0'}).dialog.type, 'product-review');
  for (const [field, value] of [['price', ''], ['price', '1e2'], ['price', '-1'], ['price', '1.234'], ['stock', '1.5'], ['cost', '-1'], ['threshold', 'NaN']]) {
    const invalid = submit(opened, {...draft, [field]: value});
    assert.equal(invalid.dialog.type, 'edit-product'); assert.ok(invalid.error);
    assert.equal(invalid.dialog.values[field], value); assert.equal(invalid.productErrorField, field);
    assert.match(operationsDialogMarkup(invalid, en), /id="ops-product-error"/);
  }
  assert.ok(submit(opened, {...draft, nameZh: ' ', nameEn: ''}).error);
});

test('the two optional language fields clearly explain that at least one name is required without marking one specific language mandatory', () => {
  for (const context of [en, zh]) {
    const html = operationsDialogMarkup(open(), context);
    assert.match(html, /At least one name is required|請至少填寫一個名稱/);
    assert.doesNotMatch(html, /Name \*|產品名稱 \*/);
    assert.match(html, /id="ops-product-name-note"/);
    assert.match(html, /name="nameZh"/); assert.match(html, /name="nameEn"/);
  }
});

test('unrepresentable monetary input stays editable with its exact raw value instead of reviewing a rounded different amount', () => {
  const opened = open(), initial = JSON.stringify(opened.data.products);
  for (const field of ['price', 'cost']) {
    const raw = '90071992547409.91', invalid = submit(opened, {...draft, [field]: raw});
    assert.equal(invalid.dialog.type, 'edit-product');
    assert.equal(invalid.productErrorField, field);
    assert.equal(invalid.dialog.values[field], raw);
    assert.match(operationsDialogMarkup(invalid, en), /cannot be represented accurately/);
    assert.equal(JSON.stringify(invalid.data.products), initial);
  }
  for (const [raw, shown] of [['0.29', 'HK$0.29'], ['0.00', 'HK$0.00'], ['.5', 'HK$0.50']]) {
    const reviewed = submit(opened, {...draft, price: raw, cost: raw});
    assert.equal(reviewed.dialog.type, 'product-review');
    assert.equal(reviewed.dialog.values.price, raw);
    assert.ok(operationsDialogMarkup(reviewed, en).includes(shown));
  }
});

test('only a nonblank duplicate Code in the provided cohort blocks Review, keeping exact product identity', () => {
  const opened = open();
  assert.equal(submit(opened, {...draft, sku: ''}).dialog.type, 'product-review');
  assert.equal(submit(opened, {...draft, sku: 'B-02'}).dialog.type, 'product-review');
  const invalid = submit(opened, {...draft, sku: ' b-01 '});
  assert.equal(invalid.dialog.type, 'edit-product'); assert.equal(invalid.productErrorField, 'sku');
  assert.equal(invalid.dialog.values.sku, ' b-01 ');
});

test('forged final submit, save or create commands never create or update a source record', () => {
  const reviewed = submit(open()), before = JSON.stringify(reviewed.data.products);
  for (const command of ['submit', 'save', 'form-submit', 'product-review']) {
    const next = advanceOperationsPreview(reviewed, command, {formKind: 'product-review', recordId: product.id, ...draft});
    assert.equal(JSON.stringify(next.data.products), before);
    assert.equal(next.dialog.type, 'product-review');
    assert.doesNotMatch(next.notice, /updated|created|saved|成功/i);
  }
  const mismatched = advanceOperationsPreview(open(), 'submit', {formKind: 'edit-product', recordId: first.id, ...draft});
  assert.deepEqual(mismatched.data.products, source().data.products);
  assert.notEqual(mismatched.dialog?.type, 'product-review');
});

test('ready empty, filtered empty, loading, error and unavailable sources are distinct and never borrow fixtures', () => {
  const empty = source(); empty.data.products = [];
  assert.match(operationsPageMarkup('products', empty, en), /Add product details, pricing and manage product inventory/);
  assert.match(operationsPageMarkup('products', {...source(), query: 'none-match'}, en), /No matching products/);
  for (const status of ['loading', 'error', 'unavailable']) {
    const state = {...source(), productSource: {status, error: 'Read failed'}};
    const html = operationsPageMarkup('products', state, en);
    assert.doesNotMatch(html, /Brush|Showing 0|Showing 1|data-ui-command="create-product"/);
    assert.match(html, status === 'loading' ? /Loading products/ : status === 'error' ? /Read failed/ : /Product data is unavailable/);
    assert.notEqual(advanceOperationsPreview(state, 'edit-product', {id: product.id}).dialog?.type, 'edit-product');
  }
});

test('source read failure preserves an existing editor draft and blocks review without turning it into a blank create', () => {
  const opened = advanceOperationsPreview(open(), 'product-draft', draft), failed = {...opened, productSource: {status: 'error', error: 'Read failed'}};
  const html = operationsDialogMarkup(failed, en);
  assert.match(html, /Read failed/); assert.match(html, /value=" Shelf C "/);
  assert.match(html, /type="submit"[^>]*disabled/);
  const next = submit(failed);
  assert.equal(next.dialog.type, 'edit-product'); assert.deepEqual(next.dialog.values, draft);
  assert.deepEqual(next.data.products, failed.data.products);
});

test('zero and unknown selling price cost inventory and threshold remain distinct in product details and list', () => {
  const data = source(); data.data.products = [{...product, price: null, cost: undefined, stock: null, threshold: undefined}];
  const detail = operationsDialogMarkup(advanceOperationsPreview(data, 'view-product', {id: product.id}), en), list = operationsPageMarkup('products', data, en);
  assert.match(detail, /Not provided/); assert.doesNotMatch(detail, /HK\$0.00|Current stock<\/dt><dd>0|Reorder level<\/dt><dd>0/);
  assert.doesNotMatch(list, /HK\$0.00|class="ops-badge[^"]*"[^>]*>Out of stock<\/span>/);
});

test('customer product surfaces have no redundant category subtitle and escape long fields in both languages', () => {
  const original = source(); original.data.products = [{...product, location: '<script>unsafe</script>', remark: 'Long & "remark" '.repeat(20)}];
  const before = JSON.stringify(original);
  for (const context of [en, zh]) {
    const html = operationsDialogMarkup(advanceOperationsPreview(original, 'view-product', {id: product.id}), context);
    assert.match(html, /&lt;script&gt;unsafe&lt;\/script&gt;/); assert.match(html, /Long &amp; &quot;remark&quot;/);
    assert.doesNotMatch(html, /<script|href=/);
  }
  assert.doesNotMatch(operationsPageMarkup('products', original, en), /Materials, kits and accessories|Review restocking needs/);
  assert.equal(JSON.stringify(original), before);
});

test('unknown stock cannot be adjusted by visible or forged submissions and known stock reaches a nonmutating review', () => {
  for (const stock of [null, undefined, NaN, Infinity, -1, .5]) {
    const initial = source(); initial.data.products[1].stock = stock;
    const opened = advanceOperationsPreview(initial, 'stock-product', {id: product.id});
    assert.doesNotMatch(operationsDialogMarkup(opened, en), /name="quantity"/);
    const before = JSON.stringify(opened.data.products), result = advanceOperationsPreview(opened, 'submit', {formKind: 'stock-product', recordId: product.id, quantity: '2', direction: 'add'});
    assert.equal(JSON.stringify(result.data.products), before);
    assert.ok(result.error);
  }
  const reviewed = submit(open()), forged = advanceOperationsPreview(reviewed, 'submit', {formKind: 'stock-product', recordId: product.id, quantity: '2', direction: 'add'});
  assert.deepEqual(forged.data.products, reviewed.data.products);
  const initial = source(); initial.data.products[1].stock = 4;
  const opened = advanceOperationsPreview(initial, 'stock-product', {id: product.id}), adjusted = advanceOperationsPreview(opened, 'submit', {formKind: 'stock-product', recordId: product.id, quantity: '2', direction: 'add'});
  assert.equal(adjusted.data.products[1].stock, 4);
  assert.equal(adjusted.dialog.type, 'stock-product-review');
  assert.equal(initial.data.products[1].stock, 4);
});

test('stock adjustment reviews known zero with original quantity, result and raw reason but never updates source stock', () => {
  const initial = advanceOperationsPreview(source(), 'view-product', {id: product.id}), before = JSON.stringify(initial.data.products);
  const opened = advanceOperationsPreview(initial, 'stock-product', {id: product.id});
  const values = {direction: 'add', quantity: '003', reason: ' Shelf <B>\n receipt '};
  const reviewed = advanceOperationsPreview(opened, 'submit', {formKind: 'stock-product', recordId: product.id, ...values});
  assert.equal(reviewed.dialog.type, 'stock-product-review');
  assert.deepEqual(reviewed.dialog.values, values);
  assert.deepEqual(reviewed.dialog.returnTo, {...opened.dialog, values});
  assert.equal(JSON.stringify(reviewed.data.products), before);
  assert.doesNotMatch(reviewed.notice, /updated|saved|已更新|成功/i);
  for (const context of [en, zh]) {
    const html = operationsDialogMarkup(reviewed, context);
    assert.match(html, /name="formKind" value="stock-product-review"/);
    assert.match(html, /data-ui-command="stock-product-back"/);
    assert.match(html, /type="submit"[^>]*disabled/);
    assert.match(html, /Shelf &lt;B&gt;\n receipt/);
    assert.match(html, /<dd>0<\/dd>/); assert.match(html, /<dd>3<\/dd>/);
    assert.doesNotMatch(html, /preview updated|Changes are for this demo|<B>/);
  }
});

test('stock Back and Cancel retain raw draft and return to the exact originating detail or filtered list', () => {
  for (const fromDetail of [false, true]) {
    const initial = fromDetail ? advanceOperationsPreview(source(), 'view-product', {id: product.id}) : source();
    const opened = advanceOperationsPreview(initial, 'stock-product', {id: product.id});
    const values = {direction: 'add', quantity: '02', reason: ' raw reason '};
    const updated = advanceOperationsPreview(opened, 'stock-product-draft', {...values, id: first.id, recordId: first.id});
    assert.equal(updated.dialog.id, product.id); assert.deepEqual(updated.dialog.values, values);
    const reviewed = advanceOperationsPreview(updated, 'submit', {formKind: 'stock-product', recordId: product.id, ...values});
    const back = advanceOperationsPreview(reviewed, 'stock-product-back');
    assert.deepEqual(back.dialog, updated.dialog);
    assert.match(operationsDialogMarkup(back, en), /name="quantity"[^>]*value="02"/);
    for (const state of [reviewed, back]) {
      const cancelled = advanceOperationsPreview(state, 'cancel-product');
      assert.deepEqual(cancelled.dialog, fromDetail ? {type: 'product', id: product.id} : null);
      for (const key of ['query', 'category', 'status', 'productSort', 'productDirection', 'productPageSize', 'productPage']) assert.equal(cancelled[key], initial[key]);
    }
  }
});

test('stock Review requires safe positive whole quantity and does not allow an excessive decrease or arithmetic overflow', () => {
  const initial = source(); initial.data.products[1].stock = 4;
  const opened = advanceOperationsPreview(initial, 'stock-product', {id: product.id});
  for (const [quantity, direction] of [['', 'add'], ['1e1', 'add'], ['1.5', 'add'], ['-1', 'add'], ['0', 'add'], ['9007199254740992', 'add'], ['9007199254740991', 'add'], ['5', 'remove'], ['1', 'invented']]) {
    const invalid = advanceOperationsPreview(opened, 'submit', {formKind: 'stock-product', recordId: product.id, quantity, direction, reason: ' preserve '});
    assert.equal(invalid.dialog.type, 'stock-product'); assert.ok(invalid.error);
    assert.equal(invalid.dialog.values.quantity, quantity); assert.equal(invalid.dialog.values.reason, ' preserve ');
    assert.equal(invalid.data.products[1].stock, 4);
    assert.match(operationsDialogMarkup(invalid, en), /id="ops-product-error"/);
  }
  const reviewed = advanceOperationsPreview(opened, 'submit', {formKind: 'stock-product', recordId: product.id, quantity: '4', direction: 'remove', reason: ''});
  assert.equal(reviewed.dialog.type, 'stock-product-review');
  assert.match(operationsDialogMarkup(reviewed, en), /<dd>0<\/dd>/);
});

test('stock source errors keep typed raw input even when the source cohort is unavailable and prevent Review', () => {
  const opened = advanceOperationsPreview(source(), 'stock-product', {id: product.id});
  const values = {direction: 'add', quantity: '007', reason: ' Keep draft\n please '};
  const updated = advanceOperationsPreview(opened, 'stock-product-draft', values);
  const failed = {...updated, data: {...updated.data, products: []}, productSource: {status: 'error', error: 'Read failed'}};
  const html = operationsDialogMarkup(failed, en);
  assert.match(html, /Read failed/); assert.match(html, /name="quantity"[^>]*value="007"/);
  assert.match(html, /Keep draft\n please/); assert.match(html, /type="submit"[^>]*disabled/);
  const blocked = advanceOperationsPreview(failed, 'submit', {formKind: 'stock-product', recordId: product.id, ...values});
  assert.equal(blocked.dialog.type, 'stock-product'); assert.deepEqual(blocked.dialog.values, values);
  assert.deepEqual(blocked.data.products, []);
});

test('stock review and forged maintenance commands cannot save an adjustment or claim success', () => {
  const opened = advanceOperationsPreview(source(), 'stock-product', {id: product.id});
  const reviewed = advanceOperationsPreview(opened, 'submit', {formKind: 'stock-product', recordId: product.id, quantity: '2', direction: 'add', reason: ''});
  for (const command of ['submit', 'save', 'form-submit', 'stock-product-review']) {
    const result = advanceOperationsPreview(reviewed, command, {formKind: 'stock-product-review', recordId: product.id, quantity: '8', direction: 'add'});
    assert.deepEqual(result.data.products, source().data.products);
    assert.equal(result.dialog.type, 'stock-product-review');
    assert.doesNotMatch(result.notice, /updated|saved|成功/i);
  }
  const forged = advanceOperationsPreview(reviewed, 'submit', {formKind: 'stock-product', recordId: product.id, quantity: '8', direction: 'add'});
  assert.deepEqual(forged.data.products, source().data.products);
  assert.equal(forged.dialog.type, 'stock-product-review');
});
