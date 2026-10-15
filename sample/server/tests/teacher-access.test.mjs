import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {fixture,error,users} from './helpers.mjs';

const teacherB={email:'teacher-b@example.test',password:'Fictional-teacher-B-password-123!',displayName:'Teacher B',role:'teacher'};
const send=(client,path,method,body,key)=>client.request(path,{method,body,...(key?{headers:{'Idempotency-Key':key}}:{})});
const calendar='/api/schedules?from=2026-10-01&to=2026-10-31';
const rule=fields=>({course:'public-course',startDate:'2026-10-14',time:'12:30',duration:30,weekdays:[3],endMode:'count',count:4,teacher:'',room:'',session:1,...fields});
async function setup(t,options={}){const app=await fixture(t,{seedUsers:[...users,teacherB],...options}),admin=app.client(),a=app.client(),b=app.client();await admin.login();await a.login(2);assert.equal((await send(b,'/api/auth/login','POST',{email:teacherB.email,password:teacherB.password})).status,200);return {...app,admin,a,b,teacherAUser:app.store.listUsers().find(user=>user.email===users[2].email),teacherBUser:app.store.listUsers().find(user=>user.email===teacherB.email)};}
async function resource(app,kind,displayName){const reply=await send(app.admin,'/api/scheduling-resources','POST',{kind,displayName});assert.equal(reply.status,201,reply.text);return reply.body.resource;}
async function link(app,teacherResourceId,userId,version=0,key){const reply=await send(app.admin,`/api/access-control/teacher-links/${teacherResourceId}`,'PATCH',{version,userId},key);assert.equal(reply.status,200,reply.text);return reply.body;}
async function grant(app,userId,kind,target,key){const reply=await send(app.admin,'/api/access-control/grants','POST',{userId,kind,...target},key);assert.equal(reply.status,201,reply.text);return reply.body;}
async function schedule(app,fields){const reply=await send(app.admin,'/api/schedules','POST',rule(fields));assert.equal(reply.status,201,reply.text);return reply.body.schedule;}
async function mixed(t,options={}){const app=await setup(t,options);app.ta=await resource(app,'teacher','Teacher resource A');app.tb=await resource(app,'teacher','Teacher resource B');app.tc=await resource(app,'teacher','Unrelated teacher C');app.ra=await resource(app,'room','Room A');app.rb=await resource(app,'room','Room B');app.rc=await resource(app,'room','Unrelated room C');let current=await schedule(app,{teacherIds:[app.ta.id],roomIds:[app.ra.id]});let changed=await send(app.admin,`/api/schedules/${current.id}/occurrences/2`,'PATCH',{...rule({startDate:'2026-10-21',count:3,session:2,teacherIds:[app.tb.id],roomIds:[app.rb.id],remark:'Only teacher B preparation'}),version:current.version,scope:'single'});assert.equal(changed.status,200,changed.text);current=changed.body.schedule;changed=await send(app.admin,`/api/schedules/${current.id}/occurrences/3`,'PATCH',{...rule({startDate:'2026-10-28',count:2,session:3,teacherIds:[app.tc.id],roomIds:[app.rc.id],remark:'Private teacher C preparation'}),version:current.version,scope:'following'});assert.equal(changed.status,200,changed.text);app.series=changed.body.schedule;app.privateSeries=await schedule(app,{course:'private-course',teacherIds:[app.tc.id],roomIds:[app.rc.id]});return app;}

