import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {request as httpRequest} from 'node:http';
import {fixture,error,origin,grantTeacherAccess} from './helpers.mjs';

const contextPath=id=>'/api/student-sessions/'+encodeURIComponent(id)+'/parent-message-context';
const sendPath=id=>'/api/student-sessions/'+encodeURIComponent(id)+'/parent-messages';
const post=(client,path,body,key,options={})=>client.request(path,{method:'POST',body,headers:key?{'Idempotency-Key':key}:{},...options});
const send=(app,id,body,key,client=app.teacher)=>post(client,sendPath(id),body,key);
const inspect=(app,read)=>{const db=new DatabaseSync(app.databasePath);try{return read(db);}finally{db.close();}};
const business=app=>inspect(app,db=>Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'lesson_parent_message%' AND name!='idempotent_creates' ORDER BY name").all().map(({name})=>[name,db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()])));
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'beamal-parent-messages-'));t.after(()=>rm(directory,{recursive:true,force:true}));const databasePath=join(directory,'isolated.sqlite'),app=await fixture(t,{databasePath});
 app.databasePath=databasePath;
 const admin=app.client(),teacher=app.client(),student=app.client(),otherStudent=app.client(),actor=(await admin.login()).body.user,teacherActor=(await teacher.login(2)).body.user,studentActor=(await student.login(3)).body.user,otherStudentActor=(await otherStudent.login(4)).body.user;
 inspect(app,db=>{const now=new Date().toISOString();for(const [id,parentName,whatsApp] of [['message-child-a','Parent A','+44 123 456'],['message-child-b','Parent B','6123 4567']])db.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES (?,'student','Same student name',?,'same student name',1,?,?)").run(id,JSON.stringify({displayName:'Same student name',parentName,whatsApp,email:'STUDENT-PRIVATE@example.test',contact2Name:'EMERGENCY-PRIVATE',contact2Phone:'9999-PRIVATE',remark:'PERSON-PRIVATE'}),now,now);});
 const resource=app.store.schedulingResources.create({kind:'teacher',displayName:'Responsible teacher'},actor.id),otherResource=app.store.schedulingResources.create({kind:'teacher',displayName:'Unassigned teacher'},actor.id);app.store.accessControl.setTeacherLink(resource.id,{version:0,userId:teacherActor.id},actor.id);
 const rule={course:'public-course',startDate:'2026-10-16',time:'13:00',duration:60,weekdays:[5],endMode:'count',count:3,teacherIds:[resource.id],roomIds:[],capacity:8},schedule=app.store.schedules.create(rule,actor.id),orders=[];
 for(const [studentId,sequences,recipient]of [['message-child-a',[1,2],studentActor],['message-child-b',[1],otherStudentActor]]){
  app.store.enrollmentOrders.setAccountLink(studentId,{version:0,userId:recipient.id},actor);
  const draft=app.store.enrollmentOrders.create({studentId,amountCents:60000,items:[{courseId:'public-course',feeId:app.store.getCourse('public-course').feeIds[0],lessons:sequences.map(sequence=>({scheduleId:schedule.id,sequence,sourceVersion:1}))}]},actor),sent=app.store.enrollmentOrders.send(draft.id,{version:draft.version},actor),accepted=app.store.enrollmentOrders.respond(draft.id,{version:sent.version,action:'confirm'},recipient);orders.push(app.store.enrollmentOrders.confirmPayment(draft.id,{version:accepted.version},actor));
 }
 const roster=app.store.enrollmentOrders.roster(schedule.id,1,actor).students,first=roster.find(row=>row.studentId==='message-child-a'),sameName=roster.find(row=>row.studentId==='message-child-b'),second=app.store.enrollmentOrders.roster(schedule.id,2,actor).students[0];
 return {...app,databasePath,admin,teacher,student,otherStudent,actor,teacherActor,studentActor,otherStudentActor,resource,otherResource,rule,schedule,orders,first,sameName,second};
}
const read=async(app,id=app.first.id,client=app.teacher)=>{const reply=await client.request(contextPath(id));assert.equal(reply.status,200,reply.text);return reply.body.context;};
const payload=(context,message=' Raw <parent message>\n preserved ' )=>({revision:context.revision,message});

test('parent message context resolves the exact paid lesson and narrow canonical parent contact without names email or emergency fallback',async t=>{
 const app=await setup(t),before=business(app),context=await read(app,app.sameName.id);
 assert.deepEqual(Object.keys(context).sort(),['appRecipient','courseId','courseName','date','duration','revision','sender','sessionId','studentId','studentName','teacherNames','time','whatsApp']);assert.equal(context.sessionId,app.sameName.id);assert.equal(context.studentId,'message-child-b');assert.equal(context.date,'2026-10-16');assert.equal(context.time,'13:00');assert.equal(context.duration,60);assert.deepEqual(context.teacherNames,['Responsible teacher']);
 assert.deepEqual(context.sender,{id:app.teacherActor.id,displayName:app.teacherActor.displayName});assert.deepEqual(context.whatsApp,{name:'Parent B',number:'6123 4567'});assert.deepEqual(context.appRecipient,{userId:app.otherStudentActor.id,displayName:app.otherStudentActor.displayName});assert.match(context.revision,/^[a-f0-9]{64}$/);
 const first=await read(app),second=await read(app,app.second.id);assert.notEqual(first.revision,context.revision);assert.notEqual(first.revision,second.revision);assert.equal(first.studentId,second.studentId);assert.deepEqual(first.whatsApp,{name:'Parent A',number:'+44 123 456'});
 assert.doesNotMatch(JSON.stringify(context),/PRIVATE|email|contact2|profile|orderId|scheduleId|phone|password/);assert.deepEqual(business(app),before);
});

test('sending a local app message saves raw text for only the exact recipient inbox without modifying sessions attendance orders prices or quotas',async t=>{
 const app=await setup(t),context=await read(app,app.sameName.id),before=business(app),input=payload(context),sent=await send(app,context.sessionId,input,'parent-exact');assert.equal(sent.status,201,sent.text);const message=sent.body.message;
 assert.deepEqual(Object.keys(message).sort(),['body','channel','courseName','createdAt','date','id','recipientName','recipientUserId','senderId','senderName','sessionId','studentId','studentName','time']);assert.equal(message.sessionId,app.sameName.id);assert.equal(message.studentId,'message-child-b');assert.equal(message.body,input.message);assert.equal(message.channel,'app-test');assert.equal(message.recipientUserId,app.otherStudentActor.id);assert.equal(message.senderId,app.teacherActor.id);assert.ok(Number.isFinite(Date.parse(message.createdAt)));
 const inbox=await app.otherStudent.request('/api/parent-messages/inbox');assert.equal(inbox.status,200,inbox.text);assert.deepEqual(inbox.body.records,[message]);assert.equal(inbox.body.total,1);assert.deepEqual((await app.student.request('/api/parent-messages/inbox')).body.records,[]);assert.deepEqual(business(app),before);assert.equal((await read(app,app.sameName.id)).revision,context.revision);assert.equal(app.store.lessonParentMessages.audit().length,1);
 assert.doesNotMatch(inbox.text,/PRIVATE|whatsApp|appRecipient|profile|orderId|sourceVersion/);
});

test('parent message authority requires the current responsible teacher and cannot be granted by read scope or forged role',async t=>{
 const app=await setup(t),context=await read(app);error(await app.student.request(contextPath(app.first.id)),403);error(await app.client().request(contextPath(app.first.id)),401);error(await send(app,app.first.id,payload(context),null,app.student),403);
 app.store.accessControl.setTeacherLink(app.resource.id,{version:1,userId:null},app.actor.id);await grantTeacherAccess(app,app.admin,{courses:['public-course']});assert.equal((await app.teacher.request(`/api/schedules/${app.schedule.id}/occurrences/1/students`)).status,200);
 error(await app.teacher.request(contextPath(app.first.id)),403);error(await send(app,app.first.id,payload(context)),403);assert.throws(()=>app.store.enrollmentOrders.authorizedParentMessageContext(app.first.id,{...app.teacherActor,role:'admin'}),value=>value.status===403);
 assert.equal((await read(app,app.first.id,app.admin)).sender.id,app.actor.id);error(await app.teacher.request('/api/parent-messages/inbox'),403);error(await app.admin.request('/api/parent-messages/inbox'),403);assert.equal(app.store.lessonParentMessages.audit().length,0);
});

test('current contact link source and session revisions invalidate stale parent message reviews without writing another message',async t=>{
 const app=await setup(t),initial=await read(app);app.store.enrollmentOrders.saveAttendance(app.first.id,{version:1,sourceVersion:1,remark:'New lesson fact'},app.teacherActor);error(await send(app,app.first.id,payload(initial)),409);
 const annotated=await read(app);app.store.people.update('message-child-a',{version:1,parentName:'Changed parent'},app.actor.id);error(await send(app,app.first.id,payload(annotated)),409);
 const current=await read(app);app.store.schedules.editOccurrence(app.schedule.id,1,{...app.rule,version:1,scope:'single',startDate:'2026-10-17',weekdays:[6],time:'14:00'},app.actor.id);error(await send(app,app.first.id,payload(current)),409);const moved=await read(app);assert.equal(moved.sessionId,app.first.id);assert.equal(moved.date,'2026-10-17');assert.equal(moved.time,'14:00');
 app.store.schedules.deleteOccurrence(app.schedule.id,1,{version:2,scope:'single'},app.actor.id);error(await app.admin.request(contextPath(app.first.id)),404);error(await send(app,app.first.id,payload(moved),null,app.admin),404);assert.equal(app.store.lessonParentMessages.audit().length,0);
});

test('explicit child account reassignment never transfers historical inbox messages to another login or permits old receipt replay',async t=>{
 const app=await setup(t),context=await read(app),input=payload(context,'For original recipient'),first=await send(app,app.first.id,input,'original-recipient');assert.equal(first.status,201,first.text);assert.equal((await app.student.request('/api/parent-messages/inbox')).body.total,1);
 app.store.enrollmentOrders.setAccountLink('message-child-a',{version:1,userId:app.otherStudentActor.id},app.actor);error(await send(app,app.first.id,input,'original-recipient'),409);
 assert.equal((await app.student.request('/api/parent-messages/inbox')).body.total,0);assert.equal((await app.otherStudent.request('/api/parent-messages/inbox')).body.total,0);
 const changed=await read(app),next=await send(app,app.first.id,payload(changed,'For new recipient'),'new-recipient');assert.equal(next.status,201,next.text);assert.equal((await app.otherStudent.request('/api/parent-messages/inbox')).body.total,1);assert.equal((await app.otherStudent.request('/api/parent-messages/inbox')).body.records[0].body,'For new recipient');
 app.store.enrollmentOrders.setAccountLink('message-child-a',{version:2,userId:null},app.actor);const missing=await read(app);assert.equal(missing.appRecipient,null);error(await send(app,app.first.id,payload(missing)),409);assert.equal((await app.otherStudent.request('/api/parent-messages/inbox')).body.total,0);
});

test('missing parent WhatsApp or linked student account remains unknown and cannot borrow a student email emergency number or first account',async t=>{
 const app=await setup(t);app.store.people.update('message-child-a',{version:1,parentName:'',whatsApp:''},app.actor.id);app.store.enrollmentOrders.setAccountLink('message-child-a',{version:1,userId:null},app.actor);const context=await read(app);assert.equal(context.whatsApp,null);assert.equal(context.appRecipient,null);error(await send(app,app.first.id,payload(context)),409);assert.equal(app.store.lessonParentMessages.audit().length,0);
 error(await app.admin.request(contextPath('missing-session')),404);inspect(app,db=>db.prepare("UPDATE enrollment_orders SET payment_status='awaiting-payment' WHERE id=?").run(app.first.orderId));error(await app.admin.request(contextPath(app.first.id)),404);
});

test('parent message validation method query CSRF origin and inbox pagination remain exact and mutation free for rejected requests',async t=>{
 const app=await setup(t),context=await read(app),valid=payload(context);
 for(const input of[null,[],{}, {...valid,studentId:app.sameName.studentId},{...valid,recipientUserId:app.otherStudentActor.id},{...valid,message:''},{...valid,message:'  \n '},{...valid,message:42},{...valid,message:'x'.repeat(2001)},{...valid,revision:'bad'}])error(await send(app,app.first.id,input),400);
 error(await app.teacher.request(sendPath(app.first.id),{method:'POST',body:valid,csrf:false}),403);error(await app.teacher.request(sendPath(app.first.id),{method:'POST',body:valid,requestOrigin:'https://hostile.test'}),403);
 error(await app.teacher.request(contextPath(app.first.id)+'?studentId=x'),400);error(await app.teacher.request(sendPath(app.first.id)+'?x=1',{method:'POST',body:valid}),400);
 for(const method of['PATCH','DELETE','PUT'])error(await app.teacher.request(sendPath(app.first.id),{method,body:valid}),405);error(await app.teacher.request(contextPath(app.first.id),{method:'POST',body:valid}),405);
 for(const suffix of['?page=0','?pageSize=101','?page=1&page=2','?studentId=message-child-b'])error(await app.student.request('/api/parent-messages/inbox'+suffix),400);assert.equal(app.store.lessonParentMessages.audit().length,0);
 for(const text of['one','two','three'])assert.equal((await send(app,app.first.id,payload(context,text),'message-'+text)).status,201);
 const paged=await app.student.request('/api/parent-messages/inbox?page=2&pageSize=2');assert.equal(paged.status,200,paged.text);assert.equal(paged.body.total,3);assert.equal(paged.body.records.length,1);assert.equal(paged.body.page,2);assert.equal(paged.body.pageSize,2);
 const unchanged=await app.student.request('/api/parent-messages/inbox?page=2&pageSize=2&since='+paged.body.revision);assert.deepEqual(unchanged.body,{revision:paged.body.revision,unchanged:true,total:3,page:2,pageSize:2});
});

test('lost acknowledgement repeats one durable app message audit and receipt while changed payload conflicts and audit failure rolls back atomically',async t=>{
 const app=await setup(t),context=await read(app),input=payload(context),first=await send(app,app.first.id,input,'parent-lost-ack');assert.equal(first.status,201,first.text);assert.deepEqual((await send(app,app.first.id,input,'parent-lost-ack')).body,first.body);error(await send(app,app.first.id,{...input,message:'different'},'parent-lost-ack'),409);assert.equal(app.store.lessonParentMessages.audit().length,1);
 inspect(app,db=>db.exec("CREATE TRIGGER isolated_parent_audit_failure BEFORE INSERT ON lesson_parent_message_audit_log BEGIN SELECT RAISE(ABORT,'isolated message audit failure'); END;"));const next=payload(context,'retry after rollback');error(await send(app,app.first.id,next,'parent-atomic'),500);assert.equal((await app.student.request('/api/parent-messages/inbox')).body.total,1);assert.equal(app.store.lessonParentMessages.audit().length,1);
 inspect(app,db=>db.exec('DROP TRIGGER isolated_parent_audit_failure'));const retry=await send(app,app.first.id,next,'parent-atomic');assert.equal(retry.status,201,retry.text);assert.equal((await app.student.request('/api/parent-messages/inbox')).body.total,2);assert.equal(app.store.lessonParentMessages.audit().length,2);
});

test('saved local parent messages survive restart and remain absent from public and general student lesson DTOs',async t=>{
 const app=await setup(t),context=await read(app),saved=await send(app,app.first.id,payload(context,'PRIVATE-DURABLE-APP-MESSAGE'),'parent-restart');assert.equal(saved.status,201,saved.text);
 const anonymous=app.client();for(const path of['/api/public/courses','/api/public/timetable?from=2026-10-16&days=7']){const reply=await anonymous.request(path);assert.equal(reply.status,200,reply.text);assert.ok(!reply.text.includes('PRIVATE-DURABLE-APP-MESSAGE'));}
 const lessons=await app.student.request('/api/student/timetable?from=2026-10-01&to=2026-11-30');assert.equal(lessons.status,200,lessons.text);assert.ok(!lessons.text.includes('PRIVATE-DURABLE-APP-MESSAGE'));
 await app.close();const next=await fixture(t,{databasePath:app.databasePath}),student=next.client();await student.login(3);const inbox=await student.request('/api/parent-messages/inbox');assert.equal(inbox.status,200,inbox.text);assert.deepEqual(inbox.body.records,[saved.body.message]);assert.equal(next.store.lessonParentMessages.audit().length,1);
});

test('a body paused across teacher unlink cannot replay its previously saved private parent message',async t=>{
 const app=await setup(t),context=await read(app),input=payload(context,'PRIVATE-PAUSED-PARENT-MESSAGE'),first=await send(app,app.first.id,input,'parent-paused');assert.equal(first.status,201,first.text);
 const payloadText=JSON.stringify(input),url=new URL(sendPath(app.first.id),app.base);let observed;const seen=new Promise(resolve=>{observed=req=>{if(req.url===url.pathname)resolve();};app.server.on('request',observed);});let request;
 const pending=new Promise((resolve,reject)=>{request=httpRequest(url,{method:'POST',headers:{Origin:origin,Cookie:[...app.teacher.cookies].map(([name,value])=>name+'='+value).join('; '),'X-CSRF-Token':app.teacher.csrfToken,'Idempotency-Key':'parent-paused','Content-Type':'application/json','Content-Length':Buffer.byteLength(payloadText)}},response=>{let text='';response.setEncoding('utf8');response.on('data',chunk=>text+=chunk);response.on('end',()=>resolve({status:response.statusCode,text}));});request.on('error',reject);request.write(payloadText.slice(0,12));});
 await seen;app.server.off('request',observed);app.store.accessControl.setTeacherLink(app.resource.id,{version:1,userId:null},app.actor.id);request.end(payloadText.slice(12));const blocked=await pending;assert.equal(blocked.status,403,blocked.text);assert.ok(!blocked.text.includes('PRIVATE-PAUSED-PARENT-MESSAGE'));assert.equal(app.store.lessonParentMessages.audit().length,1);
});
