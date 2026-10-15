import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ensureLocalDemo} from '../local-demo.mjs';
import {enrichOwnedDemoProfiles} from '../demo-profile-enrichment.mjs';
import {createStore} from '../store.mjs';
import {DEMO_IDS} from '../demo-accounts.mjs';
import {RELATIONAL_DEMO_IDS} from '../relational-demo.mjs';

const fields=['gender','dateOfBirth','firstName','lastName','fullName','localName','school','level'];
const ownedIds=[DEMO_IDS.studentPerson,...RELATIONAL_DEMO_IDS.students];
const inspect=(path,callback)=>{const db=new DatabaseSync(path);try{return callback(db);}finally{db.close();}};
const profiles=db=>db.prepare("SELECT * FROM people WHERE kind='student' ORDER BY id").all();
const protectedTables=['users','scheduling_resources','courses','fees','schedules','teacher_account_links','student_account_links','enrollment_orders','student_sessions','enrollment_sales','enrollment_order_audit_log','schema_metadata'];
const protectedSnapshot=db=>Object.fromEntries(protectedTables.map(table=>[table,db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()]));
const blank=value=>value===null||value===undefined||typeof value==='string'&&!value.trim();
async function temporary(t){const directory=await fs.mkdtemp(join(tmpdir(),'beamal-profile-enrichment-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));return {directory,databasePath:join(directory,'demo.sqlite')};}
async function fixture(t){const input=await temporary(t);await ensureLocalDemo({...input,startDate:'2026-10-16'});return input;}
async function fileSnapshot(input){return {bytes:await fs.readFile(input.databasePath),mtime:(await fs.stat(input.databasePath)).mtimeMs,names:(await fs.readdir(input.directory)).sort()};}
async function unchanged(input,before){assert.deepEqual(await fs.readFile(input.databasePath),before.bytes);assert.equal((await fs.stat(input.databasePath)).mtimeMs,before.mtime);assert.deepEqual((await fs.readdir(input.directory)).sort(),before.names);}

test('explicit enrichment of complete owned profiles is a true no-op with identical bytes timestamps and no new sidecars',async t=>{
 const input=await fixture(t),before=await fileSnapshot(input),result=await enrichOwnedDemoProfiles({databasePath:input.databasePath});assert.equal(result.updatedProfiles,0);assert.equal(result.updatedFields,0);assert.deepEqual(result.updatedStudentIds,[]);assert.equal(result.startDate,'2026-10-16');await unchanged(input,before);
});

test('enrichment fills only blank owned personal fields with audited version changes and no extra enrollment payment or account',async t=>{
 const input=await fixture(t);
 const before=inspect(input.databasePath,db=>{
  for(const row of profiles(db)){const profile=JSON.parse(row.profile);for(const key of fields.filter(key=>key!=='dateOfBirth'))profile[key]='';if(row.id===RELATIONAL_DEMO_IDS.students[3])profile.dateOfBirth=null;if(row.id===RELATIONAL_DEMO_IDS.students[0])Object.assign(profile,{gender:'Unspecified',dateOfBirth:'2013-08-21',firstName:'Family preferred name',school:'Family selected school'});db.prepare('UPDATE people SET profile=?,version=version+1 WHERE id=?').run(JSON.stringify(profile),row.id);}
  const stamp='2026-01-01T00:00:00Z';db.prepare("INSERT INTO people VALUES ('unrelated-student','student','原有學生',?,'原有學生',1,?,?,NULL,NULL)").run(JSON.stringify({displayName:'原有學生',gender:'',dateOfBirth:null}),stamp,stamp);
  return {people:profiles(db),protected:protectedSnapshot(db),audit:db.prepare('SELECT * FROM person_audit_log ORDER BY id').all()};
 });
 const changedBefore=before.people.filter(row=>ownedIds.includes(row.id)),expectedFields=changedBefore.reduce((count,row)=>count+fields.filter(key=>blank(JSON.parse(row.profile)[key])).length,0),result=await enrichOwnedDemoProfiles({databasePath:input.databasePath});
 assert.equal(result.updatedProfiles,300);assert.equal(result.updatedFields,expectedFields);assert.deepEqual([...result.updatedStudentIds].sort(),[...ownedIds].sort());
 inspect(input.databasePath,db=>{
  assert.deepEqual(protectedSnapshot(db),before.protected);assert.equal(profiles(db).length,301);
  for(const prior of before.people){const row=db.prepare('SELECT * FROM people WHERE id=?').get(prior.id),profile=JSON.parse(row.profile),previous=JSON.parse(prior.profile);if(!ownedIds.includes(row.id)){assert.deepEqual(row,prior);continue;}
   assert.equal(row.version,prior.version+1);assert.equal(row.display_name,prior.display_name);for(const key of fields)assert.ok(!blank(profile[key]),row.id+' '+key);
   for(const [key,value]of Object.entries(previous))if(!fields.includes(key)||!blank(value))assert.deepEqual(profile[key],value,row.id+' preserved '+key);
   const audit=db.prepare('SELECT * FROM person_audit_log WHERE person_id=? ORDER BY id DESC LIMIT 1').get(row.id);assert.equal(audit.action,'person.enrich-owned-demo');assert.equal(audit.actor_id,DEMO_IDS.users.maya);assert.equal(audit.version,row.version);assert.equal(JSON.parse(audit.snapshot).id,row.id);assert.equal(JSON.parse(audit.snapshot).gender,profile.gender);assert.equal(JSON.parse(audit.snapshot).dateOfBirth,profile.dateOfBirth);
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM person_audit_log').get().count,before.audit.length+300);
 });
 const after=await fileSnapshot(input);assert.equal((await enrichOwnedDemoProfiles({databasePath:input.databasePath})).updatedProfiles,0);await unchanged(input,after);
});

test('enrichment can fill missing registration contacts while preserving every nonempty human value and later reruns',async t=>{
 const input=await fixture(t),id=RELATIONAL_DEMO_IDS.students[2],registration=['parentName','contact1Name','contact1Phone','contact1Email','contact2Name','contact2Phone','contact2Email','district','address','whatsApp','phone','mobile','email','detail','billName'];
 const before=inspect(input.databasePath,db=>{const row=db.prepare('SELECT * FROM people WHERE id=?').get(id),profile=JSON.parse(row.profile);for(const key of registration)profile[key]='';Object.assign(profile,{contact1Name:'家長自訂名稱',mobile:'+852 0000 8888',remark:'家長保留的自由備註'});db.prepare('UPDATE people SET profile=? WHERE id=?').run(JSON.stringify(profile),id);return {profile,protected:protectedSnapshot(db)};});
 const result=await enrichOwnedDemoProfiles({databasePath:input.databasePath});assert.equal(result.updatedProfiles,1);inspect(input.databasePath,db=>{const row=JSON.parse(db.prepare('SELECT profile FROM people WHERE id=?').get(id).profile);for(const key of registration)assert.ok(!blank(row[key]),key);for(const key of ['contact1Name','mobile','remark','dateOfBirth','gender','fullName'])assert.equal(row[key],before.profile[key]);assert.deepEqual(protectedSnapshot(db),before.protected);});
 const saved=await fileSnapshot(input);assert.equal((await enrichOwnedDemoProfiles({databasePath:input.databasePath})).updatedProfiles,0);await unchanged(input,saved);
});

test('unknown ordinary WAL databases corrupt files and symbolic paths are refused without touching the original bytes or directory',async t=>{
 const input=await temporary(t),store=await createStore({databasePath:input.databasePath});await store.close();const before=await fileSnapshot(input);await assert.rejects(enrichOwnedDemoProfiles({databasePath:input.databasePath}),{code:'DEMO_PROFILES_UNOWNED_DATABASE'});await unchanged(input,before);
 const linkPath=join(input.directory,'alias.sqlite');await fs.symlink(input.databasePath,linkPath);const linked=await fileSnapshot(input);await assert.rejects(enrichOwnedDemoProfiles({databasePath:linkPath}),{code:'DEMO_PROFILES_UNOWNED_DATABASE'});await unchanged(input,linked);
 const corrupt={...input,databasePath:join(input.directory,'corrupt.sqlite')};await fs.writeFile(corrupt.databasePath,'NOT A DATABASE');const bad=await fileSnapshot(corrupt);await assert.rejects(enrichOwnedDemoProfiles({databasePath:corrupt.databasePath}),{code:'DEMO_PROFILES_UNOWNED_DATABASE'});await unchanged(corrupt,bad);
});

test('unsafe SHM and other SQLite sidecars are refused before enrichment without changing the owned database or unrelated target',async t=>{
 for(const [suffix,type,missing]of [['-shm','symlink',true],['-shm','directory',true],['-shm','symlink',false],['-wal','symlink',true],['-journal','directory',true]]){
  const input=await fixture(t),sentinel=join(input.directory,'unrelated.txt');await fs.writeFile(sentinel,'PRESERVE UNRELATED CONTENT');if(missing)inspect(input.databasePath,db=>db.prepare("UPDATE people SET profile=json_set(profile,'$.gender','') WHERE id=?").run(DEMO_IDS.studentPerson));
  if(type==='symlink')await fs.symlink(sentinel,input.databasePath+suffix);else await fs.mkdir(input.databasePath+suffix);
  const before=await fileSnapshot(input);await assert.rejects(enrichOwnedDemoProfiles({databasePath:input.databasePath}),{code:'DEMO_PROFILES_UNOWNED_DATABASE'},suffix+' '+type);await unchanged(input,before);assert.equal(await fs.readFile(sentinel,'utf8'),'PRESERVE UNRELATED CONTENT');
 }
});

test('sidecar safety is checked again after the private probe and before opening the original for enrichment',async t=>{
 const input=await fixture(t);inspect(input.databasePath,db=>db.prepare("UPDATE people SET profile=json_set(profile,'$.gender','') WHERE id=?").run(DEMO_IDS.studentPerson));const sentinel=join(input.directory,'unrelated.txt');await fs.writeFile(sentinel,'PRESERVE UNRELATED CONTENT');
 const read=fs.lstat.bind(fs);let mainChecks=0,injected=false;
 t.mock.method(fs,'lstat',async(path,...args)=>{if(path===input.databasePath&&++mainChecks===2){await fs.symlink(sentinel,input.databasePath+'-shm');injected=true;}return read(path,...args);});
 const before=await fileSnapshot(input);await assert.rejects(enrichOwnedDemoProfiles({databasePath:input.databasePath}),{code:'DEMO_PROFILES_UNOWNED_DATABASE'});assert.equal(injected,true);assert.deepEqual(await fs.readFile(input.databasePath),before.bytes);assert.equal((await fs.stat(input.databasePath)).mtimeMs,before.mtime);assert.equal(await fs.readFile(sentinel,'utf8'),'PRESERVE UNRELATED CONTENT');assert.equal((await fs.lstat(input.databasePath+'-shm')).isSymbolicLink(),true);
});

test('all ownership markers exact student IDs original import audits and existing account links are required before writing',async t=>{
 for(const tamper of ['local-marker','student-ids','import-audit','chloe-link','student-kind']){
  const input=await fixture(t);inspect(input.databasePath,db=>{
   if(tamper==='local-marker')db.prepare("DELETE FROM schema_metadata WHERE name='local_demo_v1'").run();
   if(tamper==='student-ids'){const row=db.prepare("SELECT value FROM schema_metadata WHERE name='relational_centre_demo_v1'").get(),marker=JSON.parse(row.value);marker.studentIds[1]='unowned-record';db.prepare("UPDATE schema_metadata SET value=? WHERE name='relational_centre_demo_v1'").run(JSON.stringify(marker));}
   if(tamper==='import-audit')db.prepare('DELETE FROM person_audit_log WHERE person_id=?').run(RELATIONAL_DEMO_IDS.students[1]);
   if(tamper==='chloe-link')db.prepare('DELETE FROM student_account_links WHERE student_id=?').run(DEMO_IDS.studentPerson);
   if(tamper==='student-kind')db.prepare("UPDATE people SET kind='applicant' WHERE id=?").run(RELATIONAL_DEMO_IDS.students[1]);
  });const before=await fileSnapshot(input);await assert.rejects(enrichOwnedDemoProfiles({databasePath:input.databasePath}),{code:'DEMO_PROFILES_UNOWNED_DATABASE'},tamper);await unchanged(input,before);
 }
});

test('an audit failure rolls back every personal-field update and version while a corrected explicit retry succeeds',async t=>{
 const input=await fixture(t),ids=ownedIds.slice(0,2);inspect(input.databasePath,db=>{for(const id of ids)db.prepare("UPDATE people SET profile=json_set(profile,'$.gender','') WHERE id=?").run(id);db.exec(`CREATE TRIGGER enrichment_audit_failure BEFORE INSERT ON person_audit_log WHEN NEW.action='person.enrich-owned-demo' AND NEW.person_id='${ids[1]}' BEGIN SELECT RAISE(ABORT,'Fictional enrichment audit failure'); END;`);});
 const before=inspect(input.databasePath,db=>({people:profiles(db),audit:db.prepare('SELECT * FROM person_audit_log ORDER BY id').all(),protected:protectedSnapshot(db)}));await assert.rejects(enrichOwnedDemoProfiles({databasePath:input.databasePath}),/Fictional enrichment audit failure/);
 inspect(input.databasePath,db=>{assert.deepEqual(profiles(db),before.people);assert.deepEqual(db.prepare('SELECT * FROM person_audit_log ORDER BY id').all(),before.audit);assert.deepEqual(protectedSnapshot(db),before.protected);db.exec('DROP TRIGGER enrichment_audit_failure');});assert.equal((await enrichOwnedDemoProfiles({databasePath:input.databasePath})).updatedProfiles,2);
});

test('the private ownership probe reads committed WAL markers and missing fields without rebuilding the fixture',async t=>{
 const input=await fixture(t),db=new DatabaseSync(input.databasePath);t.after(()=>db.close());db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;');
 const rows=db.prepare("SELECT * FROM schema_metadata WHERE name IN ('local_demo_v1','relational_centre_demo_v1','checkpoint_demo3_v1','checkpoint_demo3_student_v1')").all();db.exec("DELETE FROM schema_metadata WHERE name IN ('local_demo_v1','relational_centre_demo_v1','checkpoint_demo3_v1','checkpoint_demo3_student_v1'); PRAGMA wal_checkpoint(TRUNCATE);");for(const row of rows)db.prepare('INSERT INTO schema_metadata VALUES (?,?)').run(row.name,row.value);db.prepare("UPDATE people SET profile=json_set(profile,'$.gender','') WHERE id=?").run(DEMO_IDS.studentPerson);
 const before=protectedSnapshot(db),result=await enrichOwnedDemoProfiles({databasePath:input.databasePath});assert.equal(result.updatedProfiles,1);assert.equal(JSON.parse(db.prepare('SELECT profile FROM people WHERE id=?').get(DEMO_IDS.studentPerson).profile).gender,'Female');assert.deepEqual(protectedSnapshot(db),before);assert.equal(profiles(db).length,300);
});


test('explicit generated refresh upgrades an owned pre-launcher cohort while preserving human edits and all linked records',async t=>{
 const input=await fixture(t),id=RELATIONAL_DEMO_IDS.students[0];
 const before=inspect(input.databasePath,db=>{
  db.prepare("DELETE FROM schema_metadata WHERE name='local_demo_v1'").run();
  for(const row of profiles(db)){
   if(row.id===DEMO_IDS.studentPerson)continue;
   const profile={...JSON.parse(row.profile),dateOfBirth:'2017-01-01',parentName:'陳嘉敏',contact1Name:'陳嘉敏',displayName:'陳學生 '+row.id.slice(-3),school:'',gender:'',firstName:'',fullName:'',remark:'喜歡繪畫與動手創作。'};
   db.prepare('UPDATE people SET display_name=?,profile=? WHERE id=?').run(profile.displayName,JSON.stringify(profile),row.id);
   const audit=db.prepare("SELECT id,snapshot FROM person_audit_log WHERE person_id=? AND action='person.import'").get(row.id),snapshot={...JSON.parse(audit.snapshot),...profile};
   db.prepare('UPDATE person_audit_log SET snapshot=? WHERE id=?').run(JSON.stringify(snapshot),audit.id);
  }
  const row=db.prepare('SELECT profile FROM people WHERE id=?').get(id),profile={...JSON.parse(row.profile),remark:'家長親自更新：喜歡陶藝',mobile:'+852 0000 8888'};
  db.prepare('UPDATE people SET profile=?,version=version+1 WHERE id=?').run(JSON.stringify(profile),id);
  return {protected:protectedSnapshot(db),names:profiles(db).map(row=>row.id)};
 });
 const result=await enrichOwnedDemoProfiles({databasePath:input.databasePath,refreshGenerated:true});assert.equal(result.updatedProfiles,299);
 inspect(input.databasePath,db=>{
  assert.deepEqual(protectedSnapshot(db),before.protected);assert.deepEqual(profiles(db).map(row=>row.id),before.names);
  const all=profiles(db).map(row=>({...JSON.parse(row.profile),displayName:row.display_name}));assert.equal(new Set(all.map(row=>row.dateOfBirth.slice(5,7))).size,12);assert.equal(new Set(all.map(row=>row.fullName)).size,300);
  const contacts=new Map();for(const row of all)contacts.set(row.contact1Name,(contacts.get(row.contact1Name)||0)+1);assert.ok(Math.max(...contacts.values())<=3);
  const saved=JSON.parse(db.prepare('SELECT profile FROM people WHERE id=?').get(id).profile);assert.equal(saved.remark,'家長親自更新：喜歡陶藝');assert.equal(saved.mobile,'+852 0000 8888');
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM person_audit_log WHERE action='person.refresh-owned-demo'").get().count,299);
 });
 const after=await fileSnapshot(input);assert.equal((await enrichOwnedDemoProfiles({databasePath:input.databasePath,refreshGenerated:true})).updatedProfiles,0);await unchanged(input,after);
});

test('generated refresh is opt-in and requires valid relational ownership even if names look like demos',async t=>{
 const input=await fixture(t);inspect(input.databasePath,db=>db.prepare("DELETE FROM schema_metadata WHERE name='local_demo_v1'").run());const before=await fileSnapshot(input);
 await assert.rejects(enrichOwnedDemoProfiles({databasePath:input.databasePath}),{code:'DEMO_PROFILES_UNOWNED_DATABASE'});await unchanged(input,before);
 inspect(input.databasePath,db=>db.prepare("DELETE FROM schema_metadata WHERE name='relational_centre_demo_v1'").run());const tampered=await fileSnapshot(input);
 await assert.rejects(enrichOwnedDemoProfiles({databasePath:input.databasePath,refreshGenerated:true}),{code:'DEMO_PROFILES_UNOWNED_DATABASE'});await unchanged(input,tampered);
});

test('generated refresh rolls back all changed names profiles and versions if its audit cannot be written',async t=>{
 const input=await fixture(t),id=RELATIONAL_DEMO_IDS.students[0];
 inspect(input.databasePath,db=>{db.prepare("UPDATE people SET profile=json_set(profile,'$.gender','') WHERE id IN (?,?)").run(id,RELATIONAL_DEMO_IDS.students[1]);db.exec(`CREATE TRIGGER refresh_audit_failure BEFORE INSERT ON person_audit_log WHEN NEW.action='person.refresh-owned-demo' AND NEW.person_id='${RELATIONAL_DEMO_IDS.students[1]}' BEGIN SELECT RAISE(ABORT,'Refresh audit unavailable'); END;`);});
 const before=inspect(input.databasePath,db=>({people:profiles(db),audit:db.prepare('SELECT * FROM person_audit_log ORDER BY id').all(),protected:protectedSnapshot(db)}));
 await assert.rejects(enrichOwnedDemoProfiles({databasePath:input.databasePath,refreshGenerated:true}),/Refresh audit unavailable/);
 inspect(input.databasePath,db=>{assert.deepEqual(profiles(db),before.people);assert.deepEqual(db.prepare('SELECT * FROM person_audit_log ORDER BY id').all(),before.audit);assert.deepEqual(protectedSnapshot(db),before.protected);});
});
