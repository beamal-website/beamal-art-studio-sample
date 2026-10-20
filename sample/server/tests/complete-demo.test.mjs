import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {ensureLocalDemo} from '../local-demo.mjs';
import {completeDemo} from '../complete-demo.mjs';
import {createStore} from '../store.mjs';
import {DEMO_IDS} from '../demo-accounts.mjs';

test('complete demo keeps 25 students with paid classes, scoped family records, history and balanced sales; retry is unchanged',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'beamal-complete-demo-'));t.after(()=>rm(dir,{recursive:true,force:true}));const databasePath=join(dir,'demo.sqlite');
 await ensureLocalDemo({databasePath,startDate:'2090-01-06'});
 const result=await completeDemo({databasePath,backupPath:join(dir,'before.sqlite'),referenceDate:'2090-01-07'});
 assert.equal(result.students.length,25);assert.deepEqual(result.counts,{activeStudents:25,archivedStudents:275,paidStudents:25});assert.equal(result.requestIds.length,25);
 const db=new DatabaseSync(databasePath,{readOnly:true});
 try{
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM student_lesson_requests WHERE status='approved'").get().n,25);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM student_records WHERE kind=?').get('assessment').n,25);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM student_records WHERE kind=?').get('journal').n,50);
  assert.equal(db.prepare('SELECT SUM(amount_cents) n FROM enrollment_orders WHERE payment_status=?').get('paid').n,db.prepare('SELECT SUM(amount_cents) n FROM enrollment_sales').get().n);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM people p WHERE p.kind='student' AND p.archived_at IS NULL AND NOT EXISTS(SELECT 1 FROM student_sessions s WHERE s.student_id=p.id)").get().n,0);
 }finally{db.close();}
 const store=await createStore({databasePath});try{
  const family=store.studentRecords.family({id:DEMO_IDS.users.chloe});assert.equal(family.students.length,1);assert.ok(family.records.some(row=>row.kind==='assessment'));assert.ok(family.records.every(row=>row.kind==='notice'||row.studentId===DEMO_IDS.studentPerson));assert.ok(family.records.every(row=>row.visibility!=='internal'));
  const teaching=store.studentRecords.teaching({id:DEMO_IDS.users.leo});assert.ok(teaching.students.length>0&&teaching.students.length<25);const own=new Set(teaching.students.map(row=>row.id));assert.ok(teaching.records.every(row=>own.has(row.studentId)));assert.ok(teaching.records.some(row=>row.kind==='assessment'));assert.throws(()=>store.studentRecords.teaching({id:DEMO_IDS.users.chloe}),/teacher login/);
  const workspace=store.studentRecords.workspace(DEMO_IDS.studentPerson,{id:DEMO_IDS.users.maya});assert.ok(workspace.orders.length);assert.equal(workspace.reschedules.filter(row=>row.status==='approved').length,1);assert.ok(workspace.recordLogs.length);const change=new DatabaseSync(databasePath);try{for(const row of change.prepare('SELECT id,data FROM schedules').all()){const data=JSON.parse(row.data);if(data.teacherIds?.includes(DEMO_IDS.teachers.leo))change.prepare('UPDATE schedules SET data=? WHERE id=?').run(JSON.stringify({...data,teacherIds:data.teacherIds.filter(id=>id!==DEMO_IDS.teachers.leo)}),row.id);}}finally{change.close();}assert.deepEqual(store.studentRecords.teaching({id:DEMO_IDS.users.leo}),{students:[],records:[]});
 }finally{await store.close();}
 const again=await completeDemo({databasePath,referenceDate:'2090-01-07'});assert.equal(again.unchanged,true);
});

test('unknown database is rejected without changing records',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'beamal-complete-unowned-'));t.after(()=>rm(dir,{recursive:true,force:true}));const databasePath=join(dir,'unknown.sqlite');const store=await createStore({databasePath});await store.close();
 await assert.rejects(()=>completeDemo({databasePath,backupPath:join(dir,'backup.sqlite'),referenceDate:'2090-01-07'}),/explicitly owned/);
});
