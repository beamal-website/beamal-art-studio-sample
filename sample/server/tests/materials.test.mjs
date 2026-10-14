import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture,error,users,noCredentials} from './helpers.mjs';

const material=(extra={})=>({name:'Watercolour preparation',description:'Bring a sketchbook.\nWatch the preparation video.',videoLinks:['https://example.test/preparation?lesson=1'],visibleToStudents:false,studentDownload:false,...extra});
async function adminFixture(t,options={}){
 const app=await fixture(t,options),admin=app.client(),login=await admin.login(0);
 return {...app,admin,owner:login.body.user};
}
async function add(app,courseId='public-course',extra={},headers={}){
 const response=await app.admin.request(`/api/courses/${courseId}/materials`,{method:'POST',body:material(extra),headers});
 assert.equal(response.status,201,response.text);noCredentials(response);
 return response.body.material;
}
async function list(client,courseId='public-course'){
 const response=await client.request(`/api/courses/${courseId}/materials`);
 assert.equal(response.status,200,response.text);noCredentials(response);return response.body.materials;
}
function dto(saved,courseId,owner){
 assert.equal(typeof saved.id,'string');assert.ok(saved.id);
 assert.equal(saved.courseId,courseId);assert.equal(typeof saved.name,'string');assert.equal(typeof saved.description,'string');
 assert.ok(Array.isArray(saved.videoLinks));assert.equal(typeof saved.visibleToStudents,'boolean');assert.equal(typeof saved.studentDownload,'boolean');
 assert.deepEqual(saved.owner,{id:owner.id,displayName:owner.displayName});
 assert.ok(Number.isInteger(saved.version)&&saved.version>=1);
 assert.ok(Number.isFinite(Date.parse(saved.createdAt)));assert.ok(Number.isFinite(Date.parse(saved.updatedAt)));
}

test('materials creation and editing are shared across managers while ownership, identity and creation time remain immutable',async t=>{
 const app=await adminFixture(t),other=app.client();await other.login(1);
 const saved=await add(app);dto(saved,'public-course',app.owner);assert.equal(saved.version,1);
 assert.deepEqual(await list(other),[saved]);
 const detail=await other.request(`/api/materials/${saved.id}`);assert.equal(detail.status,200,detail.text);assert.deepEqual(detail.body.material,saved);
 const update=await other.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{description:'Revised by another manager',videoLinks:['http://example.test/video'],visibleToStudents:true,studentDownload:true,version:saved.version}});
 assert.equal(update.status,200,update.text);dto(update.body.material,'public-course',app.owner);
 assert.equal(update.body.material.id,saved.id);assert.equal(update.body.material.createdAt,saved.createdAt);assert.equal(update.body.material.version,2);
 assert.equal(update.body.material.name,saved.name);assert.equal(update.body.material.description,'Revised by another manager');
 assert.deepEqual(await list(app.admin),[update.body.material]);
});

test('materials HTTP endpoints require authentication and only administrators may write',async t=>{
 const app=await adminFixture(t),anonymous=app.client(),teacher=app.client(),student=app.client();await teacher.login(2);await student.login(3);
 const saved=await add(app);
 error(await anonymous.request('/api/courses/public-course/materials'),401);
 error(await anonymous.request(`/api/materials/${saved.id}`),401);
 assert.deepEqual(await list(teacher),[saved]);
 assert.equal((await teacher.request(`/api/materials/${saved.id}`)).status,200);
 for(const client of [teacher,student]){
  error(await client.request('/api/courses/public-course/materials',{method:'POST',body:material(),headers:{'X-User-Role':'admin'}}),403);
  error(await client.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{name:'Forbidden edit',version:saved.version},headers:{'X-User-Role':'admin'}}),403);
 }
 error(await app.admin.request('/api/courses/missing-course/materials',{method:'POST',body:material()}),404);
 assert.deepEqual(await list(app.admin),[saved]);
});

