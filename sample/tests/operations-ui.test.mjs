import test from 'node:test';
import assert from 'node:assert/strict';
import {operationsPageMarkup,operationsDialogMarkup,getOperationsPreviewData} from '../client/operations-ui.js';
const ctx={t:(_z,e)=>e};
test('operations workspaces use clean customer-facing sample content and useful action entries',()=>{for(const locale of [ctx,{t:z=>z}])for(const section of ['products','accounting','messages','channels','settings']){const html=operationsPageMarkup(section,{},locale);assert.match(html,/data-action="ui-operations"/);assert.doesNotMatch(html,/ops-preview-note|Fictional sample records|（虛構）|\(fictional\)|undefined|NaN|href="http|<img/);}});
test('product search and category filters narrow the supplied preview records and preserve explicit empty state',()=>{let html=operationsPageMarkup('products',{query:'watercolour'},ctx);assert.match(html,/Watercolour set/);assert.doesNotMatch(html,/Sketchbook A4/);html=operationsPageMarkup('products',{query:'unfindable'},ctx);assert.match(html,/No matching products/);assert.match(html,/clear-filters/);});
test('accounting has separate invoice payment and credit views without pretending preview actions are settled payments',()=>{for(const accountingTab of ['invoices','payments','credits']){const html=operationsPageMarkup('accounting',{accountingTab},ctx);assert.match(html,/Invoices/);assert.match(html,/Payments/);assert.match(html,/Credits/);assert.match(html,/Showing \d+ records?/);assert.doesNotMatch(html,/PREVIEW-(?:INV|PAY|CR)|\(fictional\)/);}const invoice=operationsDialogMarkup({dialog:{type:'invoice',id:'invoice-1'}},ctx);assert.match(invoice,/Line total/);assert.match(invoice,/Balance due/);assert.doesNotMatch(invoice,/data-ui-command="confirm-payment"|Download PDF/);});
test('product invoice payment and credit forms use ordinary submit labels and complete fields',()=>{for(const type of ['create-product','edit-product','stock-product','create-invoice','record-payment','create-credit']){const html=operationsDialogMarkup({dialog:{type,id:type.includes('product')?'product-1':'invoice-1'}},ctx);assert.match(html,/id="ui-operations-form"/);assert.match(html,/name="formKind"/);assert.match(html,/name="formSection"/);assert.doesNotMatch(html,/ops-dialog-disclosure/);assert.match(html,/<button type="submit" class="ops-primary">(?:Save|Create product|Review|Review adjustment)<\/button>/);assert.match(html,/<label/);assert.match(html,new RegExp('data-ui-command="'+(type.includes('product')?'cancel-product':'cancel-accounting')+'"'));}});
test('message workspace includes separate conversation list and thread, composer never claims delivery',()=>{const html=operationsPageMarkup('messages',{selectedThreadId:'thread-1'},ctx);assert.match(html,/Conversation list/);assert.match(html,/Message history/);assert.match(html,/name="message"/);assert.match(html,/Preview reply/);assert.doesNotMatch(html,/Sent successfully|Message sent|href="https:\/\//);const compose=operationsDialogMarkup({dialog:{type:'compose'}},ctx);assert.match(compose,/name="recipient"/);assert.match(compose,/name="subject"/);assert.match(compose,/name="message"/);});
test('channels detail and settings do not bind real providers or expose external links',()=>{const html=operationsPageMarkup('channels',{},ctx);for(const title of ['Student portal','WhatsApp','Email','Online store'])assert.match(html,new RegExp(title));const detail=operationsDialogMarkup({dialog:{type:'channel-settings',id:'whatsapp'}},ctx);assert.match(detail,/name="senderName"/);assert.match(detail,/Settings/);assert.match(detail,/>Save settings<\/button>/);assert.doesNotMatch(detail,/href=|token|API key/);});
test('settings categories have substantive forms, proper selected state and conservative notification payment defaults',()=>{for(const settingsTab of ['general','courses','notifications','payments','templates']){const html=operationsPageMarkup('settings',{settingsTab},ctx);assert.match(html,/id="ui-operations-settings"/);assert.match(html,/aria-current="page"/);assert.match(html,/name="formKind" value="settings"/);}assert.match(operationsPageMarkup('settings',{settingsTab:'payments'},ctx),/Manual verification/);});
test('all display inputs are escaped and each preview dataset copy is independent',()=>{const first=getOperationsPreviewData(),second=getOperationsPreviewData();first.products[0].nameEn='<script>bad()</script>';assert.notEqual(first.products[0].nameEn,second.products[0].nameEn);const html=operationsPageMarkup('products',{data:first},ctx);assert.match(html,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>bad/);});
test('Chinese uses localized navigation and natural product labels',()=>{const zh={t:z=>z};assert.match(operationsPageMarkup('products',{},zh),/產品/);assert.match(operationsPageMarkup('settings',{settingsTab:'notifications'},zh),/通知設定/);});

test('product creation reaches an unsaved review without mutating the source or inventing a saved row',async()=>{
 const {advanceOperationsPreview}=await import('../client/operations-ui.js');
 const state={data:getOperationsPreviewData(),dialog:{type:'create-product'}},before=JSON.stringify(state);
 const reviewed=advanceOperationsPreview(state,'submit',{formKind:'create-product',formSection:'products',nameZh:'畫筆',nameEn:'Brush',sku:'NEW-BRUSH',category:'materials',price:'25',cost:'12',stock:'10',threshold:'3',status:'active'});
 assert.equal(JSON.stringify(state),before);assert.deepEqual(reviewed.data,state.data);
 assert.equal(reviewed.dialog.type,'product-review');assert.equal(reviewed.dialog.values.sku,'NEW-BRUSH');
 const html=operationsDialogMarkup(reviewed,ctx);assert.match(html,/has not been saved/);assert.match(html,/<button[^>]*disabled[^>]*>Save product/);
 const invalid=advanceOperationsPreview(state,'submit',{formKind:'create-product',nameZh:'',nameEn:''});
 assert.ok(invalid.error);assert.deepEqual(invalid.data,state.data);assert.match(operationsDialogMarkup(invalid,ctx),/role="alert"[^>]*>[^<]+/);
});
test('preview payment record does not silently mark the linked invoice paid and compose only opens a preview',async()=>{const {advanceOperationsPreview}=await import('../client/operations-ui.js'),state={data:getOperationsPreviewData(),dialog:{type:'record-payment'}};const next=advanceOperationsPreview(state,'submit',{formKind:'record-payment',invoiceId:'invoice-1',amount:'100',date:'2026-10-15',method:'fps'});assert.equal(next.data.invoices.find(row=>row.id==='invoice-1').status,'awaiting-payment');assert.equal(next.data.payments.length,state.data.payments.length);assert.equal(next.dialog.type,'accounting-entry-review');const message=advanceOperationsPreview({...state,dialog:{type:'compose'}},'submit',{formKind:'compose',recipient:state.data.threads[0].id,subject:'Example',message:'Preview text'});assert.equal(message.dialog.type,'message-preview');assert.equal(message.data.threads[0].messages.length,3);});

test('invoice and payment details keep PDF Receipt entry with separate Save and Send by Email preview options',()=>{for(const [type,id] of [['invoice','invoice-1'],['payment','payment-1']])assert.match(operationsDialogMarkup({dialog:{type,id}},ctx),/PDF Receipt/);const options=operationsDialogMarkup({dialog:{type:'receipt-options',id:'invoice-1'}},ctx);assert.match(options,/Save/);assert.match(options,/Send by Email/);const email=operationsDialogMarkup({dialog:{type:'receipt-email',id:'invoice-1'}},ctx);for(const name of ['recipientEmail','subject','body','templateId','attachmentName'])assert.match(email,new RegExp('name="'+name+'"'));assert.match(email,/not been generated|not generated|not sent/i);});
test('settings cover coupons, preset email templates and bounded public slot visibility',()=>{for(const settingsTab of ['coupons','email-templates','public-visibility']){const html=operationsPageMarkup('settings',{settingsTab},ctx);assert.match(html,/aria-current="page"/);assert.doesNotMatch(html,/undefined|NaN/);}assert.match(operationsPageMarkup('settings',{settingsTab:'coupons'},ctx),/STUDIO10/);assert.match(operationsPageMarkup('settings',{settingsTab:'email-templates'},ctx),/Payment request/);assert.match(operationsPageMarkup('settings',{settingsTab:'public-visibility'},ctx),/name="publicDays"[^>]*min="7"[^>]*max="30"/);});
test('receipt email and Save remain preview states without creating a document, delivery or a paid invoice',async()=>{const {advanceOperationsPreview}=await import('../client/operations-ui.js'),state={data:getOperationsPreviewData(),dialog:{type:'receipt-email',id:'invoice-1'}};let next=advanceOperationsPreview(state,'submit',{formKind:'receipt-email',recordId:'invoice-1',recipientEmail:'family@example.test',subject:'Example',body:'Example body',attachmentName:'example.pdf'});assert.equal(next.dialog.type,'receipt-email-preview');assert.equal(next.data.invoices[0].status,state.data.invoices[0].status);assert.match(operationsDialogMarkup(next,ctx),/not been sent/);next=advanceOperationsPreview(state,'submit',{formKind:'receipt-save',recordId:'invoice-1',filename:'example.pdf',paperSize:'A4'});assert.equal(next.dialog.type,'receipt-save-preview');assert.match(operationsDialogMarkup(next,ctx),/not been generated/);});


test('sample records read naturally while unconnected actions retain truthful outcomes',async()=>{
 const data=getOperationsPreviewData();for(const student of data.students)assert.doesNotMatch(student.nameZh+student.nameEn,/虛構|fictional|preview/i);
 for(const row of data.products)assert.doesNotMatch(row.description+row.descriptionEn,/虛構|fictional/i);
 for(const [type,id] of [['product','product-1'],['invoice','invoice-1'],['payment','payment-1']])assert.doesNotMatch(operationsDialogMarkup({dialog:{type,id}},ctx),/ops-eyebrow|\(fictional\)|（虛構）/);
 const {advanceOperationsPreview}=await import('../client/operations-ui.js'),state={data,dialog:{type:'compose'}};
 const message=advanceOperationsPreview(state,'submit',{formKind:'compose',recipient:'Chloe’s parent',subject:'Lesson reminder',message:'See you on Friday.'});
 assert.match(operationsDialogMarkup(message,ctx),/has not been sent/);assert.equal(message.data.threads[0].messages.length,data.threads[0].messages.length);
 const payment=advanceOperationsPreview(state,'submit',{formKind:'record-payment',invoiceId:'invoice-1',amount:'100',date:'2026-10-15',method:'fps'});
 assert.equal(payment.data.invoices[0].status,'awaiting-payment');assert.equal(payment.data.payments.length,data.payments.length);assert.doesNotMatch(payment.notice,/created|added|已建立|已加入/i);
});


test('settings show normal save controls and disclose sample-only changes after submission',async()=>{
 for(const locale of [ctx,{t:z=>z}])for(const settingsTab of ['general','courses','notifications','payments','templates','public-visibility']){
  const html=operationsPageMarkup('settings',{settingsTab},locale);
  assert.match(html,/<button class="ops-primary" type="submit">(?:Save settings|儲存設定)<\/button>/);
  assert.doesNotMatch(html,/Updates this interface preview only|Update settings preview|只更新此介面預覽|更新設定預覽|ops-dialog-disclosure/);
 }
 const {advanceOperationsPreview}=await import('../client/operations-ui.js'),state={lang:'en',data:getOperationsPreviewData(),settingsTab:'general'};
 const saved=advanceOperationsPreview(state,'submit',{formKind:'settings',settingsTab:'general',studioName:'Beamal Studio'});
 assert.equal(saved.data.settings.general.studioName,'Beamal Studio');assert.equal(state.data.settings.general.studioName,'Beamal Art Studio');
 assert.equal(saved.notice,'Sample updated; system settings were not changed.');
 for(const type of ['create-coupon','edit-coupon','edit-email-template','receipt-save']){
  const html=operationsDialogMarkup({dialog:{type,id:type==='edit-email-template'?'email-template-1':type==='receipt-save'?'invoice-1':'coupon-1'}},ctx);
  assert.match(html,/<button type="submit" class="ops-primary">(?:Save coupon|Save template|Save settings)<\/button>/);
 }
});

test('product detail edit cancellation returns to the same product and keeps the filtered list unchanged',async()=>{
 const {advanceOperationsPreview}=await import('../client/operations-ui.js');
 const source={lang:'en',data:getOperationsPreviewData(),query:'watercolour',status:'active',category:'materials'},before=JSON.stringify(source);
 let state=advanceOperationsPreview(source,'view-product',{id:'product-2'});
 state=advanceOperationsPreview(state,'edit-product',{id:'product-2'});
 for(const locale of [ctx,{t:z=>z}]){
  const html=operationsDialogMarkup(state,locale);
  assert.match(html,/name="sku"[^>]*value="ART-002"/);
  assert.match(html,/data-ui-command="cancel-product"[^>]*>(Cancel|取消)<\/button>/);
 }
 state=advanceOperationsPreview(state,'submit',{formKind:'edit-product',recordId:'product-2',nameZh:'修改名稱',nameEn:'Revised watercolour',sku:'ART-001',category:'materials',price:'0',cost:'0',stock:'0',threshold:'0',status:'active',description:'Typed description',descriptionEn:'Typed English description'});
 assert.ok(state.error);
 assert.match(operationsDialogMarkup(state,ctx),/name="nameEn"[^>]*value="Revised watercolour"/);
 assert.match(operationsDialogMarkup(state,ctx),/name="price"[^>]*value="0"/);
 state=advanceOperationsPreview(state,'cancel-product');
 assert.equal(state.dialog.type,'product');
 assert.equal(state.dialog.id,'product-2');
 assert.equal(state.error,'');
 assert.equal(state.draft && Object.keys(state.draft).length,0);
 assert.match(operationsDialogMarkup(state,ctx),/Watercolour set/);
 assert.doesNotMatch(operationsDialogMarkup(state,ctx),/Revised watercolour/);
 state=advanceOperationsPreview(state,'close');
 assert.equal(state.dialog,null);
 assert.deepEqual([state.query,state.status,state.category],['watercolour','active','materials']);
 const page=operationsPageMarkup('products',state,ctx);
 assert.match(page,/Watercolour set/);
 assert.doesNotMatch(page,/Sketchbook A4/);
 assert.equal(JSON.stringify(source),before);
});

test('stock validation retains the entered quantity and cancellation never changes the original stock',async()=>{
 const {advanceOperationsPreview}=await import('../client/operations-ui.js');
 const source={lang:'en',data:getOperationsPreviewData(),query:'watercolour',status:'active',category:'materials'};
 let state=advanceOperationsPreview(advanceOperationsPreview(source,'view-product',{id:'product-2'}),'stock-product',{id:'product-2'});
 for(const quantity of [0,'']){
  const invalid=advanceOperationsPreview(state,'submit',{formKind:'stock-product',recordId:'product-2',direction:'remove',quantity,reason:'Typed reason'});
  assert.ok(invalid.error);
  assert.match(operationsDialogMarkup(invalid,ctx),new RegExp('name="quantity"[^>]*value="'+quantity+'"'));
  assert.match(operationsDialogMarkup(invalid,ctx),/value="remove" selected/);
  assert.match(operationsDialogMarkup(invalid,ctx),/Typed reason/);
  assert.equal(invalid.data.products.find(row=>row.id==='product-2').stock,4);
  const cancelled=advanceOperationsPreview(invalid,'cancel-product');
  assert.equal(cancelled.dialog.id,'product-2');
  assert.equal(cancelled.dialog.type,'product');
  assert.equal(cancelled.data.products.find(row=>row.id==='product-2').stock,4);
 }
 state=advanceOperationsPreview(state,'submit',{formKind:'stock-product',recordId:'product-2',direction:'remove',quantity:'2',reason:'Class materials'});
 assert.equal(state.dialog.type,'stock-product-review');
 assert.equal(state.dialog.id,'product-2');
 assert.equal(state.data.products.find(row=>row.id==='product-2').stock,4);
 assert.match(operationsDialogMarkup(state,ctx),/Review stock adjustment/);
 assert.match(operationsDialogMarkup(state,ctx),/type="submit"[^>]*disabled/);
 assert.equal(source.data.products.find(row=>row.id==='product-2').stock,4);
 assert.deepEqual([state.query,state.status,state.category],['watercolour','active','materials']);
 assert.doesNotMatch(state.notice,/updated|saved|成功/i);
});

test('direct list edits cancel to the list and editing preserves row order and stable product identity',async()=>{
 const {advanceOperationsPreview}=await import('../client/operations-ui.js');
 const source={lang:'en',data:getOperationsPreviewData(),query:'watercolour',status:'active',category:'materials'};
 const opened=advanceOperationsPreview(source,'edit-product',{id:'product-2'});
 assert.match(operationsDialogMarkup(opened,ctx),/data-ui-command="cancel-product"/);
 assert.equal(advanceOperationsPreview(opened,'cancel-product').dialog,null);
 const state=advanceOperationsPreview(opened,'submit',{formKind:'edit-product',recordId:'product-2',nameZh:'水彩套裝更新',nameEn:'Watercolour set revised',sku:'ART-002',category:'materials',price:'130',cost:'72',stock:'4',threshold:'6',status:'active'});
 assert.deepEqual(state.data.products.map(row=>row.id),source.data.products.map(row=>row.id));
 assert.equal(state.data.products.find(row=>row.id==='product-2').price,128);
 assert.equal(state.dialog.type,'product-review');assert.equal(state.dialog.values.price,'130');
 assert.equal(source.data.products.find(row=>row.id==='product-2').price,128);
 assert.equal(state.dialog.id,'product-2');
 assert.match(operationsDialogMarkup(state,ctx),/Watercolour set revised/);
 assert.match(operationsDialogMarkup(state,ctx),/has not been saved/);
 assert.deepEqual(state.data.products,source.data.products);
});

test('product form close icon and Cancel share one return command and reject mismatched product parents',async()=>{
 const {advanceOperationsPreview}=await import('../client/operations-ui.js');
 const source={data:getOperationsPreviewData()};
 for(const command of ['create-product','edit-product','stock-product']){
  const state=advanceOperationsPreview(source,command,{id:command==='create-product'?'':'product-2'});
  for(const locale of [ctx,{t:z=>z}]){
   const html=operationsDialogMarkup(state,locale);
   assert.match(html,/<header>[\s\S]*?data-ui-command="cancel-product"[^>]*aria-label="(?:Cancel|取消)"[^>]*>×<\/button><\/header>/);
   assert.match(html,/<footer[^>]*>[\s\S]*?data-ui-command="cancel-product"[^>]*>(?:Cancel|取消)<\/button>/);
  }
 }
 const mismatched={...source,dialog:{type:'edit-product',id:'product-2',returnTo:{type:'product',id:'product-1'}}};
 assert.equal(advanceOperationsPreview(mismatched,'cancel-product').dialog,null);
});

function productCatalogue(){
 const data=getOperationsPreviewData();
 data.products=Array.from({length:27},(_,index)=>({id:`catalogue-${index+1}`,nameZh:`產品 ${index+1}`,nameEn:`Product ${index+1}`,sku:`ITEM-${index+1}`,category:index<22?'materials':'kits',status:index===26?'draft':'active',price:(28-index)*2.5,cost:1,stock:index+1,threshold:3,description:'',descriptionEn:''})).reverse();
 return data;
}
const listedProductIds=html=>[...html.matchAll(/data-ui-command="view-product"[^>]*data-ui-id="([^"]+)"/g)].map(match=>match[1]);

test('product lists use numeric sorting, accessible sort headers and bounded pages without changing record order',async()=>{
 const {advanceOperationsPreview}=await import('../client/operations-ui.js');
 const data=productCatalogue(),source={lang:'en',data},before=JSON.stringify(source);
 let state=advanceOperationsPreview(source,'product-sort',{id:'price'});
 let html=operationsPageMarkup('products',state,ctx);
 assert.deepEqual(listedProductIds(html),Array.from({length:20},(_,index)=>`catalogue-${27-index}`));
 assert.match(html,/aria-sort="ascending"[^>]*>[\s\S]*?data-ui-id="price"/);
 assert.match(html,/Showing 1–20 of 27 products/);
 state=advanceOperationsPreview(state,'product-page',{value:'2'});
 html=operationsPageMarkup('products',state,ctx);
 assert.deepEqual(listedProductIds(html),['catalogue-7','catalogue-6','catalogue-5','catalogue-4','catalogue-3','catalogue-2','catalogue-1']);
 assert.match(html,/Page 2 of 2/);
 assert.match(html,/data-ui-command="product-page"[^>]*data-ui-value="3"[^>]*disabled/);
 state=advanceOperationsPreview(state,'product-sort',{id:'price'});
 assert.equal(state.productPage,1);
 assert.deepEqual(listedProductIds(operationsPageMarkup('products',state,ctx)).slice(0,3),['catalogue-1','catalogue-2','catalogue-3']);
 state=advanceOperationsPreview(state,'product-sort',{id:'stock'});
 assert.deepEqual(listedProductIds(operationsPageMarkup('products',state,ctx)).slice(0,3),['catalogue-1','catalogue-2','catalogue-3']);
 state=advanceOperationsPreview(state,'product-sort',{id:'name'});
 assert.deepEqual(listedProductIds(operationsPageMarkup('products',state,ctx)).slice(0,3),['catalogue-1','catalogue-2','catalogue-3']);
 state=advanceOperationsPreview(state,'product-sort',{id:'category'});
 assert.deepEqual(listedProductIds(operationsPageMarkup('products',{...state,productPageSize:50},ctx)).slice(22),['catalogue-23','catalogue-24','catalogue-25','catalogue-26','catalogue-27']);
 state=advanceOperationsPreview(state,'product-sort',{id:'status'});
 assert.equal(listedProductIds(operationsPageMarkup('products',{...state,productPageSize:50},ctx)).at(-1),'catalogue-27');
 assert.equal(JSON.stringify(source),before);
});

test('product filters and page size reset changed searches, clamp page bounds and show truthful empty counts',async()=>{
 const {advanceOperationsPreview}=await import('../client/operations-ui.js');
 let state={lang:'en',data:productCatalogue(),query:'',status:'all',category:'all',productPage:2};
 state=advanceOperationsPreview(state,'apply-filters',{section:'products',query:'',status:'all',category:'all',productPageSize:'20'});
 assert.equal(state.productPage,2);
 state=advanceOperationsPreview(state,'product-page',{value:'999'});
 assert.equal(state.productPage,2);
 state=advanceOperationsPreview(state,'apply-filters',{section:'products',query:'',status:'all',category:'kits',productPageSize:'10'});
 assert.equal(state.productPage,1);
 assert.equal(state.productPageSize,10);
 assert.equal(listedProductIds(operationsPageMarkup('products',state,ctx)).length,5);
 state=advanceOperationsPreview(state,'apply-filters',{section:'products',query:'missing',status:'all',category:'all',productPageSize:'10'});
 const empty=operationsPageMarkup('products',state,ctx);
 assert.deepEqual(listedProductIds(empty),[]);
 assert.match(empty,/No matching products/);
 assert.match(empty,/Showing 0 of 0 products/);
 assert.match(empty,/Page 1 of 1/);
 assert.doesNotMatch(empty,/Showing 1–0|Page 0|NaN/);
 state=advanceOperationsPreview(state,'clear-filters');
 assert.equal(state.productPageSize,10);
 assert.equal(listedProductIds(operationsPageMarkup('products',state,ctx)).length,10);
 for(const filters of [{query:'Product 2',status:'all',category:'all'},{query:'',status:'draft',category:'all'}]){
  state=advanceOperationsPreview({...state,productPage:3},'apply-filters',{section:'products',...filters,productPageSize:'10'});
  assert.equal(state.productPage,1);
 }
});

test('product detail, nested edit and stock returns retain the sorted filtered page and original product',async()=>{
 const {advanceOperationsPreview}=await import('../client/operations-ui.js');
 const source={lang:'en',data:productCatalogue(),query:'Product',status:'active',category:'materials',productSort:'stock',productDirection:'asc',productPageSize:10,productPage:2};
 const expected=listedProductIds(operationsPageMarkup('products',source,ctx));
 for(const command of ['edit-product','stock-product']){
  let state=advanceOperationsPreview(source,'view-product',{id:'catalogue-12'});
  state=advanceOperationsPreview(state,command,{id:'catalogue-12'});
  state=advanceOperationsPreview(state,'cancel-product');
  assert.deepEqual(state.dialog,{type:'product',id:'catalogue-12'});
  state=advanceOperationsPreview(state,'close');
  assert.deepEqual([state.query,state.status,state.category,state.productSort,state.productDirection,state.productPageSize,state.productPage],['Product','active','materials','stock','asc',10,2]);
  assert.deepEqual(listedProductIds(operationsPageMarkup('products',state,ctx)),expected);
  assert.ok(expected.includes('catalogue-12'));
 }
 const direct=advanceOperationsPreview(advanceOperationsPreview(source,'edit-product',{id:'catalogue-12'}),'cancel-product');
 assert.equal(direct.dialog,null);
 assert.deepEqual(listedProductIds(operationsPageMarkup('products',direct,ctx)),expected);
 const data=productCatalogue();data.products=data.products.filter(row=>row.id!=='catalogue-22');
 const lastPage={...source,data,productPage:3};
 const edited=advanceOperationsPreview(advanceOperationsPreview(lastPage,'edit-product',{id:'catalogue-21'}),'submit',{formKind:'edit-product',recordId:'catalogue-21',nameZh:'產品 21',nameEn:'Product 21',sku:'ITEM-21',category:'materials',price:'20',cost:'1',stock:'21',threshold:'3',status:'archived'});
 assert.equal(edited.dialog.type,'product-review');assert.equal(edited.dialog.values.status,'archived');
 assert.equal(edited.productPage,3);assert.equal(edited.productSort,'stock');
 assert.deepEqual(edited.data,lastPage.data);
 assert.match(operationsPageMarkup('products',edited,ctx),/Showing 21–21 of 21 products/);
});

test('product pagination remains bilingual and safely displays long product names and malformed page state',()=>{
 const data=productCatalogue();data.products[0].nameEn='<Long & delicate product> '.repeat(20);data.products[0].nameZh='超長產品名稱與描述'.repeat(30);
 for(const locale of [ctx,{t:z=>z}]){
  const html=operationsPageMarkup('products',{data,productPage:-7,productPageSize:50},locale);
  assert.equal(listedProductIds(html).length,27);
  assert.match(html,/name="productPageSize"/);
  assert.match(html,/class="ops-products-pagination"/);
  assert.match(html,locale===ctx?/Showing 1–27 of 27 products/:/顯示第 1–27 項，共 27 項產品/);
  assert.doesNotMatch(html,/<Long|NaN|undefined/);
  if(locale===ctx)assert.match(html,/&lt;Long &amp; delicate product&gt;/);
 }
});

const accountingIds=(html,kind)=>[...html.matchAll(new RegExp('data-ui-command="view-'+kind+'"[^>]*data-ui-id="([^"]+)"','g'))].map(match=>match[1]);
function periodRecords(){
 const data=getOperationsPreviewData();
 const invoice=(id,date,dueDate=date)=>({id,number:id,studentId:'student-1',date,dueDate,status:'awaiting-payment',items:[{nameEn:id,nameZh:id,quantity:1,unitPrice:100}],discount:0});
 data.invoices=[invoice('before','2026-09-30','2026-10-15'),invoice('first','2026-10-01'),invoice('last','2026-10-31'),invoice('after','2026-11-01'),invoice('year-last','2026-12-31'),invoice('next-year','2027-01-01')];
 data.payments=[{id:'paid-before',reference:'paid-before',studentId:'student-1',invoiceId:'first',date:'2026-09-30',amount:10,method:'bank',status:'verified'},{id:'paid-this-month',reference:'paid-this-month',studentId:'student-1',invoiceId:'before',date:'2026-10-01',amount:20,method:'fps',status:'verified'},{id:'preview-this-month',reference:'preview-this-month',studentId:'student-1',invoiceId:'first',date:'2026-10-31',amount:900,method:'fps',status:'preview'},{id:'paid-next-month',reference:'paid-next-month',studentId:'student-1',invoiceId:'first',date:'2026-11-01',amount:30,method:'fps',status:'verified'}];
 data.credits=[{id:'credit-before',number:'credit-before',studentId:'student-1',date:'2026-09-30',amount:5,status:'available'},{id:'credit-last',number:'credit-last',studentId:'student-1',date:'2026-10-31',amount:6,status:'available'}];
 return data;
}

test('accounting applies inclusive month quarter and year boundaries to each record date rather than invoice due dates',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 const source={lang:'en',today:'2026-10-15',data:periodRecords()},before=JSON.stringify(source);
 let state=advance(source,'apply-filters',{section:'accounting',accountingMode:'month',accountingMonth:'2026-10'});
 assert.deepEqual([state.accountingRange.from,state.accountingRange.to],['2026-10-01','2026-10-31']);
 assert.deepEqual(accountingIds(operationsPageMarkup('accounting',state,ctx),'invoice'),['first','last']);
 state=advance(state,'accounting-tab',{id:'payments'});
 assert.deepEqual(accountingIds(operationsPageMarkup('accounting',state,ctx),'payment'),['paid-this-month','preview-this-month']);
 state=advance(state,'accounting-tab',{id:'credits'});
 assert.deepEqual(accountingIds(operationsPageMarkup('accounting',state,ctx),'credit'),['credit-last']);
 state=advance(state,'apply-filters',{section:'accounting',accountingMode:'quarter',accountingYear:'2026',accountingQuarter:'4'});
 assert.deepEqual([state.accountingRange.from,state.accountingRange.to],['2026-10-01','2026-12-31']);
 state=advance(state,'accounting-tab',{id:'invoices'});
 assert.deepEqual(accountingIds(operationsPageMarkup('accounting',state,ctx),'invoice'),['first','last','after','year-last']);
 state=advance(state,'apply-filters',{section:'accounting',accountingMode:'year',accountingYear:'2027'});
 assert.deepEqual([state.accountingRange.from,state.accountingRange.to],['2027-01-01','2027-12-31']);
 assert.deepEqual(accountingIds(operationsPageMarkup('accounting',state,ctx),'invoice'),['next-year']);
 state=advance(state,'apply-filters',{section:'accounting',accountingMode:'month',accountingMonth:'2024-02'});
 assert.deepEqual([state.accountingRange.from,state.accountingRange.to],['2024-02-01','2024-02-29']);
 state=advance(state,'apply-filters',{section:'accounting',accountingMode:'quarter',accountingYear:'2024',accountingQuarter:'1'});
 assert.deepEqual([state.accountingRange.from,state.accountingRange.to],['2024-01-01','2024-03-31']);
 assert.equal(JSON.stringify(source),before);
});

test('accounting custom date errors retain entered values and the previous applied results without changing product filters',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 let state={lang:'en',today:'2026-10-15',data:periodRecords(),query:'watercolour',status:'active',category:'materials',productPage:2};
 state=advance(state,'apply-filters',{section:'accounting',accountingMode:'custom',accountingFrom:'2024-02-29',accountingTo:'2024-02-29',accountingQuery:'Chloe'});
 assert.deepEqual([state.accountingRange.from,state.accountingRange.to],['2024-02-29','2024-02-29']);
 const applied=JSON.stringify(state.accountingRange);
 for(const [from,to] of [['2025-02-29','2025-03-01'],['2026-04-31','2026-05-01'],['2026-11-02','2026-11-01'],['','2026-11-01']]){
  const invalid=advance(state,'apply-filters',{section:'accounting',accountingMode:'custom',accountingFrom:from,accountingTo:to,accountingQuery:'not applied'});
  assert.equal(JSON.stringify(invalid.accountingRange),applied);
  assert.equal(invalid.accountingQuery,'Chloe');
  assert.equal(invalid.accountingRangeDraft.from,from);
  assert.equal(invalid.accountingRangeDraft.to,to);
  assert.ok(invalid.accountingRangeError);
  const html=operationsPageMarkup('accounting',invalid,ctx);
  assert.match(html,/role="alert"/);assert.match(html,/2024-02-29/);
  assert.deepEqual(accountingIds(html,'invoice'),[]);
 }
 assert.deepEqual([state.query,state.status,state.category,state.productPage],['watercolour','active','materials',2]);
 state=advance(state,'accounting-tab',{id:'payments'});
 assert.equal(state.accountingQuery,'Chloe');assert.equal(JSON.stringify(state.accountingRange),applied);
});

test('accounting summaries and tab counts share the applied period and search while only verified payments count as collected',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 let state=advance({lang:'en',today:'2026-10-15',data:periodRecords()},'apply-filters',{section:'accounting',accountingMode:'month',accountingMonth:'2026-10',accountingQuery:'Chloe'});
 let html=operationsPageMarkup('accounting',state,ctx);
 assert.match(html,/>Verified payments<\/span><strong>HK\$20\.00<\/strong>/);
 assert.match(html,/>Awaiting-payment invoices<\/span><strong>HK\$200\.00<\/strong>/);
 assert.match(html,/data-ui-id="invoices"[^>]*>Invoices<span>2<\/span>/);
 assert.match(html,/data-ui-id="payments"[^>]*>Payments<span>2<\/span>/);
 assert.match(html,/data-ui-id="credits"[^>]*>Credits<span>1<\/span>/);
 assert.match(html,/Issue date.*Payment date.*Credit date/s);
 assert.doesNotMatch(html,/Payments this period|Outstanding|HK\$920\.00/);
 state=advance(state,'apply-filters',{section:'accounting',accountingMode:'month',accountingMonth:'2026-10',accountingQuery:'missing person'});
 html=operationsPageMarkup('accounting',state,ctx);
 assert.match(html,/>Verified payments<\/span><strong>HK\$0\.00<\/strong>/);
 assert.match(html,/Showing 0 records/);assert.match(html,/data-ui-id="payments"[^>]*>Payments<span>0<\/span>/);
});

test('accounting preserves unknown-date records separately and never presents missing verified amounts as zero',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js'),data=periodRecords();
 data.payments=[{id:'undated',reference:'undated',studentId:'student-1',invoiceId:'first',date:'2026-02-30',amount:50,method:'fps',status:'verified'},{id:'unknown-amount',reference:'unknown-amount',studentId:'student-1',invoiceId:'first',date:'2026-10-15',amount:null,method:'fps',status:'verified'}];
 let state=advance({lang:'en',today:'2026-10-15',data},'accounting-tab',{id:'payments'});
 const html=operationsPageMarkup('accounting',state,ctx);
 assert.match(html,/>Verified payments<\/span><strong>—<\/strong>/);
 assert.match(html,/Date needs confirmation/);assert.match(html,/undated/);assert.match(html,/not included in the selected period/i);
 assert.match(html,/amount.*not confirmed|not confirmed.*amount/i);
 assert.doesNotMatch(html,/undefined|NaN|Invalid Date/);
 assert.match(html,/>Showing 1 record</);
});

test('accounting receipt children return to the exact source through previews and never substitute an unrelated record',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 const source={lang:'en',today:'2026-10-15',data:getOperationsPreviewData(),accountingTab:'payments',accountingQuery:'Isla'};
 let state=advance(source,'view-payment',{id:'payment-1'});
 state=advance(state,'receipt-options',{id:'payment-1'});
 assert.deepEqual(state.dialog.returnTo,{type:'payment',id:'payment-1'});
 state=advance(state,'receipt-email',{id:'payment-1'});
 assert.deepEqual(state.dialog.returnTo,{type:'receipt-options',id:'payment-1',returnTo:{type:'payment',id:'payment-1'}});
 state=advance(state,'submit',{formKind:'receipt-email',recordId:'payment-1',recipientEmail:'family@example.test',subject:'My receipt',body:'Retained email draft',attachmentName:'receipt.pdf'});
 assert.equal(state.dialog.type,'receipt-email-preview');
 state=advance(state,'cancel-accounting');
 assert.equal(state.dialog.type,'receipt-email');assert.equal(state.dialog.values.body,'Retained email draft');
 state=advance(state,'cancel-accounting');assert.equal(state.dialog.type,'receipt-options');
 state=advance(state,'cancel-accounting');assert.deepEqual(state.dialog,{type:'payment',id:'payment-1'});
 state=advance(state,'close');assert.equal(state.dialog,null);assert.equal(state.accountingQuery,'Isla');assert.equal(state.accountingTab,'payments');
 for(const type of ['invoice','payment','credit','receipt-options','receipt-save','receipt-email','receipt-save-preview','receipt-email-preview']){
  const html=operationsDialogMarkup({...source,dialog:{type,id:'missing'}},ctx);
  assert.match(html,/Record unavailable/);assert.doesNotMatch(html,/INV-202610|PAY-202610|CR-202610|family@example/);
 }
 const broken=getOperationsPreviewData();broken.payments[0].invoiceId='missing-invoice';
 assert.match(operationsDialogMarkup({data:broken,dialog:{type:'receipt-options',id:'payment-1'}},ctx),/Record unavailable/);
});

test('accounting mode changes retain unapplied custom inputs and cancellation cannot return through a mismatched or deleted parent',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 let state=advance({lang:'en',today:'2026-10-15',data:getOperationsPreviewData()},'accounting-mode',{value:'custom',accountingFrom:'2026-09-01',accountingTo:'2026-09-30',accountingQuery:'Typed search'});
 const applied=state.accountingRange;
 state=advance(state,'accounting-mode',{value:'year',accountingFrom:'2026-09-02',accountingTo:'2026-09-29',accountingQuery:'Still typed'});
 state=advance(state,'accounting-mode',{value:'custom',accountingYear:'2028'});
 assert.deepEqual([state.accountingRangeDraft.from,state.accountingRangeDraft.to],['2026-09-02','2026-09-29']);
 assert.deepEqual(state.accountingRange,applied);
 for(const returnTo of [{type:'invoice',id:'invoice-2'},{type:'payment',id:'missing'},{type:'product',id:'payment-1'}]){
  const cancelled=advance({...state,dialog:{type:'receipt-options',id:'payment-1',returnTo}},'cancel-accounting');assert.equal(cancelled.dialog,null);
 }
});

test('new accounting payment entry is FPS only while legacy payment methods remain readable',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js'),data=periodRecords();
 const form=operationsDialogMarkup({data,dialog:{type:'record-payment'}},ctx);
 assert.match(form,/<option value="fps" selected>FPS<\/option>/);assert.doesNotMatch(form,/<option value="(?:cash|bank)"/);
 const legacy=operationsDialogMarkup({data,dialog:{type:'payment',id:'paid-before'}},ctx);assert.match(legacy,/>BANK<\/dd>/);
 const source={lang:'en',data,dialog:{type:'record-payment'}};
 const invalid=advance(source,'submit',{formKind:'record-payment',invoiceId:'first',amount:'10',date:'2026-10-15',method:'bank'});
 assert.ok(invalid.error);assert.equal(invalid.data.payments.length,data.payments.length);
});

