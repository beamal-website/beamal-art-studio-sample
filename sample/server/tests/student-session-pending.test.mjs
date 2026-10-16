import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../store.mjs';
import {Worker} from 'node:worker_threads';
import {users,seedCourses} from './helpers.mjs';

const fail=(fn,status,code)=>assert.throws(fn,error=>error.status===status&&(!code||error.code===code));
const versions=detail=>({version:detail.version,sessionVersion:detail.sessionVersion,sourceVersion:detail.sourceVersion});
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'beamal-session-pending-')),databasePath=join(directory,'isolated.sqlite'),store=await createStore({databasePath,seedUsers:[...users,{email:'second-pending-teacher@example.test',password:'Second-pending-teacher-password!',displayName:'Second responsible teacher',role:'teacher'}],seedCourses});
 t.after(async()=>{await store.close();await rm(directory,{recursive:true,force:true});});
 const admin=store.listUsers().find(row=>row.email===users[0].email),teacher=store.listUsers().find(row=>row.email===users[2].email),student=store.listUsers().find(row=>row.email===users[3].email),stranger=store.listUsers().find(row=>row.email===users[4].email);
 const db=new DatabaseSync(databasePath),now=new Date().toISOString();try{for(const id of['pending-student-a','pending-student-b'])db.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES (?,'student','Same name',?,'same name',1,?,?)").run(id,JSON.stringify({displayName:'Same name',remark:'PRIVATE PERSON REMARK',email:'private@example.test'}),now,now);}finally{db.close();}
 const assigned=store.schedulingResources.create({kind:'teacher',displayName:'Pending responsible teacher'},admin.id),other=store.schedulingResources.create({kind:'teacher',displayName:'Another responsible teacher'},admin.id);
 store.accessControl.setTeacherLink(assigned.id,{version:0,userId:teacher.id},admin.id);
 const rule={course:'public-course',startDate:'2030-01-02',time:'13:00',duration:60,weekdays:[3],endMode:'count',count:3,teacherIds:[assigned.id],roomIds:[],capacity:8,remark:'PRIVATE SCHEDULE REMARK'},schedule=store.schedules.create(rule,admin.id);
 const orders=[];for(const [personId,sequences]of[['pending-student-a',[1,2]],['pending-student-b',[1]]]){
  store.enrollmentOrders.setAccountLink(personId,{version:0,userId:student.id},admin);
  const draft=store.enrollmentOrders.create({studentId:personId,amountCents:60000,items:[{courseId:'public-course',feeId:store.getCourse('public-course').feeIds[0],lessons:sequences.map(sequence=>({scheduleId:schedule.id,sequence,sourceVersion:1}))}]},admin),sent=store.enrollmentOrders.send(draft.id,{version:draft.version},admin),confirmed=store.enrollmentOrders.respond(draft.id,{version:sent.version,action:'confirm'},student);
  orders.push(store.enrollmentOrders.confirmPayment(draft.id,{version:confirmed.version},admin));
 }
 const first=store.enrollmentOrders.roster(schedule.id,1,admin).students.find(row=>row.studentId==='pending-student-b'),sameName=store.enrollmentOrders.roster(schedule.id,1,admin).students.find(row=>row.studentId==='pending-student-a'),sameStudentOtherLesson=store.enrollmentOrders.roster(schedule.id,2,admin).students[0];
 return {store,admin,teacher,student,stranger,assigned,other,rule,schedule,orders,first,sameName,sameStudentOtherLesson,databasePath};
}
function businessRows(path){const db=new DatabaseSync(path);try{return Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().filter(({name})=>!['student_session_arrangements','enrollment_order_audit_log','idempotent_creates'].includes(name)).map(({name})=>[name,db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()]));}finally{db.close();}}
const pendingAudit=app=>app.store.enrollmentOrders.audit().filter(row=>row.action==='student-session.arrangement.pending');
const work=(app,user=app.teacher,query={})=>app.store.enrollmentOrders.pendingArrangementWork(user,query);