test('an unmapped teacher has no all-school data while admin and existing student behavior remain unchanged',async t=>{
 const app=await setup(t);for(const client of[app.a,app.b]){assert.deepEqual((await client.request('/api/catalog')).body.courses,[]);assert.deepEqual((await client.request('/api/courses')).body.courses,[]);assert.deepEqual((await client.request('/api/fees')).body.fees,[]);assert.deepEqual((await client.request('/api/scheduling-resources')).body.resources,[]);const read=await client.request(calendar);assert.equal(read.status,200,read.text);assert.deepEqual(read.body.occurrences,[]);assert.equal(read.body.readScope,'occurrences');assert.equal(read.body.schedules,undefined);error(await client.request('/api/schedules'),400);}
 const admin=(await app.admin.request('/api/catalog')).body;assert.equal(admin.courses.length,2);assert.equal((await app.admin.request('/api/schedules')).status,200);
 const student=app.client();await student.login(3);assert.equal((await student.request('/api/catalog')).body.courses.length,1);error(await student.request(calendar),403);error(await student.request('/api/scheduling-resources'),403);
 error(await app.client().request('/api/access-control'),401);error(await app.a.request('/api/access-control'),403);
 const access=await app.admin.request('/api/access-control');assert.equal(access.status,200,access.text);for(const account of access.body.accounts)assert.deepEqual(Object.keys(account).sort(),['id','displayName','role'].sort());assert.ok(!access.text.includes('password'));assert.ok(!access.text.includes('@example.test'));
});

test('stable teacher links authorize only actual occurrences in mixed single and following series and redact unrelated catalog links',async t=>{
 const app=await mixed(t),accounts=app.store.listUsers(),initial=(await app.a.request('/api/auth/session')).body.user.accessRevision;
 await link(app,app.ta.id,app.teacherAUser.id);await link(app,app.tb.id,app.teacherBUser.id);
 const managerTeacher=await resource(app,'teacher','Teaching administrator'),adminId=app.store.listUsers().find(user=>user.role==='admin').id;await link(app,managerTeacher.id,adminId);
 assert.deepEqual(app.store.listUsers(),accounts);assert.notEqual((await app.a.request('/api/auth/session')).body.user.accessRevision,initial);
 const a=await app.a.request(calendar),b=await app.b.request(calendar);assert.equal(a.status,200,a.text);assert.equal(b.status,200,b.text);
 assert.deepEqual(a.body.occurrences.map(row=>[row.item.id,row.sequence,row.date]),[[app.series.id,1,'2026-10-14']]);assert.deepEqual(b.body.occurrences.map(row=>[row.item.id,row.sequence]),[[app.series.id,2]]);
 for(const key of['weekdays','endMode','endDate','count','segments','exceptions']){assert.equal(a.body.occurrences[0].item[key],undefined);assert.ok(!a.text.includes(`"${key}"`));}
 for(const privateValue of[app.tc.id,app.rc.id,app.privateSeries.id,'Private teacher C preparation','Only teacher B preparation'])assert.ok(!a.text.includes(privateValue));
 assert.deepEqual(a.body.occurrences[0].item.teacherIds,[app.ta.id]);assert.equal(a.body.occurrences[0].item.startDate,'2026-10-14');
 const pooled=await app.a.request('/api/scheduling-resources');assert.deepEqual(new Set(pooled.body.resources.map(row=>row.id)),new Set([app.ta.id,app.ra.id]));
 const sharedFee=await send(app.admin,'/api/fees','POST',{feeName:'Shared scoped fee',category:'',pricingModel:'package',price:1500,packageType:'visits',packageTotal:4,onlineStore:false,bookingExpiry:null,courseIds:['public-course','private-course']});assert.equal(sharedFee.status,201,sharedFee.text);
 for(const path of['/api/catalog','/api/courses','/api/fees']){const reply=await app.a.request(path);assert.equal(reply.status,200,reply.text);assert.ok(!reply.text.includes('private-course'));const fees=reply.body.fees||reply.body.courses.flatMap(row=>row.fees||[]);for(const fee of fees)assert.ok(fee.courseIds.every(id=>id==='public-course'));}
 const raw=(await app.admin.request('/api/schedules')).body;assert.equal(raw.schedules.length,2);assert.ok(raw.schedules.some(row=>row.segments?.length&&row.exceptions?.length));assert.notEqual(a.body.revision,raw.revision);assert.equal((await app.a.request(calendar+'&since='+raw.revision)).body.unchanged,undefined);
 assert.deepEqual((await app.a.request(calendar+'&since='+a.body.revision)).body,{revision:a.body.revision,readScope:'occurrences',unchanged:true});
});

