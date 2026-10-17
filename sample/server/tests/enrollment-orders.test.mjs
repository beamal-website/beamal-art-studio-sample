import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request as httpRequest} from 'node:http';
import {fixture,error,users,noCredentials} from './helpers.mjs';

const send=(client,path,body,key)=>client.request(path,{method:'POST',body,headers:key?{'Idempotency-Key':key}:{}});
const window='?from=2026-10-01&to=2026-11-30';
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'beamal-orders-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const databasePath=join(directory,'test.sqlite'),app=await fixture(t,{databasePath}),admin=app.client(),student=app.client(),stranger=app.client(),teacher=app.client();
 await admin.login();await student.login(3);await stranger.login(4);await teacher.login(2);
 const inspection=new DatabaseSync(databasePath),now=new Date().toISOString();
 for(const [id,name]of[['formal-a','Chloe fictional'],['formal-b','Another fictional student']])inspection.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES (?,'student',?,?,?,1,?,?)").run(id,name,JSON.stringify({displayName:name,email:'private@example.test',remark:'PRIVATE PROFILE',dateOfBirth:'2018-04-01'}),name,now,now);
 inspection.close();
 const studentId=app.store.listUsers().find(user=>user.email===users[3].email).id,teacherUserId=app.store.listUsers().find(user=>user.email===users[2].email).id;
 const resource=await send(admin,'/api/scheduling-resources',{kind:'teacher',displayName:'Fictional responsible teacher',representativeColor:'#17777b'});assert.equal(resource.status,201,resource.text);
 const room=await send(admin,'/api/scheduling-resources',{kind:'room',displayName:'Room A'});assert.equal(room.status,201,room.text);
 const linkedTeacher=await admin.request(`/api/access-control/teacher-links/${resource.body.resource.id}`,{method:'PATCH',body:{version:0,userId:teacherUserId}});assert.equal(linkedTeacher.status,200,linkedTeacher.text);
 const rule={course:'public-course',startDate:'2026-10-16',time:'13:00',duration:60,weekdays:[5],endMode:'count',count:3,teacherIds:[resource.body.resource.id],roomIds:[room.body.resource.id],capacity:2,remark:'PRIVATE LESSON NOTE',detail:'PRIVATE LESSON DETAIL'};
 const scheduled=await send(admin,'/api/schedules',rule);assert.equal(scheduled.status,201,scheduled.text);
 const appData={...app,admin,student,stranger,teacher,studentId,teacherUserId,schedule:scheduled.body.schedule,rule,databasePath};
 return appData;
}
async function link(app,person='formal-a',userId=app.studentId,version=0){const reply=await app.admin.request(`/api/people/${person}/account-link`,{method:'PATCH',body:{userId,version}});assert.equal(reply.status,200,reply.text);return reply.body;}
function draft(app,studentId='formal-a',sequences=[1,2]){return {studentId,amountCents:60000,items:[{courseId:'public-course',feeId:app.store.getCourse('public-course').feeIds[0],lessons:sequences.map(sequence=>({scheduleId:app.schedule.id,sequence,sourceVersion:app.schedule.version}))}]};}
async function create(app,studentId='formal-a',sequences=[1,2],key){const reply=await send(app.admin,'/api/orders',draft(app,studentId,sequences),key);assert.equal(reply.status,201,reply.text);return reply.body.order;}
async function accept(app,order){const sent=await send(app.admin,`/api/orders/${order.id}/send`,{version:order.version});assert.equal(sent.status,200,sent.text);const accepted=await send(app.student,`/api/orders/${order.id}/respond`,{version:sent.body.order.version,action:'confirm'});assert.equal(accepted.status,200,accepted.text);return accepted.body.order;}
const roster=(app,sequence=1,scheduleId=app.schedule.id)=>app.admin.request(`/api/schedules/${scheduleId}/occurrences/${sequence}/students`);