test('Pending saves only one exact paid StudentSession arrangement and projects one real task without changing old business rows',async t=>{
 const app=await setup(t),before=businessRows(app.databasePath),empty=app.store.enrollmentOrders.getArrangement(app.first.id,app.teacher);
 assert.equal(empty.status,null);assert.equal(empty.version,0);assert.equal(empty.sessionVersion,1);assert.equal(empty.sourceVersion,1);assert.equal(empty.canSetPending,true);assert.equal(empty.sourceAvailable,true);
 assert.deepEqual(empty.teacherIds,[app.assigned.id]);assert.deepEqual(empty.roomIds,[]);assert.deepEqual(empty.teacherNames,[app.assigned.displayName]);assert.deepEqual(empty.roomNames,[]);
 const saved=app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(empty),app.teacher);
 assert.equal(saved.sessionId,app.first.id);assert.equal(saved.studentId,'pending-student-b');assert.equal(saved.status,'pending');assert.equal(saved.version,1);assert.equal(saved.sessionVersion,1);assert.equal(saved.date,'2030-01-02');
 assert.deepEqual(businessRows(app.databasePath),before);assert.equal(pendingAudit(app).length,1);assert.deepEqual(pendingAudit(app)[0].snapshot,saved);
 const roster=app.store.enrollmentOrders.roster(app.schedule.id,1,app.admin).students,selected=roster.find(row=>row.id===app.first.id),other=roster.find(row=>row.id===app.sameName.id);
 assert.deepEqual(selected.arrangement,{status:'pending',version:1,createdAt:saved.createdAt,updatedAt:saved.updatedAt});assert.equal(selected.canSetPending,true);assert.equal(selected.attendance,'unmarked');assert.equal(other.arrangement.status,null);assert.equal(other.arrangement.version,0);
 const tasks=work(app);assert.equal(tasks.total,1);assert.equal(tasks.records[0].sessionId,app.first.id);assert.equal(tasks.records[0].scheduleId,app.schedule.id);assert.equal(tasks.records[0].sequence,1);assert.equal(tasks.records[0].date,'2030-01-02');
 assert.deepEqual(work(app,app.teacher,{since:tasks.revision}),{revision:tasks.revision,unchanged:true,total:1,page:1,pageSize:25});
});

test('arrangement CAS and no-op never duplicate a task audit or timestamp and attendance remains independent',async t=>{
 const app=await setup(t),empty=app.store.enrollmentOrders.getArrangement(app.first.id,app.admin),saved=app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(empty),app.admin),audit=pendingAudit(app);
 fail(()=>app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(empty),app.teacher),409,'VERSION_CONFLICT');
 assert.deepEqual(app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(saved),app.teacher),saved);assert.deepEqual(pendingAudit(app),audit);assert.equal(work(app).total,1);
 app.store.enrollmentOrders.saveAttendance(app.first.id,{version:1,sourceVersion:1,remark:' Annotation is independent ',sticker:'pink',showRemark:true},app.teacher);
 fail(()=>app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(saved),app.teacher),409,'SESSION_VERSION_CONFLICT');
 const current=app.store.enrollmentOrders.getArrangement(app.first.id,app.teacher);assert.equal(current.version,1);assert.equal(current.sessionVersion,2);assert.deepEqual(app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(current),app.teacher),current);
 const row=app.store.enrollmentOrders.roster(app.schedule.id,1,app.admin).students.find(row=>row.id===app.first.id);assert.equal(row.attendance,'unmarked');assert.equal(row.remark,' Annotation is independent ');assert.equal(row.version,2);assert.equal(row.arrangement.status,'pending');assert.deepEqual(pendingAudit(app),audit);
});

test('Pending authority comes from current teacher identity not read grants names or a Student account',async t=>{
 const app=await setup(t),empty=app.store.enrollmentOrders.getArrangement(app.first.id,app.admin);app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(empty),app.teacher);
 app.store.accessControl.setTeacherLink(app.assigned.id,{version:1,userId:null},app.admin.id);app.store.accessControl.createGrant({userId:app.teacher.id,kind:'course',courseId:'public-course'},app.admin.id);
 const readable=app.store.enrollmentOrders.roster(app.schedule.id,1,app.teacher).students.find(row=>row.id===app.first.id);assert.equal(readable.canSetPending,false);assert.equal(readable.arrangement.status,'pending');assert.equal(work(app).total,0);
 for(const user of[app.teacher,app.student,app.stranger,{id:'unknown',role:'admin'}]){
  fail(()=>app.store.enrollmentOrders.authorizePendingArrangement(app.first.id,user),403);
  fail(()=>app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(empty),user),403);
  fail(()=>app.store.enrollmentOrders.getArrangement(app.first.id,user),403);
 }
 fail(()=>work(app,app.student),403);fail(()=>app.store.enrollmentOrders.getArrangement('unknown',app.admin),404);assert.equal(pendingAudit(app).length,1);
});

