import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fixture,error,course,users,origin,grantTeacherAccess} from './helpers.mjs';

const send=(client,path,method,body,key)=>client.request(path,{method,body,...(key?{headers:{'Idempotency-Key':key}}:{})});
async function manager(t,options={}){const app=await fixture(t,options),admin=app.client();await admin.login();return {...app,admin};}
async function catalog(client,since=''){const result=await client.request('/api/catalog'+(since?'?since='+since:''));assert.equal(result.status,200,result.text);return result.body;}
async function getCourse(client,id='public-course'){const result=await client.request('/api/courses');assert.equal(result.status,200,result.text);return result.body.courses.find(item=>item.id===id);}
const fee=(courseIds,extra={})=>({feeName:'Fictional shared fee',category:'Tuition',pricingModel:'package',price:500,packageType:'visits',packageTotal:4,onlineStore:true,bookingExpiry:null,courseIds,...extra});
const lesson=()=>({course:'public-course',startDate:'2026-10-14',time:'10:00',duration:45,weekdays:[3],endMode:'count',count:4,mustAttendAll:true,color:'#27777b',teacher:'',room:'',capacity:8,session:1,remark:'',detail:'',moreInfo:''});
const material=extra=>({name:'Fictional retained material',description:'Preparation',videoLinks:[],visibleToStudents:true,studentDownload:false,...extra});

test('a recoverably deleted course is shared with another manager and survives restart with its IDs fees and material intact',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-course-lifecycle-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const databasePath=join(directory,'fictional.sqlite'),seedMaterialAccess=[{courseId:'public-course',email:users[3].email}],app=await manager(t,{databasePath,seedMaterialAccess});
 const original=await getCourse(app.admin),before=await catalog(app.admin);
 const note=await send(app.admin,'/api/courses/public-course/materials','POST',material());assert.equal(note.status,201,note.text);
 const deleted=await send(app.admin,'/api/courses/public-course','DELETE',{version:original.version},'course-delete-restart');
 assert.equal(deleted.status,200,deleted.text);const tombstone=deleted.body.course;
 assert.equal(tombstone.id,original.id);assert.equal(tombstone.courseCode,original.courseCode);assert.equal(tombstone.version,original.version+1);
 assert.equal(tombstone.createdAt,original.createdAt);assert.ok(Number.isFinite(Date.parse(tombstone.deletedAt)));assert.deepEqual(tombstone.fees,original.fees);
 const other=app.client();await other.login(1);assert.deepEqual(await getCourse(other),tombstone);
 const after=await catalog(other,before.revision);assert.notEqual(after.revision,before.revision);assert.equal(after.courses.find(item=>item.id===original.id).deletedAt,tombstone.deletedAt);assert.deepEqual(after.fees,before.fees);
 assert.deepEqual(await catalog(other,after.revision),{revision:after.revision,unchanged:true});
 await app.close();const reopened=await manager(t,{databasePath,seedMaterialAccess});assert.deepEqual(await catalog(reopened.admin),after);
 assert.deepEqual((await send(reopened.admin,'/api/courses/public-course','DELETE',{version:original.version},'course-delete-restart')).body,deleted.body);
 assert.deepEqual((await reopened.admin.request(`/api/materials/${note.body.material.id}`)).body.material,note.body.material);
 const restored=await send(reopened.admin,'/api/courses/public-course/restore','POST',{version:tombstone.version},'course-restore-restart');
 assert.equal(restored.status,200,restored.text);const active=restored.body.course;
 assert.equal(active.id,original.id);assert.equal(active.courseCode,original.courseCode);assert.equal(active.deletedAt,undefined);assert.equal(active.version,tombstone.version+1);
 assert.deepEqual(active.fees,original.fees);assert.deepEqual(active.feeIds,original.feeIds);assert.deepEqual((await catalog(reopened.admin)).fees,before.fees);
 assert.deepEqual(reopened.store.audit().filter(row=>row.course_id===original.id).map(row=>row.action),['course.create','course.delete','course.restore']);
});

