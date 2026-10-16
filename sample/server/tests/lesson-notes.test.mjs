import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {request as httpRequest} from 'node:http';
import {createStore} from '../store.mjs';
import {users,seedCourses,fixture,error,origin} from './helpers.mjs';

const rejects=(operation,status)=>assert.throws(operation,error=>error.status===status);
const input=(note,text=' Shared raw <note>\n original ',extra={})=>({version:note.version,sourceVersion:note.sourceVersion,text,...extra});
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'beamal-lesson-notes-')),databasePath=join(directory,'isolated.sqlite'),store=await createStore({databasePath,seedUsers:users,seedCourses});
 t.after(async()=>{await store.close();await rm(directory,{recursive:true,force:true});});
 const admin=store.listUsers().find(user=>user.email===users[0].email),teacher=store.listUsers().find(user=>user.email===users[2].email),student=store.listUsers().find(user=>user.email===users[3].email);
 const assigned=store.schedulingResources.create({kind:'teacher',displayName:'Note responsible teacher'},admin.id),otherTeacher=store.schedulingResources.create({kind:'teacher',displayName:'Other note teacher'},admin.id);
 store.accessControl.setTeacherLink(assigned.id,{version:0,userId:teacher.id},admin.id);
 const rule={course:'public-course',startDate:'2026-10-16',time:'13:00',duration:60,weekdays:[5],endMode:'count',count:3,teacherIds:[assigned.id],roomIds:[],capacity:8,remark:'SCHEDULE REMARK MUST NOT BECOME A NOTE'};
 const schedule=store.schedules.create(rule,admin.id),other=store.schedules.create({...rule,teacherIds:[otherTeacher.id]},admin.id);
 return {directory,databasePath,store,admin,teacher,student,assigned,otherTeacher,rule,schedule,other};
}
function businessRows(database){return Object.fromEntries(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().filter(({name})=>!['lesson_notes','lesson_note_audit_log','idempotent_creates'].includes(name)).map(({name})=>[name,database.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()]));}
function mutation(app,id,sequence,body,key,user=app.admin){app.store.lessonNotes.authorizeWrite(id,sequence,user);return app.store.mutateOnce({userId:user.id,route:`PATCH /api/schedules/${id}/occurrences/${sequence}/note`,key,payloadHash:createHash('sha256').update(JSON.stringify(body)).digest('hex'),status:200},()=>({note:app.store.lessonNotes.save(id,sequence,body,user)}));}

test('authorized missing notes are proven empty at independent version zero without borrowing the schedule remark or creating audit rows',async t=>{
 const app=await setup(t),before=app.store.schedules.list(),note=app.store.lessonNotes.get(app.schedule.id,2,app.admin);
 assert.deepEqual(note,{scheduleId:app.schedule.id,sequence:2,courseId:'public-course',date:'2026-10-23',time:'13:00',sourceVersion:1,version:0,text:'',updatedAt:null,canWrite:true});
 assert.deepEqual(app.store.lessonNotes.get(app.schedule.id,2,app.teacher),note);assert.deepEqual(app.store.lessonNotes.audit(),[]);assert.deepEqual(app.store.schedules.list(),before);
});

test('raw note create and edit target one exact occurrence and do not modify schedules attendance fees rights or any other business records',async t=>{
 const app=await setup(t),inspection=new DatabaseSync(app.databasePath);
 try{
  const before=businessRows(inspection),empty=app.store.lessonNotes.get(app.schedule.id,2,app.admin),saved=app.store.lessonNotes.save(app.schedule.id,2,input(empty),app.admin);
  assert.equal(saved.version,1);assert.equal(saved.text,' Shared raw <note>\n original ');assert.ok(Number.isFinite(Date.parse(saved.updatedAt)));assert.deepEqual(app.store.lessonNotes.get(app.schedule.id,2,app.teacher),saved);
  assert.equal(app.store.lessonNotes.get(app.schedule.id,1,app.admin).text,'');assert.equal(app.store.lessonNotes.get(app.other.id,2,app.admin).version,0);
  const updated=app.store.lessonNotes.save(app.schedule.id,2,input(saved,' Teacher <raw>\n edit '),app.teacher);assert.equal(updated.version,2);assert.equal(updated.sourceVersion,1);assert.equal(updated.text,' Teacher <raw>\n edit ');
  assert.deepEqual(businessRows(inspection),before);assert.equal(app.store.lessonNotes.audit().length,2);assert.deepEqual(app.store.lessonNotes.audit().at(-1).snapshot,updated);
  assert.ok(!JSON.stringify(app.store.schedules.list()).includes('Teacher <raw>'));assert.ok(!JSON.stringify(app.store.catalogSnapshot({publicOnly:true})).includes('Teacher <raw>'));assert.ok(!JSON.stringify(app.store.enrollmentOrders.timetable(app.student,{from:'2026-10-01',to:'2026-11-30'})).includes('Teacher <raw>'));
 }finally{inspection.close();}
});