test('owned student timetable exposes only safe Pending status and version for the correct child and lesson',async t=>{
 const app=await setup(t),empty=app.store.enrollmentOrders.getArrangement(app.sameName.id,app.teacher);app.store.enrollmentOrders.savePendingArrangement(app.sameName.id,versions(empty),app.teacher);
 const query={from:'2030-01-01',to:'2030-01-31'},timetable=app.store.enrollmentOrders.timetable(app.student,query);
 assert.equal(timetable.lessons.length,3);assert.deepEqual(timetable.lessons.find(row=>row.id===app.sameName.id).arrangement,{status:'pending',version:1});
 for(const lesson of timetable.lessons.filter(row=>row.id!==app.sameName.id))assert.deepEqual(lesson.arrangement,{status:null,version:0});
 assert.deepEqual(app.store.enrollmentOrders.timetable(app.stranger,query).lessons,[]);
 for(const secret of['createdBy','canSetPending','sessionVersion','sourceVersion','PRIVATE PERSON REMARK','PRIVATE SCHEDULE REMARK','private@example.test'])assert.equal(JSON.stringify(timetable).includes(secret),false,secret);
});

test('all three version fields are required and no target state attendance or booking change can be smuggled into Pending',async t=>{
 const app=await setup(t),initial=app.store.enrollmentOrders.getArrangement(app.first.id,app.admin),body=versions(initial),before=businessRows(app.databasePath);
 for(const input of[null,[],{...body,targetSlotId:'made-up'},{...body,attendance:'pending'},{...body,status:'confirmed'},{...body,studentId:app.sameName.studentId},{...body,remark:'not part of this operation'}])fail(()=>app.store.enrollmentOrders.savePendingArrangement(app.first.id,input,app.admin),400);
 for(const input of[{}, {...body,version:-1},{...body,version:'0'},{...body,sessionVersion:0},{...body,sessionVersion:2},{...body,sourceVersion:0},{...body,sourceVersion:2},{...body,version:1},{...body,version:Number.MAX_SAFE_INTEGER+1}])fail(()=>app.store.enrollmentOrders.savePendingArrangement(app.first.id,input,app.admin),409);
 assert.deepEqual(businessRows(app.databasePath),before);assert.equal(pendingAudit(app).length,0);assert.equal(work(app,app.admin).total,0);
 for(const query of[{page:0},{page:null},{pageSize:101},{pageSize:1.5},{since:null},{source:'unknown'},null])fail(()=>work(app,app.admin,query),400);
});

test('an unpaid or missing StudentSession cannot become Pending even with a real student and schedule',async t=>{
 const app=await setup(t),draft=app.store.enrollmentOrders.create({studentId:'pending-student-a',amountCents:30000,items:[{courseId:'public-course',feeId:app.store.getCourse('public-course').feeIds[0],lessons:[{scheduleId:app.schedule.id,sequence:3,sourceVersion:1}]}]},app.admin),fakeId=randomUUID(),db=new DatabaseSync(app.databasePath);
 try{db.prepare("INSERT INTO student_sessions(id,student_id,schedule_id,sequence,order_id,attendance,created_at) VALUES (?,?,?,?,?,'unmarked',?)").run(fakeId,'pending-student-a',app.schedule.id,3,draft.id,new Date().toISOString());}finally{db.close();}
 const before=businessRows(app.databasePath);for(const id of[fakeId,'no-such-session']){
  fail(()=>app.store.enrollmentOrders.getArrangement(id,app.admin),404);fail(()=>app.store.enrollmentOrders.authorizePendingArrangement(id,app.admin),404);fail(()=>app.store.enrollmentOrders.savePendingArrangement(id,{version:0,sessionVersion:1,sourceVersion:1},app.admin),404);
 }
 assert.deepEqual(businessRows(app.databasePath),before);assert.equal(work(app,app.admin).total,0);assert.equal(pendingAudit(app).length,0);
});

