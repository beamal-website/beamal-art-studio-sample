import test from 'node:test';
import assert from 'node:assert/strict';
import { salesCatalogueEntries, filterSalesOrders, salesWorkspaceMarkup, salesOrdersMarkup, salesOrdersCsv } from '../client/sales-workspace-ui.js';
const en={t:(_zh,en)=>en};
const courses=[{id:'c1',courseName:'Watercolour',category:'Art',fees:[{id:'f1',feeName:'Single lesson',price:300,pricingModel:'per-lesson'}]},{id:'c2',courseName:'Drawing',category:'Art',fees:[{id:'f2',feeName:'Four lessons',price:1200,pricingModel:'package',packageType:'visits',packageTotal:4}]},{id:'deleted',courseName:'Archived',deletedAt:'2026-10-01',fees:[]}];
const orders=[{id:'o1',studentName:'Chloe',createdAt:'2026-10-18T17:00:00Z',orderStatus:'draft',paymentStatus:'draft',amountCents:30000,items:[{courseName:'Watercolour',feeName:'Single lesson',lessons:[{date:'2026-10-20'}]}]},{id:'o2',studentName:'Maya',createdAt:'2026-10-18T01:00:00Z',orderStatus:'parent-confirmed',paymentStatus:'paid',amountCents:120000,items:[{courseName:'Drawing',feeName:'Four lessons',pricing:{pricingModel:'package',packageTotal:4,packageType:'visits'},lessons:[{date:'2026-10-20'}]}]}];
test('catalogue preserves actual course-fee associations and excludes archived courses',()=>{
 assert.deepEqual(salesCatalogueEntries(courses,{}).map(row=>row.course.id),['c1','c2']);
 assert.deepEqual(salesCatalogueEntries(courses,{section:'fees',search:'four'}).map(row=>[row.course.id,row.fee.id]),[['c2','f2']]);
 assert.equal(salesCatalogueEntries(courses,{section:'courses',category:'missing'}).length,0);
 assert.equal(salesCatalogueEntries(courses,{section:'products'}).length,0);
});
test('order filters combine actual payment status, Hong Kong creation date and text without mutating records',()=>{
 const before=structuredClone(orders);
 assert.deepEqual(filterSalesOrders(orders,{date:'2026-10-19',search:'chloe'}).map(row=>row.id),['o1']);
 assert.deepEqual(filterSalesOrders(orders,{status:'paid'}).map(row=>row.id),['o2']);
 assert.deepEqual(filterSalesOrders(orders,{status:'unpaid',search:'single'}).map(row=>row.id),['o1']);
 assert.deepEqual(filterSalesOrders(orders,{status:'draft',search:'Maya'}),[]);
 assert.deepEqual(orders,before);
});
test('empty sales workspace has the reference sections and disables checkout until actual selections exist',()=>{
 const html=salesWorkspaceMarkup({courses,students:[],selection:{},ready:true},en);
 for(const text of ['Courses','Fees','Products','Other','Search student','No orders yet.','Discount code','Reset','Save','Pay'])assert.ok(html.includes(text),text);
 assert.match(html,/data-action="sales-review"[^>]*disabled/);
 assert.match(html,/data-sales-pay[^>]*disabled/);
 assert.doesNotMatch(html,/student-account-link-row|data-pay=/);
});
test('stale selections cannot enable checkout in the display-only sales workspace',()=>{
 const html=salesWorkspaceMarkup({courses,students:[{id:'p',displayName:'Child <A>'}],selection:{courseId:'c1',feeId:'f1',studentId:'p',lessonKey:'s:1',included:true},lessons:[{key:'s:1',date:'2026-10-20',time:'10:00'}],ready:true},en);
 assert.doesNotMatch(html,/sales-lesson|sales-cart-item/);
 assert.match(html,/data-action="sales-review" disabled>Save/);
 assert.match(html,/data-sales-pay[^>]*disabled/);
 assert.match(html,/Sales actions will be available later/);
});
test('orders table uses saved statuses and quota, escapes names and leaves missing receipts unknown',()=>{
 const html=salesOrdersMarkup({orders:[{...orders[1],studentName:'<script>bad</script>'}],ready:true},{},en);
 for(const label of ['Student','Order name','Detail','Scheduled / Quota','Status','Receipt #'])assert.ok(html.includes(label));
 assert.match(html,/&lt;script&gt;bad&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.match(html,/1 \/ 4/);assert.match(html,/Paid/);assert.match(html,/data-order-id="o2"/);
 assert.doesNotMatch(html,/receipt[^<]*o2/i);
});
test('CSV exports the current filtered records and neutralizes spreadsheet formulas',()=>{
 const csv=salesOrdersCsv([{...orders[0],studentName:'=HYPERLINK("bad")'}],{},en);
 assert.match(csv,/'=HYPERLINK/);assert.match(csv,/300\.00/);
 assert.doesNotMatch(salesOrdersCsv(orders,{status:'paid'},en),/Chloe/);
});

test('catalogue displays current products but never exposes an order action',()=>{
 const products=[{id:'new',nameZh:'新畫簿',nameEn:'New sketchbook',category:'materials',price:55},{id:'old',nameEn:'Archived item',status:'archived',price:10}];
 const html=salesWorkspaceMarkup({products,selection:{section:'products',search:'sketch',category:'materials'},ready:true},en);
 assert.match(html,/New sketchbook/);assert.match(html,/55.00/);assert.doesNotMatch(html,/Archived item/);
 assert.match(html,/sales-catalogue-card" disabled/);
 assert.doesNotMatch(html,/data-action="sales-(course|fee)"/);
 const updated=salesWorkspaceMarkup({products:[{...products[0],price:65}],selection:{section:'products'}},en);
 assert.match(updated,/65.00/);
});
