import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,error,users} from './helpers.mjs';
const applicant={localName:'確認測試',fullName:'Confirm Test',gender:'male',dateOfBirth:'2018-01-02',whatsapp:'00001234'};
async function setup(t){
 const app=await fixture(t,{seedUsers:[...users,{email:'unrelated@teacher.test',password:'Unrelated-teacher-123!',displayName:'Other teacher',role:'teacher'}]}),admin=app.client(),teacher=app.client(),other=app.client(),student=app.client(),anonymous=app.client();
 const a=(await admin.login()).body.user,b=(await teacher.login(2)).body.user;await other.login(1);await student.login(3);
 const resource=app.store.schedulingResources.create({kind:'teacher',displayName:'Confirmation teacher'},a.id);
 app.store.accessControl.setTeacherLink(resource.id,{version:0,userId:b.id},a.id);
 const slot=app.store.availableSlots.create({courseId:'public-course',date:'2030-01-02',time:'13:00',duration:60,teacherIds:[resource.id],roomIds:[],trialCapacity:2,trialEnabled:true,active:true,publicVisibility:'show'},a.id);
 const source=app.store.availableSlots.publicDetail('public-course',{from:'2030-01-01',days:7});
 const input={courseId:'public-course',slotId:slot.id,from:'2030-01-01',days:7,revision:source.revision,applicant};
 return {...app,admin,teacher,other,student,anonymous,actor:a,resource,slot,input};
}
const post=(client,url,body,key=randomUUID(),options={})=>client.request(url,{method:'POST',body,headers:{'Idempotency-Key':key},...options});
test('only Admin Accept confirms a trial, exposes its roster and notifies responsible teachers and admins exactly once',async t=>{
 const a=await setup(t);const receipt=await post(a.anonymous,'/api/public/trial-applications',a.input);assert.equal(receipt.status,201,receipt.text);
 const row=a.store.trialApplications.list({},a.actor).records[0],url='/api/trial-applications/'+row.id+'/accept';
 assert.equal(row.status,'pending');assert.equal(row.canAccept,true);
 let slot=a.store.availableSlots.get(a.slot.id,a.actor);assert.deepEqual(slot.participants.trials,[]);assert.equal(slot.trialPending,1);
 assert.deepEqual((await a.admin.request('/api/notifications')).body.notifications,[]);
 error(await post(a.teacher,url,{version:1}),403);error(await post(a.student,url,{version:1}),403);error(await post(a.anonymous,url,{version:1}),401);error(await post(a.admin,url,{version:1},randomUUID(),{csrf:false}),403);
 const key=randomUUID(),accepted=await post(a.admin,url,{version:1},key);assert.equal(accepted.status,200,accepted.text);assert.equal(accepted.body.application.status,'accepted');assert.equal(accepted.body.application.version,2);assert.equal(accepted.body.application.canReject,false);
 assert.deepEqual((await post(a.admin,url,{version:1},key)).body,accepted.body);error(await post(a.admin,url,{version:1}),409);error(await post(a.admin,'/api/trial-applications/'+row.id+'/reject',{version:2}),409);
 slot=a.store.availableSlots.get(a.slot.id,a.actor);assert.equal(slot.trialPending,0);assert.equal(slot.trialConfirmed,1);assert.equal(slot.trialReserved,1);assert.equal(slot.participants.trials[0].displayName,applicant.localName);assert.deepEqual(slot.participants.trials[0].age,{years:12,months:0,asOf:'2030-01-02'});
 for(const client of [a.admin,a.other,a.teacher]){const list=await client.request('/api/notifications');assert.equal(list.status,200,list.text);assert.equal(list.body.notifications.length,1);assert.equal(list.body.notifications[0].type,'trial-confirmed');assert.match(list.body.notifications[0].bodyEn,/Confirm Test|確認測試/);}
 assert.equal((await a.student.request('/api/notifications')).body.notifications.length,0);
 const notification=(await a.teacher.request('/api/notifications')).body.notifications[0];
 const read=await post(a.teacher,'/api/notifications/'+encodeURIComponent(notification.id)+'/read',{});assert.equal(read.status,200,read.text);assert.equal((await a.teacher.request('/api/notifications')).body.unread,0);assert.equal((await a.admin.request('/api/notifications')).body.unread,1);
 const publicData=await a.anonymous.request('/api/public/courses/public-course?from=2030-01-01&days=7');assert.doesNotMatch(publicData.text,/確認測試|Confirm Test|participants|00001234/);
 a.store.accessControl.setTeacherLink(a.resource.id,{version:1,userId:null},a.actor.id);assert.equal((await a.teacher.request('/api/notifications')).body.notifications.length,0);
 assert.equal(a.store.trialApplications.workSnapshot(a.actor).pendingTotal,0);assert.equal(a.store.trialApplications.workSnapshot(a.actor).notifications.filter(row=>row.type==='accepted').length,1);
});
test('birth date is mandatory before a public trial can reserve a place',async t=>{
 const a=await setup(t),result=await post(a.anonymous,'/api/public/trial-applications',{...a.input,applicant:{...applicant,dateOfBirth:''}});error(result,400);
 assert.equal(a.store.availableSlots.get(a.slot.id,a.actor).trialReserved,0);assert.equal(a.store.trialApplications.list({},a.actor).total,0);
});

