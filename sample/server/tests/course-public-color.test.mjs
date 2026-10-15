import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fixture,error,course,grantTeacherAccess} from './helpers.mjs';
import {validateCourse,validateCourseMetadata} from '../validation.mjs';

const send=(client,path,method,body,options={})=>client.request(path,{method,body,...options});
const patch=(client,id,version,fields,options={})=>send(client,'/api/courses/'+id,'PATCH',{version,...fields},options);
async function setup(t,options={}){const app=await fixture(t,options),admin=app.client();await admin.login();return {...app,admin};}
async function disk(t){const directory=await mkdtemp(join(tmpdir(),'beamal-course-colour-'));t.after(()=>rm(directory,{recursive:true,force:true}));return join(directory,'fictional.sqlite');}
async function publishedSlot(app,{courseId='public-course',linked=false}={}){
 const teacher=await send(app.admin,'/api/scheduling-resources','POST',{kind:'teacher',displayName:'Shared colour-independent teacher',representativeColor:'#123456'});assert.equal(teacher.status,201,teacher.text);
 let schedule=null;const fields={course:courseId,startDate:'2026-10-15',time:'12:30',duration:30,weekdays:[4],endMode:'count',count:2,teacherIds:[teacher.body.resource.id],roomIds:[],capacity:8,session:1,classTypeId:'00000000-0000-4000-8000-000000000001',classTypeVersion:1};
 if(linked){const reply=await send(app.admin,'/api/schedules','POST',fields);assert.equal(reply.status,201,reply.text);schedule=reply.body.schedule;}
 const result=await send(app.admin,'/api/available-slots','POST',{...(linked?{scheduleId:schedule.id,sequence:1}:{courseId,date:'2026-10-15',time:'12:30',duration:30,teacherIds:[teacher.body.resource.id],roomIds:[]}),totalCapacity:8,trialCapacity:1,reschedulingCapacity:2,trialEnabled:true,reschedulingEnabled:true,active:true,publicVisibility:'default',remark:'PRIVATE administrative colour-independent note'});assert.equal(result.status,201,result.text);
 return {slot:result.body.slot,schedule,teacher:teacher.body.resource};
}
async function publicFacts(client,id='public-course'){const directory=await client.request('/api/public/courses'),detail=await client.request('/api/public/courses/'+id+'?from=2026-10-15');assert.equal(directory.status,200,directory.text);assert.equal(detail.status,200,detail.text);return {directory:directory.body,detail:detail.body};}
function businessRows(database){return Object.fromEntries(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().filter(row=>!['courses','audit_log','sessions','idempotent_creates'].includes(row.name)).map(({name})=>[name,database.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()]));}

test('course public colour validation defaults to null and accepts only explicit six-digit hexadecimal values',()=>{
 assert.equal(validateCourse(course()).publicColor,null);assert.equal(validateCourseMetadata({courseName:'No colour'}).publicColor,null);
 assert.equal(validateCourse(course({publicColor:'#Ab12EF'})).publicColor,'#ab12ef');assert.equal(validateCourseMetadata({courseName:'Clear',publicColor:null}).publicColor,null);
 const current={courseName:'Kept',category:'Art',level:'Beginner',publicColor:'#aabbcc'};assert.equal(validateCourseMetadata({level:'Advanced'},current).publicColor,'#aabbcc');assert.equal(validateCourse({price:301},course({publicColor:'#aabbcc'})).publicColor,'#aabbcc');
 for(const value of ['', '#abc','#12345678','123456',' #123456','#123456 ','#123456\n','#123456\r','red','rgb(1,2,3)','url(https://example.test)','#000000;display:none',0,false,[],{},'#gggggg'])for(const validate of [input=>validateCourse(course(input)),input=>validateCourseMetadata({courseName:'Invalid',...input})])assert.throws(()=>validate({publicColor:value}),failure=>failure.status===400&&failure.code==='INVALID_COURSE');
});

test('course public colour writes enforce existing identity origin version and deleted-course guards without touching other courses',async t=>{
 const app=await setup(t),anonymous=app.client(),teacher=app.client(),student=app.client();await teacher.login(2);await student.login(3);const original=app.store.getCourse('public-course'),other=app.store.getCourse('private-course');
 const saved=await patch(app.admin,original.id,original.version,{publicColor:'#AaBBcC'});assert.equal(saved.status,200,saved.text);assert.equal(saved.body.course.publicColor,'#aabbcc');
 for(const [client,status]of[[anonymous,401],[teacher,403],[student,403]])error(await patch(client,original.id,saved.body.course.version,{publicColor:'#000000'}),status);
 for(const options of [{csrf:false},{requestOrigin:'https://hostile.example.test'}])error(await patch(app.admin,original.id,saved.body.course.version,{publicColor:'#000000'},options),403);
 const before=app.store.getCourse(original.id),audit=app.store.audit();for(const publicColor of ['#123','url(javascript:alert(1))',{color:'#123456'},false])error(await patch(app.admin,original.id,before.version,{publicColor}),400);
 error(await patch(app.admin,original.id,original.version,{publicColor:'#000000'}),409);error(await patch(app.admin,'missing-colour-course',before.version,{publicColor:'#000000'}),404);
 assert.deepEqual(app.store.getCourse(original.id),before);assert.deepEqual(app.store.getCourse(other.id),other);assert.deepEqual(app.store.audit(),audit);
 const deleted=await send(app.admin,'/api/courses/'+other.id,'DELETE',{version:other.version});assert.equal(deleted.status,200,deleted.text);error(await patch(app.admin,other.id,deleted.body.course.version,{publicColor:'#000000'}),409);assert.equal(app.store.getCourse(other.id).publicColor,null);
});