test('accounting input drafts survive background rendering without applying dates or search and retain source state',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 const source=advance({lang:'en',today:'2026-10-15',data:periodRecords()},'apply-filters',{section:'accounting',accountingMode:'month',accountingMonth:'2026-10',accountingQuery:'Chloe'}),before=JSON.stringify(source);
 const draft=advance(source,'accounting-draft',{accountingMode:'custom',accountingFrom:'2026-11-01',accountingTo:'',accountingQuery:'Typed search not applied'});
 assert.deepEqual(draft.accountingRange,source.accountingRange);
 assert.equal(draft.accountingQuery,'Chloe');assert.equal(draft.accountingRangeDraft.query,'Typed search not applied');
 assert.equal(draft.accountingRangeDraft.to,'');
 const html=operationsPageMarkup('accounting',draft,ctx);
 assert.match(html,/name="accountingQuery"[^>]*value="Typed search not applied"/);
 assert.deepEqual(accountingIds(html,'invoice'),['first','last']);
 assert.match(html,/Applied period[\s\S]*2026-10-01[\s\S]*2026-10-31/);
 assert.equal(JSON.stringify(source),before);
});

test('accounting save preview X and footer return commands preserve its immediate form and reject removed sources',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 let state=advance({lang:'en',today:'2026-10-15',data:getOperationsPreviewData()},'view-invoice',{id:'invoice-2'});
 state=advance(state,'receipt-options',{id:'invoice-2'});state=advance(state,'receipt-save',{id:'invoice-2'});
 state=advance(state,'submit',{formKind:'receipt-save',recordId:'invoice-2',filename:'my-receipt.pdf',paperSize:'Letter',documentLanguage:'en'});
 assert.equal(state.dialog.returnTo.type,'receipt-save');
 const preview=operationsDialogMarkup(state,ctx);
 assert.match(preview,/<header>[\s\S]*data-ui-command="cancel-accounting"/);
 assert.match(preview,/<footer[^>]*>[\s\S]*data-ui-command="cancel-accounting"/);
 assert.match(preview,/data-ui-command="receipt-save"[^>]*>Back to settings/);
 state=advance(state,'cancel-accounting');
 assert.equal(state.dialog.type,'receipt-save');assert.equal(state.dialog.values.filename,'my-receipt.pdf');
 const form=operationsDialogMarkup(state,ctx);
 assert.match(form,/value="Letter" selected/);assert.match(form,/value="my-receipt.pdf"/);
 state=advance(state,'cancel-accounting');assert.equal(state.dialog.type,'receipt-options');
 state.data.invoices=state.data.invoices.filter(row=>row.id!=='invoice-2');
 assert.match(operationsDialogMarkup(state,ctx),/Record unavailable/);
 assert.equal(advance(state,'cancel-accounting').dialog,null);
 for(const type of ['invoice','preview-invoice','payment','credit','receipt-options'])assert.doesNotThrow(()=>operationsDialogMarkup({data:{...getOperationsPreviewData(),invoices:[],payments:[],credits:[]},dialog:{type,id:'missing'}},ctx));
});