test('clear keeps a higher note version and audit so stale editors cannot resurrect text while empty new notes are rejected',async t=>{
 const app=await setup(t),empty=app.store.lessonNotes.get(app.schedule.id,1,app.admin);
 for(const text of ['', ' \n\t '])rejects(()=>app.store.lessonNotes.save(app.schedule.id,1,input(empty,text),app.admin),400);
 assert.equal(app.store.lessonNotes.get(app.schedule.id,1,app.admin).version,0);assert.deepEqual(app.store.lessonNotes.audit(),[]);
 const saved=app.store.lessonNotes.save(app.schedule.id,1,input(empty),app.admin),cleared=app.store.lessonNotes.save(app.schedule.id,1,input(saved,''),app.teacher);
 assert.equal(cleared.text,'');assert.equal(cleared.version,2);assert.equal(cleared.sourceVersion,1);assert.deepEqual(app.store.lessonNotes.get(app.schedule.id,1,app.admin),cleared);
 rejects(()=>app.store.lessonNotes.save(app.schedule.id,1,input(empty,'Stale create'),app.admin),409);rejects(()=>app.store.lessonNotes.save(app.schedule.id,1,input(saved,'Stale edit'),app.admin),409);assert.equal(app.store.lessonNotes.audit().length,2);
});

test('current responsible teacher writes but scoped read grants and caller-supplied roles cannot expand note write permissions',async t=>{
 const app=await setup(t),note=app.store.lessonNotes.get(app.schedule.id,1,app.teacher),saved=app.store.lessonNotes.save(app.schedule.id,1,input(note,' Responsible teacher note '),app.teacher);
 rejects(()=>app.store.lessonNotes.get(app.other.id,1,app.teacher),404);rejects(()=>app.store.lessonNotes.get(app.schedule.id,1,app.student),403);rejects(()=>app.store.lessonNotes.get(app.schedule.id,1,{id:'unknown-user',role:'admin'}),403);
 app.store.accessControl.setTeacherLink(app.assigned.id,{version:1,userId:null},app.admin.id);app.store.accessControl.createGrant({userId:app.teacher.id,kind:'course',courseId:'public-course'},app.admin.id);
 const readable=app.store.lessonNotes.get(app.schedule.id,1,app.teacher);assert.equal(readable.canWrite,false);assert.equal(readable.text,saved.text);
 const audit=app.store.lessonNotes.audit();for(const user of [app.teacher,{...app.teacher,role:'admin'}]){rejects(()=>app.store.lessonNotes.authorizeWrite(app.schedule.id,1,user),403);rejects(()=>app.store.lessonNotes.save(app.schedule.id,1,input(readable,'Forbidden'),user),403);}
 assert.deepEqual(app.store.lessonNotes.audit(),audit);assert.equal(app.store.lessonNotes.get(app.schedule.id,1,app.admin).text,saved.text);
});