test('course delete and restore enforce real roles origin CSRF versions and strict bodies without partial changes',async t=>{
 const app=await manager(t),before=await catalog(app.admin),target=await getCourse(app.admin),teacher=app.client(),student=app.client();await teacher.login(2);await student.login(3);
 for(const [method,path]of[['DELETE','/api/courses/public-course'],['POST','/api/courses/public-course/restore']]){
  error(await send(app.client(),path,method,{version:1}),401);
  for(const client of[teacher,student])error(await send(client,path,method,{version:1}),403);
  error(await app.admin.request(path,{method,body:{version:1},csrf:false}),403);
  error(await app.admin.request(path,{method,body:{version:1},requestOrigin:'https://hostile.example.test'}),403);
  error(await send(app.admin,path,method,{}),409);
  error(await send(app.admin,path,method,{version:1,courseName:'Injected rename'}),400);
 }
 error(await send(app.admin,'/api/courses/public-course','DELETE',{version:target.version+1}),409);
 error(await send(app.admin,'/api/courses/missing-course','DELETE',{version:1}),404);
 error(await send(app.admin,'/api/courses/public-course/restore','POST',{version:target.version}),409);
 assert.deepEqual(await catalog(app.admin),before);
 const deleted=await send(app.admin,'/api/courses/public-course','DELETE',{version:target.version});assert.equal(deleted.status,200,deleted.text);
 const snapshot=await catalog(app.admin);error(await send(app.admin,'/api/courses/public-course/restore','POST',{version:target.version}),409);assert.deepEqual(await catalog(app.admin),snapshot);
});

test('course lifecycle receipts replay exactly while stale or concurrent mutations cannot overwrite another version',async t=>{
 const app=await manager(t),current=await getCourse(app.admin),input={version:current.version};
 const replies=await Promise.all(Array.from({length:5},()=>send(app.admin,'/api/courses/public-course','DELETE',input,'same-delete')));
 for(const reply of replies){assert.equal(reply.status,200,reply.text);assert.deepEqual(reply.body,replies[0].body);}
 const deleted=replies[0].body.course;assert.equal(app.store.audit().filter(row=>row.action==='course.delete').length,1);
 error(await send(app.admin,'/api/courses/public-course','DELETE',{version:deleted.version},'same-delete'),409);
 const restored=await send(app.admin,'/api/courses/public-course/restore','POST',{version:deleted.version},'same-restore');assert.equal(restored.status,200,restored.text);
 assert.deepEqual((await send(app.admin,'/api/courses/public-course/restore','POST',{version:deleted.version},'same-restore')).body,restored.body);
 const active=restored.body.course,path='/api/courses/public-course';
 const race=await Promise.all([send(app.admin,path,'DELETE',{version:active.version},'race-delete'),send(app.admin,path,'PATCH',{version:active.version,level:'Intermediate'})]);
 assert.deepEqual(race.map(reply=>reply.status).sort(),[200,409]);
 const last=await getCourse(app.admin);assert.equal(last.version,active.version+1);
});

test('active schedules protect a course while deleted schedules do not and cannot be restored into a deleted course',async t=>{
 const app=await manager(t),created=await send(app.admin,'/api/schedules','POST',lesson());assert.equal(created.status,201,created.text);
 const current=await getCourse(app.admin),before=await catalog(app.admin);
 const rejected=await send(app.admin,'/api/courses/public-course','DELETE',{version:current.version},'schedule-guard');error(rejected,409);assert.equal(rejected.body.error.code,'COURSE_HAS_SCHEDULES');assert.deepEqual(await catalog(app.admin),before);
 const schedule=created.body.schedule,removed=await send(app.admin,`/api/schedules/${schedule.id}`,'DELETE',{version:schedule.version});assert.equal(removed.status,200,removed.text);
 const deleted=await send(app.admin,'/api/courses/public-course','DELETE',{version:current.version},'schedule-guard');assert.equal(deleted.status,200,deleted.text);
 const restorePath=`/api/schedules/${schedule.id}/restore`,restoreInput={version:removed.body.schedule.version};
 const blocked=await send(app.admin,restorePath,'POST',restoreInput,'blocked-schedule-restore');error(blocked,409);assert.equal(blocked.body.error.code,'COURSE_DELETED');
 assert.deepEqual((await app.admin.request('/api/schedules')).body.schedules,[]);
 const restored=await send(app.admin,'/api/courses/public-course/restore','POST',{version:deleted.body.course.version});assert.equal(restored.status,200,restored.text);
 const returned=await send(app.admin,restorePath,'POST',restoreInput,'blocked-schedule-restore');assert.equal(returned.status,200,returned.text);assert.equal(returned.body.schedule.id,schedule.id);
});

