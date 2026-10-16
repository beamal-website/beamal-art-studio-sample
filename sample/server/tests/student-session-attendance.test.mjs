import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request as httpRequest} from 'node:http';
import {fixture,error,users,grantTeacherAccess,origin} from './helpers.mjs';

const range='?from=2026-10-01&to=2026-11-30';
const send=(client,path,body,key)=>client.request(path,{method:'POST',body,headers:key?{'Idempotency-Key':key}:{}});
const patch=(client,id,body,key,options={})=>client.request('/api/student-sessions/'+id+'/attendance',{method:'PATCH',body,headers:key?{'Idempotency-Key':key}:{},...options});
const roster=(app,sequence=1,client=app.admin)=>client.request(`/api/schedules/${app.schedule.id}/occurrences/${sequence}/students`);
const draft=(row,changes={})=>({version:row.version,sourceVersion:row.sourceVersion,attendance:'present',...changes});
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'beamal-attendance-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const databasePath=join(directory,'isolated.sqlite'),app=await fixture(t,{databasePath}),admin=app.client(),student=app.client(),teacher=app.client();
 const adminLogin=await admin.login(),studentLogin=await student.login(3),teacherLogin=await teacher.login(2),inspection=new DatabaseSync(databasePath),now=new Date().toISOString();
 for(const [id,name]of[['attendance-a','Same name'],['attendance-b','Same name']])inspection.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES (?,'student',?,?,?,1,?,?)").run(id,name,JSON.stringify({displayName:name,remark:'PRIVATE PROFILE'}),name,now,now);
 inspection.close();
 const resource=await send(admin,'/api/scheduling-resources',{kind:'teacher',displayName:'Attendance responsible teacher'});assert.equal(resource.status,201,resource.text);
 const teacherResource=resource.body.resource,teacherLink=await admin.request(`/api/access-control/teacher-links/${teacherResource.id}`,{method:'PATCH',body:{version:0,userId:teacherLogin.body.user.id}});assert.equal(teacherLink.status,200,teacherLink.text);
 const rule={course:'public-course',startDate:'2026-10-16',time:'13:00',duration:60,weekdays:[5],endMode:'count',count:3,teacherIds:[teacherResource.id],roomIds:[],capacity:8};
 const scheduled=await send(admin,'/api/schedules',rule);assert.equal(scheduled.status,201,scheduled.text);
 const schedule=scheduled.body.schedule,orders=[];
 for(const [studentId,sequences]of[['attendance-a',[1,2]],['attendance-b',[1]]]){
  const linked=await admin.request(`/api/people/${studentId}/account-link`,{method:'PATCH',body:{version:0,userId:studentLogin.body.user.id}});assert.equal(linked.status,200,linked.text);
  const created=await send(admin,'/api/orders',{studentId,amountCents:60000,items:[{courseId:'public-course',feeId:app.store.getCourse('public-course').feeIds[0],lessons:sequences.map(sequence=>({scheduleId:schedule.id,sequence,sourceVersion:schedule.version}))}]});assert.equal(created.status,201,created.text);
  const sent=await send(admin,`/api/orders/${created.body.order.id}/send`,{version:1});assert.equal(sent.status,200,sent.text);
  const accepted=await send(student,`/api/orders/${sent.body.order.id}/respond`,{version:sent.body.order.version,action:'confirm'});assert.equal(accepted.status,200,accepted.text);
  const paid=await send(admin,`/api/orders/${accepted.body.order.id}/confirm-payment`,{version:accepted.body.order.version});assert.equal(paid.status,200,paid.text);orders.push(paid.body.order);
 }
 return {...app,admin,student,teacher,actor:adminLogin.body.user,teacherActor:teacherLogin.body.user,teacherResource,teacherLink:teacherLink.body.link,rule,schedule,orders,databasePath};
}
async function selected(app,studentId='attendance-b',sequence=1){const result=await roster(app,sequence);assert.equal(result.status,200,result.text);return result.body.students.find(row=>row.studentId===studentId);}
const attendanceAudit=app=>app.store.enrollmentOrders.audit().filter(row=>row.action==='student-session.attendance');