test('accounting unknown payment and credit amounts remain unknown when opening the same list record and missing methods are safe',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 for(const amount of [null,undefined,'','not a number']){
  const data=getOperationsPreviewData();data.payments[0].amount=amount;data.credits[0].amount=amount;delete data.payments[0].method;
  for(const [tab,kind,id,title] of [['payments','payment','payment-1','Amount'],['credits','credit','credit-1','Credit amount']]){
   const source={lang:'en',today:'2026-10-15',data,accountingTab:tab},page=operationsPageMarkup('accounting',source,ctx);
   assert.match(page,/class="ops-money">—<\/td>/);assert.ok(accountingIds(page,kind).includes(id));
   const state=advance(source,'view-'+kind,{id}),detail=operationsDialogMarkup(state,ctx);
   assert.match(detail,new RegExp('<dt>'+title+'<\\/dt><dd>—<\\/dd>'));
   assert.doesNotMatch(detail,/HK\$0\.00|undefined|NaN/);
   if(kind==='payment')assert.match(detail,/<dt>Method<\/dt><dd>—<\/dd>/);
  }
 }
});

test('invoice unknown inputs keep line totals total and balance unknown through detail and receipt template amount',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 for(const field of ['unitPrice','quantity','discount']){
  const data=getOperationsPreviewData(),invoice=data.invoices[0];
  invoice.items=[{nameEn:'Amount pending confirmation',nameZh:'金額待確認',quantity:1,unitPrice:80}];invoice.discount=0;
  if(field==='discount')invoice.discount=null;else invoice.items[0][field]=null;
  const source={lang:'en',today:'2026-10-15',data};
  assert.match(operationsPageMarkup('accounting',source,ctx),/data-ui-id="invoice-1"[\s\S]*?class="ops-money">—<\/td>/);
  const state=advance(source,'view-invoice',{id:'invoice-1'}),detail=operationsDialogMarkup(state,ctx);
  assert.match(detail,/<dt>Total<\/dt><dd>—<\/dd>/);assert.match(detail,/<dt>Balance due<\/dt><dd>—<\/dd>/);
  if(field!=='discount')assert.match(detail,/<td class="ops-money">—<\/td>/);
  const applied=advance({...state,dialog:{type:'receipt-email',id:'invoice-1'}},'apply-email-template',{id:'invoice-1',templateId:'email-template-1'});
  assert.match(applied.dialog.values.body,/Amount: —/);assert.doesNotMatch(applied.dialog.values.body,/Amount: HK\$0\.00/);
 }
});

