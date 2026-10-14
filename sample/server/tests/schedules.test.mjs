import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fixture,error,course,grantTeacherAccess} from './helpers.mjs';

const schedule = (changes={}) => ({course:'public-course',startDate:'2026-10-14',time:'10:00',duration:45,weekdays:[1,3],endMode:'count',endDate:'',count:4,mustAttendAll:true,color:'#27777b',teacher:'Fictional teacher',room:'Fictional room',capacity:8,session:1,remark:'Preparation',detail:'Bring paper.',moreInfo:'Student information',...changes});
const send = (client,path,method,body,key) => client.request(path,{method,body,headers:key?{'Idempotency-Key':key}:{}});
async function manager(t,options={}) {
 const app=await fixture(t,options),admin=app.client();await admin.login();
 const resource=async(kind,displayName)=>{const reply=await send(admin,'/api/scheduling-resources','POST',{kind,displayName},`fixture-schedule-${kind}`);assert.equal(reply.status,201,reply.text);return reply.body.resource.id;};
 const teacherId=await resource('teacher','Fictional teacher'),roomId=await resource('room','Fictional room');
 return {...app,admin,rule:changes=>schedule({teacherIds:[teacherId],roomIds:[roomId],...changes})};
}

test('shared timetable saves one recurring series, shares it with teachers and acknowledges retries without duplicates',async t=>{
 const app=await manager(t),before=await app.admin.request('/api/schedules');
 assert.equal(before.status,200,before.text);assert.deepEqual(before.body.schedules,[]);
 const saved=await send(app.admin,'/api/schedules','POST',app.rule(),'schedule-create-stable');
 assert.equal(saved.status,201,saved.text);const item=saved.body.schedule;
 assert.match(item.id,/^[0-9a-f-]{36}$/);assert.equal(item.version,1);assert.equal(item.course,'public-course');
 assert.deepEqual(item.weekdays,[1,3]);assert.equal(item.count,4);assert.equal(item.mustAttendAll,true);
 assert.ok(Number.isFinite(Date.parse(item.createdAt)));assert.equal(item.createdAt,item.updatedAt);
 assert.deepEqual((await send(app.admin,'/api/schedules','POST',app.rule(),'schedule-create-stable')).body,saved.body);
 error(await send(app.admin,'/api/schedules','POST',app.rule({time:'11:00'}),'schedule-create-stable'),409);
 await grantTeacherAccess(app,app.admin,{courses:['public-course']});
 const teacher=app.client();await teacher.login(2);const window='/api/schedules?from=2026-10-01&to=2026-10-31',listed=await teacher.request(window);
 assert.equal(listed.status,200,listed.text);assert.equal(listed.body.readScope,'occurrences');assert.equal(listed.body.schedules,undefined);
 assert.deepEqual(listed.body.occurrences.map(row=>[row.item.id,row.item.course,row.sequence,row.date,row.item.time]),[[item.id,item.course,1,'2026-10-14','10:00'],[item.id,item.course,2,'2026-10-19','10:00'],[item.id,item.course,3,'2026-10-21','10:00'],[item.id,item.course,4,'2026-10-26','10:00']]);
 const managerRead=(await app.admin.request('/api/schedules')).body;assert.deepEqual(managerRead.schedules,[item]);assert.notEqual(listed.body.revision,managerRead.revision);
 assert.deepEqual((await teacher.request(window+'&since='+listed.body.revision)).body,{revision:listed.body.revision,readScope:'occurrences',unchanged:true});
 assert.deepEqual((await app.admin.request('/api/schedules?since='+managerRead.revision)).body,{revision:managerRead.revision,unchanged:true});
 assert.equal(app.store.schedules.audit().length,1);
});