test('course resource and occurrence grants are distinct and revoke immediately changes scope without exposing sibling lessons',async t=>{
 const app=await mixed(t);await link(app,app.ta.id,app.teacherAUser.id);
 const own=(await app.a.request(calendar)).body,one=await grant(app,app.teacherAUser.id,'occurrence',{scheduleId:app.privateSeries.id,sequence:2});
 let scoped=(await app.a.request(calendar)).body;assert.deepEqual(scoped.occurrences.map(row=>[row.item.id,row.sequence]),[[app.series.id,1],[app.privateSeries.id,2]]);assert.notEqual(scoped.revision,own.revision);
 assert.ok((await app.a.request('/api/catalog')).body.courses.some(course=>course.id==='private-course'),'A course metadata read must not authorize its other lessons.');
 const revoked=await send(app.admin,`/api/access-control/grants/${one.grant.id}`,'PATCH',{version:1,active:false});assert.equal(revoked.status,200,revoked.text);scoped=(await app.a.request(calendar+'&since='+scoped.revision)).body;assert.equal(scoped.unchanged,undefined);assert.deepEqual(scoped.occurrences.map(row=>[row.item.id,row.sequence]),[[app.series.id,1]]);
 const room=await grant(app,app.teacherAUser.id,'resource',{resourceId:app.rc.id});scoped=(await app.a.request(calendar)).body;assert.ok(scoped.occurrences.some(row=>row.item.id===app.series.id&&row.sequence===3));assert.equal(scoped.occurrences.filter(row=>row.item.id===app.privateSeries.id).length,3);
 assert.equal((await send(app.admin,`/api/access-control/grants/${room.grant.id}`,'PATCH',{version:1,active:false})).status,200);
 const whole=await grant(app,app.teacherAUser.id,'course',{courseId:'private-course'});scoped=(await app.a.request(calendar)).body;assert.equal(scoped.occurrences.filter(row=>row.item.id===app.privateSeries.id).length,3);
 assert.equal((await send(app.admin,`/api/access-control/grants/${whole.grant.id}`,'PATCH',{version:1,active:false})).status,200);
 const session=(await app.a.request('/api/auth/session')).body.user.accessRevision;await link(app,app.ta.id,null,1);assert.notEqual((await app.a.request('/api/auth/session')).body.user.accessRevision,session);assert.deepEqual((await app.a.request(calendar)).body.occurrences,[]);assert.deepEqual((await app.a.request('/api/catalog')).body.courses,[]);
 for(const query of['','&courseId=private-course','&teacherId='+app.tc.id,'&since='+scoped.revision])assert.deepEqual((await app.a.request(calendar+query)).body.occurrences,[]);
});

