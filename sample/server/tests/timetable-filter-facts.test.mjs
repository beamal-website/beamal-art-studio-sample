import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture,error,users,noCredentials} from './helpers.mjs';

const route='/api/timetable/filter-facts';
const query='?from=2026-10-16&to=2026-10-30';
const post=(client,path,body)=>client.request(path,{method:'POST',body});
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'beamal-filter-facts-')),databasePath=join(directory,'test.sqlite');
 const app=await fixture(t,{databasePath}),admin=app.client(),teacher=app.client(),student=app.client();
 const inspection=new DatabaseSync(databasePath);t.after(async()=>{inspection.close();await rm(directory,{recursive:true,force:true});});
 await admin.login();await teacher.login(2);await student.login(3);
 const teacherUserId=app.store.listUsers().find(user=>user.email===users[2].email).id,studentUserId=app.store.listUsers().find(user=>user.email===users[3].email).id;
 const a=await post(admin,'/api/scheduling-resources',{kind:'teacher',displayName:'Teacher A'}),b=await post(admin,'/api/scheduling-resources',{kind:'teacher',displayName:'Teacher B'});assert.equal(a.status,201,a.text);assert.equal(b.status,201,b.text);
 const linked=await admin.request('/api/access-control/teacher-links/'+a.body.resource.id,{method:'PATCH',body:{version:0,userId:teacherUserId}});assert.equal(linked.status,200,linked.text);
 const rule={course:'public-course',startDate:'2026-10-16',time:'13:00',duration:60,weekdays:[5],endMode:'count',count:3,teacherIds:[a.body.resource.id],roomIds:[],capacity:20};
 const scheduled=await post(admin,'/api/schedules',rule);assert.equal(scheduled.status,201,scheduled.text);
 const now=new Date().toISOString(),insert=inspection.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES (?,'student',?,?,?,1,?,?)");
 for(const [id,displayName,extra]of[['child-a','Same Student',{dateOfBirth:'2018-10-17',gender:'Female'}],['child-b','Same Student',{dateOfBirth:'2016-10-16',gender:'Male'}],['child-unknown','Unknown Student',{dateOfBirth:'2018-02-30',gender:''}],['child-newborn','Newborn Student',{dateOfBirth:'2026-10-16',gender:'Nonbinary'}],['child-future','Future Student',{dateOfBirth:'2027-01-01',gender:null}]]){
  const profile={displayName,...extra,email:'PRIVATE_EMAIL@example.test',dateOfBirth:extra.dateOfBirth,parentName:'PRIVATE_FAMILY',address:'PRIVATE_ADDRESS',contact1Phone:'PRIVATE_PHONE'};insert.run(id,displayName,JSON.stringify(profile),displayName,now,now);
 }
 return {...app,admin,teacher,student,teacherUserId,studentUserId,teacherResource:a.body.resource,otherTeacher:b.body.resource,schedule:scheduled.body.schedule,rule,inspection};
}
async function order(app,person,sequences=[1]){
 const reply=await post(app.admin,'/api/orders',{studentId:person,amountCents:10000,items:[{courseId:'public-course',feeId:app.store.getCourse('public-course').feeIds[0],lessons:sequences.map(sequence=>({scheduleId:app.schedule.id,sequence,sourceVersion:app.schedule.version}))}]});assert.equal(reply.status,201,reply.text);return reply.body.order;
}
async function paid(app,person,sequences=[1]){
 let reply=await app.admin.request('/api/people/'+person+'/account-link',{method:'PATCH',body:{version:0,userId:app.studentUserId}});assert.equal(reply.status,200,reply.text);
 let current=await order(app,person,sequences);reply=await post(app.admin,`/api/orders/${current.id}/send`,{version:current.version});assert.equal(reply.status,200,reply.text);current=reply.body.order;
 reply=await post(app.student,`/api/orders/${current.id}/respond`,{version:current.version,action:'confirm'});assert.equal(reply.status,200,reply.text);current=reply.body.order;
 reply=await post(app.admin,`/api/orders/${current.id}/confirm-payment`,{version:current.version});assert.equal(reply.status,200,reply.text);return reply.body.order;
}
const get=async(app,client=app.admin,suffix=query)=>{const reply=await client.request(route+suffix);assert.equal(reply.status,200,reply.text);return reply.body;};

