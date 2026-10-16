import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {fixture,error,grantTeacherAccess} from './helpers.mjs';
const send=(client,path,body,key)=>client.request(path,{method:'POST',body,headers:key?{'Idempotency-Key':key}:{}});
const roster=(app,sequence=1,client=app.admin)=>client.request(`/api/schedules/${app.schedule.id}/occurrences/${sequence}/students`);
const pending=(client,id,body,key,options={})=>client.request('/api/student-sessions/'+encodeURIComponent(id)+'/pending-arrangement',{method:'PATCH',body,headers:key?{'Idempotency-Key':key}:{},...options});
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'beamal-pending-http-'));t.after(()=>rm(directory,{recursive:true,force:true}));
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

test('HTTP pending writes create one exact task and safe owned readback without altering attendance paid seats or another student',async t=>{
 const app=await setup(t),row=await selected(app),other=await selected(app,'attendance-a'),before=app.store.enrollmentOrders.sales(),payload={version:0,sessionVersion:row.version,sourceVersion:row.sourceVersion};
 const detail=await app.teacher.request('/api/student-sessions/'+row.id+'/arrangement');assert.equal(detail.status,200,detail.text);assert.equal(detail.body.arrangement.version,0);
 const first=await pending(app.teacher,row.id,payload,'pending-lost-ack');assert.equal(first.status,200,first.text);assert.equal(first.body.arrangement.sessionId,row.id);assert.equal(first.body.arrangement.status,'pending');assert.equal(first.body.arrangement.version,1);
 const replay=await pending(app.teacher,row.id,payload,'pending-lost-ack');assert.equal(replay.status,200,replay.text);assert.deepEqual(replay.body,first.body);error(await pending(app.teacher,row.id,{...payload,sourceVersion:99},'pending-lost-ack'),409);
 const readback=await selected(app);assert.equal(readback.version,row.version);assert.equal(readback.attendance,row.attendance);assert.equal(readback.arrangement.status,'pending');assert.deepEqual(await selected(app,'attendance-a'),other);assert.deepEqual(app.store.enrollmentOrders.sales(),before);assert.equal(app.store.enrollmentOrders.occupied(app.schedule.id,1),2);
 const work=await app.teacher.request('/api/pending-arrangements?page=1&pageSize=10');assert.equal(work.status,200,work.text);assert.equal(work.body.total,1);assert.equal(work.body.records[0].sessionId,row.id);const again=await app.teacher.request('/api/pending-arrangements?page=1&pageSize=10&since='+work.body.revision);assert.equal(again.body.unchanged,true);
 const owned=await app.student.request('/api/student/timetable?from=2026-10-01&to=2026-11-30');assert.equal(owned.status,200,owned.text);assert.deepEqual(owned.body.lessons.find(x=>x.id===row.id).arrangement,{status:'pending',version:1});assert.doesNotMatch(JSON.stringify(owned.body.lessons.find(x=>x.id===row.id).arrangement),/actor|createdBy|PRIVATE/);
});
test('HTTP pending requires current responsibility even for a committed receipt and rejects unsupported queries origin and csrf',async t=>{
 const app=await setup(t),row=await selected(app),payload={version:0,sessionVersion:row.version,sourceVersion:row.sourceVersion};
 error(await pending(app.student,row.id,payload,'student-forged'),403);error(await pending(app.client(),row.id,payload,'anonymous'),401);error(await pending(app.admin,row.id,payload,'csrf',{csrf:false}),403);error(await pending(app.admin,row.id,payload,'origin',{requestOrigin:'https://hostile.example.test'}),403);error(await app.teacher.request('/api/pending-arrangements?studentId=forged'),400);
 const first=await pending(app.teacher,row.id,payload,'teacher-key');assert.equal(first.status,200,first.text);const unlink=await app.admin.request('/api/access-control/teacher-links/'+app.teacherResource.id,{method:'PATCH',body:{version:1,userId:null}});assert.equal(unlink.status,200,unlink.text);await grantTeacherAccess(app,app.admin,{courses:['public-course']});error(await pending(app.teacher,row.id,payload,'teacher-key'),403);error(await app.student.request('/api/pending-arrangements'),403);error(await app.student.request('/api/student-sessions/'+row.id+'/arrangement'),403);
});