test('material and every direct attachment read follow current course authorization including revoke and student legacy grants',async t=>{
 const app=await mixed(t,{seedMaterialAccess:[{courseId:'public-course',email:users[3].email}]});await link(app,app.ta.id,app.teacherAUser.id);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6S9sAAAAASUVORK5CYII=','base64');
 const uploaded=await fetch(app.base+'/api/courses/private-course/material-uploads',{method:'POST',headers:{Origin:'http://localhost:5173',Cookie:[...app.admin.cookies].map(([key,value])=>`${key}=${value}`).join('; '),'X-CSRF-Token':app.admin.csrfToken,'Content-Type':'image/png','X-File-Name':'fictional-private.png','Idempotency-Key':'access-private-upload'},body:png});assert.equal(uploaded.status,201,await uploaded.clone().text());const upload=(await uploaded.json()).upload;
 const privateMaterial=await send(app.admin,'/api/courses/private-course/materials','POST',{name:'Private course notes',description:'Teacher C private material',visibleToStudents:false,attachments:[upload.id]});assert.equal(privateMaterial.status,201,privateMaterial.text);const id=privateMaterial.body.material.id,file=`/api/materials/${id}/attachments/${upload.id}`;
 error(await app.a.request('/api/courses/private-course/materials'),404);error(await app.a.request(`/api/materials/${id}`),404);
 const binary=async(client,path,method='GET',range)=>{const response=await fetch(app.base+path,{method,headers:{Cookie:[...client.cookies].map(([key,value])=>`${key}=${value}`).join('; '),...(range?{Range:range}:{})}});return {status:response.status,bytes:Buffer.from(await response.arrayBuffer())};};
 for(const [path,method,range]of[[file,'GET'],[file+'?download=1','GET'],[file,'HEAD'],[file,'GET','bytes=0-7']])assert.equal((await binary(app.a,path,method,range)).status,404);
 const permitted=await grant(app,app.teacherAUser.id,'course',{courseId:'private-course'});assert.equal((await app.a.request(`/api/materials/${id}`)).status,200);assert.deepEqual((await binary(app.a,file)).bytes,png);assert.equal((await binary(app.a,file+'?download=1')).status,200);
 assert.equal((await send(app.admin,`/api/access-control/grants/${permitted.grant.id}`,'PATCH',{version:1,active:false})).status,200);assert.equal((await binary(app.a,file)).status,404);assert.equal((await binary(app.admin,file)).status,200);
 const publicMaterial=await send(app.admin,'/api/courses/public-course/materials','POST',{name:'Public course student material',visibleToStudents:true,studentDownload:true});assert.equal(publicMaterial.status,201,publicMaterial.text);const student=app.client();await student.login(3);assert.equal((await student.request(`/api/materials/${publicMaterial.body.material.id}`)).status,200);assert.equal((await binary(student,file)).status,404);
});

test('access management requires administrator CSRF strict targets versions and atomic durable idempotent writes',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-teacher-access-'));t.after(()=>rm(directory,{recursive:true,force:true}));const databasePath=join(directory,'fictional.sqlite'),app=await setup(t,{databasePath}),ta=await resource(app,'teacher','Durable linked teacher'),room=await resource(app,'room','Wrong link room'),path=`/api/access-control/teacher-links/${ta.id}`,input={version:0,userId:app.teacherAUser.id};
 for(const client of[app.a,app.b])error(await send(client,path,'PATCH',input),403);error(await app.admin.request(path,{method:'PATCH',body:input,csrf:false}),403);error(await app.admin.request(path,{method:'PATCH',body:input,requestOrigin:'https://hostile.example.test'}),403);
 error(await send(app.admin,`/api/access-control/teacher-links/${room.id}`,'PATCH',input),400);error(await send(app.admin,path,'PATCH',{...input,userId:'missing'}),400);error(await send(app.admin,path,'PATCH',{...input,userId:app.store.listUsers().find(user=>user.role==='student').id}),400);error(await send(app.admin,path,'PATCH',{...input,role:'admin'}),400);error(await send(app.admin,path,'PATCH',{userId:app.teacherAUser.id}),409);
 const before=(await app.admin.request('/api/access-control')).body,inspection=new DatabaseSync(databasePath);try{inspection.exec("CREATE TRIGGER fictional_access_failure BEFORE INSERT ON access_control_audit_log BEGIN SELECT RAISE(ABORT,'Fictional access audit failure'); END;");error(await send(app.admin,path,'PATCH',input,'access-durable-link'),500);assert.deepEqual((await app.admin.request('/api/access-control')).body,before);assert.equal(inspection.prepare("SELECT COUNT(*) AS count FROM idempotent_creates WHERE request_key='access-durable-link'").get().count,0);inspection.exec('DROP TRIGGER fictional_access_failure');}finally{inspection.close();}
 const links=await Promise.all(Array.from({length:5},()=>send(app.admin,path,'PATCH',input,'access-durable-link')));for(const reply of links){assert.equal(reply.status,200,reply.text);assert.deepEqual(reply.body,links[0].body);}assert.equal(links[0].body.teacherLink.version,1);error(await send(app.admin,path,'PATCH',{...input,userId:null},'access-durable-link'),409);error(await send(app.admin,path,'PATCH',{version:0,userId:null}),409);
 const allowed=await grant(app,app.teacherAUser.id,'course',{courseId:'public-course'},'access-durable-grant');error(await send(app.admin,'/api/access-control/grants','POST',{userId:app.teacherAUser.id,kind:'course',courseId:'missing'}),400);error(await send(app.admin,'/api/access-control/grants','POST',{userId:app.teacherAUser.id,kind:'occurrence',scheduleId:'missing',sequence:1}),400);
 const snapshot=(await app.admin.request('/api/access-control')).body,session=(await app.a.request('/api/auth/session')).body.user;await app.close();const reopened=await setup(t,{databasePath});assert.deepEqual((await reopened.admin.request('/api/access-control')).body,snapshot);assert.equal((await reopened.a.request('/api/auth/session')).body.user.accessRevision,session.accessRevision);assert.deepEqual((await send(reopened.admin,path,'PATCH',input,'access-durable-link')).body,links[0].body);assert.deepEqual((await grant(reopened,reopened.teacherAUser.id,'course',{courseId:'public-course'},'access-durable-grant')),allowed);
 const race=await Promise.all([true,false].map(active=>send(reopened.admin,`/api/access-control/grants/${allowed.grant.id}`,'PATCH',{version:1,active})));assert.deepEqual(race.map(reply=>reply.status).sort(),[200,409]);
});