test('effective single-occurrence reassignment changes only its teacher write authority while source version conflicts keep the same moved note identity',async t=>{
 const app=await setup(t),empty=app.store.lessonNotes.get(app.schedule.id,1,app.admin),saved=app.store.lessonNotes.save(app.schedule.id,1,input(empty),app.admin);
 app.store.accessControl.createGrant({userId:app.teacher.id,kind:'course',courseId:'public-course'},app.admin.id);
 app.store.schedules.editOccurrence(app.schedule.id,1,{...app.rule,version:1,scope:'single',startDate:'2026-11-01',weekdays:[0],teacherIds:[app.otherTeacher.id]},app.admin.id);
 const moved=app.store.lessonNotes.get(app.schedule.id,1,app.admin);assert.equal(moved.date,'2026-11-01');assert.equal(moved.version,1);assert.equal(moved.sourceVersion,2);assert.equal(moved.text,saved.text);
 rejects(()=>app.store.lessonNotes.save(app.schedule.id,1,input(saved,'Old source'),app.admin),409);assert.equal(app.store.lessonNotes.get(app.schedule.id,1,app.teacher).canWrite,false);rejects(()=>app.store.lessonNotes.authorizeWrite(app.schedule.id,1,app.teacher),403);assert.equal(app.store.lessonNotes.get(app.schedule.id,2,app.teacher).canWrite,true);
 const updated=app.store.lessonNotes.save(app.schedule.id,1,input(moved,' Current moved note '),app.admin);assert.equal(updated.version,2);assert.equal(updated.sourceVersion,2);assert.equal(updated.sequence,1);
});

test('cancel delete and deleted-course contexts hide notes and reject cached-write authorization without erasing the record for restoration',async t=>{
 const app=await setup(t),empty=app.store.lessonNotes.get(app.schedule.id,1,app.admin),saved=app.store.lessonNotes.save(app.schedule.id,1,input(empty,' Persist across cancellation '),app.admin);
 app.store.schedules.deleteOccurrence(app.schedule.id,1,{version:1,scope:'single'},app.admin.id);
 for(const operation of [()=>app.store.lessonNotes.get(app.schedule.id,1,app.admin),()=>app.store.lessonNotes.authorizeWrite(app.schedule.id,1,app.admin),()=>app.store.lessonNotes.save(app.schedule.id,1,input(saved,'Cancelled write'),app.admin)])rejects(operation,404);
 app.store.schedules.restoreOccurrence(app.schedule.id,1,{version:2,scope:'single'},app.admin.id);const restored=app.store.lessonNotes.get(app.schedule.id,1,app.admin);assert.equal(restored.text,saved.text);assert.equal(restored.version,1);assert.equal(restored.sourceVersion,3);
 app.store.schedules.delete(app.schedule.id,{version:3},app.admin.id);rejects(()=>app.store.lessonNotes.get(app.schedule.id,1,app.admin),404);app.store.schedules.restore(app.schedule.id,{version:4},app.admin.id);
 const inspection=new DatabaseSync(app.databasePath);try{inspection.prepare('UPDATE courses SET deleted_at=? WHERE id=?').run(new Date().toISOString(),'public-course');rejects(()=>app.store.lessonNotes.get(app.schedule.id,1,app.admin),404);rejects(()=>app.store.lessonNotes.authorizeWrite(app.schedule.id,1,app.admin),404);inspection.prepare('UPDATE courses SET deleted_at=NULL WHERE id=?').run('public-course');}finally{inspection.close();}
 assert.equal(app.store.lessonNotes.get(app.schedule.id,1,app.admin).text,saved.text);assert.equal(app.store.lessonNotes.audit().length,1);
});

test('strict note identity input versions text and extra-field validation never creates partial records',async t=>{
 const app=await setup(t),note=app.store.lessonNotes.get(app.schedule.id,1,app.admin);
 for(const sequence of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'1',null])rejects(()=>app.store.lessonNotes.get(app.schedule.id,sequence,app.admin),400);
 rejects(()=>app.store.lessonNotes.get('missing',1,app.admin),404);rejects(()=>app.store.lessonNotes.get(app.schedule.id,4,app.admin),404);
 for(const body of [null,[],input(note,null),input(note,42),input(note,'x'.repeat(2001)),{version:0,sourceVersion:1},input(note,'valid',{scope:'following'}),input(note,'valid',{date:'2026-10-16'}),input(note,'valid',{teacherId:app.assigned.id})])rejects(()=>app.store.lessonNotes.save(app.schedule.id,1,body,app.admin),400);
 for(const body of [{sourceVersion:1,text:'text'},input(note,'text',{version:-1}),input(note,'text',{version:1.5}),{version:0,text:'text'},input(note,'text',{sourceVersion:0})])rejects(()=>app.store.lessonNotes.save(app.schedule.id,1,body,app.admin),409);
 assert.equal(app.store.lessonNotes.get(app.schedule.id,1,app.admin).version,0);assert.deepEqual(app.store.lessonNotes.audit(),[]);
 const maximum=app.store.lessonNotes.save(app.schedule.id,1,input(note,'x'.repeat(2000)),app.admin);assert.equal(maximum.text.length,2000);
});