test('course public colour create set omitted pricing and metadata updates and explicit clear use the same canonical field',async t=>{
 const app=await setup(t);assert.equal(app.store.getCourse('public-course').publicColor,null);const created=await send(app.admin,'/api/courses','POST',course({courseName:'Explicit colour',publicColor:'#AB00EF'}));assert.equal(created.status,201,created.text);let current=created.body.course;assert.equal(current.publicColor,'#ab00ef');
 const fees=app.store.listFees(),other=app.store.getCourse('public-course');let reply=await patch(app.admin,current.id,current.version,{category:'Changed category'});assert.equal(reply.status,200,reply.text);current=reply.body.course;assert.equal(current.publicColor,'#ab00ef');assert.deepEqual(app.store.listFees(),fees);
 reply=await patch(app.admin,current.id,current.version,{price:301});assert.equal(reply.status,200,reply.text);current=reply.body.course;assert.equal(current.publicColor,'#ab00ef');assert.equal(current.price,301);
 reply=await patch(app.admin,current.id,current.version,{publicColor:null});assert.equal(reply.status,200,reply.text);current=reply.body.course;assert.equal(current.publicColor,null);
 reply=await patch(app.admin,current.id,current.version,{level:'Another omitted colour'});assert.equal(reply.status,200,reply.text);assert.equal(reply.body.course.publicColor,null);assert.deepEqual(app.store.getCourse('public-course'),other);
 for(const path of ['/api/courses','/api/catalog']){const result=await app.admin.request(path);assert.equal(result.status,200,result.text);assert.equal(result.body.courses.find(row=>row.id===current.id).publicColor,null);}
});

test('course public colour survives restart while missing or malformed historical values are safely projected without reseeding or rewriting source JSON',async t=>{
 const databasePath=await disk(t),first=await setup(t,{databasePath});const saved=await patch(first.admin,'public-course',1,{publicColor:'#01ABCD'});assert.equal(saved.status,200,saved.text);const privateCourse=first.store.getCourse('private-course');await first.close();
 const next=await setup(t,{databasePath});assert.equal(next.store.getCourse('public-course').publicColor,'#01abcd');assert.deepEqual(next.store.getCourse('private-course'),privateCourse);await publishedSlot(next);const anonymous=next.client();
 const inspection=new DatabaseSync(databasePath);try{
  const record=inspection.prepare('SELECT * FROM courses WHERE id=?').get('public-course'),valid=JSON.parse(record.data);assert.equal(valid.publicColor,'#01abcd');
  for(const value of [undefined,'#A0B1C2','#A0B1C2\n','red','url(https://private.example.test)',{unsafe:'PRIVATE colour object'},'#abcdef;background:url(private)']){
   const data={...valid};if(value===undefined)delete data.publicColor;else data.publicColor=value;const raw=JSON.stringify(data);inspection.prepare('UPDATE courses SET data=? WHERE id=?').run(raw,'public-course');const expected=value==='#A0B1C2'?'#a0b1c2':null;
   assert.equal(next.store.getCourse('public-course').publicColor,expected);assert.equal((await next.admin.request('/api/catalog')).body.courses.find(row=>row.id==='public-course').publicColor,expected);
   const facts=await publicFacts(anonymous);assert.equal(facts.directory.courses[0].publicColor,expected);assert.equal(facts.detail.course.publicColor,expected);assert.ok(!JSON.stringify(facts).includes('PRIVATE colour'));assert.ok(!JSON.stringify(facts).includes('private.example.test'));assert.ok(!JSON.stringify(facts).includes('background:url'));
   assert.equal(inspection.prepare('SELECT data FROM courses WHERE id=?').get('public-course').data,raw,'Reads must not repair or backfill stored historical colour values.');
  }
  inspection.prepare('UPDATE courses SET data=? WHERE id=?').run(record.data,'public-course');
 }finally{inspection.close();}
 const restored=next.store.getCourse('public-course');await next.close();const restarted=await setup(t,{databasePath});assert.deepEqual(restarted.store.getCourse('public-course'),restored);assert.deepEqual(restarted.store.getCourse('private-course'),privateCourse);
});