test('effective assignment and course lifecycle changes invalidate teacher scope while unrelated grants leave administrator scope stable',async t=>{
 const app=await mixed(t);await link(app,app.ta.id,app.teacherAUser.id);
 const adminRevision=(await app.admin.request('/api/auth/session')).body.user.accessRevision,initial=(await app.a.request('/api/auth/session')).body.user.accessRevision;
 const timeOnly=await send(app.admin,`/api/schedules/${app.series.id}/occurrences/1`,'PATCH',{...rule({teacherIds:[app.ta.id],roomIds:[app.ra.id],time:'13:00'}),version:app.series.version,scope:'single'});assert.equal(timeOnly.status,200,timeOnly.text);
 assert.equal((await app.a.request('/api/auth/session')).body.user.accessRevision,initial,'Changing a lesson time is not a permission change.');
 const moved=await send(app.admin,`/api/schedules/${app.series.id}/occurrences/1`,'PATCH',{...rule({teacherIds:[app.tb.id],roomIds:[app.rb.id],time:'13:00'}),version:timeOnly.body.schedule.version,scope:'single'});assert.equal(moved.status,200,moved.text);
 assert.notEqual((await app.a.request('/api/auth/session')).body.user.accessRevision,initial);assert.deepEqual((await app.a.request(calendar)).body.occurrences,[]);assert.deepEqual((await app.a.request('/api/catalog')).body.courses,[]);
 await grant(app,app.teacherAUser.id,'course',{courseId:'private-course'});const grantedRevision=(await app.a.request('/api/auth/session')).body.user.accessRevision;
 const seriesDeleted=await send(app.admin,`/api/schedules/${app.privateSeries.id}`,'DELETE',{version:app.privateSeries.version});assert.equal(seriesDeleted.status,200,seriesDeleted.text);
 const current=(await app.admin.request('/api/courses')).body.courses.find(course=>course.id==='private-course'),deleted=await send(app.admin,'/api/courses/private-course','DELETE',{version:current.version});assert.equal(deleted.status,200,deleted.text);
 assert.notEqual((await app.a.request('/api/auth/session')).body.user.accessRevision,grantedRevision);assert.deepEqual((await app.a.request(calendar)).body.occurrences,[]);
 assert.equal((await app.admin.request('/api/auth/session')).body.user.accessRevision,adminRevision);
 error(await send(app.a,'/api/access-control/grants','POST',{userId:app.teacherAUser.id,kind:'course',courseId:'public-course'}),403);
 error(await send(app.a,'/api/schedules','POST',rule({teacherIds:[app.ta.id],roomIds:[app.ra.id]})),403);
 error(await send(app.a,'/api/courses/private-course/materials','POST',{name:'Forbidden write'}),403);
});


