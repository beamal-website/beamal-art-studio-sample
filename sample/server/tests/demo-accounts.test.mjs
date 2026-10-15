import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createStore} from '../store.mjs';
import {hashPassword,verifyPassword} from '../security.mjs';
import {provisionDemoAccounts,DEMO_IDS} from '../demo-accounts.mjs';

async function temporaryDatabase(t) {
  const directory=await mkdtemp(join(tmpdir(),'beamal-demo-accounts-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const databasePath=join(directory,'fictional.sqlite');
  const store=await createStore({databasePath});await store.close();
  return databasePath;
}
const provision=databasePath=>provisionDemoAccounts({databasePath,startDate:'2026-10-16'});
const inspect=(databasePath,callback)=>{const db=new DatabaseSync(databasePath);db.exec('PRAGMA foreign_keys=ON;');try{return callback(db);}finally{db.close();}};
const count=(db,table)=>db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
const ownershipTables=['users','scheduling_resources','courses','fees','schedules','people','teacher_account_links'];

test('creates the three named test accounts and one explicitly imported existing Student, without payment or enrollment',async t=>{
  const databasePath=await temporaryDatabase(t),manifest=await provision(databasePath);
  assert.equal(manifest.created,true);assert.equal(manifest.student.created,true);
  assert.equal(manifest.profileKey,'checkpoint-demo3-v1');assert.equal(manifest.student.personId,DEMO_IDS.studentPerson);
  assert.doesNotMatch(JSON.stringify(manifest),/"000000"/);
  assert.doesNotMatch(JSON.stringify(manifest),/password|scrypt|credential|token/i);
  const rows=inspect(databasePath,db=>{
    assert.equal(count(db,'users'),3);assert.equal(count(db,'teacher_account_links'),2);assert.equal(count(db,'schedules'),2);
    const person=db.prepare('SELECT * FROM people WHERE id=?').get(DEMO_IDS.studentPerson);
    assert.equal(person.kind,'student');assert.equal(person.converted_at,null);assert.equal(person.converted_by,null);
    const profile=JSON.parse(person.profile);assert.equal(profile.displayName,'何詠晴 Chloe Ho');assert.equal(profile.email,'student@gmail.com');assert.match(profile.remark,/虛構/);
    const history=db.prepare('SELECT * FROM person_audit_log WHERE person_id=?').all(person.id);
    assert.equal(history.length,1);assert.equal(history[0].action,'person.import');assert.equal(history[0].actor_id,DEMO_IDS.users.maya);
    assert.equal(JSON.parse(history[0].snapshot).fixture.profileKey,'checkpoint-demo3-student-v1');
    for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all())if(/^(bookings|payments|enrollments|enrollment_orders|student_sessions|student_account_links)$/.test(name))assert.equal(count(db,name),0,name);
    return db.prepare('SELECT id,email,display_name,role,password_hash FROM users ORDER BY email').all();
  });
  assert.deepEqual(rows.map(row=>[row.email,row.role,row.display_name]),[['admin@gmail.com','admin','林雅晴 Maya Lam'],['student@gmail.com','student','何詠晴 Chloe Ho'],['teacher@gmail.com','teacher','陳子朗 Leo Chan']]);
  for(const row of rows)assert.equal(await verifyPassword('000000',row.password_hash),true);
});

test('safe reruns preserve edited names, passwords, profile data, schedules and audit history without duplicates',async t=>{
  const databasePath=await temporaryDatabase(t);await provision(databasePath);
  const changedHash=await hashPassword('Changed-fictional-password-123!');
  const before=inspect(databasePath,db=>{
    db.prepare('UPDATE users SET display_name=?,password_hash=? WHERE id=?').run('Edited Maya',changedHash,DEMO_IDS.users.maya);
    const person=db.prepare('SELECT profile FROM people WHERE id=?').get(DEMO_IDS.studentPerson),profile={...JSON.parse(person.profile),remark:'User edited this fixture'};
    db.prepare('UPDATE people SET profile=?,version=7 WHERE id=?').run(JSON.stringify(profile),DEMO_IDS.studentPerson);
    db.prepare('UPDATE schedules SET version=4 WHERE id=?').run(DEMO_IDS.schedules.leo);
    return Object.fromEntries([...ownershipTables,'person_audit_log','schedule_audit_log'].map(table=>[table,db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()]));
  });
  const second=await provisionDemoAccounts({databasePath,startDate:'2027-01-01'});
  assert.equal(second.created,false);assert.equal(second.student.created,false);assert.equal(second.startDate,'2026-10-16');
  const after=inspect(databasePath,db=>Object.fromEntries(Object.keys(before).map(table=>[table,db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()])));
  assert.deepEqual(after,before);
});

test('adds only the separately marked Student when upgrading an existing checkpoint profile',async t=>{
  const databasePath=await temporaryDatabase(t);await provision(databasePath);
  const baseline=inspect(databasePath,db=>{
    db.prepare('DELETE FROM person_audit_log WHERE person_id=?').run(DEMO_IDS.studentPerson);
    db.prepare('DELETE FROM people WHERE id=?').run(DEMO_IDS.studentPerson);
    db.prepare('DELETE FROM schema_metadata WHERE name=?').run('checkpoint_demo3_student_v1');
    return db.prepare('SELECT * FROM users ORDER BY id').all();
  });
  const manifest=await provision(databasePath);assert.equal(manifest.created,false);assert.equal(manifest.student.created,true);
  inspect(databasePath,db=>{assert.deepEqual(db.prepare('SELECT * FROM users ORDER BY id').all(),baseline);assert.equal(count(db,'people'),1);assert.equal(count(db,'person_audit_log'),1);});
});

test('unknown account collisions never replace another account or partially create fixtures',async t=>{
  const databasePath=await temporaryDatabase(t),originalHash=await hashPassword('Unrelated-account-password-123!');
  inspect(databasePath,db=>db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run('unrelated-admin','ADMIN@gmail.com','Existing administrator','admin',originalHash,'2026-01-01T00:00:00Z'));
  await assert.rejects(provision(databasePath),{code:'CHECKPOINT_PROFILE_CONFLICT'});
  inspect(databasePath,db=>{assert.equal(count(db,'users'),1);assert.equal(count(db,'people'),0);assert.equal(count(db,'courses'),0);assert.equal(db.prepare('SELECT password_hash FROM users').get().password_hash===originalHash,true);});
});

test('unknown Student profile collisions abort the whole new fixture, including accounts and counters',async t=>{
  const databasePath=await temporaryDatabase(t);
  inspect(databasePath,db=>db.prepare('INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)').run('unrelated-child','student','Another student',JSON.stringify({displayName:'Another student',email:'student@gmail.com'}),'another student','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z'));
  await assert.rejects(provision(databasePath),{code:'CHECKPOINT_PROFILE_CONFLICT'});
  inspect(databasePath,db=>{assert.equal(count(db,'people'),1);assert.equal(count(db,'users'),0);assert.equal(count(db,'courses'),0);assert.equal(db.prepare('SELECT value FROM course_sequence').get().value,0);assert.equal(db.prepare("SELECT COUNT(*) AS count FROM schema_metadata WHERE name LIKE 'checkpoint_demo3%'").get().count,0);});
});

test('an audit failure rolls back the entire batch and a corrected retry succeeds',async t=>{
  const databasePath=await temporaryDatabase(t);
  inspect(databasePath,db=>db.exec("CREATE TRIGGER demo_audit_failure BEFORE INSERT ON person_audit_log BEGIN SELECT RAISE(ABORT,'Fictional demo audit failure'); END;"));
  await assert.rejects(provision(databasePath),/Fictional demo audit failure/);
  inspect(databasePath,db=>{for(const table of ownershipTables)assert.equal(count(db,table),0,table);assert.equal(db.prepare('SELECT value FROM fee_sequence').get().value,0);assert.equal(db.prepare("SELECT COUNT(*) AS count FROM schema_metadata WHERE name LIKE 'checkpoint_demo3%'").get().count,0);db.exec('DROP TRIGGER demo_audit_failure');});
  assert.equal((await provision(databasePath)).created,true);
});

test('missing owned records and forged fixture markers are rejected without resetting user changes',async t=>{
  const databasePath=await temporaryDatabase(t);await provision(databasePath);
  inspect(databasePath,db=>db.prepare('DELETE FROM teacher_account_links WHERE teacher_resource_id=?').run(DEMO_IDS.teachers.leo));
  await assert.rejects(provision(databasePath),{code:'CHECKPOINT_PROFILE_INCOMPLETE'});
  inspect(databasePath,db=>{assert.equal(count(db,'teacher_account_links'),1);db.prepare('UPDATE schema_metadata SET value=? WHERE name=?').run(JSON.stringify({profileKey:'another-profile',ids:{}}),'checkpoint_demo3_v1');});
  await assert.rejects(provision(databasePath),{code:'CHECKPOINT_PROFILE_CONFLICT'});
});

test('requires explicit absolute database and valid date, while ordinary production seed validation remains strict',async t=>{
  await assert.rejects(provisionDemoAccounts({databasePath:'relative.sqlite'}),/absolute/);
  const databasePath=await temporaryDatabase(t);
  await assert.rejects(provisionDemoAccounts({databasePath,startDate:'2026-02-30'}),/valid/);
  await assert.rejects(createStore({seedUsers:[{email:'ordinary@example.test',password:'000000',displayName:'Ordinary','role':'admin'}]}),/Invalid seed user/);
});