test('administrator links formal students explicitly; student profiles stay own-only with versioned durable links',async t=>{
 const app=await setup(t);const initialAccess=(await app.student.request('/api/auth/session')).body.user.accessRevision,strangerAccess=(await app.stranger.request('/api/auth/session')).body.user.accessRevision;const management=await app.admin.request('/api/student-account-links');assert.equal(management.status,200,management.text);assert.equal(management.body.students.length,2);assert.equal(management.body.accounts.length,2);assert.deepEqual(management.body.links,[]);
 error(await app.student.request('/api/student-account-links'),403);assert.deepEqual((await app.student.request('/api/student/profile')).body.students,[]);
 const result=await link(app);const linkedAccess=(await app.student.request('/api/auth/session')).body.user.accessRevision;assert.notEqual(linkedAccess,initialAccess,'A linked student must refresh permission-dependent UI.');assert.equal((await app.stranger.request('/api/auth/session')).body.user.accessRevision,strangerAccess,'Another family permission revision must stay independent.');assert.equal(result.link.studentId,'formal-a');assert.equal(result.link.version,1);const own=await app.student.request('/api/student/profile');assert.equal(own.status,200,own.text);assert.equal(own.body.students[0].id,'formal-a');assert.ok(!own.text.includes('PRIVATE PROFILE'));assert.deepEqual((await app.stranger.request('/api/student/profile')).body.students,[]);
 error(await app.admin.request('/api/people/formal-a/account-link',{method:'PATCH',body:{version:0,userId:app.studentId}}),409);
 error(await app.admin.request('/api/people/formal-b/account-link',{method:'PATCH',body:{version:0,userId:app.teacherUserId}}),400);
 await link(app,'formal-b');const twoAccess=(await app.student.request('/api/auth/session')).body.user.accessRevision;assert.notEqual(twoAccess,linkedAccess);assert.equal((await app.student.request('/api/student/profile')).body.students.length,2);
 await link(app,'formal-a',null,1);assert.notEqual((await app.student.request('/api/auth/session')).body.user.accessRevision,twoAccess,'Revocation must invalidate already open student screens.');assert.deepEqual((await app.student.request('/api/student/profile')).body.students.map(row=>row.id),['formal-b']);
 assert.equal(app.store.enrollmentOrders.audit().filter(row=>row.action==='student.account-link').length,3);
});

test('only confirmed payment atomically adds paid seats sales and the same occurrence identities to student timetable and authorized teacher roster',async t=>{
 const app=await setup(t);await link(app);let order=await create(app);assert.equal(order.orderStatus,'draft');assert.equal(order.paymentStatus,'draft');assert.equal(order.items[0].lessons[0].date,'2026-10-16');assert.equal(order.items[0].feeName,'Four lessons');assert.equal(order.purchasedLessons,2);
 assert.deepEqual((await app.student.request('/api/orders')).body.orders,[]);assert.equal((await roster(app)).body.occupied,0);assert.deepEqual((await app.student.request('/api/student/timetable'+window)).body.lessons,[]);
 order=await accept(app,order);assert.equal(order.orderStatus,'parent-confirmed');assert.equal(order.paymentStatus,'awaiting-payment');assert.equal((await roster(app)).body.occupied,0);
 const paid=await send(app.admin,`/api/orders/${order.id}/confirm-payment`,{version:order.version},'payment-exact-once');assert.equal(paid.status,200,paid.text);assert.equal(paid.body.order.paymentStatus,'paid');assert.ok(paid.body.order.paidAt);
 const replay=await send(app.admin,`/api/orders/${order.id}/confirm-payment`,{version:order.version},'payment-exact-once');assert.deepEqual(replay.body,paid.body);
 const timetable=await app.student.request('/api/student/timetable'+window);assert.equal(timetable.status,200,timetable.text);assert.deepEqual(timetable.body.lessons.map(row=>[row.scheduleId,row.sequence]),[[app.schedule.id,1],[app.schedule.id,2]]);assert.equal(timetable.body.lessons[0].teachers[0].displayName,'Fictional responsible teacher');assert.equal(timetable.body.lessons[0].teachers[0].color,'#17777b');assert.equal(timetable.body.lessons[0].attendance,'unmarked');assert.ok(!timetable.text.includes('PRIVATE'));noCredentials(timetable);
 const teacherRoster=await app.teacher.request(`/api/schedules/${app.schedule.id}/occurrences/1/students`);assert.equal(teacherRoster.status,200,teacherRoster.text);assert.equal(teacherRoster.body.occupied,1);assert.equal(teacherRoster.body.students[0].displayName,'Chloe fictional');assert.equal(teacherRoster.body.students[0].paymentStatus,'paid');assert.ok(!teacherRoster.text.includes('PRIVATE'));assert.equal(app.store.enrollmentOrders.sales().length,1);assert.equal(app.store.enrollmentOrders.occupied(app.schedule.id,1),1);
 assert.deepEqual((await app.student.request('/api/student/timetable'+window+'&since='+timetable.body.revision)).body,{revision:timetable.body.revision,unchanged:true});
});