test('time-only following splits preserve the same effective authorization while actual tail membership changes invalidate it',async t=>{
 const app=await setup(t),ta=await resource(app,'teacher','Continuous teacher A'),tb=await resource(app,'teacher','Continuous teacher B'),room=await resource(app,'room','Continuous room');await link(app,ta.id,app.teacherAUser.id);
 const original=await schedule(app,{teacherIds:[ta.id],roomIds:[room.id]}),initial=(await app.a.request('/api/auth/session')).body.user.accessRevision;
 const timed=await send(app.admin,`/api/schedules/${original.id}/occurrences/2`,'PATCH',{...rule({startDate:'2026-10-21',endMode:'date',endDate:'2026-11-04',count:3,session:2,teacherIds:[ta.id],roomIds:[room.id],time:'14:00'}),version:original.version,scope:'following'});assert.equal(timed.status,200,timed.text);
 assert.equal((await app.a.request('/api/auth/session')).body.user.accessRevision,initial);
 const assigned=await send(app.admin,`/api/schedules/${original.id}/occurrences/2`,'PATCH',{...rule({startDate:'2026-10-21',endMode:'date',endDate:'2026-11-04',count:3,session:2,teacherIds:[tb.id],roomIds:[room.id],time:'14:00'}),version:timed.body.schedule.version,scope:'following'});assert.equal(assigned.status,200,assigned.text);
 assert.notEqual((await app.a.request('/api/auth/session')).body.user.accessRevision,initial);assert.deepEqual((await app.a.request(calendar)).body.occurrences.map(row=>row.sequence),[1]);
});

test('real linked and resource-granted occurrence DTOs retain parent identity version and timestamps and sort overlapping series',async t=>{
 const app=await setup(t),ta=await resource(app,'teacher','DTO linked teacher'),tc=await resource(app,'teacher','DTO unrelated teacher'),room=await resource(app,'room','DTO authorized room'),hiddenRoom=await resource(app,'room','DTO unrelated room');await link(app,ta.id,app.teacherAUser.id);await grant(app,app.teacherBUser.id,'resource',{resourceId:room.id});
 const fields={startDate:'2026-10-30',weekdays:[5],count:1,teacherIds:[ta.id],roomIds:[room.id]},first=await schedule(app,fields),second=await schedule(app,{...fields,course:'private-course'}),hidden=await schedule(app,{...fields,teacherIds:[tc.id],roomIds:[hiddenRoom.id],remark:'Unrelated same-time private notes'});
 const updated=await send(app.admin,`/api/schedules/${first.id}`,'PATCH',{version:first.version,remark:'Updated parent identity metadata'});assert.equal(updated.status,200,updated.text);
 const parents=[updated.body.schedule,second].sort((a,b)=>a.id.localeCompare(b.id));
 for(const client of[app.a,app.b]){
  const read=await client.request(calendar);assert.equal(read.status,200,read.text);assert.equal(read.body.readScope,'occurrences');assert.equal(read.body.schedules,undefined);assert.equal(read.body.occurrences.length,2);
  assert.deepEqual(read.body.occurrences.map(row=>row.item.id),parents.map(row=>row.id),'Different series at the same date/time must sort by the persisted series ID.');
  for(let index=0;index<parents.length;index++){const parent=parents[index],row=read.body.occurrences[index];assert.equal(row.date,'2026-10-30');assert.equal(row.sequence,1);assert.equal(row.item.sequence,1);for(const key of['id','course','version','createdAt','updatedAt']){assert.ok(Object.hasOwn(row.item,key),`Real HTTP occurrence is missing parent ${key}`);assert.equal(row.item[key],parent[key]);}assert.equal(row.item.startDate,row.date);assert.deepEqual(row.item.teacherIds,[ta.id]);assert.deepEqual(row.item.roomIds,[room.id]);for(const key of['segments','exceptions','weekdays','endMode','endDate','count'])assert.equal(Object.hasOwn(row.item,key),false);}
  assert.ok(!read.text.includes(hidden.id));assert.ok(!read.text.includes('Unrelated same-time private notes'));
 }
});