test('idempotent note receipts save one version audit and reject changed payload while current authorization remains required before replay',async t=>{
 const app=await setup(t),note=app.store.lessonNotes.get(app.schedule.id,1,app.teacher),body=input(note,'PRIVATE NOTE RETRY'),first=mutation(app,app.schedule.id,1,body,'note-lost-ack',app.teacher),retry=mutation(app,app.schedule.id,1,body,'note-lost-ack',app.teacher);
 assert.deepEqual(retry,first);assert.equal(first.body.note.version,1);assert.equal(app.store.lessonNotes.audit().length,1);rejects(()=>mutation(app,app.schedule.id,1,{...body,text:'Changed payload'},'note-lost-ack',app.teacher),409);
 app.store.accessControl.setTeacherLink(app.assigned.id,{version:1,userId:null},app.admin.id);app.store.accessControl.createGrant({userId:app.teacher.id,kind:'course',courseId:'public-course'},app.admin.id);rejects(()=>mutation(app,app.schedule.id,1,body,'note-lost-ack',app.teacher),403);assert.equal(app.store.lessonNotes.audit().length,1);
});

test('note audit failure rolls back text version and idempotency receipt so the same request can be retried once',async t=>{
 const app=await setup(t),note=app.store.lessonNotes.get(app.schedule.id,1,app.admin),inspection=new DatabaseSync(app.databasePath),body=input(note,'Atomic note');
 try{
  const before=businessRows(inspection);inspection.exec("CREATE TRIGGER isolated_lesson_note_failure BEFORE INSERT ON lesson_note_audit_log BEGIN SELECT RAISE(ABORT,'Isolated note audit failure'); END;");
  assert.throws(()=>mutation(app,app.schedule.id,1,body,'note-atomic'));assert.deepEqual(app.store.lessonNotes.get(app.schedule.id,1,app.admin),note);assert.deepEqual(app.store.lessonNotes.audit(),[]);assert.deepEqual(businessRows(inspection),before);
  inspection.exec('DROP TRIGGER isolated_lesson_note_failure');const saved=mutation(app,app.schedule.id,1,body,'note-atomic');assert.equal(saved.body.note.version,1);assert.equal(app.store.lessonNotes.audit().length,1);
 }finally{inspection.close();}
});

test('additive note tables preserve existing database rows and saved updates and clear survive reopen without reseeding',async t=>{
 const app=await setup(t),note=app.store.lessonNotes.get(app.schedule.id,1,app.admin),saved=app.store.lessonNotes.save(app.schedule.id,1,input(note),app.admin),beforeSchedule=app.store.schedules.get(app.schedule.id);await app.store.close();
 const inspection=new DatabaseSync(app.databasePath);let before;
 try{before=businessRows(inspection);}finally{inspection.close();}
 const next=await createStore({databasePath:app.databasePath,seedUsers:users,seedCourses});t.after(()=>next.close());assert.deepEqual(next.lessonNotes.get(app.schedule.id,1,app.admin),saved);assert.deepEqual(next.schedules.get(app.schedule.id),beforeSchedule);
 const check=new DatabaseSync(app.databasePath);try{assert.deepEqual(businessRows(check),before);}finally{check.close();}
 const cleared=next.lessonNotes.save(app.schedule.id,1,input(saved,''),app.admin);await next.close();const final=await createStore({databasePath:app.databasePath,seedUsers:users,seedCourses});t.after(()=>final.close());assert.deepEqual(final.lessonNotes.get(app.schedule.id,1,app.admin),cleared);assert.equal(cleared.version,2);assert.equal(cleared.text,'');assert.equal(final.lessonNotes.audit().length,2);
});