test('paid roster projects version source and authoritative responsibility while old optional fields remain unknown and student timetable is private-safe',async t=>{
 const app=await setup(t),admin=await roster(app),teacher=await roster(app,1,app.teacher);assert.equal(admin.status,200,admin.text);assert.equal(teacher.status,200,teacher.text);
 assert.equal(admin.body.students.length,2);assert.equal(admin.body.occupied,2);
 for(const row of [...admin.body.students,...teacher.body.students]){
  assert.equal(row.version,1);assert.equal(row.sourceVersion,1);assert.equal(row.canRecordAttendance,true);assert.equal(row.attendance,'unmarked');
  for(const field of ['remark','stickerColor','showRemark','updatedAt'])assert.equal(row[field],null,field);
 }
 const timetable=await app.student.request('/api/student/timetable'+range);assert.equal(timetable.status,200,timetable.text);assert.equal(timetable.body.lessons.length,3);
 for(const row of timetable.body.lessons){assert.equal(row.version,1);for(const field of ['remark','sticker','stickerColor','showRemark','updatedAt','canRecordAttendance','sourceVersion'])assert.ok(!Object.hasOwn(row,field),field);}
});

test('all six attendance values and optional raw remark sticker visibility persist for one exact session without changing another same-name student paid seats fees or sales',async t=>{
 const app=await setup(t),first=await selected(app),other=await selected(app,'attendance-a'),sales=app.store.enrollmentOrders.sales(),orders=app.store.enrollmentOrders.list(app.actor),fees=app.store.listFees(),capacity=app.store.classCapacityStatuses.get(app.schedule.id,1,app.actor);
 let row=first;
 for(const [index,attendance]of ['present','late','absent','leave','sick','other'].entries()){
  const body=draft(row,{attendance,...(index===0?{remark:' Keep <raw>\n remark ',sticker:'pink',showRemark:true}:{})});
  const result=await patch(app.admin,row.id,body);assert.equal(result.status,200,result.text);row=result.body.session;
  assert.equal(row.id,first.id);assert.equal(row.studentId,'attendance-b');assert.equal(row.attendance,attendance);assert.equal(row.version,index+2);assert.equal(row.sourceVersion,1);assert.equal(row.remark,' Keep <raw>\n remark ');assert.equal(row.stickerColor,'pink');assert.equal(row.showRemark,true);assert.ok(Number.isFinite(Date.parse(row.updatedAt)));
 }
 assert.deepEqual(await selected(app,'attendance-a'),other);assert.equal(app.store.enrollmentOrders.occupied(app.schedule.id,1),2);assert.deepEqual(app.store.enrollmentOrders.sales(),sales);assert.deepEqual(app.store.enrollmentOrders.list(app.actor),orders);assert.deepEqual(app.store.listFees(),fees);assert.deepEqual(app.store.classCapacityStatuses.get(app.schedule.id,1,app.actor),capacity);
 assert.equal(attendanceAudit(app).length,6);assert.equal(attendanceAudit(app).at(-1).target_id,row.id);assert.deepEqual(attendanceAudit(app).at(-1).snapshot,row);
 const cleared=await patch(app.admin,row.id,draft(row,{remark:'',sticker:'none',showRemark:false}));assert.equal(cleared.status,200,cleared.text);assert.equal(cleared.body.session.remark,'');assert.equal(cleared.body.session.stickerColor,'none');assert.equal(cleared.body.session.showRemark,false);
 const timetable=await app.student.request('/api/student/timetable'+range);assert.equal(timetable.status,200,timetable.text);const visible=timetable.body.lessons.find(item=>item.id===row.id);assert.equal(visible.attendance,'present');assert.equal(visible.version,8);assert.ok(!timetable.text.includes('Keep <raw>'));for(const field of ['remark','stickerColor','showRemark'])assert.ok(!Object.hasOwn(visible,field));
});