test('accounting numeric year input normalizes to four digit ISO boundaries without the JavaScript 1900 offset',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 for(const year of ['1','0001','99','0099','9999']){
  const normalized=String(Number(year)).padStart(4,'0'),source={lang:'en',today:'2026-10-15',data:getOperationsPreviewData()};
  const state=advance(source,'apply-filters',{section:'accounting',accountingMode:'year',accountingYear:year});
  assert.equal(state.accountingRangeError,'');assert.deepEqual([state.accountingRange.from,state.accountingRange.to],[normalized+'-01-01',normalized+'-12-31']);
  const html=operationsPageMarkup('accounting',state,ctx);assert.match(html,new RegExp(normalized+'-12-31'));assert.doesNotMatch(html,/Invalid Date|NaN/);
  const quarter=advance(state,'apply-filters',{section:'accounting',accountingMode:'quarter',accountingYear:year,accountingQuarter:'1'});
  assert.deepEqual([quarter.accountingRange.from,quarter.accountingRange.to],[normalized+'-01-01',normalized+'-03-31']);
 }
 for(const year of ['0','0000','10000','1.5','-1']){
  const state=advance({lang:'en',today:'2026-10-15'},'apply-filters',{section:'accounting',accountingMode:'year',accountingYear:year});assert.ok(state.accountingRangeError);
 }
});