test('teacher course roster exposes accepted assigned trials only, never pending or another teacher course',async t=>{
 const a=await setup(t),url='/api/courses/public-course/students';
 let result=await a.teacher.request(url);assert.equal(result.status,200,result.text);assert.deepEqual(result.body.students,[]);
 const pending=await post(a.anonymous,'/api/public/trial-applications',a.input);assert.equal(pending.status,201,pending.text);
 assert.deepEqual((await a.teacher.request(url)).body.students,[]);
 await post(a.admin,`/api/trial-applications/${a.store.trialApplications.list({},a.actor).records[0].id}/accept`,{version:1});
 result=await a.teacher.request(url);assert.equal(result.status,200,result.text);assert.equal(result.body.students.length,1);assert.equal(result.body.students[0].displayName,'確認測試');assert.doesNotMatch(result.text,/whatsapp|00001234|dateOfBirth/);
 const unrelated=a.client();await unrelated.request('/api/auth/login',{method:'POST',body:{email:'unrelated@teacher.test',password:'Unrelated-teacher-123!'}});error(await unrelated.request(url),404);error(await a.student.request(url),403);
 a.store.accessControl.setTeacherLink(a.resource.id,{version:1,userId:null},a.actor.id);error(await a.teacher.request(url),404);
});

test('Admin schedule changes notify only the responsible teacher and update that teacher timetable',async t=>{
 const a=await setup(t),otherTeacher=a.client();await otherTeacher.request('/api/auth/login',{method:'POST',body:{email:'unrelated@teacher.test',password:'Unrelated-teacher-123!'}});
 const created=await post(a.admin,'/api/schedules',{course:'public-course',startDate:'2030-01-02',time:'10:00',duration:60,weekdays:[3],endMode:'count',count:1,teacherIds:[a.resource.id],roomIds:[],capacity:5});assert.equal(created.status,201,created.text);
 assert.deepEqual((await a.teacher.request('/api/notifications')).body.notifications,[]);
 const schedule=created.body.schedule;
 const changed=await a.admin.request('/api/schedules/'+schedule.id,{method:'PATCH',body:{...Object.fromEntries(['course','startDate','time','duration','weekdays','endMode','count','teacherIds','roomIds','capacity'].map(key=>[key,schedule[key]])),version:1,time:'11:00'}});assert.equal(changed.status,200,changed.text);
 const notices=(await a.teacher.request('/api/notifications')).body.notifications;assert.equal(notices.length,1);assert.equal(notices[0].type,'schedule-updated');assert.match(notices[0].bodyEn,/Published art/);
 assert.deepEqual((await otherTeacher.request('/api/notifications')).body.notifications,[]);assert.deepEqual((await a.student.request('/api/notifications')).body.notifications,[]);
 const timetable=await a.teacher.request('/api/schedules?from=2030-01-01&to=2030-01-07');assert.equal(timetable.status,200,timetable.text);assert.equal(timetable.body.occurrences.find(row=>row.item.id===schedule.id).item.time,'11:00');
});