test('students need an explicit course grant as well as material visibility; catalog visibility alone grants no materials',async t=>{
 const app=await adminFixture(t,{seedMaterialAccess:[{courseId:'public-course',email:users[3].email},{courseId:'private-course',email:users[4].email}]}),granted=app.client(),ungranted=app.client();await granted.login(3);await ungranted.login(4);
 const visible=await add(app,'public-course',{visibleToStudents:true,studentDownload:true}),hidden=await add(app,'public-course',{name:'Private staff preparation',visibleToStudents:false});
 assert.deepEqual(await list(granted),[visible]);
 assert.equal((await granted.request(`/api/materials/${visible.id}`)).status,200);
 error(await granted.request(`/api/materials/${hidden.id}`),404);
 error(await ungranted.request('/api/courses/public-course/materials'),404);
 error(await ungranted.request(`/api/materials/${visible.id}`),404);
 const internal=await add(app,'private-course',{name:'Enrolled private course material',visibleToStudents:true});
 assert.deepEqual(await list(ungranted,'private-course'),[internal],'An explicit enrollment grant works independently of online store advertising');
 error(await granted.request(`/api/materials/${internal.id}`),404);
 const hiddenAgain=await app.admin.request(`/api/materials/${visible.id}`,{method:'PATCH',body:{visibleToStudents:false,version:visible.version}});assert.equal(hiddenAgain.status,200,hiddenAgain.text);
 assert.deepEqual(await list(granted),[]);error(await granted.request(`/api/materials/${visible.id}`),404);
});

test('hidden materials never retain student download permission and visibility changes do not silently enable downloads',async t=>{
 const app=await adminFixture(t),saved=await add(app,'public-course',{visibleToStudents:false,studentDownload:true});
 assert.equal(saved.studentDownload,false);
 const shown=await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{visibleToStudents:true,version:saved.version}});assert.equal(shown.status,200,shown.text);
 assert.equal(shown.body.material.visibleToStudents,true);assert.equal(shown.body.material.studentDownload,false);
 const enabled=await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{studentDownload:true,version:shown.body.material.version}});assert.equal(enabled.status,200,enabled.text);assert.equal(enabled.body.material.studentDownload,true);
 const hidden=await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{visibleToStudents:false,version:enabled.body.material.version}});assert.equal(hidden.status,200,hidden.text);assert.equal(hidden.body.material.studentDownload,false);
});

test('invalid material text, URLs, permissions and unsupported fields fail atomically without changing saved versions',async t=>{
 const app=await adminFixture(t),saved=await add(app),before=await list(app.admin),auditCount=app.materials.audit().length;
 const invalid=[
  {name:''},{name:' '},{name:'x'.repeat(201)},{description:'x'.repeat(10001)},{description:{text:'object'}},
  {videoLinks:'https://example.test/video'},{videoLinks:Array.from({length:21},()=> 'https://example.test/video')},{videoLinks:[{}]},
  ...['javascript:alert(1)','data:text/html,<script>alert(1)</script>','file:///tmp/material','ftp://example.test/video','https://user:password@example.test/video','https://example.test@another.example.test/video'].map(url=>({videoLinks:[url]})),
  {visibleToStudents:'true'},{studentDownload:1},{owner:{id:'forged',displayName:'Forged owner'}},{courseId:'private-course'},
  {id:'forged'},{createdAt:'1900-01-01'},{updatedAt:'1900-01-01'},{attachments:[{url:'https://example.test/file.pdf'}]},{lessonIds:['one-lesson']},{unexpected:'ignored?'}
 ];
 for(const fields of invalid){
  error(await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:material(fields)}),400);
  error(await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{...fields,version:saved.version}}),400);
  assert.deepEqual(await list(app.admin),before,JSON.stringify(fields));
  assert.equal(app.materials.audit().length,auditCount);
 }
});