test('accounting filter forms provide a native default submit button for Enter and retain the delegated Apply command',()=>{
 for(const mode of ['month','quarter','year','custom']){
  const html=operationsPageMarkup('accounting',{today:'2026-10-15',accountingRangeDraft:{mode}},ctx);
  const form=html.match(/<form class="ops-filters ops-accounting-filters"[^>]*>[\s\S]*?<\/form>/)?.[0];
  assert.ok(form,'The period and search controls share a native form.');
  const buttons=[...form.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  const submitButtons=buttons.filter(([,attributes])=>/\btype="submit"/.test(attributes));
  assert.equal(submitButtons.length,1,'Enter has one unambiguous enabled default submit button.');
  const [,attributes,text]=submitButtons[0];
  assert.match(attributes,/data-action="ui-operations"/);
  assert.match(attributes,/data-ui-command="apply-filters"/);
  assert.match(attributes,/data-ui-section="accounting"/);
  assert.doesNotMatch(attributes,/\bdisabled\b/);
  assert.equal(text,'Apply');
  assert.match(form,/name="formSection" value="accounting"/);
  assert.match(form,/name="accountingQuery"/);
 }
});

const entryFields=(dialog,extra={})=>({formKind:dialog.type,recordId:dialog.id||'',studentId:'student-1',date:'2026-10-15',dueDate:'2026-10-22',discount:'10',...Object.fromEntries((dialog.values.items||[]).flatMap((item,index)=>[[`itemName_${item.key}`,`Item ${index+1}`],[`quantity_${item.key}`,'2'],[`unitPrice_${item.key}`,'25']])),...extra});
test('accounting invoice entry starts blank supports keyed dynamic items and reaches a truthful review without writing records',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js'),source={lang:'en',today:'2026-10-15',data:getOperationsPreviewData(),accountingQuery:'Chloe'},before=JSON.stringify(source.data);
 let state=advance(source,'create-invoice');
 assert.equal(state.dialog.values.studentId,'');assert.equal(state.dialog.values.items.length,1);assert.equal(state.dialog.values.items[0].name,'');
 state=advance(state,'accounting-add-item',entryFields(state.dialog));
 state=advance(state,'accounting-add-item',entryFields(state.dialog));
 assert.equal(new Set(state.dialog.values.items.map(item=>item.key)).size,3);
 const removed=state.dialog.values.items[1].key,kept=state.dialog.values.items[2].key;
 state=advance(state,'accounting-remove-item',{...entryFields(state.dialog),value:removed});
 assert.equal(state.dialog.values.items.length,2);assert.equal(state.dialog.values.items[1].key,kept);
 state=advance(state,'submit',entryFields(state.dialog));
 assert.equal(state.dialog.type,'accounting-entry-review');
 assert.match(operationsDialogMarkup(state,ctx),/data-ui-command="accounting-entry-back"[^>]*>Back to edit<\/button>/);
 assert.match(operationsDialogMarkup(state,ctx),/<dt>Total<\/dt><dd>HK\$90\.00<\/dd>/);
 assert.match(operationsDialogMarkup(state,ctx),/data-ui-command="finalize-accounting-entry"[^>]*disabled/);
 for(const command of ['submit','finalize-accounting-entry','save','form-submit'])state=advance(state,command,{formKind:'create-invoice',studentId:'student-1',date:'2026-10-15',dueDate:'2026-10-22',itemName1:'Forged',quantity1:'1',unitPrice1:'999'});
 assert.equal(JSON.stringify(state.data),before);
 state=advance(state,'accounting-entry-back');assert.equal(state.dialog.type,'create-invoice');assert.equal(state.dialog.values.items[1].key,kept);
 state=advance(state,'cancel-accounting');assert.equal(state.dialog,null);assert.equal(state.accountingQuery,'Chloe');
});