test('filter facts include every active authorized occurrence with paid students only and a minimal same-name-safe projection',async t=>{
 const app=await setup(t);await paid(app,'child-a',[1,2]);await paid(app,'child-b');const unpaid=await order(app,'child-unknown');
 app.inspection.prepare("INSERT INTO student_sessions(id,student_id,schedule_id,sequence,order_id,attendance,created_at) VALUES ('legacy-unpaid-seat','child-unknown',?,1,?,'unmarked',?)").run(app.schedule.id,unpaid.id,new Date().toISOString());
 const before={audit:app.store.enrollmentOrders.audit(),sales:app.store.enrollmentOrders.sales()},reply=await app.admin.request(route+query);assert.equal(reply.status,200,reply.text);assert.equal(reply.body.facts.length,3);
 assert.deepEqual(reply.body.facts.map(row=>[row.scheduleId,row.sequence,row.date,row.students.map(person=>person.id)]),[[app.schedule.id,1,'2026-10-16',['child-a','child-b']],[app.schedule.id,2,'2026-10-23',['child-a']],[app.schedule.id,3,'2026-10-30',[]]]);
 assert.deepEqual(reply.body.facts[0].students,[{id:'child-a',displayName:'Same Student',gender:'Female',age:{years:7,months:11,asOf:'2026-10-16'}},{id:'child-b',displayName:'Same Student',gender:'Male',age:{years:10,months:0,asOf:'2026-10-16'}}]);assert.deepEqual(reply.body.facts[1].students[0].age,{years:8,months:0,asOf:'2026-10-23'});
 for(const row of reply.body.facts)assert.deepEqual(Object.keys(row).sort(),['date','scheduleId','sequence','students']);assert.doesNotMatch(reply.text,/PRIVATE|dateOfBirth|email|family|parentName|address|orderId|amountCents|paymentStatus|attendance/);noCredentials(reply);assert.deepEqual({audit:app.store.enrollmentOrders.audit(),sales:app.store.enrollmentOrders.sales()},before);
});

test('filter facts distinguish unknown invalid future births from genuine zero-year zero-month age',async t=>{
 const app=await setup(t);for(const person of ['child-unknown','child-newborn','child-future'])await paid(app,person);
 const facts=await get(app),students=new Map(facts.facts[0].students.map(row=>[row.id,row]));assert.deepEqual(students.get('child-newborn'),{id:'child-newborn',displayName:'Newborn Student',gender:'Nonbinary',age:{years:0,months:0,asOf:'2026-10-16'}});
 assert.deepEqual(students.get('child-unknown'),{id:'child-unknown',displayName:'Unknown Student'});assert.deepEqual(students.get('child-future'),{id:'child-future',displayName:'Future Student'});
});

test('a revision responds unchanged but current profile versions gender and lesson-date age trigger a fresh snapshot',async t=>{
 const app=await setup(t);await paid(app,'child-a');const first=await get(app);assert.deepEqual(await get(app,app.admin,query+'&since='+first.revision),{revision:first.revision,unchanged:true});
 let changed=await app.admin.request('/api/people/child-a',{method:'PATCH',body:{version:1,gender:'Male',dateOfBirth:'2017-10-16'}});assert.equal(changed.status,200,changed.text);const second=await get(app,app.admin,query+'&since='+first.revision);assert.notEqual(second.revision,first.revision);assert.deepEqual(second.facts[0].students[0].age,{years:9,months:0,asOf:'2026-10-16'});assert.equal(second.facts[0].students[0].gender,'Male');
 changed=await app.admin.request('/api/people/child-a',{method:'PATCH',body:{version:2,email:'changed-private@example.test'}});assert.equal(changed.status,200,changed.text);const third=await get(app,app.admin,query+'&since='+second.revision);assert.notEqual(third.revision,second.revision,'Even unchanged projected values must include the source profile version in the revision');assert.deepEqual(third.facts,second.facts);assert.doesNotMatch(JSON.stringify(third),/changed-private|dateOfBirth/);
 const empty=await get(app,app.admin,'?from=2027-01-01&to=2027-01-01');assert.deepEqual(empty.facts,[]);assert.notEqual(empty.revision,third.revision);
});

test('teacher reads use each effective occurrence scope and revoke promptly even with a previously valid revision',async t=>{
 const app=await setup(t);await paid(app,'child-a');const other=await post(app.admin,'/api/schedules',{...app.rule,teacherIds:[app.otherTeacher.id]});assert.equal(other.status,201,other.text);
 const initial=await get(app,app.teacher);assert.deepEqual(initial.facts.map(row=>row.scheduleId),Array(3).fill(app.schedule.id));assert.equal((await get(app)).facts.length,6);
 const grant=await post(app.admin,'/api/access-control/grants',{userId:app.teacherUserId,kind:'occurrence',scheduleId:other.body.schedule.id,sequence:2});assert.equal(grant.status,201,grant.text);let current=await get(app,app.teacher);assert.deepEqual(current.facts.filter(row=>row.scheduleId===other.body.schedule.id).map(row=>row.sequence),[2]);
 const unlink=await app.admin.request('/api/access-control/teacher-links/'+app.teacherResource.id,{method:'PATCH',body:{version:1,userId:null}});assert.equal(unlink.status,200,unlink.text);current=await get(app,app.teacher,query+'&since='+current.revision);assert.equal(current.facts.length,1);assert.equal(current.facts[0].scheduleId,other.body.schedule.id);assert.deepEqual(current.facts[0].students,[]);
 const revoked=await app.admin.request('/api/access-control/grants/'+grant.body.grant.id,{method:'PATCH',body:{version:1,active:false}});assert.equal(revoked.status,200,revoked.text);const denied=await get(app,app.teacher,query+'&since='+current.revision);assert.deepEqual(denied.facts,[]);assert.notEqual(denied.revision,current.revision);assert.doesNotMatch(JSON.stringify(denied),/Same Student|child-a/);
 error(await app.student.request(route+query),403);error(await app.client().request(route+query),401);error(await post(app.admin,route,{}),405);
});

