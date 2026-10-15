import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../store.mjs';
import {provisionDemoAccounts,DEMO_IDS} from '../demo-accounts.mjs';
import {provisionRelationalDemo,backupRelationalDemo,RELATIONAL_DEMO_IDS} from '../relational-demo.mjs';
import {fixture} from './helpers.mjs';

const inspect=(path,callback)=>{const db=new DatabaseSync(path);try{return callback(db);}finally{db.close();}};
const count=(db,table)=>db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
async function setup(t,startDate='2026-10-16'){
 const directory=await mkdtemp(join(tmpdir(),'beamal-relational-demo-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const databasePath=join(directory,'sample.sqlite');
 await provisionDemoAccounts({databasePath,startDate});
 const store=await createStore({databasePath});
 let mapping;
 try{
  const teachers=[{key:'maya',id:DEMO_IDS.teachers.maya},{key:'leo',id:DEMO_IDS.teachers.leo}];
  for(const [key,displayName]of[['ava','許雅雯 Ava Hui'],['ethan','黃逸朗 Ethan Wong']])teachers.push({key,id:store.schedulingResources.create({kind:'teacher',displayName,representativeColor:'#27777b'},DEMO_IDS.users.maya).id});
  const courses=[{id:DEMO_IDS.course,feeId:DEMO_IDS.fees[0]}];
  for(const courseName of['水彩創作','幼兒藝術探索','故事繪本','布藝手作','素描基礎']){
   const course=store.createCourse({courseName,feeName:'每堂60分鐘',category:'Art',level:'Beginner',pricingModel:'monthly-lessons',price:280,duration:60,months:1,bookingExpiry:null,onlineStore:true},DEMO_IDS.users.maya);
   courses.push({id:course.id,feeId:course.feeIds[0]});
  }
  mapping={courses,teachers,rooms:[{id:DEMO_IDS.room}],startDate};
 }finally{await store.close();}
 return {databasePath,directory,mapping};
}
const ageAt=(birthDate,date)=>Number(date.slice(0,4))-Number(birthDate.slice(0,4))-(date.slice(5)<birthDate.slice(5)?1:0);

test('adopts four teachers and six courses, imports 300 profiles and pays only Chloe through the canonical order pipeline',async t=>{
 const input=await setup(t),before=inspect(input.databasePath,db=>({users:count(db,'users'),courses:count(db,'courses'),resources:count(db,'scheduling_resources'),legacy:db.prepare('SELECT * FROM schedules ORDER BY id').all()}));
 const result=await provisionRelationalDemo(input);
 assert.equal(result.created,true);assert.equal(result.phase,'complete');assert.deepEqual(result.counts,{teachers:4,courses:6,students:300,activeStudents:300,paidStudents:1,paidOrders:2,studentSessions:7});
 assert.equal(result.studentIds.length,300);assert.equal(new Set(result.studentIds).size,300);assert.ok(result.studentIds.includes(DEMO_IDS.studentPerson));assert.equal(result.createdScheduleIds.length,5);
 inspect(input.databasePath,db=>{
  assert.equal(count(db,'users'),before.users);assert.equal(count(db,'users'),3);assert.equal(count(db,'courses'),before.courses);assert.equal(count(db,'scheduling_resources'),before.resources);assert.equal(count(db,'people'),300);assert.equal(count(db,'student_account_links'),1);
  assert.deepEqual(db.prepare('SELECT * FROM schedules WHERE id IN (?,?) ORDER BY id').all(DEMO_IDS.schedules.leo,DEMO_IDS.schedules.maya),before.legacy);
  const students=db.prepare("SELECT profile FROM people WHERE kind='student'").all().map(row=>JSON.parse(row.profile));assert.ok(students.every(row=>row.quitDate===null));assert.ok(students.every(row=>ageAt(row.dateOfBirth,input.mapping.startDate)>=3&&ageAt(row.dateOfBirth,input.mapping.startDate)<=18));
  assert.doesNotMatch(JSON.stringify(students),/QA|虛構|中期檢查|測試學生/);
  const actions=db.prepare('SELECT action FROM enrollment_order_audit_log ORDER BY id').all().map(row=>row.action);for(const action of['order.create','order.send','order.respond','order.confirm-payment'])assert.equal(actions.filter(value=>value===action).length,2);
  assert.equal(count(db,'enrollment_sales'),2);assert.equal(count(db,'student_sessions'),7);assert.ok(db.prepare('SELECT capacity FROM (SELECT json_extract(data,\'$.capacity\') AS capacity FROM schedules)').all().every(row=>row.capacity<=8));
 });
});

test('all 300 owned students have useful fictional demographic profiles with both genders and birthdays across every month',async t=>{
 const input=await setup(t);await provisionRelationalDemo(input);
 inspect(input.databasePath,db=>{
  const students=db.prepare("SELECT id,display_name,profile FROM people WHERE kind='student' ORDER BY id").all().map(row=>({...row,profile:JSON.parse(row.profile)}));assert.equal(students.length,300);
  for(const {id,display_name,profile}of students){
   assert.match(display_name,/[\u3400-\u9fff]/);assert.equal(profile.displayName,display_name);assert.ok(['Male','Female'].includes(profile.gender));
   for(const key of ['firstName','lastName','fullName','localName','school','level'])assert.ok(typeof profile[key]==='string'&&profile[key].trim(),id+' '+key);
   assert.equal(new Date(profile.dateOfBirth+'T00:00:00Z').toISOString().slice(0,10),profile.dateOfBirth);assert.ok(ageAt(profile.dateOfBirth,input.mapping.startDate)>=3&&ageAt(profile.dateOfBirth,input.mapping.startDate)<=18);
   assert.equal(profile.citizenId,'');assert.match(profile.phone,/^\+852 0000 \d{4}$/);assert.match(profile.mobile,/^\+852 0000 \d{4}$/);assert.match(profile.contact1Email,/@example\.test$/);
   if(id!==DEMO_IDS.studentPerson)assert.match(profile.email,/@example\.test$/);
  }
  const additional=students.filter(row=>row.id!==DEMO_IDS.studentPerson).map(row=>row.profile);
  assert.deepEqual([...new Set(additional.map(row=>ageAt(row.dateOfBirth,input.mapping.startDate)))].sort((a,b)=>a-b),Array.from({length:16},(_,index)=>index+3));
  assert.equal(new Set(additional.map(row=>row.dateOfBirth.slice(5,7))).size,12);assert.ok(new Set(additional.map(row=>row.dateOfBirth.slice(8))).size>=20);
  for(const gender of ['Male','Female'])assert.ok(additional.filter(row=>row.gender===gender).length>=100);
  for(let age=3;age<=18;age++)assert.equal(new Set(additional.filter(row=>ageAt(row.dateOfBirth,input.mapping.startDate)===age).map(row=>row.gender)).size,2,'Both genders should occur in age '+age);
  const chloe=students.find(row=>row.id===DEMO_IDS.studentPerson).profile;assert.equal(chloe.dateOfBirth,'2017-04-18');assert.equal(chloe.gender,'Female');assert.equal(chloe.firstName,'Chloe');assert.equal(chloe.lastName,'Ho');assert.match(chloe.email,/@example\.test$/);
  assert.equal(count(db,'users'),3);assert.equal(count(db,'student_sessions'),7);assert.equal(count(db,'enrollment_sales'),2);
 });
});

test('the 300-person cohort models mostly single-child families with complete safe registration contacts and plausible siblings',async t=>{
 const input=await setup(t);await provisionRelationalDemo(input);
 inspect(input.databasePath,db=>{
  const rows=db.prepare("SELECT id,display_name,profile FROM people WHERE kind='student' ORDER BY id").all(),students=rows.map(row=>({...JSON.parse(row.profile),id:row.id})),families=new Map(),guardianFamilies=new Map();
  assert.equal(new Set(students.map(row=>row.displayName)).size,300);assert.equal(new Set(students.map(row=>row.fullName)).size,300);assert.ok(new Set(students.map(row=>row.localName.slice(1))).size>=100);assert.ok(new Set(students.map(row=>row.firstName)).size>=100);
  for(const student of students){
   for(const key of ['parentName','contact1Name','contact1Phone','contact1Email','contact2Name','contact2Phone','contact2Email','district','address','whatsApp','phone','mobile','school','level'])assert.ok(typeof student[key]==='string'&&student[key].trim(),student.id+' '+key);
   for(const key of ['email','contact1Email','contact2Email'])assert.match(student[key],/^[^\s@]+@example\.test$/);
   for(const key of ['contact1Phone','contact2Phone','whatsApp','phone','mobile'])assert.match(student[key],/^\+852 0000 \d{4}$/);
   assert.equal(student.parentName,student.contact1Name);assert.notEqual(student.contact1Name,student.contact2Name);assert.notEqual(student.contact1Phone,student.contact2Phone);assert.ok(student.promotion===false||student.promotion===null);assert.equal(student.citizenId,'');
   assert.ok([student.contact1Name,student.contact2Name].some(name=>name.slice(0,1)===student.localName.slice(0,1)));
   assert.doesNotMatch(student.address+student.school,/示例|虛構|mock|sample|QA/i);
   const age=ageAt(student.dateOfBirth,input.mapping.startDate),expectedLevel=age<6?'K'+(age-2):age<12?'P'+(age-5):'S'+Math.min(6,age-11);assert.equal(student.level,expectedLevel,student.id+' school grade');
   const group=families.get(student.contact1Email)||[];group.push(student);families.set(student.contact1Email,group);const previous=guardianFamilies.get(student.contact1Name);assert.ok(!previous||previous===student.contact1Email,'A guardian name must not represent unrelated large families');guardianFamilies.set(student.contact1Name,student.contact1Email);
  }
  assert.ok(families.size>200);assert.ok([...families.values()].every(children=>children.length<=3));assert.ok([...families.values()].some(children=>children.length===2));assert.ok([...families.values()].some(children=>children.length===3));assert.ok([...families.values()].filter(children=>children.length===1).length/families.size>0.7);
  for(const children of families.values()){
   const first=children[0];for(const sibling of children.slice(1))for(const key of ['parentName','contact1Name','contact1Phone','contact1Email','contact2Name','contact2Phone','contact2Email','district','address','whatsApp','phone','mobile'])assert.equal(sibling[key],first[key],key+' must agree within one family');
   const birthdays=children.map(row=>Date.parse(row.dateOfBirth+'T00:00:00Z')).sort((a,b)=>a-b);for(let index=1;index<birthdays.length;index++)assert.ok((birthdays[index]-birthdays[index-1])/86400000>=365,'Siblings need plausible distinct birthdays');
  }
  const chloe=students.find(row=>row.id===DEMO_IDS.studentPerson);assert.equal(chloe.dateOfBirth,'2017-04-18');assert.equal(chloe.displayName,'何詠晴 Chloe Ho');assert.equal(families.get(chloe.contact1Email).length,1);assert.deepEqual(db.prepare('SELECT student_id,user_id FROM student_account_links').all().map(row=>[row.student_id,row.user_id]),[[DEMO_IDS.studentPerson,DEMO_IDS.users.chloe]]);assert.equal(count(db,'users'),3);assert.equal(count(db,'enrollment_sales'),2);assert.equal(count(db,'student_sessions'),7);
 });
});

test('additional student birthdays remain genuinely 3–18 on January and leap-day start dates rather than using the birth year alone',async t=>{
 for(const startDate of ['2027-01-01','2024-02-29']){
  const input=await setup(t,startDate);await provisionRelationalDemo(input);
  const profiles=inspect(input.databasePath,db=>db.prepare("SELECT profile FROM people WHERE kind='student' AND id<>?").all(DEMO_IDS.studentPerson).map(row=>JSON.parse(row.profile)));
  assert.equal(profiles.length,299);assert.equal(new Set(profiles.map(row=>row.dateOfBirth.slice(5,7))).size,12);
  assert.deepEqual([...new Set(profiles.map(row=>ageAt(row.dateOfBirth,startDate)))].sort((a,b)=>a-b),Array.from({length:16},(_,index)=>index+3));
  assert.ok(profiles.every(row=>new Date(row.dateOfBirth+'T00:00:00Z').toISOString().slice(0,10)===row.dateOfBirth));
 }
});

test('reruns preserve edits and unknown records, and mapping drift cannot append or reset the fixture',async t=>{
 const input=await setup(t),first=await provisionRelationalDemo(input);
 inspect(input.databasePath,db=>{
  const id=RELATIONAL_DEMO_IDS.students[0],row=db.prepare('SELECT profile FROM people WHERE id=?').get(id),profile={...JSON.parse(row.profile),remark:'家長更新了學習目標。'};
  db.prepare('UPDATE people SET profile=?,version=version+1 WHERE id=?').run(JSON.stringify(profile),id);
  db.prepare('UPDATE scheduling_resources SET display_name=?,name_key=?,version=version+1 WHERE id=?').run('使用者更新的老師名字','使用者更新的老師名字',DEMO_IDS.teachers.leo);
  db.prepare('UPDATE schedules SET data=json_set(data,\'$.time\',\'10:30\'),version=version+1 WHERE id=?').run(first.createdScheduleIds[0]);
  const now=new Date().toISOString();db.prepare("INSERT INTO people VALUES ('unrelated-profile','applicant','原有申請人','{}','原有申請人',1,?,?,NULL,NULL)").run(now,now);
 });
 const snapshot=inspect(input.databasePath,db=>Object.fromEntries(['users','people','courses','fees','scheduling_resources','schedules','enrollment_orders','student_sessions','enrollment_sales','schema_metadata'].map(table=>[table,db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()])));
 const again=await provisionRelationalDemo(input);assert.equal(again.created,false);assert.deepEqual(again.scheduleIds,first.scheduleIds);
 assert.deepEqual(inspect(input.databasePath,db=>Object.fromEntries(Object.keys(snapshot).map(table=>[table,db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()]))),snapshot);
 const courses=input.mapping.courses,changed={...input,mapping:{...input.mapping,courses:[courses[0],courses[2],courses[1],...courses.slice(3)]}};
 await assert.rejects(provisionRelationalDemo(changed),{code:'RELATIONAL_DEMO_MAPPING_DRIFT'});
 assert.equal(inspect(input.databasePath,db=>count(db,'people')),301);
});

test('wrong mappings and unowned stable-id collisions are rejected without importing profiles',async t=>{
 const input=await setup(t),wrong={...input,mapping:{...input.mapping,teachers:input.mapping.teachers.map(row=>row.key==='ava'?{...row,id:DEMO_IDS.room}:row)}};
 await assert.rejects(provisionRelationalDemo(wrong),{code:'RELATIONAL_DEMO_INVALID_MAPPING'});assert.equal(inspect(input.databasePath,db=>count(db,'people')),1);
 inspect(input.databasePath,db=>{const now=new Date().toISOString();db.prepare("INSERT INTO people VALUES (?,'applicant','原有個案','{}','原有個案',1,?,?,NULL,NULL)").run(RELATIONAL_DEMO_IDS.students[0],now,now);});
 await assert.rejects(provisionRelationalDemo(input),{code:'RELATIONAL_DEMO_CONFLICT'});assert.equal(inspect(input.databasePath,db=>count(db,'people')),2);assert.equal(inspect(input.databasePath,db=>count(db,'student_sessions')),0);
});

test('business failure rolls back classes, account links and all payments; retry completes the preserved import phase',async t=>{
 const input=await setup(t);
 inspect(input.databasePath,db=>db.exec("CREATE TRIGGER relational_payment_failure BEFORE INSERT ON enrollment_order_audit_log WHEN NEW.action='order.confirm-payment' BEGIN SELECT RAISE(ABORT,'Sample payment failure'); END;"));
 await assert.rejects(provisionRelationalDemo(input),/Sample payment failure/);
 inspect(input.databasePath,db=>{assert.equal(count(db,'people'),300);assert.equal(count(db,'schedules'),2);for(const table of['student_account_links','enrollment_orders','student_sessions','enrollment_sales','idempotent_creates'])assert.equal(count(db,table),0,table);assert.equal(JSON.parse(db.prepare("SELECT value FROM schema_metadata WHERE name='relational_centre_demo_v1'").get().value).phase,'profiles');db.exec('DROP TRIGGER relational_payment_failure');});
 const result=await provisionRelationalDemo(input);assert.equal(result.phase,'complete');assert.equal(result.counts.studentSessions,7);assert.equal(inspect(input.databasePath,db=>count(db,'people')),300);
});

test('an unrelated existing room or teacher booking blocks the plan without moving or importing anything',async t=>{
 const input=await setup(t),store=await createStore({databasePath:input.databasePath});
 try{store.schedules.create({course:DEMO_IDS.course,startDate:'2026-10-17',time:'10:00',duration:60,weekdays:[6],endMode:'count',count:1,teacherIds:[DEMO_IDS.teachers.leo],roomIds:[DEMO_IDS.room],capacity:8},DEMO_IDS.users.maya);}finally{await store.close();}
 await assert.rejects(provisionRelationalDemo(input),{code:'RELATIONAL_DEMO_SCHEDULE_CONFLICT'});
 inspect(input.databasePath,db=>{assert.equal(count(db,'people'),1);assert.equal(count(db,'schedules'),3);assert.equal(db.prepare('SELECT value FROM schema_metadata WHERE name=?').get('relational_centre_demo_v1'),undefined);});
});

test('real admin, teacher and student HTTP reads share the same rescheduled occurrence and preserve isolation',async t=>{
 const input=await setup(t),result=await provisionRelationalDemo(input),app=await fixture(t,{databasePath:input.databasePath,seedUsers:[],seedCourses:[]});
 const [admin,teacher,student]=[app.client(),app.client(),app.client()];for(const [client,email]of[[admin,'admin@gmail.com'],[teacher,'teacher@gmail.com'],[student,'student@gmail.com']])assert.equal((await client.request('/api/auth/login',{method:'POST',body:{email,password:'000000'},csrf:false})).status,200);
 const range='?from=2026-10-01&to=2026-11-30',before=(await student.request('/api/student/timetable'+range)).body,teacherBefore=(await teacher.request('/api/schedules'+range)).body;
 assert.equal(before.students.length,1);assert.equal(before.students[0].id,DEMO_IDS.studentPerson);assert.equal(before.lessons.length,7);assert.equal(new Set(teacherBefore.occurrences.map(row=>row.item.id)).size,2);
 const schedule=app.store.schedules.get(result.createdScheduleIds[0]),{id,version,createdAt,updatedAt,classType,...fields}=schedule;
 const moved=await admin.request(`/api/schedules/${id}/occurrences/1`,{method:'PATCH',body:{...fields,version,scope:'single',time:'11:00'}});assert.equal(moved.status,200,moved.text);
 const after=(await student.request('/api/student/timetable'+range+'&since='+before.revision)).body,teacherAfter=(await teacher.request('/api/schedules'+range)).body;
 const prior=before.lessons.find(row=>row.scheduleId===id&&row.sequence===1),next=after.lessons.find(row=>row.id===prior.id);assert.equal(next.time,'11:00');assert.equal(next.scheduleId,prior.scheduleId);assert.equal(teacherAfter.occurrences.find(row=>row.item.id===id&&row.sequence===1).item.time,'11:00');
 assert.equal(after.lessons.length,7);assert.ok(after.lessons.every(row=>row.studentId===DEMO_IDS.studentPerson));
 assert.equal((await teacher.request('/api/people?kind=student')).status,403);assert.equal((await student.request('/api/schedules/'+id+'/occurrences/1/students')).status,403);
});

test('explicit backup is private, consistent and never replaces an existing file',async t=>{
 const input=await setup(t),backupPath=join(input.directory,'before-demo.sqlite');
 const live=await createStore({databasePath:input.databasePath});
 try{
  live.people.create({displayName:'新增申請人'},DEMO_IDS.users.maya);
  await backupRelationalDemo(input.databasePath,backupPath);assert.equal((await stat(backupPath)).mode&0o777,0o600);assert.equal(inspect(backupPath,db=>count(db,'people')),2);
  await assert.rejects(backupRelationalDemo(input.databasePath,backupPath),{code:'EEXIST'});assert.equal(inspect(backupPath,db=>count(db,'people')),2);
 }finally{await live.close();}
});