test('invoice edit retains exact source values through validation review back and cancel without changing original records',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js'),source={lang:'en',today:'2026-10-15',data:getOperationsPreviewData()},before=JSON.stringify(source.data);
 let state=advance(advance(source,'view-invoice',{id:'invoice-2'}),'edit-invoice',{id:'invoice-2'});
 assert.equal(state.dialog.values.studentId,'student-2');assert.equal(state.dialog.values.items[0].unitPrice,280);
 const invalid=entryFields(state.dialog,{studentId:'student-2',dueDate:'2026-10-01',notes:'Keep this note'});
 state=advance(state,'submit',invalid);assert.ok(state.error);assert.equal(state.dialog.values.notes,'Keep this note');
 state=advance(state,'submit',{...invalid,dueDate:'2026-10-22'});assert.equal(state.dialog.type,'accounting-entry-review');
 state=advance(state,'cancel-accounting');assert.equal(state.dialog.type,'edit-invoice');assert.equal(state.dialog.values.notes,'Keep this note');
 state=advance(state,'cancel-accounting');assert.deepEqual(state.dialog,{type:'invoice',id:'invoice-2'});
 assert.equal(JSON.stringify(state.data),before);
 assert.match(operationsDialogMarkup(advance(source,'edit-invoice',{id:'missing'}),ctx),/Record unavailable/);
});