test('reject and optional empty change reason are historical responses and do not enroll or mark paid',async t=>{
 const app=await setup(t);await link(app);
 for(const action of['reject','request-changes']){const order=await create(app);const sent=await send(app.admin,`/api/orders/${order.id}/send`,{version:1});const response=await send(app.student,`/api/orders/${order.id}/respond`,{version:sent.body.order.version,action,...(action==='request-changes'?{reason:''}:{})});assert.equal(response.status,200,response.text);assert.equal(response.body.order.orderStatus,action==='reject'?'rejected':'changes-requested');assert.notEqual(response.body.order.paymentStatus,'paid');error(await send(app.admin,`/api/orders/${order.id}/confirm-payment`,{version:response.body.order.version}),409);}
 assert.equal((await roster(app)).body.occupied,0);assert.equal(app.store.enrollmentOrders.sales().length,0);assert.ok(app.store.enrollmentOrders.audit().some(row=>row.snapshot.responseReason===''));
});

test('roles own-family scoping and revocation are checked before idempotent response replay',async t=>{
 const app=await setup(t);await link(app);const order=await create(app);const sent=await send(app.admin,`/api/orders/${order.id}/send`,{version:1});
 error(await app.stranger.request(`/api/orders/${order.id}`),404);error(await send(app.stranger,`/api/orders/${order.id}/respond`,{version:2,action:'confirm'}),404);assert.deepEqual((await app.stranger.request('/api/orders')).body.orders,[]);
 error(await app.student.request(`/api/schedules/${app.schedule.id}/occurrences/1/students`),403);error(await send(app.teacher,'/api/orders',draft(app)),403);error(await send(app.teacher,`/api/orders/${order.id}/confirm-payment`,{version:2}),403);error(await send(app.student,`/api/orders/${order.id}/send`,{version:2}),403);
 const response=await send(app.student,`/api/orders/${order.id}/respond`,{version:2,action:'confirm'},'response-before-revoke');assert.equal(response.status,200,response.text);await link(app,'formal-a',null,1);error(await send(app.student,`/api/orders/${order.id}/respond`,{version:2,action:'confirm'},'response-before-revoke'),404);
 for(const query of[window+'&studentId=formal-b',window+'&owner=forged',window+'&from=2026-10-01','?from=2026-02-30&to=2026-10-01','?from=2026-01-01&to=2027-02-01'])error(await app.student.request('/api/student/timetable'+query),400);
});