test('course public colour changes only visible public course facts and revisions and never publishes a private course or leaks internal identities',async t=>{
 const app=await setup(t),{slot,teacher,schedule}=await publishedSlot(app,{linked:true}),anonymous=app.client(),before=await publicFacts(anonymous);assert.equal(before.directory.courses[0].publicColor,null);assert.equal(before.detail.course.publicColor,null);
 const saved=await patch(app.admin,'public-course',1,{publicColor:'#00ABEF'});assert.equal(saved.status,200,saved.text);const after=await publicFacts(anonymous);assert.equal(after.directory.courses[0].publicColor,'#00abef');assert.equal(after.detail.course.publicColor,'#00abef');assert.notEqual(after.directory.revision,before.directory.revision);assert.notEqual(after.detail.revision,before.detail.revision);assert.deepEqual(after.detail.slots,before.detail.slots);
 const stripColour=body=>{const value=structuredClone(body);delete value.revision;for(const record of value.courses||[value.course])delete record.publicColor;return value;};assert.deepEqual(stripColour(after.directory),stripColour(before.directory));assert.deepEqual(stripColour(after.detail),stripColour(before.detail));assert.deepEqual(Object.keys(after.detail.course).sort(),['category','courseName','id','level','publicColor']);
 for(const [path,revision]of[['/api/public/courses',after.directory.revision],['/api/public/courses/public-course?from=2026-10-15',after.detail.revision]]){const result=await anonymous.request(path+(path.includes('?')?'&':'?')+'since='+revision);assert.equal(result.body.unchanged,true);}
 const hidden=await patch(app.admin,'private-course',1,{publicColor:'#ffffff'});assert.equal(hidden.status,200,hidden.text);assert.deepEqual(await publicFacts(anonymous),after);assert.equal((await anonymous.request('/api/public/courses/private-course?from=2026-10-15')).status,404);
 const privateColour=await send(app.admin,'/api/scheduling-resources/'+teacher.id,'PATCH',{version:1,representativeColor:'#ffffff'});assert.equal(privateColour.status,200,privateColour.text);const privateNote=await send(app.admin,'/api/available-slots/'+slot.id,'PATCH',{version:1,remark:'PRIVATE new administrative note'});assert.equal(privateNote.status,200,privateNote.text);assert.deepEqual(await publicFacts(anonymous),after);
 for(const secret of [teacher.id,schedule.id,'classTypeId','studentReschedulingAllowed','PRIVATE', 'representativeColor'])assert.ok(!JSON.stringify(after).includes(secret),secret);
 const cleared=await patch(app.admin,'public-course',saved.body.course.version,{publicColor:null});assert.equal(cleared.status,200,cleared.text);assert.deepEqual(await publicFacts(anonymous),before,'Clearing returns to the same public facts without exposing private metadata versions.');
});

test('course public colour-only updates are audited atomically without changing pricing assignments source identities holds or rights',async t=>{
 const databasePath=await disk(t),app=await setup(t,{databasePath}),{slot}=await publishedSlot(app,{linked:true}),teacher=app.client();await teacher.login(2);await grantTeacherAccess(app,app.admin,{courses:['public-course']});
 const inspection=new DatabaseSync(databasePath);try{
  inspection.prepare("INSERT INTO availability_reservations(id,slot_id,kind,state) VALUES ('colour-test-hold',?,'trial','held')").run(slot.id);const before=businessRows(inspection),original=app.store.getCourse('public-course'),audit=app.store.audit(),access=(await teacher.request('/api/auth/session')).body.user.accessRevision;
  const saved=await patch(app.admin,original.id,original.version,{publicColor:'#BADA55'});assert.equal(saved.status,200,saved.text);assert.equal(saved.body.course.publicColor,'#bada55');assert.equal(saved.body.course.version,original.version+1);assert.deepEqual(saved.body.course.fees,original.fees);assert.deepEqual(businessRows(inspection),before);assert.equal((await teacher.request('/api/auth/session')).body.user.accessRevision,access);
  assert.equal(app.store.audit().length,audit.length+1);assert.equal(app.store.audit().at(-1).snapshot.publicColor,'#bada55');assert.equal(app.store.audit().at(-1).action,'course.update');
  const current=app.store.getCourse(original.id),currentAudit=app.store.audit();inspection.exec("CREATE TRIGGER fictional_colour_audit_failure BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT,'Fictional colour audit failure'); END;");
  error(await patch(app.admin,current.id,current.version,{publicColor:'#ffffff'}),500);assert.deepEqual(app.store.getCourse(current.id),current);assert.deepEqual(app.store.audit(),currentAudit);assert.deepEqual(businessRows(inspection),before);inspection.exec('DROP TRIGGER fictional_colour_audit_failure');
 }finally{inspection.close();}
});