test('invoice entry rejects impossible dates invalid quantities prices discounts and deleted source while keeping all dynamic drafts',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 const opened=advance({lang:'en',today:'2026-10-15',data:getOperationsPreviewData()},'create-invoice'),key=opened.dialog.values.items[0].key;
 for(const extra of [{date:'2026-02-30'},{[`quantity_${key}`]:'0'},{[`quantity_${key}`]:'1.5'},{[`unitPrice_${key}`]:''},{[`unitPrice_${key}`]:'-1'},{discount:'51'},{studentId:'missing'},{[`itemName_${key}`]:''}]){
  const next=advance(opened,'submit',entryFields(opened.dialog,extra));assert.equal(next.dialog.type,'create-invoice');assert.ok(next.error);assert.equal(next.dialog.values.items.length,1);assert.deepEqual(next.data,opened.data);
 }
 const edited=advance(opened,'edit-invoice',{id:'invoice-1'});edited.data.invoices=[];
 assert.match(operationsDialogMarkup(edited,ctx),/Record unavailable/);
 assert.notEqual(advance(edited,'submit',entryFields(edited.dialog)).dialog.type,'accounting-entry-review');
});

test('payment and credit entry review preserve precise invoice student amounts and never create fake records',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');
 for(const kind of ['record-payment','create-credit']){
  const source={lang:'en',today:'2026-10-15',data:getOperationsPreviewData()},before=JSON.stringify(source.data);
  let state=advance(advance(source,'view-invoice',{id:'invoice-2'}),kind,{id:'invoice-2'});
  assert.equal(state.dialog.values.invoiceId,'invoice-2');assert.equal(state.dialog.values.studentId,'student-2');
  state=advance(state,'submit',{formKind:kind,invoiceId:'invoice-2',studentId:'student-2',amount:'25',date:'2026-10-15',method:'fps',reason:'Fee correction',note:'Retain note'});
  assert.equal(state.dialog.type,'accounting-entry-review');assert.match(operationsDialogMarkup(state,ctx),/Isla Chan/);
  state=advance(state,'finalize-accounting-entry');assert.equal(JSON.stringify(state.data),before);
  state=advance(state,'accounting-entry-back');assert.equal(state.dialog.values.amount,'25');
  state=advance(state,'cancel-accounting');assert.deepEqual(state.dialog,{type:'invoice',id:'invoice-2'});
  const blank=advance(source,kind);assert.equal(blank.dialog.values.invoiceId,'');assert.equal(blank.dialog.values.studentId,'');
 }
});