test('a moved lesson retains the same Pending identity and work follows only the new current responsible teacher',async t=>{
 const app=await setup(t),nextTeacher=app.store.listUsers().find(row=>row.email==='second-pending-teacher@example.test'),initial=app.store.enrollmentOrders.getArrangement(app.first.id,app.teacher),saved=app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(initial),app.teacher);
 app.store.accessControl.setTeacherLink(app.other.id,{version:0,userId:nextTeacher.id},app.admin.id);
 app.store.schedules.editOccurrence(app.schedule.id,1,{...app.rule,version:1,scope:'single',startDate:'2030-02-13',weekdays:[3],time:'15:00',teacherIds:[app.other.id]},app.admin.id);
 assert.equal(work(app).total,0);fail(()=>app.store.enrollmentOrders.getArrangement(app.first.id,app.teacher),403);fail(()=>app.store.enrollmentOrders.authorizePendingArrangement(app.first.id,app.teacher),403);
 const current=app.store.enrollmentOrders.getArrangement(app.first.id,nextTeacher);assert.equal(current.sessionId,saved.sessionId);assert.equal(current.version,1);assert.equal(current.sessionVersion,1);assert.equal(current.sourceVersion,2);assert.equal(current.date,'2030-02-13');assert.equal(current.time,'15:00');assert.deepEqual(current.teacherIds,[app.other.id]);assert.deepEqual(current.teacherNames,[app.other.displayName]);
 fail(()=>app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(saved),nextTeacher),409,'SOURCE_VERSION_CONFLICT');assert.deepEqual(app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(current),nextTeacher),current);assert.equal(pendingAudit(app).length,1);
 const task=work(app,nextTeacher).records[0];assert.equal(task.sessionId,saved.sessionId);assert.equal(task.date,current.date);assert.equal(task.sourceVersion,2);assert.equal(work(app,app.admin).total,1);
});

test('canceled and deleted sources retain a read-only Pending record without claiming an active arrangement or clearing work',async t=>{
 const app=await setup(t),initial=app.store.enrollmentOrders.getArrangement(app.first.id,app.admin),saved=app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(initial),app.admin);
 app.store.schedules.deleteOccurrence(app.schedule.id,1,{version:1,scope:'single'},app.admin.id);
 for(const user of[app.admin,app.teacher]){const current=app.store.enrollmentOrders.getArrangement(app.first.id,user);assert.equal(current.status,'pending');assert.equal(current.sourceAvailable,false);assert.equal(current.canSetPending,false);assert.equal(current.unavailableReason,'LESSON_CANCELLED');assert.equal(work(app,user).total,1);fail(()=>app.store.enrollmentOrders.savePendingArrangement(app.first.id,versions(current),user),409,'ARRANGEMENT_SOURCE_UNAVAILABLE');}
 app.store.schedules.delete(app.schedule.id,{version:2},app.admin.id);app.store.deleteCourse('public-course',app.store.getCourse('public-course').version,app.admin.id);
 const unavailable=app.store.enrollmentOrders.getArrangement(app.first.id,app.admin);assert.equal(unavailable.status,'pending');assert.equal(unavailable.version,1);assert.equal(unavailable.sourceAvailable,false);assert.equal(unavailable.date,saved.date);assert.equal(unavailable.courseName,saved.courseName);assert.deepEqual(unavailable.teacherNames,saved.teacherNames);assert.equal(work(app,app.admin).total,1);assert.equal(pendingAudit(app).length,1);
});

