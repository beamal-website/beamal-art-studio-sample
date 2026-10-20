import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {ensureLocalDemo} from '../local-demo.mjs';
import {completeDemo} from '../complete-demo.mjs';
import {simplifyDemoFees} from '../simplify-demo-fees.mjs';
import {createStore} from '../store.mjs';
import {sharedAccountingData} from '../../client/shared-accounting.js';
import {DEMO_IDS} from '../demo-accounts.mjs';

test('six term fees update every current student order and receipt without changing seats or reschedule history',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'beamal-six-term-'));t.after(()=>rm(dir,{recursive:true,force:true}));const databasePath=join(dir,'sample.sqlite');
 const source=await ensureLocalDemo({databasePath,startDate:'2090-01-06'});
 await completeDemo({databasePath,backupPath:join(dir,'before25.sqlite'),referenceDate:'2090-01-07'});
 const prices=[100000,120000,150000,120000,16800,120000],plan=source.mapping.courses.map((row,index)=>({...row,priceCents:prices[index]}));
 let db=new DatabaseSync(databasePath),before;
 try{before={sessions:db.prepare('SELECT * FROM student_sessions ORDER BY id').all(),requests:db.prepare('SELECT * FROM student_lesson_requests ORDER BY id').all(),students:db.prepare('SELECT * FROM people ORDER BY id').all()};}finally{db.close();}
 const result=await simplifyDemoFees({databasePath,backupPath:join(dir,'before-fees.sqlite'),plan});assert.equal(result.fees.length,6);assert.equal(result.orderCount,26);
 db=new DatabaseSync(databasePath,{readOnly:true});try{
  assert.equal(db.prepare('SELECT COUNT(*) n FROM fees').get().n,6);assert.equal(db.prepare('SELECT COUNT(*) n FROM course_fees').get().n,6);
  for(const row of db.prepare('SELECT data,price_cents FROM fees').all()){const data=JSON.parse(row.data);assert.match(data.feeName,/^Course [1-6]｜四堂一期$/);assert.equal(data.pricingModel,'package');assert.equal(data.packageTotal,4);assert.equal(data.months,undefined);assert.equal(data.duration,undefined);}
  for(const row of db.prepare('SELECT * FROM enrollment_orders').all()){
   const data=JSON.parse(row.data);assert.ok(data.items.every(item=>item.pricing.packageTotal===4&&item.feeName===`${item.courseName}｜四堂一期`));assert.equal(row.amount_cents,data.items.reduce((sum,item)=>sum+Math.round(item.pricing.price*100),0));
   assert.equal(db.prepare('SELECT amount_cents FROM enrollment_sales WHERE order_id=?').get(row.id).amount_cents,row.amount_cents);
  }
  assert.deepEqual(db.prepare('SELECT * FROM student_sessions ORDER BY id').all(),before.sessions);assert.deepEqual(db.prepare('SELECT * FROM student_lesson_requests ORDER BY id').all(),before.requests);assert.deepEqual(db.prepare('SELECT * FROM people ORDER BY id').all(),before.students);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM enrollment_order_audit_log WHERE action='order.demo-four-lesson-term'").get().n,26);
 }finally{db.close();}
 const store=await createStore({databasePath});try{const {orders}=store.enrollmentOrders.list({id:DEMO_IDS.users.maya});assert.equal(orders.length,26);assert.equal(store.listFees().length,6);const accounting=sharedAccountingData(orders);assert.equal(accounting.payments.length,26);assert.equal(Math.round(accounting.payments.reduce((sum,row)=>sum+row.amount,0)*100),result.paidTotalCents);const profile=store.studentRecords.workspace(DEMO_IDS.studentPerson,{id:DEMO_IDS.users.maya});assert.ok(profile.orders.every(row=>row.items.every(item=>item.pricing.packageTotal===4)));const {orders:familyOrders}=store.enrollmentOrders.list({id:DEMO_IDS.users.chloe});assert.ok(familyOrders.length>0&&familyOrders.every(row=>row.items.every(item=>item.pricing.packageTotal===4)));}finally{await store.close();}
 assert.equal((await simplifyDemoFees({databasePath,plan})).unchanged,true);
});

test('unknown databases are rejected without modifying their catalogue',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'beamal-six-unknown-'));t.after(()=>rm(dir,{recursive:true,force:true}));const databasePath=join(dir,'sample.sqlite');const store=await createStore({databasePath});await store.close();
 await assert.rejects(()=>simplifyDemoFees({databasePath,backupPath:join(dir,'before.sqlite'),plan:[]}),/25-student demo/);
});
