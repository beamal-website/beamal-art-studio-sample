import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture,users,error} from './helpers.mjs';
const send=(client,path,body)=>client.request(path,{method:'POST',body});
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'beamal-resched-'));t.after(()=>rm(directory,{recursive:true,force:true}));const databasePath=join(directory,'data.sqlite'),a=await fixture(t,{databasePath}),admin=a.client(),student=a.client();await admin.login();await student.login(3);
 const teacher=(await send(admin,'/api/scheduling-resources',{kind:'teacher',displayName:'Maya'})).body.resource;
 const teacherClient=a.client(),teacherUser=(await teacherClient.login(2)).body.user;a.store.accessControl.setTeacherLink(teacher.id,{version:0,userId:teacherUser.id},a.store.listUsers().find(row=>row.email===users[0].email).id);
 const source=(await send(admin,'/api/schedules',{course:'public-course',startDate:'2090-01-02',time:'10:00',duration:60,weekdays:[1],endMode:'count',count:2,teacherIds:[teacher.id],capacity:5})).body.schedule;
 const db=new DatabaseSync(databasePath),now=new Date().toISOString(),userId=a.store.listUsers().find(row=>row.email===users[3].email).id;
 db.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES ('child','student','Chloe','{}','Chloe',1,?,?)").run(now,now);db.close();
 const link=await admin.request('/api/people/child/account-link',{method:'PATCH',body:{userId,version:0}});assert.equal(link.status,200,link.text);
 const draft={studentId:'child',amountCents:10000,items:[{courseId:'public-course',feeId:a.store.getCourse('public-course').feeIds[0],lessons:[{scheduleId:source.id,sequence:1,sourceVersion:1}]}]};
 let response=await send(admin,'/api/orders',draft);assert.equal(response.status,201,response.text);let order=response.body.order;
 order=(await send(admin,`/api/orders/${order.id}/send`,{version:order.version})).body.order;order=(await send(student,`/api/orders/${order.id}/respond`,{version:order.version,action:'confirm'})).body.order;
 response=await send(admin,`/api/orders/${order.id}/confirm-payment`,{version:order.version});assert.equal(response.status,200,response.text);
 const timetable=await student.request('/api/student/timetable?from=2090-01-01&to=2090-03-01');assert.equal(timetable.status,200,timetable.text);const lesson=timetable.body.lessons[0];
 const slot={courseId:'public-course',date:'2090-02-01',time:'12:30',duration:60,teacherIds:[teacher.id],roomIds:[],trialEnabled:false,reschedulingEnabled:true,active:true,totalCapacity:5,trialCapacity:0,reschedulingCapacity:1,publicVisibility:'show',reschedulingSourceMode:'all',studentAccessMode:'all',studentIds:[]};
 return {...a,admin,student,teacherClient,source,lesson,slot};
}
test('internal times enforce source and student rules and never leak onto the public timetable',async t=>{
 const a=await setup(t),created=await send(a.admin,'/api/available-slots',a.slot);assert.equal(created.status,201,created.text);const slot=created.body.slot;
 const path='/api/student/lessons/'+a.lesson.id+'/rescheduling-times';let options=await a.student.request(path);assert.equal(options.status,200,options.text);assert.equal(options.body.slots[0].id,slot.id);
 const publicTimes=await a.client().request('/api/public/timetable?from=2090-02-01&days=7');assert.equal(publicTimes.status,200,publicTimes.text);assert.equal(publicTimes.body.slots.length,0);
 let update=await a.admin.request('/api/available-slots/'+slot.id,{method:'PATCH',body:{version:1,studentAccessMode:'whitelist',studentIds:['child']}});assert.equal(update.status,200,update.text);
 assert.equal((await a.student.request(path)).body.slots.length,1);
 update=await a.admin.request('/api/available-slots/'+slot.id,{method:'PATCH',body:{version:2,studentAccessMode:'blacklist',studentIds:['child']}});assert.equal(update.status,200,update.text);assert.equal((await a.student.request(path)).body.slots.length,0);
 error(await send(a.student,'/api/lesson-requests',{studentSessionId:a.lesson.id,type:'reschedule',preferredSlotId:slot.id}),409);
});
test('final placement rechecks updated rules and atomically moves a paid lesson into a standalone time',async t=>{
 const a=await setup(t),created=await send(a.admin,'/api/available-slots',a.slot);assert.equal(created.status,201,created.text);const slot=created.body.slot;
 const request=await send(a.student,'/api/lesson-requests',{studentSessionId:a.lesson.id,type:'reschedule',preferredSlotId:slot.id});assert.equal(request.status,201,request.text);
 let update=await a.admin.request('/api/available-slots/'+slot.id,{method:'PATCH',body:{version:1,reschedulingEnabled:false}});assert.equal(update.status,200,update.text);
 const path='/api/lesson-requests/'+request.body.request.id+'/assign';error(await send(a.admin,path,{version:1,slotId:slot.id}),409);
 update=await a.admin.request('/api/available-slots/'+slot.id,{method:'PATCH',body:{version:2,reschedulingEnabled:true}});assert.equal(update.status,200,update.text);
 assert.equal((await a.student.request('/api/notifications')).body.notifications.length,0);
 const assigned=await send(a.admin,path,{version:1,slotId:slot.id});assert.equal(assigned.status,200,assigned.text);assert.equal(assigned.body.request.status,'approved');
 for(const client of [a.admin,a.student,a.teacherClient]){const notifications=await client.request('/api/notifications');assert.equal(notifications.status,200,notifications.text);assert.equal(notifications.body.notifications.length,1);const notification=notifications.body.notifications[0];assert.equal(notification.type,'rescheduling-confirmed');assert.match(notification.bodyEn,/Chloe/);assert.ok(notification.bodyEn.includes(a.lesson.date));assert.match(notification.bodyEn,/2090-02-01 12:30/);}
 const other=a.client();await other.login(4);assert.equal((await other.request('/api/notifications')).body.notifications.length,0);
 const roster=await a.teacherClient.request('/api/courses/public-course/students');assert.equal(roster.status,200,roster.text);assert.equal(roster.body.students.length,1);assert.equal(roster.body.students[0].displayName,'Chloe');
 const participantSlot=(await a.admin.request('/api/available-slots/'+slot.id)).body.slot;assert.equal(participantSlot.participants.rescheduling[0].displayName,'Chloe');

 const timetable=(await a.student.request('/api/student/timetable?from=2090-02-01&to=2090-02-28')).body;assert.equal(timetable.lessons.length,1);assert.equal(timetable.lessons[0].id,a.lesson.id);
 const saved=(await a.admin.request('/api/available-slots/'+slot.id)).body.slot;assert.equal(saved.reschedulingReserved,1);assert.equal(saved.reschedulingRemaining,0);assert.equal(saved.trialReserved,0);
});