test('annotations can be saved independently while attendance remains unmarked and later attendance-only changes preserve annotations',async t=>{
 const app=await setup(t),row=await selected(app),other=await selected(app,'attendance-a'),orders=app.store.enrollmentOrders.list(app.actor),sales=app.store.enrollmentOrders.sales();
 const saved=await patch(app.teacher,row.id,{version:row.version,sourceVersion:row.sourceVersion,remark:' Annotation only\n retained ',sticker:'yellow',showRemark:true});assert.equal(saved.status,200,saved.text);
 assert.equal(saved.body.session.attendance,'unmarked');assert.equal(saved.body.session.version,2);assert.equal(saved.body.session.remark,' Annotation only\n retained ');assert.equal(saved.body.session.stickerColor,'yellow');assert.equal(saved.body.session.showRemark,true);
 assert.deepEqual(await selected(app,'attendance-a'),other);assert.deepEqual(app.store.enrollmentOrders.list(app.actor),orders);assert.deepEqual(app.store.enrollmentOrders.sales(),sales);assert.equal(app.store.enrollmentOrders.occupied(app.schedule.id,1),2);
 const timetable=await app.student.request('/api/student/timetable'+range);assert.equal(timetable.status,200,timetable.text);assert.equal(timetable.body.lessons.find(item=>item.id===row.id).attendance,'unmarked');
 const marked=await patch(app.teacher,row.id,draft(saved.body.session,{attendance:'late'}));assert.equal(marked.status,200,marked.text);assert.equal(marked.body.session.attendance,'late');for(const field of ['remark','stickerColor','showRemark'])assert.equal(marked.body.session[field],saved.body.session[field]);
 const blanked=await patch(app.teacher,row.id,{version:marked.body.session.version,sourceVersion:marked.body.session.sourceVersion,remark:''});assert.equal(blanked.status,200,blanked.text);assert.equal(blanked.body.session.attendance,'late');assert.equal(blanked.body.session.remark,'');assert.equal(blanked.body.session.stickerColor,'yellow');
 const before=await selected(app),audit=attendanceAudit(app);error(await patch(app.admin,row.id,{version:before.version,sourceVersion:before.sourceVersion}),400);error(await patch(app.admin,row.id,{version:before.version,sourceVersion:before.sourceVersion,attendance:'unmarked',remark:'Cannot unset attendance'}),400);assert.deepEqual(await selected(app),before);assert.deepEqual(attendanceAudit(app),audit);
});

test('only the current responsible teacher may write and a course read grant never becomes attendance permission or cached replay authority',async t=>{
 const app=await setup(t),row=await selected(app),saved=await patch(app.teacher,row.id,draft(row,{attendance:'late'}),'teacher-first-attendance');assert.equal(saved.status,200,saved.text);
 const unlink=await app.admin.request(`/api/access-control/teacher-links/${app.teacherResource.id}`,{method:'PATCH',body:{version:1,userId:null}});assert.equal(unlink.status,200,unlink.text);await grantTeacherAccess(app,app.admin,{courses:['public-course']});
 const readable=await roster(app,1,app.teacher);assert.equal(readable.status,200,readable.text);assert.ok(readable.body.students.every(item=>item.canRecordAttendance===false));
 const before=await selected(app),audit=attendanceAudit(app);error(await patch(app.teacher,row.id,draft(before)),403);error(await patch(app.teacher,row.id,draft(row,{attendance:'late'}),'teacher-first-attendance'),403);
 assert.throws(()=>app.store.enrollmentOrders.authorizeAttendance(row.id,{...app.teacherActor,role:'admin'}),value=>value.status===403);
 error(await patch(app.student,row.id,draft(before)),403);error(await patch(app.client(),row.id,draft(before)),401);assert.deepEqual(await selected(app),before);assert.deepEqual(attendanceAudit(app),audit);
});

test('session and effective source versions reject stale writes and moved lessons retain the same paid identity for a fresh authorized save',async t=>{
 const app=await setup(t),original=await selected(app),saved=await patch(app.admin,original.id,draft(original));assert.equal(saved.status,200,saved.text);let row=saved.body.session;
 error(await patch(app.admin,row.id,draft(original,{attendance:'absent'})),409);
 const moved=await app.admin.request(`/api/schedules/${app.schedule.id}/occurrences/1`,{method:'PATCH',body:{...app.rule,version:1,scope:'single',startDate:'2026-11-01',weekdays:[0]}});assert.equal(moved.status,200,moved.text);
 error(await patch(app.admin,row.id,draft(row,{attendance:'sick'})),409);const fresh=await selected(app);assert.equal(fresh.id,row.id);assert.equal(fresh.sourceVersion,2);
 const updated=await patch(app.teacher,fresh.id,draft(fresh,{attendance:'sick'}));assert.equal(updated.status,200,updated.text);row=updated.body.session;assert.equal(row.attendance,'sick');assert.equal(row.sourceVersion,2);
 const cancelled=await app.admin.request(`/api/schedules/${app.schedule.id}/occurrences/1`,{method:'DELETE',body:{version:2,scope:'single'}});assert.equal(cancelled.status,200,cancelled.text);
 error(await patch(app.admin,row.id,draft(row)),404);assert.throws(()=>app.store.enrollmentOrders.authorizeAttendance(row.id,app.actor),value=>value.status===404);assert.equal(app.store.enrollmentOrders.occupied(app.schedule.id,1),2);
});