test('stale source cancellation duplicate seats and the final capacity place cannot partly pay an order',async t=>{
 const app=await setup(t);await link(app);await link(app,'formal-b');let order=await accept(app,await create(app));
 const edited=await app.admin.request(`/api/schedules/${app.schedule.id}`,{method:'PATCH',body:{...app.rule,version:1,time:'14:00'}});assert.equal(edited.status,200,edited.text);error(await send(app.admin,`/api/orders/${order.id}/confirm-payment`,{version:order.version}),409);assert.equal(app.store.enrollmentOrders.sales().length,0);assert.equal((await roster(app)).body.occupied,0);app.schedule=edited.body.schedule;
 order=await accept(app,await create(app));assert.equal((await send(app.admin,`/api/orders/${order.id}/confirm-payment`,{version:order.version})).status,200);
 const duplicate=await accept(app,await create(app));error(await send(app.admin,`/api/orders/${duplicate.id}/confirm-payment`,{version:duplicate.version}),409);assert.equal(app.store.enrollmentOrders.sales().length,1);
 const second=await accept(app,await create(app,'formal-b'));assert.equal((await send(app.admin,`/api/orders/${second.id}/confirm-payment`,{version:second.version})).status,200);assert.equal((await roster(app)).body.occupied,2);
 const inspection=new DatabaseSync(app.databasePath),now=new Date().toISOString();inspection.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES ('formal-c','student','C','{}','c',1,?,?)").run(now,now);inspection.close();await link(app,'formal-c');const full=await accept(app,await create(app,'formal-c'));error(await send(app.admin,`/api/orders/${full.id}/confirm-payment`,{version:full.version}),409);assert.equal(app.store.enrollmentOrders.sales().length,2);assert.equal((await app.admin.request(`/api/orders/${full.id}`)).body.order.paymentStatus,'awaiting-payment');
});

test('audit failure rolls back payment seats sales and replay receipt; successful records and projections survive restart and follow rescheduled identities',async t=>{
 const app=await setup(t);await link(app);const order=await accept(app,await create(app));const inspection=new DatabaseSync(app.databasePath);inspection.exec("CREATE TRIGGER fictional_order_audit_failure BEFORE INSERT ON enrollment_order_audit_log WHEN NEW.action='order.confirm-payment' BEGIN SELECT RAISE(ABORT,'Fictional order audit failure'); END;");error(await send(app.admin,`/api/orders/${order.id}/confirm-payment`,{version:order.version},'recover-payment'),500);assert.equal(inspection.prepare('SELECT COUNT(*) AS count FROM student_sessions').get().count,0);assert.equal(inspection.prepare('SELECT COUNT(*) AS count FROM enrollment_sales').get().count,0);assert.equal(inspection.prepare("SELECT COUNT(*) AS count FROM idempotent_creates WHERE request_key='recover-payment'").get().count,0);inspection.exec('DROP TRIGGER fictional_order_audit_failure');inspection.close();
 const paid=await send(app.admin,`/api/orders/${order.id}/confirm-payment`,{version:order.version},'recover-payment');assert.equal(paid.status,200,paid.text);const before=(await app.student.request('/api/student/timetable'+window)).body;
 const moved=await app.admin.request(`/api/schedules/${app.schedule.id}/occurrences/1`,{method:'PATCH',body:{...app.rule,version:1,scope:'single',startDate:'2026-11-01',weekdays:[0]}});assert.equal(moved.status,200,moved.text);const after=(await app.student.request('/api/student/timetable'+window+'&since='+before.revision)).body;assert.equal(after.unchanged,undefined);assert.equal(after.lessons.find(row=>row.sequence===1).date,'2026-11-01');assert.equal(after.lessons.find(row=>row.sequence===1).id,before.lessons.find(row=>row.sequence===1).id);
 await app.close();const restart=await fixture(t,{databasePath:app.databasePath}),admin=restart.client(),student=restart.client();await admin.login();await student.login(3);assert.deepEqual((await student.request('/api/student/timetable'+window)).body,after);assert.deepEqual((await send(admin,`/api/orders/${order.id}/confirm-payment`,{version:order.version},'recover-payment')).body,paid.body);assert.equal(restart.store.enrollmentOrders.sales().length,1);
});