test('upgrading a database without note tables adds no note records and preserves every existing business row',async t=>{
 const app=await setup(t);await app.store.close();const inspection=new DatabaseSync(app.databasePath);let before;
 try{inspection.exec('DROP TABLE lesson_note_audit_log;DROP TABLE lesson_notes;');before=businessRows(inspection);}finally{inspection.close();}
 const upgraded=await createStore({databasePath:app.databasePath,seedUsers:users,seedCourses});
 try{
  assert.equal(upgraded.lessonNotes.get(app.schedule.id,1,app.admin).version,0);assert.deepEqual(upgraded.lessonNotes.audit(),[]);
  const check=new DatabaseSync(app.databasePath);try{assert.deepEqual(businessRows(check),before);assert.equal(check.prepare('SELECT COUNT(*) AS count FROM lesson_notes').get().count,0);}finally{check.close();}
 }finally{await upgraded.close();}
});

async function httpSetup(t){
 const app=await fixture(t),admin=app.client(),teacher=app.client(),student=app.client(),adminLogin=await admin.login(),teacherLogin=await teacher.login(2);await student.login(3);
 const resource=app.store.schedulingResources.create({kind:'teacher',displayName:'HTTP note teacher'},adminLogin.body.user.id);app.store.accessControl.setTeacherLink(resource.id,{version:0,userId:teacherLogin.body.user.id},adminLogin.body.user.id);
 const rule={course:'public-course',startDate:'2026-10-16',time:'13:00',duration:60,weekdays:[5],endMode:'count',count:3,teacherIds:[resource.id],roomIds:[],capacity:8},schedule=app.store.schedules.create(rule,adminLogin.body.user.id);
 return {...app,admin,teacher,student,actor:adminLogin.body.user,teacherActor:teacherLogin.body.user,resource,rule,schedule};
}
const notePath=(app,sequence=1)=>`/api/schedules/${app.schedule.id}/occurrences/${sequence}/note`;
const httpSave=(app,client,body,key,options={})=>client.request(notePath(app),{method:'PATCH',body,headers:key?{'Idempotency-Key':key}:{},...options});

test('actual lesson-note REST reads creates clears and replays one audit while rejecting stale versions role CSRF method and query violations',async t=>{
 const app=await httpSetup(t),initial=await app.teacher.request(notePath(app));assert.equal(initial.status,200,initial.text);assert.equal(initial.body.note.version,0);assert.equal(initial.body.note.text,'');assert.equal(initial.body.note.canWrite,true);
 const body=input(initial.body.note,' HTTP raw <note>\n preserved '),saved=await httpSave(app,app.teacher,body,'note-http-lost-ack');assert.equal(saved.status,200,saved.text);assert.equal(saved.body.note.version,1);assert.equal(saved.body.note.text,body.text);assert.deepEqual((await app.admin.request(notePath(app))).body,saved.body);
 const replay=await httpSave(app,app.teacher,body,'note-http-lost-ack');assert.equal(replay.status,200,replay.text);assert.deepEqual(replay.body,saved.body);assert.equal(app.store.lessonNotes.audit().length,1);
 error(await httpSave(app,app.teacher,{...body,text:'Same key different payload'},'note-http-lost-ack'),409);error(await httpSave(app,app.teacher,body),409);
 error(await httpSave(app,app.student,input(saved.body.note)),403);error(await httpSave(app,app.client(),input(saved.body.note)),401);error(await httpSave(app,app.admin,input(saved.body.note),null,{csrf:false}),403);error(await httpSave(app,app.admin,input(saved.body.note),null,{requestOrigin:'https://hostile.example.test'}),403);
 error(await app.admin.request(notePath(app)+'?from=2026-10-16'),400);error(await app.admin.request(notePath(app),{method:'POST',body:input(saved.body.note)}),405);error(await app.admin.request(notePath(app).replace('/1/note','/01/note')),400);
 const cleared=await httpSave(app,app.admin,input(saved.body.note,''));assert.equal(cleared.status,200,cleared.text);assert.equal(cleared.body.note.text,'');assert.equal(cleared.body.note.version,2);assert.equal(app.store.lessonNotes.audit().length,2);
});