test('effective single-occurrence teacher reassignment immediately removes write authority but leaves another assigned occurrence writable',async t=>{
 const app=await setup(t),row=await selected(app),otherTeacher=await send(app.admin,'/api/scheduling-resources',{kind:'teacher',displayName:'Other assigned teacher'});assert.equal(otherTeacher.status,201,otherTeacher.text);await grantTeacherAccess(app,app.admin,{courses:['public-course']});
 const changed=await app.admin.request(`/api/schedules/${app.schedule.id}/occurrences/1`,{method:'PATCH',body:{...app.rule,version:1,scope:'single',teacherIds:[otherTeacher.body.resource.id]}});assert.equal(changed.status,200,changed.text);
 const readonly=await roster(app,1,app.teacher);assert.equal(readonly.status,200,readonly.text);assert.equal(readonly.body.students.find(item=>item.id===row.id).canRecordAttendance,false);error(await patch(app.teacher,row.id,draft(await selected(app))),403);
 const own=await selected(app,'attendance-a',2);assert.equal(own.canRecordAttendance,true);const saved=await patch(app.teacher,own.id,draft(own));assert.equal(saved.status,200,saved.text);
});

test('strict attendance validation and missing or no-longer-paid exact sessions fail without modifying history',async t=>{
 const app=await setup(t),row=await selected(app),audit=attendanceAudit(app);
 for(const input of [draft(row,{attendance:'unmarked'}),draft(row,{attendance:''}),draft(row,{attendance:null}),draft(row,{attendance:'present',remark:null}),draft(row,{remark:42}),draft(row,{remark:'x'.repeat(2001)}),draft(row,{sticker:'purple'}),draft(row,{sticker:null}),draft(row,{showRemark:'yes'}),draft(row,{showRemark:null}),draft(row,{studentId:'attendance-a'}),draft(row,{paymentStatus:'paid'})])error(await patch(app.admin,row.id,input),400);
 for(const input of [{sourceVersion:1,attendance:'present'},{version:0,sourceVersion:1,attendance:'present'},{version:1,attendance:'present'},{version:1,sourceVersion:0,attendance:'present'}])error(await patch(app.admin,row.id,input),409);
 error(await patch(app.admin,'missing-session',draft(row)),404);error(await patch(app.admin,row.id,draft(row),null,{csrf:false}),403);error(await patch(app.admin,row.id,draft(row),null,{requestOrigin:'https://hostile.example.test'}),403);
 assert.deepEqual(await selected(app),row);assert.deepEqual(attendanceAudit(app),audit);
 const inspection=new DatabaseSync(app.databasePath);try{inspection.prepare("UPDATE enrollment_orders SET payment_status='awaiting-payment' WHERE id=?").run(row.orderId);error(await patch(app.admin,row.id,draft(row)),404);assert.throws(()=>app.store.enrollmentOrders.authorizeAttendance(row.id,app.actor),value=>value.status===404);}finally{inspection.close();}
});

test('saved attendance retries replay one durable version and audit while a different payload with the same key conflicts',async t=>{
 const app=await setup(t),row=await selected(app),body=draft(row,{attendance:'late',remark:'PRIVATE SESSION NOTE',sticker:'blue',showRemark:true});
 const first=await patch(app.admin,row.id,body,'attendance-lost-ack');assert.equal(first.status,200,first.text);const replay=await patch(app.admin,row.id,body,'attendance-lost-ack');assert.equal(replay.status,200,replay.text);assert.deepEqual(replay.body,first.body);assert.equal(attendanceAudit(app).length,1);
 error(await patch(app.admin,row.id,{...body,attendance:'absent'},'attendance-lost-ack'),409);assert.deepEqual(await selected(app),first.body.session);assert.equal(attendanceAudit(app).length,1);
 const cancelled=await app.admin.request(`/api/schedules/${app.schedule.id}/occurrences/1`,{method:'DELETE',body:{version:1,scope:'single'}});assert.equal(cancelled.status,200,cancelled.text);error(await patch(app.admin,row.id,body,'attendance-lost-ack'),404);
});