test('manual Full blocks payment; a simultaneous last-seat race cannot overbook and a cancelled selected lesson cannot partly enroll',async t=>{
 const app=await setup(t);await link(app);await link(app,'formal-b');
 const first=await accept(app,await create(app,'formal-a',[1,2]));
 let manual=await app.admin.request(`/api/schedules/${app.schedule.id}/occurrences/2/capacity-status`,{method:'PATCH',body:{version:0,sourceVersion:1,manualStatus:'full'}});assert.equal(manual.status,200,manual.text);
 error(await send(app.admin,`/api/orders/${first.id}/confirm-payment`,{version:first.version}),409);assert.equal(app.store.enrollmentOrders.sales().length,0);assert.equal((await roster(app,1)).body.occupied,0);assert.equal((await roster(app,2)).body.occupied,0);
 manual=await app.admin.request(`/api/schedules/${app.schedule.id}/occurrences/2/capacity-status`,{method:'PATCH',body:{version:manual.body.status.version,sourceVersion:1,manualStatus:'available'}});assert.equal(manual.status,200,manual.text);
 assert.equal((await send(app.admin,`/api/orders/${first.id}/confirm-payment`,{version:first.version})).status,200);
 const inspection=new DatabaseSync(app.databasePath),now=new Date().toISOString();inspection.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES ('formal-c','student','C','{}','c',1,?,?)").run(now,now);inspection.close();await link(app,'formal-c');
 const contenders=await Promise.all(['formal-b','formal-c'].map(async studentId=>accept(app,await create(app,studentId,[1,2]))));
 const replies=await Promise.all(contenders.map(order=>send(app.admin,`/api/orders/${order.id}/confirm-payment`,{version:order.version},'race-'+order.id)));
 assert.deepEqual(replies.map(reply=>reply.status).sort(),[200,409]);assert.equal((await roster(app,1)).body.occupied,2);assert.equal((await roster(app,2)).body.occupied,2);assert.equal(app.store.enrollmentOrders.sales().length,2);
 const unavailable=await accept(app,await create(app,'formal-b',[3]));const canceled=await app.admin.request(`/api/schedules/${app.schedule.id}/occurrences/3`,{method:'DELETE',body:{version:1,scope:'single'}});assert.equal(canceled.status,200,canceled.text);error(await roster(app,3),404);error(await app.teacher.request(`/api/schedules/${app.schedule.id}/occurrences/3/students`),404);error(await app.teacher.request('/api/schedules/missing/occurrences/1/students'),404);
 error(await send(app.admin,`/api/orders/${unavailable.id}/confirm-payment`,{version:unavailable.version}),409);assert.equal(app.store.enrollmentOrders.occupied(app.schedule.id,3),0);assert.equal(app.store.enrollmentOrders.sales().length,2);
});

