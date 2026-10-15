import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fixture,error,course,grantTeacherAccess} from './helpers.mjs';
import {validateCourse,validateCourseMetadata} from '../validation.mjs';

const content=(fields={})=>({descriptionZh:' 原始中文介紹\n <保留文字> ',descriptionEn:' English introduction\n retained ',minAgeYears:'2.5',maxAgeYears:'18',...fields});
const clear=()=>content({descriptionZh:'',descriptionEn:'',minAgeYears:'',maxAgeYears:''});
const patch=(client,id,version,fields,options={})=>client.request('/api/courses/'+id,{method:'PATCH',body:{version,...fields},...options});
async function setup(t,options={}){const app=await fixture(t,options),admin=app.client();await admin.login();return {...app,admin};}
async function disk(t){const directory=await mkdtemp(join(tmpdir(),'beamal-course-content-'));t.after(()=>rm(directory,{recursive:true,force:true}));return join(directory,'isolated.sqlite');}
const invalid=operation=>assert.throws(operation,value=>value.status===400&&value.code==='INVALID_COURSE');

test('course content validation preserves raw descriptions and optional decimal age values without forcing either language or a maximum age policy',()=>{
 for(const value of [content(),clear(),content({descriptionZh:'',minAgeYears:'0',maxAgeYears:''}),content({descriptionEn:'',minAgeYears:'',maxAgeYears:2.5}),content({minAgeYears:0,maxAgeYears:0}),content({minAgeYears:'.5',maxAgeYears:'0002.500'}),content({minAgeYears:'9999999999999998',maxAgeYears:'9999999999999999'})]){
  const expected={...value,minAgeYears:String(value.minAgeYears),maxAgeYears:String(value.maxAgeYears)};
  assert.deepEqual(validateCourse(course({content:value})).content,expected);
  assert.deepEqual(validateCourseMetadata({courseName:'Content',content:value}).content,expected);
 }
 const current=course({content:content()});
 assert.ok(!Object.hasOwn(validateCourseMetadata({level:'Updated'},current),'content'),'Omitted content must not be converted to a replacement value.');
 assert.ok(!Object.hasOwn(validateCourse({price:301},current),'content'));
});

test('course content rejects incomplete objects unknown fields illegal types and precise reversed ages instead of coercing or partially clearing',()=>{
 const values=[null,[],false,'text',{}, {descriptionZh:'partial'}, {...content(),unknown:'private'},content({descriptionZh:42}),content({descriptionEn:null}),content({descriptionZh:'a'.repeat(10001)}),content({minAgeYears:false}),content({minAgeYears:null}),content({minAgeYears:[]}),content({minAgeYears:Infinity}),content({minAgeYears:'-1'}),content({minAgeYears:'1e2'}),content({minAgeYears:' 2.5'}),content({minAgeYears:'2.5 '}),content({minAgeYears:'2.'}),content({minAgeYears:'12345678901234567'}),content({minAgeYears:'2.50000000000001',maxAgeYears:'2.50000000000000'}),content({minAgeYears:'9007199254740993',maxAgeYears:'9007199254740992'}),content({minAgeYears:'6',maxAgeYears:'2.5'}),content({minAgeYears:'0.00000000000001',maxAgeYears:'0.00000000000000'})];
 for(const value of values){invalid(()=>validateCourse(course({content:value})));invalid(()=>validateCourseMetadata({courseName:'Bad',content:value}));}
 assert.equal(validateCourseMetadata({courseName:'Precise',content:content({minAgeYears:'2.50000000000000',maxAgeYears:'2.50000000000001'})}).content.maxAgeYears,'2.50000000000001');
});

test('admin saves internal course content atomically with version and audit while pricing colour type and other courses remain unchanged',async t=>{
 const app=await setup(t),before=app.store.getCourse('public-course'),other=app.store.getCourse('private-course'),fees=app.store.listFees(),audit=app.store.audit();
 const coloured=await patch(app.admin,before.id,before.version,{publicColor:'#aabbcc',classTypeId:'00000000-0000-4000-8000-000000000001',classTypeVersion:1});assert.equal(coloured.status,200,coloured.text);
 const original=coloured.body.course,baseline=app.store.audit();
 const saved=await patch(app.admin,original.id,original.version,{content:content()});assert.equal(saved.status,200,saved.text);
 assert.deepEqual(saved.body.course.content,content());assert.equal(saved.body.course.version,original.version+1);
 for(const key of ['price','pricingModel','feeIds','fees','publicColor','classTypeId','category','level'])assert.deepEqual(saved.body.course[key],original[key],key);
 assert.deepEqual(app.store.listFees(),fees);assert.deepEqual(app.store.getCourse(other.id),other);
 assert.equal(app.store.audit().length,baseline.length+1);assert.equal(app.store.audit().at(-1).action,'course.update');assert.deepEqual(app.store.audit().at(-1).snapshot.content,content());
 for(const path of ['/api/catalog','/api/courses']){const result=await app.admin.request(path);assert.equal(result.status,200,result.text);assert.deepEqual(result.body.courses.find(row=>row.id===original.id).content,content());}
 assert.equal(app.store.audit().length,audit.length+2);
});