test('actual internal note REST never publishes text to anonymous Student or public availability DTOs or changes their public facts',async t=>{
 const app=await httpSetup(t),anonymous=app.client();
 const slot=await app.admin.request('/api/available-slots',{method:'POST',body:{courseId:'public-course',date:'2026-10-16',time:'13:00',duration:60,teacherIds:[app.resource.id],roomIds:[],totalCapacity:8,trialCapacity:1,reschedulingCapacity:2,trialEnabled:true,reschedulingEnabled:true,active:true,publicVisibility:'default'}});assert.equal(slot.status,201,slot.text);
 const paths=['/api/public/courses','/api/public/courses/public-course?from=2026-10-16','/api/public/timetable?from=2026-10-16&days=7'],before=await Promise.all(paths.map(path=>anonymous.request(path)));for(const result of before)assert.equal(result.status,200,result.text);
 const initial=await app.admin.request(notePath(app)),saved=await httpSave(app,app.admin,input(initial.body.note,'PRIVATE LESSON NOTE MUST STAY INTERNAL'));assert.equal(saved.status,200,saved.text);
 error(await anonymous.request(notePath(app)),401);error(await app.student.request(notePath(app)),403);
 for(let index=0;index<paths.length;index++){const result=await anonymous.request(paths[index]);assert.equal(result.status,200,result.text);assert.deepEqual(result.body,before[index].body);assert.ok(!result.text.includes('PRIVATE LESSON NOTE'));}
 for(const path of ['/api/courses','/api/catalog','/api/student/timetable?from=2026-10-01&to=2026-11-30']){const result=await app.student.request(path);assert.equal(result.status,200,result.text);assert.ok(!result.text.includes('PRIVATE LESSON NOTE'));}
});

test('actual PATCH checks current responsibility after a paused request body before replaying its old private receipt',async t=>{
 const app=await httpSetup(t),initial=await app.teacher.request(notePath(app)),body=input(initial.body.note,'PRIVATE PAUSED NOTE RESPONSE'),saved=await httpSave(app,app.teacher,body,'note-paused-ack');assert.equal(saved.status,200,saved.text);
 app.store.accessControl.createGrant({userId:app.teacherActor.id,kind:'course',courseId:'public-course'},app.actor.id);
 const payload=JSON.stringify(body),url=new URL(notePath(app),app.base);let observed;
 const seen=new Promise(resolve=>{observed=req=>{if(req.url===url.pathname)resolve();};app.server.on('request',observed);});
 let request;const pending=new Promise((resolve,reject)=>{request=httpRequest(url,{method:'PATCH',headers:{Origin:origin,Cookie:[...app.teacher.cookies].map(([name,value])=>name+'='+value).join('; '),'X-CSRF-Token':app.teacher.csrfToken,'Idempotency-Key':'note-paused-ack','Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},response=>{let text='';response.setEncoding('utf8');response.on('data',chunk=>text+=chunk);response.on('end',()=>resolve({status:response.statusCode,text}));});request.on('error',reject);request.write(payload.slice(0,12));});
 await seen;app.server.off('request',observed);app.store.accessControl.setTeacherLink(app.resource.id,{version:1,userId:null},app.actor.id);request.end(payload.slice(12));
 const blocked=await pending;assert.equal(blocked.status,403,blocked.text);assert.ok(!blocked.text.includes('PRIVATE PAUSED NOTE RESPONSE'));assert.equal(app.store.lessonNotes.audit().length,1);
 const readonly=await app.teacher.request(notePath(app));assert.equal(readonly.status,200,readonly.text);assert.equal(readonly.body.note.canWrite,false);assert.equal(readonly.body.note.text,body.text);
 app.store.schedules.deleteOccurrence(app.schedule.id,1,{version:1,scope:'single'},app.actor.id);error(await httpSave(app,app.admin,input(saved.body.note),'note-after-cancel'),404);
});
