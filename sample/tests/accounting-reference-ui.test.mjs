import test from 'node:test';
import assert from 'node:assert/strict';
import {accountingReferenceMarkup} from '../client/accounting-reference-ui.js';
const ctx={t:(_zh,en)=>en};
const data={students:[{id:'s',nameEn:'Child <A>'}],invoices:[{id:'i',number:'INV-1',studentId:'s',date:'2026-10-19',status:'awaiting-payment',items:[{quantity:1,unitPrice:150}],discount:0}],payments:[{id:'p',reference:'PAY-1',invoiceId:'i',studentId:'s',date:'2026-10-20',amount:50,status:'verified',method:'cash'},{id:'u',reference:'UNVERIFIED',invoiceId:'i',studentId:'s',date:'2026-10-20',amount:100,status:'pending'}]};
test('reference invoices show linked amounts without counting unverified payments and keep export disabled',()=>{
 const before=structuredClone(data),html=accountingReferenceMarkup({data},ctx);
 for(const label of ['Invoice Number','Students','Billing Month','Paid / Total ($)','All dates'])assert.ok(html.includes(label),label);
 assert.match(html,/50 \/ 150/);assert.match(html,/Child &lt;A&gt;/);assert.match(html,/disabled>Export/);
 assert.doesNotMatch(html,/ops-summary|Create invoice/);assert.deepEqual(data,before);
});
test('receipts show only verified records and filters restrict rather than alter the source data',()=>{
 const html=accountingReferenceMarkup({data,accountingTab:'payments'},ctx);
 assert.match(html,/PAY-1/);assert.doesNotMatch(html,/UNVERIFIED/);
 for(const label of ['Created date','Student','Staff','Payment method','Remark'])assert.ok(html.includes(label));
 assert.match(accountingReferenceMarkup({data,accountingTab:'payments',accountingReferenceFilters:{from:'2026-11-01'}},ctx),/No receipt yet/);
 assert.match(accountingReferenceMarkup({data,accountingReferenceFilters:{query:'missing'}},ctx),/No matching invoices/);
 const unknown=accountingReferenceMarkup({data:{...data,invoices:[{...data.invoices[0],items:[]}]},accountingTab:'payments'},ctx);assert.match(unknown,/50 \/ —/);
});