test('an otherwise unlinked and ungranted teacher receives exactly one explicitly granted immutable occurrence with real parent metadata',async t=>{
 const app=await setup(t),tc=await resource(app,'teacher','Grant-only unrelated teacher'),room=await resource(app,'room','Grant-only room'),first=await schedule(app,{course:'private-course',teacherIds:[tc.id],roomIds:[room.id]}),other=await schedule(app,{teacherIds:[tc.id],roomIds:[room.id],remark:'Never authorized other series'});
 assert.deepEqual((await app.a.request(calendar)).body.occurrences,[]);await grant(app,app.teacherAUser.id,'occurrence',{scheduleId:first.id,sequence:2});
 const access=(await app.admin.request('/api/access-control')).body;assert.deepEqual(access.teacherLinks,[]);assert.deepEqual(access.grants.map(row=>row.kind),['occurrence']);
 const read=await app.a.request(calendar);assert.equal(read.status,200,read.text);assert.equal(read.body.occurrences.length,1);const row=read.body.occurrences[0];assert.equal(row.sequence,2);assert.equal(row.date,'2026-10-21');for(const key of['id','course','version','createdAt','updatedAt']){assert.ok(Object.hasOwn(row.item,key),`Grant-only HTTP occurrence is missing parent ${key}`);assert.equal(row.item[key],first[key]);}assert.ok(!read.text.includes(other.id));assert.equal(row.item.startDate,row.date);assert.deepEqual((await app.b.request(calendar)).body.occurrences,[]);
 const catalog=(await app.a.request('/api/catalog')).body;assert.deepEqual(catalog.courses.map(row=>row.id),['private-course']);assert.deepEqual((await app.a.request(calendar+'&since='+read.body.revision)).body,{revision:read.body.revision,readScope:'occurrences',unchanged:true});
});

test('authentication DTOs expose only self teacher resource IDs despite grants and without any recent lessons',async t=>{
 const app=await setup(t),own=await resource(app,'teacher','Self profile without lessons'),other=await resource(app,'teacher','Another linked teacher'),room=await resource(app,'room','Granted room only');
 await link(app,own.id,app.teacherAUser.id);await link(app,other.id,app.teacherBUser.id);
 await grant(app,app.teacherAUser.id,'resource',{resourceId:other.id});await grant(app,app.teacherAUser.id,'resource',{resourceId:room.id});
 const before=(await app.admin.request('/api/access-control')).body;
 const session=await app.a.request('/api/auth/session');assert.equal(session.status,200,session.text);assert.deepEqual(session.body.user.teacherResourceIds,[own.id]);
 assert.deepEqual((await app.a.request(calendar)).body.occurrences,[],'A self identity must not require an upcoming lesson.');
 for(const key of ['teacherLinks','grants','accounts'])assert.equal(Object.hasOwn(session.body.user,key),false);
 assert.ok(!session.text.includes(other.id));assert.ok(!session.text.includes(room.id));
 const login=await send(app.a,'/api/auth/login','POST',{email:users[2].email,password:users[2].password});assert.equal(login.status,200,login.text);assert.deepEqual(login.body.user.teacherResourceIds,[own.id]);
 assert.deepEqual((await app.admin.request('/api/access-control')).body,before,'Self lookup must not create or modify account links or grants.');
 error(await app.a.request('/api/access-control'),403);assert.equal((await app.admin.request('/api/access-control')).status,200);
});