test('create metadata pricing and Fee updates preserve content when old callers omit it and explicit four blank fields clear only content',async t=>{
 const app=await setup(t),created=await app.admin.request('/api/courses',{method:'POST',body:course({courseName:'Content on create',content:content(),publicColor:'#112233'})});assert.equal(created.status,201,created.text);
 let current=created.body.course;assert.deepEqual(current.content,content());
 for(const fields of [{level:'Another level'},{price:301},{courseName:'Renamed content'}]){const result=await patch(app.admin,current.id,current.version,fields);assert.equal(result.status,200,result.text);current=result.body.course;assert.deepEqual(current.content,content());assert.equal(current.publicColor,'#112233');}
 const fee=app.store.getFee(current.feeIds[0]),feeResult=await app.admin.request('/api/fees/'+fee.id,{method:'PATCH',body:{version:fee.version,feeName:'Updated Fee'}});assert.equal(feeResult.status,200,feeResult.text);current=app.store.getCourse(current.id);assert.deepEqual(current.content,content());
 const beforeFee=app.store.getFee(fee.id),cleared=await patch(app.admin,current.id,current.version,{content:clear()});assert.equal(cleared.status,200,cleared.text);assert.deepEqual(cleared.body.course.content,clear());assert.deepEqual(app.store.getFee(fee.id),beforeFee);assert.equal(cleared.body.course.publicColor,'#112233');
 const partial=await patch(app.admin,current.id,cleared.body.course.version,{content:{descriptionZh:'Do not partially erase'}});error(partial,400);assert.deepEqual(app.store.getCourse(current.id).content,clear());
});

test('teacher reads only granted course content and all unauthorized stale invalid deleted and CSRF writes leave source and audit unchanged',async t=>{
 const app=await setup(t),teacher=app.client(),student=app.client(),anonymous=app.client();await teacher.login(2);await student.login(3);
 const saved=await patch(app.admin,'public-course',1,{content:content()});assert.equal(saved.status,200,saved.text);await grantTeacherAccess(app,app.admin,{courses:['public-course']});
 for(const path of ['/api/courses','/api/catalog']){const result=await teacher.request(path);assert.equal(result.status,200,result.text);assert.deepEqual(result.body.courses.map(row=>row.id),['public-course']);assert.deepEqual(result.body.courses[0].content,content());}
 const before=app.store.getCourse('public-course'),audit=app.store.audit();
 for(const [client,status]of[[teacher,403],[student,403],[anonymous,401]])error(await patch(client,before.id,before.version,{content:clear()}),status);
 for(const options of [{csrf:false},{requestOrigin:'https://hostile.example.test'}])error(await patch(app.admin,before.id,before.version,{content:clear()},options),403);
 error(await patch(app.admin,before.id,1,{content:clear()}),409);
 for(const value of [null,{descriptionZh:'Partial'},content({minAgeYears:'6',maxAgeYears:'2.5'})])error(await patch(app.admin,before.id,before.version,{content:value}),400);
 assert.deepEqual(app.store.getCourse(before.id),before);assert.deepEqual(app.store.audit(),audit);
 const deleted=await app.admin.request('/api/courses/private-course',{method:'DELETE',body:{version:1}});assert.equal(deleted.status,200,deleted.text);error(await patch(app.admin,'private-course',deleted.body.course.version,{content:content()}),409);
});