test('moved and cancelled occurrence dates are authoritative for both window membership and age',async t=>{
 const app=await setup(t);await paid(app,'child-a');const first=await get(app);let moved=await app.admin.request(`/api/schedules/${app.schedule.id}/occurrences/1`,{method:'PATCH',body:{...app.rule,version:1,scope:'single',startDate:'2026-11-17',weekdays:[2]}});assert.equal(moved.status,200,moved.text);
 const old=await get(app,app.admin,query+'&since='+first.revision);assert.deepEqual(old.facts.map(row=>row.sequence),[2,3]);const active=await get(app,app.admin,'?from=2026-11-17&to=2026-11-17');assert.equal(active.facts[0].date,'2026-11-17');assert.deepEqual(active.facts[0].students[0].age,{years:8,months:1,asOf:'2026-11-17'});
 const cancelled=await app.admin.request(`/api/schedules/${app.schedule.id}/occurrences/1`,{method:'DELETE',body:{version:moved.body.schedule.version,scope:'single'}});assert.equal(cancelled.status,200,cancelled.text);assert.deepEqual((await get(app,app.admin,'?from=2026-11-17&to=2026-11-17&since='+active.revision)).facts,[]);
});

test('filter facts enforce an inclusive 62-day real date range and reject duplicate or unsupported query keys',async t=>{
 const app=await setup(t);assert.equal((await app.admin.request(route+'?from=2026-10-01&to=2026-12-01')).status,200);
 for(const suffix of ['', '?from=2026-02-30&to=2026-03-01','?from=0000-01-01&to=0000-01-02','?from=2026-10-30&to=2026-10-16','?from=2026-10-01&to=2026-12-02',query+'&from=2026-10-16',query+'&studentId=child-a',query+'&courseId=public-course',query+'&gender=Female',query+'&since='+('x'.repeat(201))])error(await app.admin.request(route+suffix),400);
});

test('legacy duplicate paid seats are deduplicated by student identity without merging same-name people',async t=>{
 const app=await setup(t);await paid(app,'child-a');await paid(app,'child-b');app.inspection.exec('CREATE TABLE legacy_sessions AS SELECT * FROM student_sessions; DROP TABLE student_sessions; ALTER TABLE legacy_sessions RENAME TO student_sessions;');app.inspection.exec("INSERT INTO student_sessions(id,student_id,schedule_id,sequence,order_id,attendance,created_at) SELECT 'duplicate-legacy-session',student_id,schedule_id,sequence,order_id,attendance,created_at FROM student_sessions WHERE student_id='child-a'");
 const result=await get(app);assert.deepEqual(result.facts[0].students.map(row=>row.id),['child-a','child-b']);
});

test('an effective teacher reassignment removes only that occurrence and deleted schedules never return stale paid roster facts',async t=>{
 const app=await setup(t);await paid(app,'child-a');const first=await get(app,app.teacher);
 const changed=await app.admin.request(`/api/schedules/${app.schedule.id}/occurrences/1`,{method:'PATCH',body:{...app.rule,version:1,scope:'single',teacherIds:[app.otherTeacher.id]}});assert.equal(changed.status,200,changed.text);
 const reduced=await get(app,app.teacher,query+'&since='+first.revision);assert.deepEqual(reduced.facts.map(row=>row.sequence),[2,3]);assert.doesNotMatch(JSON.stringify(reduced),/Same Student|child-a/);assert.equal((await get(app)).facts[0].students[0].id,'child-a');
 const removed=await app.admin.request('/api/schedules/'+app.schedule.id,{method:'DELETE',body:{version:changed.body.schedule.version}});assert.equal(removed.status,200,removed.text);assert.deepEqual((await get(app)).facts,[]);assert.deepEqual((await get(app,app.teacher)).facts,[]);assert.equal(app.inspection.prepare('SELECT COUNT(*) AS count FROM student_sessions').get().count,1);assert.equal(app.inspection.prepare('SELECT payment_status FROM enrollment_orders').get().payment_status,'paid');
});

test('completed calendar age handles exact birthdays and month boundaries while malformed optional metadata remains unknown',async t=>{
 const app=await setup(t);await paid(app,'child-a');const update=app.inspection.prepare('UPDATE people SET profile=?,version=version+1 WHERE id=\'child-a\'');
 for(const [dateOfBirth,expected]of [['2026-10-16',{years:0,months:0,asOf:'2026-10-16'}],['2026-09-16',{years:0,months:1,asOf:'2026-10-16'}],['2026-09-17',{years:0,months:0,asOf:'2026-10-16'}],['2025-10-16',{years:1,months:0,asOf:'2026-10-16'}],['2025-10-17',{years:0,months:11,asOf:'2026-10-16'}],[null,undefined],[true,undefined],['',undefined]]){
  update.run(JSON.stringify({dateOfBirth,gender:{invalid:'not a gender'}}));const student=(await get(app)).facts[0].students[0];assert.deepEqual(student.age,expected,String(dateOfBirth));assert.equal(Object.hasOwn(student,'gender'),false);
 }
});