test('students cannot discover deleted courses or fee links and lose direct access to retained course materials',async t=>{
 const app=await manager(t,{seedMaterialAccess:[{courseId:'public-course',email:users[3].email}]}),student=app.client(),teacher=app.client();await student.login(3);await teacher.login(2);
 const common=await send(app.admin,'/api/fees','POST',fee(['public-course','private-course']));assert.equal(common.status,201,common.text);
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAABAAAAAQBPJcTWAAAAF0lEQVR4nGP8x0AaYCFR/aiGUQ1DSAMAaw8BPJLkRBUAAAAASUVORK5CYII=','base64');
 const upload=await fetch(app.base+'/api/courses/public-course/material-uploads',{method:'POST',headers:{Origin:origin,Cookie:[...app.admin.cookies].map(([key,value])=>key+'='+value).join('; '),'X-CSRF-Token':app.admin.csrfToken,'Content-Type':'image/png','X-File-Name':encodeURIComponent('Fictional retained picture.png')},body:bytes});
 assert.equal(upload.status,201,await upload.clone().text());const descriptor=(await upload.json()).upload;
 const note=await send(app.admin,'/api/courses/public-course/materials','POST',material({attachments:[descriptor.id],studentDownload:true}));assert.equal(note.status,201,note.text);
 const attachmentPath=`/api/materials/${note.body.material.id}/attachments/${descriptor.id}`;
 const readAttachment=async(client,suffix='')=>{const reply=await fetch(app.base+attachmentPath+suffix,{headers:{Cookie:[...client.cookies].map(([key,value])=>key+'='+value).join('; ')}});return{status:reply.status,bytes:Buffer.from(await reply.arrayBuffer())};};
 assert.deepEqual((await readAttachment(student)).bytes,bytes);
 const before=await catalog(student);assert.ok(before.courses.some(item=>item.id==='public-course'));assert.equal((await student.request(`/api/materials/${note.body.material.id}`)).status,200);
 const current=await getCourse(app.admin),deleted=await send(app.admin,'/api/courses/public-course','DELETE',{version:current.version});assert.equal(deleted.status,200,deleted.text);
 const enrolled=app.store.publicUser(app.store.userByEmail(users[3].email)),ungranted=app.store.publicUser(app.store.userByEmail(users[4].email));
 assert.doesNotThrow(()=>app.materials.grantCourseAccess('public-course',enrolled.id),'Reasserting a preserved bootstrap grant must not prevent restarting the service.');
 assert.throws(()=>app.materials.grantCourseAccess('public-course',ungranted.id),failure=>failure.status===409&&failure.code==='COURSE_DELETED');
 const after=await catalog(student,before.revision);assert.notEqual(after.revision,before.revision);assert.ok(after.courses.every(item=>item.id!=='public-course'));
 assert.ok(after.fees.every(item=>!item.courseIds.includes('public-course')));assert.ok(!JSON.stringify(after).includes('Published art'));
 const mixed=after.fees.find(item=>item.id===common.body.fee.id);assert.deepEqual(mixed.courseIds,['private-course']);
 assert.ok(!after.fees.some(item=>item.id===current.feeIds[0]));assert.deepEqual((await student.request('/api/fees')).body.fees,after.fees);
 assert.ok((await student.request('/api/courses')).body.courses.every(item=>item.id!=='public-course'));
 error(await student.request('/api/courses/public-course/materials'),404);error(await student.request(`/api/materials/${note.body.material.id}`),404);
 assert.equal((await readAttachment(student)).status,404);assert.equal((await readAttachment(student,'?download=1')).status,404);
 await grantTeacherAccess(app,app.admin,{courses:['public-course']});
 assert.equal((await teacher.request(`/api/materials/${note.body.material.id}`)).status,200);
 assert.deepEqual((await readAttachment(teacher)).bytes,bytes,'Recoverable course deletion must preserve the private file bytes.');
 const restored=await send(app.admin,'/api/courses/public-course/restore','POST',{version:deleted.body.course.version});assert.equal(restored.status,200,restored.text);
 assert.equal((await student.request(`/api/materials/${note.body.material.id}`)).status,200);
 assert.deepEqual((await readAttachment(student)).bytes,bytes);assert.deepEqual((await readAttachment(student,'?download=1')).bytes,bytes);
});

