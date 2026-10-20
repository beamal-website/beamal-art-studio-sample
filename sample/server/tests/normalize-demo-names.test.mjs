import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {ensureLocalDemo} from '../local-demo.mjs';
import {completeDemo} from '../complete-demo.mjs';
import {normalizeDemoNames} from '../normalize-demo-names.mjs';
import {createStore} from '../store.mjs';
import {DEMO_IDS} from '../demo-accounts.mjs';

test('Chinese display names preserve English search, paid records, identities, teaching links and class arrangements',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'beamal-chinese-names-'));t.after(()=>rm(dir,{recursive:true,force:true}));const databasePath=join(dir,'sample.sqlite');
 await ensureLocalDemo({databasePath,startDate:'2090-01-06'});await completeDemo({databasePath,backupPath:join(dir,'before25.sqlite'),referenceDate:'2090-01-07'});
 let db=new DatabaseSync(databasePath),before;
 try{db.prepare("INSERT INTO users(id,email,display_name,role,password_hash,created_at) VALUES ('unrelated-user','unrelated@example.invalid','何詠晴 Chloe Ho','student','not-a-login',?)").run(new Date().toISOString());before={sessions:db.prepare('SELECT * FROM student_sessions ORDER BY id').all(),links:db.prepare('SELECT * FROM teacher_account_links ORDER BY teacher_resource_id').all(),payments:db.prepare('SELECT * FROM enrollment_sales ORDER BY id').all(),profiles:db.prepare("SELECT id,profile FROM people WHERE kind='student' ORDER BY id").all()};}finally{db.close();}
 const result=await normalizeDemoNames({databasePath,backupPath:join(dir,'before-names.sqlite')});assert.equal(result.students,300);assert.equal(result.activeStudents,25);assert.equal(result.teachers,4);
 db=new DatabaseSync(databasePath,{readOnly:true});try{
  for(const row of db.prepare("SELECT * FROM people WHERE kind='student'").all()){
   const profile=JSON.parse(row.profile);assert.equal(row.display_name,profile.localName);assert.equal(profile.displayName,profile.localName);assert.match(profile.displayName,/^[\p{Script=Han}]+$/u);assert.doesNotMatch(profile.fullName,/[\p{Script=Han}]/u);assert.equal(profile.fullName,JSON.parse(before.profiles.find(item=>item.id===row.id).profile).fullName);
  }
  for(const row of db.prepare('SELECT r.display_name,p.profile FROM scheduling_resources r JOIN staff_personal_profiles p ON p.teacher_resource_id=r.id WHERE r.archived_at IS NULL').all()){const profile=JSON.parse(row.profile);assert.equal(row.display_name,profile.localName);assert.doesNotMatch(profile.fullName,/[\p{Script=Han}]/u);}
  assert.deepEqual(db.prepare('SELECT * FROM student_sessions ORDER BY id').all(),before.sessions);assert.deepEqual(db.prepare('SELECT * FROM teacher_account_links ORDER BY teacher_resource_id').all(),before.links);assert.deepEqual(db.prepare('SELECT * FROM enrollment_sales ORDER BY id').all(),before.payments);
  assert.ok(db.prepare("SELECT id FROM people WHERE kind='student' AND instr(search_text,'chloe ho')>0").get());
  assert.equal(db.prepare('SELECT display_name FROM users WHERE id=?').get(DEMO_IDS.users.chloe).display_name,'何詠晴');assert.equal(db.prepare("SELECT display_name FROM users WHERE id='unrelated-user'").get().display_name,'何詠晴 Chloe Ho');
  for(const row of db.prepare('SELECT o.data,p.display_name FROM enrollment_orders o JOIN people p ON p.id=o.student_id').all())assert.equal(JSON.parse(row.data).studentName,row.display_name);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{db.close();}
 assert.equal((await normalizeDemoNames({databasePath})).unchanged,true);
});
test('unowned databases are rejected before a backup or data change',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'beamal-unknown-names-'));t.after(()=>rm(dir,{recursive:true,force:true}));const databasePath=join(dir,'sample.sqlite');const store=await createStore({databasePath});await store.close();
 await assert.rejects(()=>normalizeDemoNames({databasePath,backupPath:join(dir,'before.sqlite')}),/owned student demo/);
});