test('a saved historical snapshot never grants Teacher access after its effective occurrence can no longer resolve',async t=>{
 const app=await setup(t),id=app.sameStudentOtherLesson.id,initial=app.store.enrollmentOrders.getArrangement(id,app.admin),saved=app.store.enrollmentOrders.savePendingArrangement(id,versions(initial),app.admin);
 app.store.schedules.update(app.schedule.id,{...app.rule,count:1,version:1},app.admin.id);
 const history=app.store.enrollmentOrders.getArrangement(id,app.admin);assert.equal(history.sourceAvailable,false);assert.equal(history.unavailableReason,'OCCURRENCE_NOT_FOUND');assert.equal(history.sourceVersion,null);assert.equal(history.date,saved.date);assert.deepEqual(history.teacherIds,[app.assigned.id]);assert.equal(history.canSetPending,false);
 fail(()=>app.store.enrollmentOrders.getArrangement(id,app.teacher),403);fail(()=>app.store.enrollmentOrders.authorizePendingArrangement(id,app.teacher),403);assert.equal(work(app).total,0);assert.equal(work(app,app.admin).total,1);assert.equal(pendingAudit(app).length,1);
});

function mutation(app,id,input,key,user=app.admin){app.store.enrollmentOrders.authorizePendingArrangement(id,user);return app.store.mutateOnce({userId:user.id,route:'PATCH /api/student-sessions/'+id+'/pending-arrangement',key,payloadHash:createHash('sha256').update(JSON.stringify(input)).digest('hex'),status:200},()=>({arrangement:app.store.enrollmentOrders.savePendingArrangement(id,input,user)}));}
test('Pending audit and authenticated receipt are atomic and exact-key replay cannot bypass current assignment',async t=>{
 const app=await setup(t),empty=app.store.enrollmentOrders.getArrangement(app.first.id,app.teacher),input=versions(empty),operationKey=randomUUID(),db=new DatabaseSync(app.databasePath),before=businessRows(app.databasePath);
 try{db.exec("CREATE TRIGGER isolated_pending_audit_failure BEFORE INSERT ON enrollment_order_audit_log WHEN NEW.action='student-session.arrangement.pending' BEGIN SELECT RAISE(ABORT,'isolated pending audit rollback'); END;");
  assert.throws(()=>mutation(app,app.first.id,input,operationKey,app.teacher),/isolated pending audit rollback/);assert.deepEqual(businessRows(app.databasePath),before);assert.equal(app.store.enrollmentOrders.getArrangement(app.first.id,app.admin).version,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM idempotent_creates WHERE request_key=?').get(operationKey).n,0);assert.equal(work(app).total,0);db.exec('DROP TRIGGER isolated_pending_audit_failure');
  db.exec("CREATE TRIGGER isolated_pending_receipt_failure BEFORE INSERT ON idempotent_creates BEGIN SELECT RAISE(ABORT,'isolated pending receipt rollback'); END;");assert.throws(()=>mutation(app,app.first.id,input,operationKey,app.teacher),/isolated pending receipt rollback/);assert.equal(app.store.enrollmentOrders.getArrangement(app.first.id,app.admin).version,0);assert.equal(work(app).total,0);assert.equal(pendingAudit(app).length,0);assert.deepEqual(businessRows(app.databasePath),before);db.exec('DROP TRIGGER isolated_pending_receipt_failure');
  const saved=mutation(app,app.first.id,input,operationKey,app.teacher);assert.deepEqual(mutation(app,app.first.id,input,operationKey,app.teacher),saved);assert.equal(pendingAudit(app).length,1);assert.equal(work(app).total,1);
  fail(()=>mutation(app,app.first.id,{...input,version:1},operationKey,app.teacher),409,'IDEMPOTENCY_CONFLICT');
  app.store.accessControl.setTeacherLink(app.assigned.id,{version:1,userId:null},app.admin.id);app.store.accessControl.createGrant({userId:app.teacher.id,kind:'course',courseId:'public-course'},app.admin.id);
  fail(()=>mutation(app,app.first.id,input,operationKey,app.teacher),403);assert.equal(pendingAudit(app).length,1);assert.equal(work(app,app.admin).total,1);
 }finally{db.close();}
});

test('two independent connections racing to mark the same paid session Pending create one durable row task and audit',async t=>{
 const app=await setup(t),body=versions(app.store.enrollmentOrders.getArrangement(app.first.id,app.admin)),before=businessRows(app.databasePath),moduleUrl=new URL('../store.mjs',import.meta.url).href;
 const launch=user=>new Promise((resolve,reject)=>{
  const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');
   (async()=>{const {createStore}=await import(workerData.moduleUrl),store=await createStore({databasePath:workerData.databasePath});parentPort.once('message',async()=>{let result;try{result={status:200,arrangement:store.enrollmentOrders.savePendingArrangement(workerData.id,workerData.body,workerData.user)};}catch(error){result={status:error.status||500,code:error.code};}finally{await store.close();}parentPort.postMessage(result);});parentPort.postMessage({ready:true});})().catch(error=>{parentPort.postMessage({fatal:error.message});process.exitCode=1;});`,{eval:true,workerData:{databasePath:app.databasePath,moduleUrl,id:app.first.id,body,user}});
  worker.once('error',reject);worker.once('message',message=>{if(message.fatal)reject(new Error(message.fatal));else resolve({worker,result:new Promise((done,failed)=>{worker.once('error',failed);worker.once('message',done);})});});
 });
 const contenders=await Promise.all([launch(app.admin),launch(app.teacher)]);for(const contender of contenders)contender.worker.postMessage('save');const results=await Promise.all(contenders.map(row=>row.result));
 assert.deepEqual(results.map(row=>row.status).sort(),[200,409]);assert.equal(results.find(row=>row.status===409).code,'VERSION_CONFLICT');assert.equal(work(app,app.admin).total,1);assert.equal(pendingAudit(app).length,1);assert.deepEqual(businessRows(app.databasePath),before);
});

test('Pending work pages count all exact sessions and revisions reflect canonical source or profile changes',async t=>{
 const app=await setup(t);for(const row of[app.first,app.sameName,app.sameStudentOtherLesson])app.store.enrollmentOrders.savePendingArrangement(row.id,versions(app.store.enrollmentOrders.getArrangement(row.id,app.admin)),app.admin);
 const first=work(app,app.teacher,{page:1,pageSize:1}),second=work(app,app.teacher,{page:2,pageSize:1}),all=work(app,app.teacher,{pageSize:100});assert.equal(first.total,3);assert.equal(first.records.length,1);assert.equal(second.records.length,1);assert.notEqual(first.records[0].sessionId,second.records[0].sessionId);assert.notEqual(first.revision,second.revision);assert.equal(new Set(all.records.map(row=>row.sessionId)).size,3);assert.equal(all.records.filter(row=>row.studentId==='pending-student-a').length,2);
 const changedId=first.records[0].studentId;app.store.people.update(changedId,{version:1,displayName:'Updated canonical student'},app.admin.id);const changed=work(app,app.teacher,{page:1,pageSize:1,since:first.revision});assert.equal(changed.unchanged,undefined);assert.equal(changed.records[0].displayName,'Updated canonical student');assert.equal(changed.total,3);assert.equal(pendingAudit(app).length,3);
});

test('Pending state audit and retry receipt survive restart while an older database gains only an empty arrangement table',async t=>{
 const app=await setup(t),before=businessRows(app.databasePath);await app.store.close();const old=new DatabaseSync(app.databasePath);try{old.exec('DROP TABLE student_session_arrangements');}finally{old.close();}
 const reopened=await createStore({databasePath:app.databasePath});
 try{
  assert.deepEqual(businessRows(app.databasePath),before);const current=reopened.enrollmentOrders.getArrangement(app.first.id,app.admin);assert.equal(current.version,0);assert.equal(reopened.enrollmentOrders.pendingArrangementWork(app.admin).total,0);
  const key=randomUUID(),input=versions(current),context={...app,store:reopened};const saved=mutation(context,app.first.id,input,key);const audit=reopened.enrollmentOrders.audit();await reopened.close();const again=await createStore({databasePath:app.databasePath});
  try{assert.deepEqual(again.enrollmentOrders.getArrangement(app.first.id,app.admin),saved.body.arrangement);assert.deepEqual(again.enrollmentOrders.audit(),audit);assert.deepEqual(mutation({...app,store:again},app.first.id,input,key),saved);assert.equal(again.enrollmentOrders.pendingArrangementWork(app.teacher).total,1);assert.deepEqual(businessRows(app.databasePath),before);}finally{await again.close();}
 }finally{await reopened.close();}
});