test('attendance audit failure rolls back row version optional fields and receipt so the same key can be retried',async t=>{
 const app=await setup(t),row=await selected(app),inspection=new DatabaseSync(app.databasePath),orders=app.store.enrollmentOrders.list(app.actor),sales=app.store.enrollmentOrders.sales();
 try{
  inspection.exec("CREATE TRIGGER isolated_attendance_audit_failure BEFORE INSERT ON enrollment_order_audit_log WHEN NEW.action='student-session.attendance' BEGIN SELECT RAISE(ABORT,'Isolated attendance failure'); END;");
  error(await patch(app.admin,row.id,draft(row,{remark:'rollback',sticker:'green',showRemark:true}),'attendance-atomic'),500);assert.deepEqual(await selected(app),row);assert.equal(attendanceAudit(app).length,0);assert.deepEqual(app.store.enrollmentOrders.list(app.actor),orders);assert.deepEqual(app.store.enrollmentOrders.sales(),sales);
  inspection.exec('DROP TRIGGER isolated_attendance_audit_failure');const retry=await patch(app.admin,row.id,draft(row,{remark:'rollback',sticker:'green',showRemark:true}),'attendance-atomic');assert.equal(retry.status,200,retry.text);assert.equal(retry.body.session.version,2);assert.equal(attendanceAudit(app).length,1);
 }finally{inspection.close();}
});

test('safe migration retains legacy attendance created time paid seats and unknown optional values then saved fields survive restart',async t=>{
 const app=await setup(t),row=await selected(app),databasePath=app.databasePath,orders=app.store.enrollmentOrders.list(app.actor),sales=app.store.enrollmentOrders.sales();await app.close();
 const inspection=new DatabaseSync(databasePath);let before;
 try{
  inspection.prepare("UPDATE student_sessions SET attendance='late' WHERE id=?").run(row.id);before=inspection.prepare('SELECT id,student_id,schedule_id,sequence,order_id,attendance,created_at FROM student_sessions ORDER BY id').all();
  inspection.exec(`PRAGMA foreign_keys=OFF;CREATE TABLE legacy_attendance_sessions(id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES people(id),schedule_id TEXT NOT NULL REFERENCES schedules(id),sequence INTEGER NOT NULL CHECK(sequence>0),order_id TEXT NOT NULL REFERENCES enrollment_orders(id),attendance TEXT NOT NULL DEFAULT 'unmarked',created_at TEXT NOT NULL,UNIQUE(student_id,schedule_id,sequence));INSERT INTO legacy_attendance_sessions SELECT id,student_id,schedule_id,sequence,order_id,attendance,created_at FROM student_sessions;DROP TABLE student_sessions;ALTER TABLE legacy_attendance_sessions RENAME TO student_sessions;`);
 }finally{inspection.close();}
 const restart=await fixture(t,{databasePath}),admin=restart.client();await admin.login();const rosterReply=await admin.request(`/api/schedules/${app.schedule.id}/occurrences/1/students`);assert.equal(rosterReply.status,200,rosterReply.text);const migrated=rosterReply.body.students.find(item=>item.id===row.id);assert.equal(migrated.attendance,'late');assert.equal(migrated.version,1);for(const field of ['remark','stickerColor','showRemark','updatedAt'])assert.equal(migrated[field],null);
 const check=new DatabaseSync(databasePath);try{assert.deepEqual(check.prepare('SELECT id,student_id,schedule_id,sequence,order_id,attendance,created_at FROM student_sessions ORDER BY id').all(),before);}finally{check.close();}
 assert.deepEqual(restart.store.enrollmentOrders.list(app.actor),orders);assert.deepEqual(restart.store.enrollmentOrders.sales(),sales);
 const saved=await patch(admin,row.id,draft(migrated,{attendance:'sick',remark:' Persist\n original ',sticker:'yellow',showRemark:false}));assert.equal(saved.status,200,saved.text);await restart.close();const final=await fixture(t,{databasePath}),finalAdmin=final.client();await finalAdmin.login();const finalRoster=await finalAdmin.request(`/api/schedules/${app.schedule.id}/occurrences/1/students`);assert.equal(finalRoster.status,200,finalRoster.text);assert.deepEqual(finalRoster.body.students.find(item=>item.id===row.id),saved.body.session);assert.equal(final.store.enrollmentOrders.occupied(app.schedule.id,1),2);
});