test('shared timetable enforces authentication, roles, origin and CSRF before any write',async t=>{
 const app=await manager(t),teacher=app.client(),student=app.client();
 error(await app.client().request('/api/schedules'),401);await teacher.login(2);await student.login(3);
 error(await student.request('/api/schedules'),403);
 for(const client of [teacher,student]) error(await send(client,'/api/schedules','POST',app.rule()),403);
 error(await app.admin.request('/api/schedules',{method:'POST',body:app.rule(),csrf:false}),403);
 error(await app.admin.request('/api/schedules',{method:'POST',body:app.rule(),requestOrigin:'https://hostile.example.test'}),403);
 assert.deepEqual((await app.admin.request('/api/schedules')).body.schedules,[]);
 const created=await send(app.admin,'/api/schedules','POST',app.rule()),item=created.body.schedule;
 for(const [method,path,body] of [['PATCH',`/api/schedules/${item.id}`,{version:1,remark:'Other'}],['DELETE',`/api/schedules/${item.id}`,{version:1}],['POST',`/api/schedules/${item.id}/restore`,{version:1}]]) {
  error(await send(teacher,path,method,body),403);error(await send(student,path,method,body),403);
  error(await app.admin.request(path,{method,body,csrf:false}),403);
 }
 assert.equal((await app.admin.request('/api/schedules')).body.schedules[0].version,1);
});

test('editing, deleting and Undo use versions and stable receipts for the entire series',async t=>{
 const app=await manager(t),created=await send(app.admin,'/api/schedules','POST',app.rule()),first=created.body.schedule;
 const newCourse=await send(app.admin,'/api/courses','POST',course({courseName:'Fictional scheduling transfer course'}));assert.equal(newCourse.status,201,newCourse.text);
 const targetCourse=newCourse.body.course.id;assert.match(targetCourse,/^[0-9a-f-]{36}$/);
 const catalogBefore=(await app.admin.request('/api/catalog')).body;
 const path=`/api/schedules/${first.id}`,change={version:1,course:targetCourse,time:'11:00',remark:'Updated'};
 const edited=await send(app.admin,path,'PATCH',change,'schedule-edit');assert.equal(edited.status,200,edited.text);
 const second=edited.body.schedule;assert.equal(second.version,2);assert.equal(second.time,'11:00');assert.equal(second.course,targetCourse);assert.equal(second.createdAt,first.createdAt);
 assert.deepEqual((await send(app.admin,path,'PATCH',change,'schedule-edit')).body,edited.body);
 error(await send(app.admin,path,'PATCH',{version:1,remark:'Stale'}),409);
 error(await send(app.admin,path,'DELETE',{version:1}),409);
 const deleted=await send(app.admin,path,'DELETE',{version:2},'schedule-delete');assert.equal(deleted.status,200,deleted.text);
 assert.equal(deleted.body.schedule.activityDeleted,true);assert.equal(deleted.body.schedule.version,3);
 assert.deepEqual((await app.admin.request('/api/schedules')).body.schedules,[]);
 assert.deepEqual((await send(app.admin,path,'DELETE',{version:2},'schedule-delete')).body,deleted.body);
 error(await send(app.admin,path,'PATCH',{version:3,remark:'Hidden write'}),404);
 error(await send(app.admin,path+'/restore','POST',{version:2}),409);
 const restored=await send(app.admin,path+'/restore','POST',{version:3},'schedule-restore');assert.equal(restored.status,200,restored.text);
 assert.equal(restored.body.schedule.version,4);assert.equal(restored.body.schedule.activityDeleted,undefined);
 assert.equal(restored.body.schedule.time,'11:00');assert.deepEqual((await app.admin.request('/api/schedules')).body.schedules,[restored.body.schedule]);
 assert.equal(restored.body.schedule.course,targetCourse);
 assert.deepEqual((await app.admin.request('/api/catalog')).body,catalogBefore,'Schedule edits, delete and Undo must not modify course metadata or linked fees.');
 assert.deepEqual((await send(app.admin,path+'/restore','POST',{version:3},'schedule-restore')).body,restored.body);
 assert.deepEqual(app.store.schedules.audit().map(item=>item.action),['schedule.create','schedule.update','schedule.delete','schedule.restore']);
});