test('selected source courses and classes allow cross-course placement but do not mean unrestricted student access',async t=>{
 const a=await setup(t),created=await send(a.admin,'/api/available-slots',{...a.slot,courseId:'private-course',reschedulingSourceMode:'selected',allowedSourceCourseIds:['private-course']});assert.equal(created.status,201,created.text);const slot=created.body.slot,path='/api/student/lessons/'+a.lesson.id+'/rescheduling-times';
 assert.equal((await a.student.request(path)).body.slots.length,0);
 let change=await a.admin.request('/api/available-slots/'+slot.id,{method:'PATCH',body:{version:1,allowedSourceCourseIds:[],allowedSourceScheduleIds:[a.source.id]}});assert.equal(change.status,200,change.text);
 const choices=(await a.student.request(path)).body.slots;assert.equal(choices.length,1);assert.equal(choices[0].courseId,'private-course');assert.ok(!JSON.stringify(choices).includes('studentIds'));
 const req=await send(a.student,'/api/lesson-requests',{studentSessionId:a.lesson.id,type:'reschedule',preferredSlotId:slot.id});assert.equal(req.status,201,req.text);
 const moved=await send(a.admin,'/api/lesson-requests/'+req.body.request.id+'/assign',{version:1,slotId:slot.id});assert.equal(moved.status,200,moved.text);assert.equal(moved.body.request.assignedLesson.courseId,'private-course');
 const rows=(await a.student.request('/api/student/timetable?from=2090-02-01&to=2090-02-28')).body.lessons;assert.equal(rows[0].courseId,'private-course');assert.equal(rows[0].id,a.lesson.id);
});
test('one available-time quota cannot be consumed twice by parallel final confirmations',async t=>{
 const a=await setup(t),slot=(await send(a.admin,'/api/available-slots',a.slot)).body.slot;
 const first=await send(a.student,'/api/lesson-requests',{studentSessionId:a.lesson.id,type:'reschedule',preferredSlotId:slot.id}),second=await send(a.student,'/api/lesson-requests',{studentSessionId:a.lesson.id,type:'reschedule',preferredSlotId:slot.id});assert.equal(first.status,201,first.text);assert.equal(second.status,201,second.text);
 const results=await Promise.all([first,second].map(request=>send(a.admin,'/api/lesson-requests/'+request.body.request.id+'/assign',{version:1,slotId:slot.id})));
 assert.deepEqual(results.map(row=>row.status).sort(),[200,409]);const saved=(await a.admin.request('/api/available-slots/'+slot.id)).body.slot;assert.equal(saved.reschedulingReserved,1);assert.equal(saved.reschedulingRemaining,0);
});

test('moving the same lesson again releases its previous time quota and preserves its paid identity',async t=>{
 const a=await setup(t),first=(await send(a.admin,'/api/available-slots',a.slot)).body.slot,second=(await send(a.admin,'/api/available-slots',{...a.slot,date:'2090-02-02'})).body.slot;
 for(const slot of [first,second]){const request=await send(a.student,'/api/lesson-requests',{studentSessionId:a.lesson.id,type:'reschedule',preferredSlotId:slot.id});assert.equal(request.status,201,request.text);const result=await send(a.admin,'/api/lesson-requests/'+request.body.request.id+'/assign',{version:1,slotId:slot.id});assert.equal(result.status,200,result.text);}
 assert.equal((await a.admin.request('/api/available-slots/'+first.id)).body.slot.reschedulingReserved,0);assert.equal((await a.admin.request('/api/available-slots/'+first.id)).body.slot.reschedulingRemaining,1);
 assert.equal((await a.admin.request('/api/available-slots/'+second.id)).body.slot.reschedulingReserved,1);
 const lessons=(await a.student.request('/api/student/timetable?from=2090-02-01&to=2090-02-28')).body.lessons;assert.equal(lessons.length,1);assert.equal(lessons[0].id,a.lesson.id);
 const outsider=a.client();await outsider.login(4);error(await outsider.request('/api/student/lessons/'+a.lesson.id+'/rescheduling-times'),404);error(await outsider.request('/api/availability-rule-options'),403);
});