test('deleted course names remain reserved and new associations are refused while existing fee links remain editable',async t=>{
 const app=await manager(t),current=await getCourse(app.admin),privateCourse=await getCourse(app.admin,'private-course');
 const deleted=await send(app.admin,'/api/courses/public-course','DELETE',{version:current.version});assert.equal(deleted.status,200,deleted.text);
 const tombstone=deleted.body.course;
 const duplicate=await send(app.admin,'/api/courses','POST',course({courseName:'  PUBLISHED ART  '}));error(duplicate,409);assert.equal(duplicate.body.error.code,'COURSE_NAME_DELETED');
 const edited=await send(app.admin,'/api/courses/public-course','PATCH',{version:tombstone.version,courseName:'Changed deleted course'});error(edited,409);assert.equal(edited.body.error.code,'COURSE_DELETED');
 const invalid=[['/api/schedules',lesson()],['/api/courses/public-course/materials',material()],['/api/fees',fee(['public-course'])]];
 for(const[path,input]of invalid){const reply=await send(app.admin,path,'POST',input);error(reply,409);assert.equal(reply.body.error.code,'COURSE_DELETED');}
 const old=current.fees[0],preserved=await send(app.admin,`/api/fees/${old.id}`,'PATCH',{version:old.version,feeName:'Retained fee rename'});assert.equal(preserved.status,200,preserved.text);assert.deepEqual(preserved.body.fee.courseIds,['public-course']);assert.equal(preserved.body.fee.price,old.price);
 const other=privateCourse.fees[0],newLink=await send(app.admin,`/api/fees/${other.id}`,'PATCH',{version:other.version,courseIds:['private-course','public-course']});error(newLink,409);assert.equal(newLink.body.error.code,'COURSE_DELETED');
 assert.equal((await app.admin.request('/api/schedules')).body.schedules.length,0);assert.equal((await app.admin.request('/api/courses/public-course/materials')).body.materials.length,0);
 assert.deepEqual((await getCourse(app.admin)).fees.map(item=>item.id),current.feeIds);
});

test('a real course audit failure rolls back deletion and its receipt so the unchanged request can be retried',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-course-atomic-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const databasePath=join(directory,'fictional.sqlite'),app=await manager(t,{databasePath}),before=await catalog(app.admin),current=await getCourse(app.admin),inspection=new DatabaseSync(databasePath);
 try{
  inspection.exec("CREATE TRIGGER fictional_course_delete_failure BEFORE INSERT ON audit_log WHEN NEW.action='course.delete' BEGIN SELECT RAISE(ABORT,'Fictional course audit failure'); END;");
  error(await send(app.admin,'/api/courses/public-course','DELETE',{version:current.version},'atomic-course-delete'),500);
  assert.deepEqual(await catalog(app.admin),before);assert.equal(inspection.prepare("SELECT COUNT(*) AS count FROM idempotent_creates WHERE request_key='atomic-course-delete'").get().count,0);
  inspection.exec('DROP TRIGGER fictional_course_delete_failure');
  const retried=await send(app.admin,'/api/courses/public-course','DELETE',{version:current.version},'atomic-course-delete');assert.equal(retried.status,200,retried.text);assert.equal(retried.body.course.version,current.version+1);
 }finally{inspection.close();}
});