test('an in-flight cached attendance replay rechecks responsibility after body await and cannot expose the old saved private response',async t=>{
 const app=await setup(t),row=await selected(app),body=draft(row,{remark:'PRIVATE CACHED ATTENDANCE'}),saved=await patch(app.teacher,row.id,body,'attendance-slow-body');assert.equal(saved.status,200,saved.text);
 const payload=JSON.stringify(body),url=new URL('/api/student-sessions/'+row.id+'/attendance',app.base);let observed;
 const seen=new Promise(resolve=>{observed=(req)=>{if(req.url===url.pathname)resolve();};app.server.on('request',observed);});
 let request;
 const pending=new Promise((resolve,reject)=>{request=httpRequest(url,{method:'PATCH',headers:{Origin:origin,Cookie:[...app.teacher.cookies].map(([name,value])=>name+'='+value).join('; '),'X-CSRF-Token':app.teacher.csrfToken,'Idempotency-Key':'attendance-slow-body','Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},response=>{let text='';response.setEncoding('utf8');response.on('data',chunk=>text+=chunk);response.on('end',()=>resolve({status:response.statusCode,text}));});request.on('error',reject);request.write(payload.slice(0,12));});
 await seen;app.server.off('request',observed);const unlink=await app.admin.request(`/api/access-control/teacher-links/${app.teacherResource.id}`,{method:'PATCH',body:{version:1,userId:null}});assert.equal(unlink.status,200,unlink.text);request.end(payload.slice(12));
 const blocked=await pending;assert.equal(blocked.status,403,blocked.text);assert.ok(!blocked.text.includes('PRIVATE CACHED ATTENDANCE'));assert.equal(attendanceAudit(app).length,1);
});

test('only explicitly visible session remarks and stickers reach authorized internal timetable facts and false removes them without changing another student or any student DTO',async t=>{
 const app=await setup(t),row=await selected(app),path='/api/timetable/filter-facts'+range;
 const before=await app.admin.request(path);assert.equal(before.status,200,before.text);
 const fact=result=>result.body.facts.find(item=>item.scheduleId===app.schedule.id&&item.sequence===1);
 const other=fact(before).students.find(item=>item.id==='attendance-a');
 const saved=await patch(app.admin,row.id,draft(row,{remark:' Internal visible <raw>\n only ',sticker:'green',showRemark:true}));assert.equal(saved.status,200,saved.text);
 const visible=await app.admin.request(path);assert.equal(visible.status,200,visible.text);assert.notEqual(visible.body.revision,before.body.revision);
 const target=fact(visible).students.find(item=>item.id==='attendance-b');assert.equal(target.lessonRemark,' Internal visible <raw>\n only ');assert.equal(target.stickerColor,'green');assert.deepEqual(fact(visible).students.find(item=>item.id==='attendance-a'),other);
 const unlink=await app.admin.request(`/api/access-control/teacher-links/${app.teacherResource.id}`,{method:'PATCH',body:{version:1,userId:null}});assert.equal(unlink.status,200,unlink.text);await grantTeacherAccess(app,app.admin,{courses:['public-course']});
 const permitted=await app.teacher.request(path);assert.equal(permitted.status,200,permitted.text);assert.deepEqual(fact(permitted).students.find(item=>item.id==='attendance-b'),target);error(await patch(app.teacher,row.id,draft(saved.body.session)),403);error(await app.student.request(path),403);
 const timetable=await app.student.request('/api/student/timetable'+range);assert.equal(timetable.status,200,timetable.text);assert.ok(!timetable.text.includes('Internal visible'));for(const item of timetable.body.lessons)for(const field of ['lessonRemark','remark','stickerColor','showRemark'])assert.ok(!Object.hasOwn(item,field),field);
 const hidden=await patch(app.admin,row.id,draft(saved.body.session,{showRemark:false}));assert.equal(hidden.status,200,hidden.text);assert.equal(hidden.body.session.remark,' Internal visible <raw>\n only ');assert.equal(hidden.body.session.stickerColor,'green');
 const after=await app.admin.request(path);assert.equal(after.status,200,after.text);assert.deepEqual(after.body,before.body,'Hiding retained private notes restores the same timetable facts and revision.');
});