test('students can submit durable rescheduling and sick-leave requests for their own paid lessons; administrators see pending requests',async t=>{
 const app=await setup(t);await link(app);
 const order=await accept(app,await create(app,'formal-a',[1]));const paid=await send(app.admin,`/api/orders/${order.id}/confirm-payment`,{version:order.version});assert.equal(paid.status,200,paid.text);
 const candidateDate=new Date(Date.now()+6*86400000).toISOString().slice(0,10),candidateWeekday=new Date(candidateDate+'T00:00:00Z').getUTCDay(),candidateScheduleReply=await send(app.admin,'/api/schedules',{...app.rule,startDate:candidateDate,time:'15:00',weekdays:[candidateWeekday],endMode:'count',count:3,capacity:1});assert.equal(candidateScheduleReply.status,201,candidateScheduleReply.text);
 const candidateSchedule=candidateScheduleReply.body.schedule,inspection=new DatabaseSync(app.databasePath),now=new Date().toISOString();
 try{
  inspection.prepare("INSERT INTO student_sessions(id,student_id,schedule_id,sequence,order_id,attendance,created_at) VALUES ('other-student-seat','formal-b',?,1,?,'unmarked',?)").run(candidateSchedule.id,order.id,now);
  inspection.prepare("INSERT INTO class_capacity_statuses(schedule_id,sequence,manual_status,version,created_at,updated_at) VALUES (?,2,'full',1,?,?)").run(candidateSchedule.id,now,now);
 }finally{inspection.close();}
 const myLesson=(await app.student.request('/api/student/timetable'+window)).body.lessons[0];
 const rescheduling={studentSessionId:myLesson.id,type:'reschedule',reason:'Family appointment',preferredDate:'2026-10-25'};
 const saved=await send(app.student,'/api/lesson-requests',rescheduling,'student-reschedule-once');assert.equal(saved.status,201,saved.text);
 assert.equal(saved.body.request.type,'reschedule');assert.equal(saved.body.request.status,'pending');assert.equal(saved.body.request.studentId,'formal-a');assert.equal(saved.body.request.studentName,'Chloe fictional');assert.equal(saved.body.request.lesson.studentSessionId,myLesson.id);assert.equal(saved.body.request.lesson.scheduleId,myLesson.scheduleId);assert.equal(saved.body.request.lesson.sequence,myLesson.sequence);assert.equal(saved.body.request.lesson.courseId,myLesson.courseId);assert.equal(saved.body.request.lesson.courseName,myLesson.courseName);assert.equal(saved.body.request.lesson.date,myLesson.date);assert.equal(saved.body.request.preferredDate,'2026-10-25');assert.equal(saved.body.request.reason,'Family appointment');
 const replay=await send(app.student,'/api/lesson-requests',rescheduling,'student-reschedule-once');assert.deepEqual(replay.body,saved.body);
 error(await send(app.student,'/api/lesson-requests',{...rescheduling,reason:'Different request'},'student-reschedule-once'),409);
 const sick=await send(app.student,'/api/lesson-requests',{studentSessionId:myLesson.id,type:'sick',reason:'Unwell'},'student-sick-once');assert.equal(sick.status,201,sick.text);assert.equal(sick.body.request.type,'sick');assert.equal(sick.body.request.preferredDate,'');
 const own=(await app.student.request('/api/lesson-requests')).body.requests;assert.deepEqual(own.map(row=>row.id),[sick.body.request.id,saved.body.request.id]);assert.ok(own.every(row=>!Object.hasOwn(row,'availableTimes')));
 const admin=(await app.admin.request('/api/lesson-requests')).body.requests;assert.deepEqual(admin.map(row=>row.id),[sick.body.request.id,saved.body.request.id]);
 for(const request of admin){
  assert.ok(Array.isArray(request.availableTimes));assert.ok(request.availableTimes.length>0);
  assert.ok(request.availableTimes.every(row=>row.courseId===myLesson.courseId));assert.ok(request.availableTimes.every(row=>row.scheduleId!==myLesson.scheduleId||row.sequence!==myLesson.sequence));
  assert.ok(!request.availableTimes.some(row=>row.scheduleId===candidateSchedule.id&&row.sequence===1),'A fully occupied class must not be offered.');
  assert.ok(!request.availableTimes.some(row=>row.scheduleId===candidateSchedule.id&&row.sequence===2),'A manually full class must not be offered.');
  assert.ok(request.availableTimes.some(row=>row.scheduleId===candidateSchedule.id&&row.sequence===3),'A future class with an available seat must be offered.');
 }
 const assignmentInput={version:saved.body.request.version,scheduleId:candidateSchedule.id,sequence:3},fullAssignment=await send(app.admin,`/api/lesson-requests/${saved.body.request.id}/assign`,{...assignmentInput,sequence:1},'assign-full-lesson');assert.equal(fullAssignment.status,409);assert.equal((await app.student.request('/api/lesson-requests')).body.requests.find(row=>row.id===saved.body.request.id).status,'pending');
 const manualFullAssignment=await send(app.admin,`/api/lesson-requests/${saved.body.request.id}/assign`,{...assignmentInput,sequence:2},'assign-manual-full-lesson');assert.equal(manualFullAssignment.status,409);
 const assigned=await send(app.admin,`/api/lesson-requests/${saved.body.request.id}/assign`,assignmentInput,'assign-paid-lesson');assert.equal(assigned.status,200,assigned.text);assert.equal(assigned.body.request.status,'approved');assert.equal(assigned.body.request.version,saved.body.request.version+1);assert.deepEqual(assigned.body.request.assignedLesson,{scheduleId:candidateSchedule.id,sequence:3,courseId:myLesson.courseId,courseName:myLesson.courseName,date:new Date(Date.parse(candidateDate+'T00:00:00Z')+14*86400000).toISOString().slice(0,10),time:'15:00',duration:60});
 assert.deepEqual(await send(app.admin,`/api/lesson-requests/${saved.body.request.id}/assign`,assignmentInput,'assign-paid-lesson'),assigned);
 const movedRoster=await roster(app,3,candidateSchedule.id),releasedRoster=await roster(app,1,app.schedule.id);assert.equal(movedRoster.body.occupied,1);assert.equal(movedRoster.body.students[0].studentId,'formal-a');assert.equal(releasedRoster.body.occupied,0);assert.equal(app.store.enrollmentOrders.occupied(candidateSchedule.id,3),1);assert.equal(app.store.enrollmentOrders.sales().length,1);
 const inspectionAfter=new DatabaseSync(app.databasePath);try{const movedSession=inspectionAfter.prepare('SELECT schedule_id,sequence,order_id,attendance FROM student_sessions WHERE id=?').get(myLesson.id);assert.equal(movedSession.schedule_id,candidateSchedule.id);assert.equal(movedSession.sequence,3);assert.equal(movedSession.order_id,order.id);assert.equal(movedSession.attendance,'unmarked');}finally{inspectionAfter.close();}
 const timetableTo=new Date(Date.parse(candidateDate+'T00:00:00Z')+30*86400000).toISOString().slice(0,10),movedTimetable=await app.student.request(`/api/student/timetable?from=${candidateDate}&to=${timetableTo}`);assert.equal(movedTimetable.status,200,movedTimetable.text);assert.ok(movedTimetable.body.lessons.some(row=>row.id===myLesson.id&&row.scheduleId===candidateSchedule.id&&row.sequence===3));
 const afterAssignment=(await app.student.request('/api/lesson-requests')).body.requests.find(row=>row.id===saved.body.request.id);assert.equal(afterAssignment.status,'approved');assert.deepEqual(afterAssignment.assignedLesson,assigned.body.request.assignedLesson);
 error(await send(app.student,`/api/lesson-requests/${saved.body.request.id}/assign`,assignmentInput),403);error(await send(app.teacher,`/api/lesson-requests/${saved.body.request.id}/assign`,assignmentInput),403);
 assert.deepEqual((await app.admin.request('/api/lesson-requests')).body.requests.map(row=>row.id),[sick.body.request.id]);assert.equal(app.store.studentLessonRequests.audit().filter(row=>row.action==='request.assign').length,1);
 assert.deepEqual((await app.stranger.request('/api/lesson-requests')).body.requests,[]);
 error(await app.teacher.request('/api/lesson-requests'),403);error(await send(app.admin,'/api/lesson-requests',rescheduling),403);
 error(await send(app.student,'/api/lesson-requests',{...rescheduling,studentSessionId:'not-the-students-lesson'}),404);
 error(await send(app.student,'/api/lesson-requests',{...rescheduling,scheduleId:app.schedule.id}),400);
 error(await send(app.student,'/api/lesson-requests',{...rescheduling,type:'cancel-class'}),400);
 assert.equal(app.store.studentLessonRequests.audit().length,3);
});