test('private content never appears in student publicOnly catalog or anonymous course and timetable DTOs and does not change public availability facts',async t=>{
 const app=await setup(t),student=app.client(),anonymous=app.client();await student.login(3);
 const resource=await app.admin.request('/api/scheduling-resources',{method:'POST',body:{kind:'teacher',displayName:'Isolated course teacher'}});assert.equal(resource.status,201,resource.text);
 const slot=await app.admin.request('/api/available-slots',{method:'POST',body:{courseId:'public-course',date:'2026-10-16',time:'12:30',duration:30,teacherIds:[resource.body.resource.id],roomIds:[],totalCapacity:8,trialCapacity:1,reschedulingCapacity:2,trialEnabled:true,reschedulingEnabled:true,active:true,publicVisibility:'default'}});assert.equal(slot.status,201,slot.text);
 const paths=['/api/public/courses','/api/public/courses/public-course?from=2026-10-16','/api/public/timetable?from=2026-10-16&days=7'];
 const before=await Promise.all(paths.map(path=>anonymous.request(path)));for(const result of before)assert.equal(result.status,200,result.text);
 const secret=content({descriptionZh:'PRIVATE CONTENT SHOULD NOT PUBLISH',descriptionEn:'PRIVATE COURSE CONTENT EN'}),saved=await patch(app.admin,'public-course',1,{content:secret});assert.equal(saved.status,200,saved.text);
 for(const path of ['/api/courses','/api/catalog']){const result=await student.request(path);assert.equal(result.status,200,result.text);for(const row of result.body.courses)assert.ok(!Object.hasOwn(row,'content'));assert.ok(!result.text.includes('PRIVATE CONTENT'));}
 for(let index=0;index<paths.length;index++){const result=await anonymous.request(paths[index]);assert.equal(result.status,200,result.text);assert.deepEqual(result.body,before[index].body);assert.ok(!result.text.includes('content'));assert.ok(!result.text.includes('PRIVATE COURSE'));}
 assert.ok(app.store.listCourses({publicOnly:true}).every(row=>!Object.hasOwn(row,'content')));
});

test('course content survives restart and complete clear persists without reseeding while invalid historical shapes project unknown without rewriting source',async t=>{
 const databasePath=await disk(t),first=await setup(t,{databasePath});const saved=await patch(first.admin,'public-course',1,{content:content({minAgeYears:'0',maxAgeYears:'2.5'})});assert.equal(saved.status,200,saved.text);const expected=saved.body.course;await first.close();
 const next=await setup(t,{databasePath});assert.deepEqual(next.store.getCourse('public-course'),expected);
 const inspection=new DatabaseSync(databasePath);try{
  const stored=inspection.prepare('SELECT data FROM courses WHERE id=?').get('public-course').data,record=JSON.parse(stored);
  for(const value of [undefined,{descriptionZh:42,minAgeYears:false},content({minAgeYears:'5',maxAgeYears:'2.5'})]){
   const data={...record};if(value===undefined)delete data.content;else data.content=value;const raw=JSON.stringify(data);inspection.prepare('UPDATE courses SET data=? WHERE id=?').run(raw,'public-course');
   assert.equal(next.store.getCourse('public-course').content,null);assert.equal(inspection.prepare('SELECT data FROM courses WHERE id=?').get('public-course').data,raw);
  }
  inspection.prepare('UPDATE courses SET data=? WHERE id=?').run(stored,'public-course');
 }finally{inspection.close();}
 const cleared=await patch(next.admin,expected.id,expected.version,{content:clear()});assert.equal(cleared.status,200,cleared.text);await next.close();const final=await setup(t,{databasePath});assert.deepEqual(final.store.getCourse(expected.id).content,clear());
});

test('same saved content request key replays one version and audit while a different payload with that key conflicts',async t=>{
 const app=await setup(t),before=app.store.audit(),options={headers:{'Idempotency-Key':'course-content-retry-20261016'}},body={content:content()};
 const first=await patch(app.admin,'public-course',1,body,options);assert.equal(first.status,200,first.text);
 const replay=await patch(app.admin,'public-course',1,body,options);assert.equal(replay.status,200,replay.text);assert.deepEqual(replay.body,first.body);assert.equal(app.store.audit().length,before.length+1);
 error(await patch(app.admin,'public-course',1,{content:clear()},options),409);assert.deepEqual(app.store.getCourse('public-course'),first.body.course);assert.equal(app.store.audit().length,before.length+1);
});

test('an audit failure rolls back content and version atomically and does not consume the retry key',async t=>{
 const databasePath=await disk(t),app=await setup(t,{databasePath}),before=app.store.getCourse('public-course'),fees=app.store.listFees(),audit=app.store.audit(),inspection=new DatabaseSync(databasePath);
 const options={headers:{'Idempotency-Key':'course-content-atomic-retry-20261016'}};
 try{
  inspection.exec("CREATE TRIGGER isolated_course_content_audit_failure BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT,'Isolated course content audit failure'); END;");
  error(await patch(app.admin,before.id,before.version,{content:content()},options),500);
  assert.deepEqual(app.store.getCourse(before.id),before);assert.deepEqual(app.store.listFees(),fees);assert.deepEqual(app.store.audit(),audit);
  inspection.exec('DROP TRIGGER isolated_course_content_audit_failure');
  const retry=await patch(app.admin,before.id,before.version,{content:content()},options);assert.equal(retry.status,200,retry.text);assert.equal(retry.body.course.version,before.version+1);assert.deepEqual(retry.body.course.content,content());assert.equal(app.store.audit().length,audit.length+1);
 }finally{inspection.close();}
});