test('grant-only teachers never acquire self identity from visible resources and multiple self links remain stable',async t=>{
 const app=await setup(t),first=await resource(app,'teacher','Own linked first'),second=await resource(app,'teacher','Own linked second'),visible=await resource(app,'teacher','Grant-visible without own link');
 await link(app,first.id,app.teacherAUser.id);await link(app,second.id,app.teacherAUser.id);await grant(app,app.teacherBUser.id,'resource',{resourceId:visible.id});
 const ownIds=[first.id,second.id].sort();assert.deepEqual((await app.a.request('/api/auth/session')).body.user.teacherResourceIds,ownIds);
 assert.deepEqual((await app.b.request('/api/auth/session')).body.user.teacherResourceIds,[]);
 assert.ok((await app.b.request('/api/scheduling-resources')).body.resources.some(row=>row.id===visible.id),'The grant is effective, but it must not become an own profile link.');
 const relogin=await send(app.b,'/api/auth/login','POST',{email:teacherB.email,password:teacherB.password});assert.deepEqual(relogin.body.user.teacherResourceIds,[]);
});

test('self teacher identity follows account switches and link reassignment or removal with the existing teacher revision',async t=>{
 const app=await setup(t),first=await resource(app,'teacher','Account A profile'),second=await resource(app,'teacher','Account B profile');
 await link(app,first.id,app.teacherAUser.id);await link(app,second.id,app.teacherBUser.id);
 const initial=(await app.a.request('/api/auth/session')).body.user;assert.deepEqual(initial.teacherResourceIds,[first.id]);
 const switched=await send(app.a,'/api/auth/login','POST',{email:teacherB.email,password:teacherB.password});assert.equal(switched.status,200,switched.text);assert.equal(switched.body.user.id,app.teacherBUser.id);assert.deepEqual(switched.body.user.teacherResourceIds,[second.id]);
 await link(app,first.id,app.teacherBUser.id,1);
 const changed=(await app.b.request('/api/auth/session')).body.user;assert.deepEqual(changed.teacherResourceIds,[first.id,second.id].sort());assert.notEqual(changed.accessRevision,switched.body.user.accessRevision);
 const teacherA=app.client();await teacherA.login(2);const removed=(await teacherA.request('/api/auth/session')).body.user;assert.deepEqual(removed.teacherResourceIds,[]);assert.notEqual(removed.accessRevision,initial.accessRevision);
 await link(app,second.id,null,1);const unlinked=(await app.b.request('/api/auth/session')).body.user;assert.deepEqual(unlinked.teacherResourceIds,[first.id]);assert.notEqual(unlinked.accessRevision,changed.accessRevision);
});

test('self mapping is role-checked against stored identity and does not disclose other accounts or student links',async t=>{
 const app=await setup(t),manager=app.store.listUsers().find(user=>user.email===users[0].email),studentUser=app.store.listUsers().find(user=>user.email===users[3].email),ownAdmin=await resource(app,'teacher','Teaching manager profile'),ownTeacher=await resource(app,'teacher','Teacher private link');
 await link(app,ownAdmin.id,manager.id);await link(app,ownTeacher.id,app.teacherAUser.id);
 assert.equal(typeof app.store.accessControl.ownTeacherResourceIds,'function');
 assert.deepEqual(app.store.accessControl.ownTeacherResourceIds(manager),[ownAdmin.id]);
 assert.deepEqual(app.store.accessControl.ownTeacherResourceIds(app.teacherAUser),[ownTeacher.id]);
 for(const user of [studentUser,{...studentUser,role:'admin'},null,{}, {id:'missing',role:'admin'}])assert.deepEqual(app.store.accessControl.ownTeacherResourceIds(user),[]);
 const student=app.client();await student.login(3);assert.deepEqual((await student.request('/api/auth/session')).body.user.teacherResourceIds,[]);
 const studentLogin=await send(student,'/api/auth/login','POST',{email:users[3].email,password:users[3].password});assert.equal(studentLogin.status,200,studentLogin.text);assert.deepEqual(studentLogin.body.user.teacherResourceIds,[]);
 assert.ok(!studentLogin.text.includes(ownTeacher.id));assert.ok(!studentLogin.text.includes(ownAdmin.id));
 assert.deepEqual((await app.admin.request('/api/auth/session')).body.user.teacherResourceIds,[ownAdmin.id]);
 error(await student.request('/api/access-control'),403);error(await app.b.request('/api/access-control'),403);assert.equal((await app.admin.request('/api/access-control')).status,200);
});