test('order validation rejects forged fields non-integer amounts duplicate occurrence IDs and wrong course-fee associations without receipts or writes',async t=>{
 const app=await setup(t);await link(app);const correct=draft(app),duplicate={...correct,items:[{...correct.items[0],lessons:[correct.items[0].lessons[0],correct.items[0].lessons[0]]}]};
 error(await app.client().request('/api/orders'),401);
 error(await app.admin.request('/api/orders',{method:'POST',body:correct,csrf:false}),403);
 error(await app.admin.request('/api/orders',{method:'POST',body:correct,requestOrigin:'https://untrusted.example'}),403);
 error(await app.admin.request('/api/people/formal-b/account-link',{method:'PATCH',body:{version:0,userId:app.studentId},csrf:false}),403);
 for(const input of[{...correct,amountCents:-1},{...correct,amountCents:1.5},{...correct,paymentStatus:'paid'},{...correct,studentId:'not-a-formal-student'},duplicate,{...correct,items:[{...correct.items[0],courseId:'private-course'}]},{...correct,items:[]},{...correct,items:[{...correct.items[0],lessons:[]}]}])error(await send(app.admin,'/api/orders',input,'correctable-invalid-order'),400);
 for(const input of[{...correct,items:[{...correct.items[0],lessons:[{...correct.items[0].lessons[0],sourceVersion:999}]}]},{...correct,items:[{...correct.items[0],lessons:[{...correct.items[0].lessons[0],sourceVersion:0}]}]}])error(await send(app.admin,'/api/orders',input,'correctable-invalid-order'),409);
 assert.deepEqual((await app.admin.request('/api/orders')).body.orders,[]);const saved=await create(app,'formal-a',[1,2],'correctable-invalid-order');assert.equal(saved.version,1);assert.equal(app.store.enrollmentOrders.audit().filter(row=>row.action==='order.create').length,1);
 const same=await send(app.admin,'/api/orders',correct,'correctable-invalid-order');assert.equal(same.status,201,same.text);assert.equal(same.body.order.id,saved.id);error(await send(app.admin,'/api/orders',{...correct,amountCents:1},'correctable-invalid-order'),409);
 const unrelated=await send(app.admin,'/api/schedules',{...app.rule,course:'private-course',teacherIds:[],roomIds:[]});assert.equal(unrelated.status,201,unrelated.text);const rosterRead=await app.teacher.request(`/api/schedules/${unrelated.body.schedule.id}/occurrences/1/students`);error(rosterRead,404);error(await app.teacher.request('/api/student/profile'),403);
});

