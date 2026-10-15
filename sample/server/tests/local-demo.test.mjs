import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ensureLocalDemo} from '../local-demo.mjs';
import {DEMO_IDS} from '../demo-accounts.mjs';
import {verifyPassword,hashPassword} from '../security.mjs';
import {createStore} from '../store.mjs';

async function temporary(t){const directory=await fs.mkdtemp(join(tmpdir(),'beamal-local-launcher-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));return {directory,databasePath:join(directory,'demo.sqlite')};}
const inspect=(path,callback)=>{const db=new DatabaseSync(path);try{return callback(db);}finally{db.close();}};
const count=(db,table)=>db.prepare(`SELECT COUNT(*) AS value FROM ${table}`).get().value;
const launch=input=>ensureLocalDemo({...input,startDate:'2026-10-16'});

test('a new private demo has the exact three password accounts, four teaching resources, six courses and truthful 300-student relations',async t=>{
 const input=await temporary(t),result=await launch(input);assert.equal(result.created,true);assert.equal(result.profileKey,'local-demo-v1');assert.equal(result.startDate,'2026-10-16');assert.equal(result.mapping.teachers.length,4);assert.equal(result.mapping.courses.length,6);assert.equal(result.counts.students,300);assert.equal(result.counts.paidStudents,1);
 const accounts=inspect(input.databasePath,db=>{
  assert.equal(count(db,'users'),3);assert.equal(count(db,'people'),300);assert.equal(count(db,'courses'),6);assert.equal(db.prepare("SELECT COUNT(*) AS value FROM scheduling_resources WHERE kind='teacher'").get().value,4);
  assert.deepEqual(db.prepare("SELECT display_name FROM scheduling_resources WHERE kind='teacher' ORDER BY display_name").all().map(row=>row.display_name).sort(),['林雅晴 Maya Lam','陳子朗 Leo Chan','許悅童 Ava Hui','鄭思澄 Ethan Cheng'].sort());
  assert.deepEqual(db.prepare('SELECT data FROM courses').all().map(row=>JSON.parse(row.data).courseName).sort(),['創意繪畫','水彩探索','幼兒創意藝術','繪本創作','手作與拼貼','素描基礎'].sort());
  assert.equal(count(db,'teacher_account_links'),2);assert.equal(count(db,'student_account_links'),1);assert.equal(db.prepare('SELECT student_id FROM student_account_links').get().student_id,DEMO_IDS.studentPerson);
  assert.deepEqual(db.prepare("SELECT DISTINCT student_id FROM enrollment_orders WHERE payment_status='paid'").all().map(row=>row.student_id),[DEMO_IDS.studentPerson]);assert.equal(count(db,'enrollment_sales'),2);assert.equal(count(db,'student_sessions'),7);
  assert.equal(db.prepare("SELECT COUNT(*) AS value FROM people WHERE kind='student' AND json_extract(profile,'$.quitDate') IS NULL").get().value,300);
  const marker=JSON.parse(db.prepare("SELECT value FROM schema_metadata WHERE name='local_demo_v1'").get().value);assert.deepEqual(marker.mapping,result.mapping);assert.equal(marker.startDate,result.startDate);
  return db.prepare('SELECT email,role,password_hash FROM users ORDER BY email').all();
 });
 assert.deepEqual(accounts.map(row=>[row.email,row.role]),[['admin@gmail.com','admin'],['student@gmail.com','student'],['teacher@gmail.com','teacher']]);for(const account of accounts)assert.equal(await verifyPassword('000000',account.password_hash),true);
 assert.equal((await fs.stat(input.databasePath)).mode&0o777,0o600);assert.equal((await fs.stat(input.directory)).mode&0o777,0o700);assert.deepEqual(await fs.readdir(input.directory),['demo.sqlite']);assert.doesNotMatch(JSON.stringify(result),/scrypt|password_hash/);
});

test('an owned restart preserves changed passwords, students and lessons, the saved date and all database bytes without duplicate initialization',async t=>{
 const input=await temporary(t),first=await launch(input),passwordHash=await hashPassword('User-changed-demo-passphrase');
 inspect(input.databasePath,db=>{db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash,DEMO_IDS.users.maya);db.prepare("UPDATE people SET profile=json_set(profile,'$.remark','家長更新內容'),version=version+1 WHERE id=?").run(DEMO_IDS.studentPerson);db.prepare('UPDATE schedules SET version=version+1 WHERE id=?').run(DEMO_IDS.schedules.leo);});
 const before=await fs.readFile(input.databasePath),beforeStat=await fs.stat(input.databasePath),second=await ensureLocalDemo({databasePath:input.databasePath,startDate:'2027-04-02'});assert.equal(second.created,false);assert.equal(second.startDate,'2026-10-16');assert.deepEqual(second.mapping,first.mapping);assert.deepEqual(await fs.readFile(input.databasePath),before);assert.equal((await fs.stat(input.databasePath)).mtimeMs,beforeStat.mtimeMs);
 inspect(input.databasePath,db=>{assert.equal(count(db,'users'),3);assert.equal(count(db,'people'),300);assert.equal(db.prepare('SELECT password_hash FROM users WHERE id=?').get(DEMO_IDS.users.maya).password_hash,passwordHash);assert.equal(JSON.parse(db.prepare('SELECT profile FROM people WHERE id=?').get(DEMO_IDS.studentPerson).profile).remark,'家長更新內容');});
});

test('an unknown existing SQLite database is refused read only with identical bytes mtime account contents and no new sidecars',async t=>{
 const input=await temporary(t);inspect(input.databasePath,db=>db.exec("CREATE TABLE users(id TEXT PRIMARY KEY,password_hash TEXT); INSERT INTO users VALUES('original','DO NOT RESET'); CREATE TABLE schema_metadata(name TEXT PRIMARY KEY,value TEXT); INSERT INTO schema_metadata VALUES('checkpoint_demo3_v1','{}');"));
 const before=await fs.readFile(input.databasePath),stamp=(await fs.stat(input.databasePath)).mtimeMs,names=await fs.readdir(input.directory);await assert.rejects(launch(input),{code:'LOCAL_DEMO_UNOWNED_DATABASE'});assert.deepEqual(await fs.readFile(input.databasePath),before);assert.equal((await fs.stat(input.databasePath)).mtimeMs,stamp);assert.deepEqual(await fs.readdir(input.directory),names);assert.equal(inspect(input.databasePath,db=>db.prepare('SELECT password_hash FROM users').get().password_hash),'DO NOT RESET');
});

test('empty files corrupt SQLite markers and symlink destinations are not adopted or repaired',async t=>{
 const input=await temporary(t);await fs.writeFile(input.databasePath,'');await assert.rejects(launch(input),{code:'LOCAL_DEMO_UNOWNED_DATABASE'});assert.equal((await fs.stat(input.databasePath)).size,0);await fs.unlink(input.databasePath);
 inspect(input.databasePath,db=>db.exec("CREATE TABLE schema_metadata(name TEXT PRIMARY KEY,value TEXT); INSERT INTO schema_metadata VALUES('local_demo_v1','{bad json');"));const bytes=await fs.readFile(input.databasePath);await assert.rejects(launch(input),{code:'LOCAL_DEMO_UNOWNED_DATABASE'});assert.deepEqual(await fs.readFile(input.databasePath),bytes);
 const linkPath=join(input.directory,'alias.sqlite');await fs.symlink(input.databasePath,linkPath);await assert.rejects(ensureLocalDemo({databasePath:linkPath}),{code:'LOCAL_DEMO_UNOWNED_DATABASE'});assert.deepEqual(await fs.readFile(input.databasePath),bytes);
});

test('fresh initialization does not depend on environment database paths and creates a private dedicated parent directory',async t=>{
 const input=await temporary(t),original=process.env.BEAMAL_DATABASE_PATH;process.env.BEAMAL_DATABASE_PATH=join(input.directory,'unrelated.sqlite');t.after(()=>{if(original===undefined)delete process.env.BEAMAL_DATABASE_PATH;else process.env.BEAMAL_DATABASE_PATH=original;});await fs.writeFile(process.env.BEAMAL_DATABASE_PATH,'DO NOT USE');
 const databasePath=join(input.directory,'private-data','demo.sqlite'),result=await ensureLocalDemo({databasePath,startDate:'2026-10-16'});assert.equal(result.created,true);assert.equal((await fs.stat(join(input.directory,'private-data'))).mode&0o777,0o700);assert.equal(await fs.readFile(process.env.BEAMAL_DATABASE_PATH,'utf8'),'DO NOT USE');
});

test('an initialization finalization failure publishes no partial database and cleans only its own staging',async t=>{
 const input=await temporary(t),sentinel=join(input.directory,'.unrelated-staging');await fs.writeFile(sentinel,'PRESERVE');const realOpen=fs.open.bind(fs);t.mock.method(fs,'open',async(path,flags,...args)=>{if(flags==='r'&&String(path).includes('.beamal-local-demo-'))throw Object.assign(new Error('Injected durability failure'),{code:'EIO'});return realOpen(path,flags,...args);});
 await assert.rejects(launch(input),{code:'EIO'});await assert.rejects(fs.stat(input.databasePath),{code:'ENOENT'});assert.deepEqual(await fs.readdir(input.directory),['.unrelated-staging']);assert.equal(await fs.readFile(sentinel,'utf8'),'PRESERVE');
});

test('exclusive publication refuses an atomic destination collision without overwriting the other file',async t=>{
 const input=await temporary(t),realLink=fs.link.bind(fs);let collisionStamp;t.mock.method(fs,'link',async(source,destination)=>{await fs.writeFile(destination,'RACING UNKNOWN DATABASE',{flag:'wx',mode:0o600});collisionStamp=(await fs.stat(destination)).mtimeMs;return realLink(source,destination);});
 await assert.rejects(launch(input),{code:'EEXIST'});assert.equal(await fs.readFile(input.databasePath,'utf8'),'RACING UNKNOWN DATABASE');assert.equal((await fs.stat(input.databasePath)).mtimeMs,collisionStamp);assert.deepEqual(await fs.readdir(input.directory),['demo.sqlite']);
});

test('the first implicit start date is a Hong Kong Friday within the next week and is retained on restart',async t=>{
 const input=await temporary(t),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),today=['year','month','day'].map(key=>parts.find(part=>part.type===key).value).join('-'),result=await ensureLocalDemo({databasePath:input.databasePath});
 assert.equal(new Date(result.startDate+'T00:00:00Z').getUTCDay(),5);const days=(Date.parse(result.startDate+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000;assert.ok(days>=0&&days<=6);const restarted=await ensureLocalDemo({databasePath:input.databasePath});assert.equal(restarted.startDate,result.startDate);
});

test('invalid paths and dates cannot create a partial local demo',async t=>{
 const input=await temporary(t);for(const databasePath of [undefined,'relative.sqlite',':memory:'])await assert.rejects(ensureLocalDemo({databasePath}),/absolute/);await assert.rejects(ensureLocalDemo({databasePath:input.databasePath,startDate:'2026-02-30'}),/valid startDate/);assert.deepEqual(await fs.readdir(input.directory),[]);
});

test('refusing an unknown WAL database must not create journals or lock files in its directory',async t=>{
 const input=await temporary(t),store=await createStore({databasePath:input.databasePath});await store.close();
 const before=await fs.readFile(input.databasePath),names=(await fs.readdir(input.directory)).sort(),stamp=(await fs.stat(input.databasePath)).mtimeMs;
 await assert.rejects(launch(input),{code:'LOCAL_DEMO_UNOWNED_DATABASE'});
 assert.deepEqual((await fs.readdir(input.directory)).sort(),names);assert.deepEqual(await fs.readFile(input.databasePath),before);assert.equal((await fs.stat(input.databasePath)).mtimeMs,stamp);
});

test('a newly launched demo provisions four distinct adult staff profiles linked to the same four teaching resources',async t=>{
 const input=await temporary(t),result=await launch(input),store=await createStore({databasePath:input.databasePath});t.after(()=>store.close());
 const data=store.staffPersonalProfiles.list(DEMO_IDS.users.maya);assert.equal(data.records.length,4);assert.deepEqual(new Set(data.records.map(row=>row.staffId)),new Set(result.mapping.teachers.map(row=>row.id)));
 assert.equal(new Set(data.records.map(row=>row.dateOfBirth)).size,4);assert.equal(new Set(data.records.map(row=>row.contactEmail)).size,4);
 for(const row of data.records){assert.ok(row.fullName&&row.localName&&row.staffNumber&&row.position&&row.employment&&row.joined&&row.dateOfBirth);assert.ok(row.dateOfBirth<'2008-01-01');assert.match(row.contactEmail,/@example\.test$/);assert.match(row.mobile,/^\+852 0000 /);}
 const own=store.staffPersonalProfiles.list(DEMO_IDS.users.leo);assert.deepEqual(own.records.map(row=>row.staffId),[DEMO_IDS.teachers.leo]);
});