test('material maximum text and video counts are accepted and injection-like names remain inert text rather than SQL',async t=>{
 const app=await adminFixture(t),maximum=await add(app,'public-course',{name:'n'.repeat(200),description:'d'.repeat(10000),videoLinks:Array.from({length:20},(_,index)=>`https://example.test/video/${index}`)});
 assert.equal(maximum.name.length,200);assert.equal(maximum.description.length,10000);assert.equal(maximum.videoLinks.length,20);
 const injection="Robert'); DROP TABLE materials; -- <img src=x onerror=alert(1)>";
 const saved=await add(app,'public-course',{name:injection});assert.equal(saved.name,injection);
 const all=await list(app.admin);assert.equal(all.length,2);assert.ok(all.some(m=>m.id===maximum.id));assert.ok(all.some(m=>m.name===injection));
});

test('material writes enforce session CSRF and allowed origins and preserve the record when refused',async t=>{
 const app=await adminFixture(t),other=app.client();await other.login(1);const saved=await add(app),before=await list(app.admin);
 for(const options of [{csrf:false},{headers:{'X-CSRF-Token':'wrong'}},{headers:{'X-CSRF-Token':other.csrfToken}},{requestOrigin:'https://untrusted.example.test'}]){
  error(await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:material(),...options}),403);
  error(await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{name:'Refused change',version:saved.version},...options}),403);
 }
 assert.deepEqual(await list(app.admin),before);
});

test('concurrent material edits accept one opened version and reject stale or missing versions without lost updates',async t=>{
 const app=await adminFixture(t),other=app.client();await other.login(1);const saved=await add(app);
 error(await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{name:'Missing version'}}),409);
 const responses=await Promise.all([
  app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{name:'First edit',version:saved.version}}),
  other.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{name:'Second edit',version:saved.version}}),
 ]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);const winner=responses.find(r=>r.status===200).body.material;
 error(await other.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{description:'Outdated change',version:saved.version}}),409);
 assert.deepEqual(await list(app.admin),[winner]);assert.equal(winner.version,2);assert.deepEqual(winner.owner,saved.owner);
});

test('concurrent material create retries use one durable operation and one audit entry while changed payloads conflict',async t=>{
 const app=await adminFixture(t),headers={'Idempotency-Key':randomUUID()},input=material(),auditCount=app.materials.audit().length;
 const responses=await Promise.all(Array.from({length:10},()=>app.admin.request('/api/courses/public-course/materials',{method:'POST',body:input,headers})));
 for(const response of responses){assert.equal(response.status,201,response.text);assert.deepEqual(response.body,responses[0].body);}
 assert.deepEqual(await list(app.admin),[responses[0].body.material]);assert.equal(app.materials.audit().length,auditCount+1);
 const changed=await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:material({description:'Different payload'}),headers});error(changed,409);assert.equal(changed.body.error.code,'IDEMPOTENCY_CONFLICT');
 assert.equal(app.materials.audit().length,auditCount+1);
});

test('materials, student grants and idempotent acknowledgements survive file-backed service restart',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-materials-qa-'));let second;
 t.after(async()=>{await second?.close();await rm(directory,{recursive:true,force:true});});
 const databasePath=join(directory,'materials.sqlite'),options={databasePath,seedMaterialAccess:[{courseId:'public-course',email:users[3].email}]};
 const first=await adminFixture(t,options),input=material({visibleToStudents:true,studentDownload:true}),headers={'Idempotency-Key':randomUUID()};
 const response=await first.admin.request('/api/courses/public-course/materials',{method:'POST',body:input,headers});assert.equal(response.status,201,response.text);const saved=response.body.material;
 const auditCount=first.materials.audit().length;await first.close();
 second=await adminFixture(t,options);
 const replay=await second.admin.request('/api/courses/public-course/materials',{method:'POST',body:input,headers});assert.equal(replay.status,201,replay.text);assert.deepEqual(replay.body.material,saved);
 assert.equal(second.materials.audit().length,auditCount);
 const student=second.client();await student.login(3);assert.deepEqual(await list(student),[saved]);
});