test('revoking a Student link while a replay body is still streaming blocks the saved private order response',async t=>{
 const app=await setup(t);await link(app);const order=await create(app);
 const sent=await send(app.admin,`/api/orders/${order.id}/send`,{version:order.version});assert.equal(sent.status,200,sent.text);
 const pathname=`/api/orders/${order.id}/respond`,input={version:sent.body.order.version,action:'confirm'},requestKey='response-with-streamed-replay';
 const original=await send(app.student,pathname,input,requestKey);assert.equal(original.status,200,original.text);
 const payload=JSON.stringify(input),address=new URL(app.base);
 let observe;
 const arrived=new Promise(resolve=>{
  // createApplication registered its handler first. This listener runs after
  // that handler reaches its body await, before the unfinished JSON can resolve.
  observe=request=>{if(request.url===pathname&&request.headers['idempotency-key']===requestKey){app.server.off('request',observe);resolve();}};
  app.server.on('request',observe);
 });
 let request;
 const completed=new Promise((resolve,reject)=>{
  request=httpRequest({hostname:address.hostname,port:address.port,path:pathname,method:'POST',headers:{
   Origin:'http://localhost:5173','Content-Type':'application/json','Content-Length':Buffer.byteLength(payload),
   Cookie:[...app.student.cookies].map(([name,value])=>`${name}=${value}`).join('; '),
   'X-CSRF-Token':app.student.csrfToken,'Idempotency-Key':requestKey,
  }},response=>{
   const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>resolve({status:response.statusCode,body:JSON.parse(Buffer.concat(chunks).toString('utf8'))}));response.on('error',reject);
  });
  request.on('error',reject);request.setTimeout(20000,()=>request.destroy(new Error('Streamed fixture request timed out.')));
 });
 t.after(()=>{app.server.off('request',observe);request.destroy();});
 // Keep the final JSON byte unsent until the administrator has revoked access.
 request.write(payload.slice(0,-1));
 await arrived;
 await link(app,'formal-a',null,1);
 request.end(payload.slice(-1));
 const result=await completed;
 assert.equal(result.status,404);assert.equal(result.body.error.code,'ORDER_NOT_FOUND');
 assert.deepEqual((await app.student.request('/api/orders')).body.orders,[]);
 assert.equal(app.store.enrollmentOrders.audit().filter(row=>row.action==='order.respond').length,1);
});