test('accounting entry drafts expose a current summary without replacing inputs or accepting mismatched credit ownership',async()=>{
 const {advanceOperationsPreview:advance,accountingEntrySummaryMarkup:summary,accountingEntryStudentMarkup:student}=await import('../client/operations-ui.js');
 let state=advance({lang:'en',today:'2026-10-15',data:getOperationsPreviewData()},'create-invoice');
 state=advance(state,'accounting-entry-draft',entryFields(state.dialog,{notes:'Long text remains entered'}));
 const before=JSON.stringify(state);
 assert.match(summary(state,ctx),/<dt>Total<\/dt><dd>HK\$40\.00<\/dd>/);
 const overDiscount=advance(state,'accounting-entry-draft',{discount:'51'});
 assert.match(summary(overDiscount,ctx),/<dt>Total<\/dt><dd>—<\/dd>/);
 assert.match(operationsDialogMarkup(state,ctx),/data-accounting-entry-summary/);
 assert.equal(JSON.stringify(state),before);
 let payment=advance(state,'record-payment');payment=advance(payment,'accounting-entry-draft',{invoiceId:'invoice-2',amount:'18'});
 assert.equal(student(payment,ctx),'Isla Chan');assert.equal(payment.dialog.values.amount,'18');
 const credit=advance(state,'create-credit'),invalid=advance(credit,'submit',{formKind:'create-credit',studentId:'student-1',invoiceId:'invoice-2',date:'2026-10-15',amount:'18',reason:'Typed reason'});
 assert.ok(invalid.error);assert.equal(invalid.dialog.type,'create-credit');assert.equal(invalid.dialog.values.reason,'Typed reason');
 assert.deepEqual(invalid.data,credit.data);
});

test('message reply drafts stay with their exact family when switching conversations',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');const source={lang:'en',data:getOperationsPreviewData(),selectedThreadId:'thread-1',dialog:null};
 let state=advance(source,'preview-reply',{id:'thread-1',message:'PRIVATE CHLOE FOLLOW-UP'});state=advance(state,'close');state=advance(state,'thread',{id:'thread-2'});
 const draft=html=>html.match(/<textarea name="message"[^>]*>([\s\S]*?)<\/textarea>/)?.[1];assert.equal(draft(operationsPageMarkup('messages',state,ctx)),'');
 state=advance(state,'preview-reply',{id:'thread-2',message:'ISLA PRIVATE DRAFT'});state=advance(state,'close');state=advance(state,'thread',{id:'thread-1'});assert.equal(draft(operationsPageMarkup('messages',state,ctx)),'PRIVATE CHLOE FOLLOW-UP');assert.deepEqual(state.data.threads.map(row=>row.messages),source.data.threads.map(row=>row.messages));
});
test('unknown or ambiguous conversation cannot preview a message for an invented or first family',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');const source={lang:'en',data:getOperationsPreviewData(),selectedThreadId:'thread-1',dialog:null};
 for(const data of [source.data,{...source.data,threads:[...source.data.threads,{...source.data.threads[1]}]}]){const state=advance({...source,data},'preview-reply',{id:data===source.data?'unknown-thread':'thread-2',message:'PRIVATE UNKNOWN CONTEXT'});assert.notEqual(state.dialog?.type,'message-preview');assert.ok(state.error);assert.doesNotMatch(operationsDialogMarkup(state,ctx),/PRIVATE UNKNOWN CONTEXT|Example parent/);}
});
test('reply preview Back uses its exact original inline conversation rather than unrelated compose',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js');let state={lang:'en',data:getOperationsPreviewData(),selectedThreadId:'thread-2',query:'Isla',dialog:null};state=advance(state,'preview-reply',{id:'thread-2',message:'ISLA EXACT REPLY'});
 const html=operationsDialogMarkup(state,ctx),back=[...html.matchAll(/<button\b([^>]*)>([^<]*Back[^<]*)<\/button>/g)].at(-1);assert.ok(back);const command=back[1].match(/data-ui-command="([^"]*)"/)?.[1],id=back[1].match(/data-ui-id="([^"]*)"/)?.[1];state=advance(state,command,{id});
 assert.equal(state.dialog,null);assert.equal(state.selectedThreadId,'thread-2');assert.equal(state.query,'Isla');assert.match(operationsPageMarkup('messages',state,ctx),/ISLA EXACT REPLY/);assert.doesNotMatch(operationsPageMarkup('messages',state,ctx),/Chloe’s parent/);
});

test('compose draft preview Back and Cancel preserve the original exact recipient and fields without altering conversations',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js'),source={lang:'en',data:getOperationsPreviewData(),selectedThreadId:'thread-1',query:'Chloe',dialog:null},values={recipient:'thread-2',subject:'Exact subject',message:'ISLA COMPOSE DRAFT'};let state=advance(source,'compose');state=advance(state,'message-compose-draft',values);state=advance(state,'submit',{formKind:'compose',...values});
 assert.equal(state.dialog.origin,'compose');assert.match(operationsDialogMarkup(state,ctx),/Isla’s parent/);assert.match(operationsDialogMarkup(state,ctx),/message-send"[^>]*disabled/);
 for(const command of ['message-back','close']){const edit=advance(state,command);assert.equal(edit.dialog.type,'compose');assert.deepEqual(edit.dialog.values,values);assert.match(operationsDialogMarkup(edit,ctx),/<option value="thread-2" selected/);const cancelled=advance(edit,'close');assert.equal(cancelled.dialog,null);assert.equal(cancelled.selectedThreadId,'thread-1');assert.equal(cancelled.query,'Chloe');assert.deepEqual(advance(cancelled,'compose').dialog.values,values);assert.deepEqual(cancelled.data.threads,source.data.threads);}
});
test('inline message draft commands preserve each conversation without inventing a target or sending even under forged final fields',async()=>{
 const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js'),source={lang:'en',data:getOperationsPreviewData(),selectedThreadId:'thread-1',dialog:null};let state=advance(source,'message-draft',{id:'thread-1',message:'Unpreviewed Chloe typing'});state=advance(state,'thread',{id:'thread-2'});state=advance(state,'message-draft',{id:'thread-2',message:'Unpreviewed Isla typing'});state=advance(state,'thread',{id:'thread-1'});assert.match(operationsPageMarkup('messages',state,ctx),/Unpreviewed Chloe typing/);assert.doesNotMatch(operationsPageMarkup('messages',state,ctx),/Unpreviewed Isla typing/);
 state=advance(state,'preview-reply',{id:'thread-1'});assert.equal(state.dialog.values.message,'Unpreviewed Chloe typing');const unchanged=advance(state,'message-send',{formKind:'compose',recipient:'thread-2',subject:'FORGED',message:'FORGED'});assert.deepEqual(unchanged.dialog,state.dialog);assert.deepEqual(unchanged.data.threads,state.data.threads);assert.equal(unchanged.notice,'');
 const unknown=advance(state,'message-draft',{id:'missing-thread',message:'DO NOT STORE'});assert.equal(unknown.replyDrafts?.['missing-thread'],undefined);assert.doesNotMatch(operationsPageMarkup('messages',{...state,selectedThreadId:'missing-thread'},ctx),/ops-message-history|name="message"/);
});
test('compose native draft updates are immutable and cannot overwrite the previous rendered state',async()=>{const {advanceOperationsPreview:advance}=await import('../client/operations-ui.js'),opened=advance({lang:'en',data:getOperationsPreviewData()},'compose'),before=JSON.stringify(opened);const typed=advance(opened,'message-compose-draft',{recipient:'thread-2',subject:'Native draft',message:'New text'});assert.equal(JSON.stringify(opened),before);assert.equal(typed.dialog.values.message,'New text');assert.equal(typed.composeDraft.recipient,'thread-2');});