test('invalid dates, recurrence and fields cannot partially create or overwrite a shared series',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-schedules-atomic-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const databasePath=join(directory,'fictional.sqlite'),app=await manager(t,{databasePath});
 const bad=[{course:'missing-course'},{startDate:'2026-02-30'},{time:'10:07'},{duration:0},{time:'23:45',duration:30},{weekdays:[]},{weekdays:[1,1]},{endMode:'date',endDate:'2026-10-13'},{endMode:'date',endDate:'2026-10-14',weekdays:[1]},{count:1000},{capacity:0},{session:0},{mustAttendAll:'yes'},{remark:'x'.repeat(2001)},{owner:'forged'}];
 for(const input of bad) error(await send(app.admin,'/api/schedules','POST',app.rule(input),'correctable-invalid'),400);
 assert.deepEqual((await app.admin.request('/api/schedules')).body.schedules,[]);
 // A real SQLite audit failure must roll back both the new series and its receipt.
 const inspection=new DatabaseSync(databasePath);
 try {
  inspection.exec("CREATE TRIGGER fictional_schedule_failure BEFORE INSERT ON schedule_audit_log BEGIN SELECT RAISE(ABORT,'Fictional audit failure'); END;");
  error(await send(app.admin,'/api/schedules','POST',app.rule(),'correctable-invalid'),500);
  assert.equal(inspection.prepare('SELECT COUNT(*) AS count FROM schedules').get().count,0);
  assert.equal(inspection.prepare('SELECT COUNT(*) AS count FROM schedule_audit_log').get().count,0);
  assert.equal(inspection.prepare("SELECT COUNT(*) AS count FROM idempotent_creates WHERE request_key='correctable-invalid'").get().count,0);
  inspection.exec('DROP TRIGGER fictional_schedule_failure');
 } finally {inspection.close();}
 const created=await send(app.admin,'/api/schedules','POST',app.rule(),'correctable-invalid');assert.equal(created.status,201,created.text);
 const item=created.body.schedule,path=`/api/schedules/${item.id}`;
 error(await send(app.admin,path,'PATCH',{remark:'Missing version'}),409);
 error(await send(app.admin,path,'PATCH',{version:1,startDate:'2026-02-30'}),400);
 error(await send(app.admin,path,'DELETE',{version:1,course:'private-course'}),400);
 assert.deepEqual((await app.admin.request('/api/schedules')).body.schedules,[item]);assert.equal(app.store.schedules.audit().length,1);
 // Overlapping series are allowed: collision policy has not been established.
 assert.equal((await send(app.admin,'/api/schedules','POST',app.rule({endMode:'forever',count:1,capacity:null}))).status,201);
});

test('two simultaneous edits cannot silently overwrite each other',async t=>{
 const app=await manager(t),created=await send(app.admin,'/api/schedules','POST',app.rule()),id=created.body.schedule.id;
 const replies=await Promise.all(['First','Second'].map(remark=>send(app.admin,`/api/schedules/${id}`,'PATCH',{version:1,remark})));
 assert.deepEqual(replies.map(reply=>reply.status).sort(),[200,409]);
 const listed=await app.admin.request('/api/schedules');assert.equal(listed.body.schedules[0].version,2);
 assert.equal(app.store.schedules.audit().length,2);
});

test('shared timetable, revision and creation receipt survive closing and reopening the isolated database',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-schedules-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const databasePath=join(directory,'fictional.sqlite'),first=await manager(t,{databasePath});
 const saved=await send(first.admin,'/api/schedules','POST',first.rule(),'restart-schedule'),snapshot=await first.admin.request('/api/schedules');
 assert.equal(saved.status,201,saved.text);await first.close();
 const reopened=await manager(t,{databasePath});assert.deepEqual((await reopened.admin.request('/api/schedules')).body,snapshot.body);
 assert.deepEqual((await send(reopened.admin,'/api/schedules','POST',reopened.rule(),'restart-schedule')).body,saved.body);
 assert.equal(reopened.store.schedules.audit().length,1);
});
