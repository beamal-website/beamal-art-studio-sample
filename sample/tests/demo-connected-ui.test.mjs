import test from 'node:test';
import assert from 'node:assert/strict';
import {sharedAccountingData,enrollmentReportSummary} from '../client/shared-accounting.js';
import {staffReferenceClassesMarkup} from '../client/staff-reference-ui.js';
const ctx={t:(_zh,en)=>en,esc:value=>String(value??'').replaceAll('<','&lt;')};
test('accounting and report totals are projections of the same paid orders',()=>{
 const orders=[{id:'order-a',studentId:'a',studentName:'Amy',amountCents:120000,paymentStatus:'paid',createdAt:'2026-10-20',paidAt:'2026-10-20',items:[{courseName:'Course 1'}]},{id:'order-b',studentId:'b',studentName:'Bob',amountCents:60000,paymentStatus:'awaiting-payment',items:[]}],before=JSON.stringify(orders),data=sharedAccountingData(orders);
 assert.equal(data.invoices.length,2);assert.equal(data.payments.length,1);assert.equal(data.payments[0].amount,1200);assert.equal(data.payments[0].invoiceId,'order-a');assert.equal(data.invoices[0].orderPreviewSource,true);assert.equal(data.payments[0].method,'');assert.match(enrollmentReportSummary(orders,ctx),/1 paid students · 1 orders/);assert.doesNotMatch(enrollmentReportSummary(orders,ctx),/Bob/);assert.equal(JSON.stringify(orders),before);
});
test('staff Class view groups assigned lessons and uses their loaded rosters without inventing empty students',()=>{
 const base={scheduleId:'a',date:'2026-10-23',time:'10:00',endTime:'11:00',courseName:'Course 1',teacherIds:['leo'],students:[{studentId:'one',displayName:'Amy'}],rosterReady:true};
 const state={assignedClasses:[{...base,id:'a:1',sequence:1},{...base,id:'a:2',sequence:2,date:'2026-10-30'},{...base,id:'b:1',scheduleId:'b',teacherIds:['maya'],courseName:'Hidden',students:[{studentId:'two',displayName:'Other student'}]}]};
 const html=staffReferenceClassesMarkup(state,{id:'leo'},ctx);assert.equal((html.match(/<article>/g)||[]).length,1);assert.match(html,/Amy/);assert.match(html,/2026-10-23/);assert.match(html,/2026-10-30/);assert.doesNotMatch(html,/Hidden|Other student/);
 const loading=staffReferenceClassesMarkup({assignedClasses:[{...base,students:[],rosterReady:false}]},{id:'leo'},ctx);assert.match(loading,/Loading students/);assert.doesNotMatch(loading,/No enrolled students/);
});
