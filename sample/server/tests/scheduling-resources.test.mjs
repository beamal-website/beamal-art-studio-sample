import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {fixture,error,grantTeacherAccess} from './helpers.mjs';

const endpoint='/api/scheduling-resources';
const request=(client,path,method,body,key)=>client.request(path,{method,body,...(key?{headers:{'Idempotency-Key':key}}:{})});
async function manager(t,options={}){const app=await fixture(t,options),admin=app.client();await admin.login();return {...app,admin};}
async function create(app,fields={},key){const result=await request(app.admin,endpoint,'POST',{kind:'teacher',displayName:'Fictional studio teacher',...fields},key);assert.equal(result.status,201,result.text);return result;}

test('shared scheduling resources have stable identities without creating accounts and retain disabled entries',async t=>{
 const app=await manager(t),accounts=app.store.listUsers(),empty=await app.admin.request(endpoint);assert.equal(empty.status,200,empty.text);assert.deepEqual(empty.body.resources,[]);
 const teacher=(await create(app)).body.resource,room=(await create(app,{kind:'room',displayName:'Fictional studio room'})).body.resource;
 assert.match(teacher.id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);assert.equal(teacher.version,1);assert.equal(teacher.active,true);assert.notEqual(teacher.id,room.id);
 assert.deepEqual(Object.keys(teacher).sort(),['id','kind','displayName','active','version','createdAt','updatedAt'].sort());
 const second=app.client(),reader=app.client();await second.login(1);await reader.login(2);
 await grantTeacherAccess(app,app.admin,{resources:[teacher.id,room.id]});
 const shared=(await second.request(endpoint)).body;assert.equal(shared.resources.length,2);assert.notEqual(shared.revision,empty.body.revision);const teacherShared=(await reader.request(endpoint)).body;assert.deepEqual(teacherShared.resources,shared.resources);assert.notEqual(teacherShared.revision,shared.revision);
 const disabled=await request(second,`${endpoint}/${teacher.id}`,'PATCH',{version:1,displayName:'Renamed fictional teacher',active:false});assert.equal(disabled.status,200,disabled.text);
 assert.equal(disabled.body.resource.id,teacher.id);assert.equal(disabled.body.resource.kind,'teacher');assert.equal(disabled.body.resource.version,2);assert.equal(disabled.body.resource.active,false);assert.equal(disabled.body.resource.createdAt,teacher.createdAt);
 const after=(await app.admin.request(endpoint)).body;assert.ok(after.resources.some(item=>item.id===teacher.id&&!item.active));assert.notEqual(after.revision,shared.revision);
 const teacherAfter=(await reader.request(endpoint)).body;assert.deepEqual(teacherAfter.resources,after.resources);assert.notEqual(teacherAfter.revision,teacherShared.revision);assert.deepEqual((await reader.request(`${endpoint}?since=${teacherAfter.revision}`)).body,{revision:teacherAfter.revision,unchanged:true});assert.deepEqual(app.store.listUsers(),accounts);
});

test('resource API enforces roles origin CSRF strict fields versions and provisional per-kind name uniqueness',async t=>{
 const app=await manager(t),teacher=app.client(),student=app.client();await teacher.login(2);await student.login(3);const saved=(await create(app)).body.resource;
 error(await app.client().request(endpoint),401);error(await student.request(endpoint),403);
 for(const [path,method,body]of[[endpoint,'POST',{kind:'room',displayName:'Fictional room'}],[`${endpoint}/${saved.id}`,'PATCH',{version:1,active:false}]]){
  error(await request(app.client(),path,method,body),401);for(const client of[teacher,student])error(await request(client,path,method,body),403);
  error(await app.admin.request(path,{method,body,csrf:false}),403);error(await app.admin.request(path,{method,body,requestOrigin:'https://hostile.example.test'}),403);
 }
 const before=(await app.admin.request(endpoint)).body;
 for(const body of[{kind:'admin',displayName:'Invalid'},{kind:'teacher',displayName:''},{kind:'teacher',displayName:' '.repeat(5)},{kind:'room',displayName:'x'.repeat(201)},{kind:'teacher',displayName:'Invalid',active:'true'},{kind:'teacher',displayName:'Invalid',email:'not-an-account@example.test'},{kind:'teacher',displayName:'Invalid',id:'forged'}])error(await request(app.admin,endpoint,'POST',body),400);
 for(const body of[{version:1,kind:'room'},{version:1,displayName:''},{version:1,active:null},{version:1,role:'admin'},{version:1},{version:1,createdAt:'forged'}])error(await request(app.admin,`${endpoint}/${saved.id}`,'PATCH',body),400);
 error(await request(app.admin,`${endpoint}/${saved.id}`,'PATCH',{active:false}),409);error(await request(app.admin,`${endpoint}/missing`,'PATCH',{version:1,active:false}),404);
 const duplicate=await request(app.admin,endpoint,'POST',{kind:'teacher',displayName:'  FICTIONAL STUDIO TEACHER '});error(duplicate,409);assert.equal(duplicate.body.error.code,'RESOURCE_NAME_EXISTS');
 assert.deepEqual((await app.admin.request(endpoint)).body,before);await create(app,{kind:'room'});
 const other=(await create(app,{displayName:'Another fictional teacher'})).body.resource;
 const renameDuplicate=await request(app.admin,`${endpoint}/${other.id}`,'PATCH',{version:1,displayName:saved.displayName});error(renameDuplicate,409);assert.equal(renameDuplicate.body.error.code,'RESOURCE_NAME_EXISTS');
});

test('resource creation and edits use exact receipts and optimistic versions under concurrent HTTP requests',async t=>{
 const app=await manager(t),input={kind:'teacher',displayName:'Fictional retry teacher'};
 const replies=await Promise.all(Array.from({length:5},()=>request(app.admin,endpoint,'POST',input,'resource-create-retry')));for(const reply of replies){assert.equal(reply.status,201,reply.text);assert.deepEqual(reply.body,replies[0].body);}
 const saved=replies[0].body.resource,before=(await app.admin.request(endpoint)).body;assert.equal(before.resources.length,1);
 error(await request(app.admin,endpoint,'POST',{...input,displayName:'Different'},'resource-create-retry'),409);
 assert.deepEqual((await app.admin.request(endpoint)).body,before);
 const change={version:1,displayName:'Fictional retry teacher renamed',active:false};
 const edits=await Promise.all(Array.from({length:5},()=>request(app.admin,`${endpoint}/${saved.id}`,'PATCH',change,'resource-edit-retry')));for(const edit of edits){assert.equal(edit.status,200,edit.text);assert.deepEqual(edit.body,edits[0].body);}
 const current=edits[0].body.resource;assert.equal(current.version,2);
 error(await request(app.admin,`${endpoint}/${saved.id}`,'PATCH',{...change,active:true},'resource-edit-retry'),409);
 const race=await Promise.all(['Teacher A','Teacher B'].map(displayName=>request(app.admin,`${endpoint}/${saved.id}`,'PATCH',{version:2,displayName})));assert.deepEqual(race.map(reply=>reply.status).sort(),[200,409]);
 assert.equal(app.store.schedulingResources.audit().length,3);
 // The first name is free after the rename. A different account using the
 // same key must create its own resource rather than replay another account.
 const next=app.client();await next.login(1);const independent=await request(next,endpoint,'POST',input,'resource-create-retry');assert.equal(independent.status,201,independent.text);assert.notEqual(independent.body.resource.id,saved.id);assert.equal(independent.body.resource.version,1);
});

test('the resource name database constraint rejects a simultaneous duplicate without extra resources or audits',async t=>{
 const app=await manager(t),replies=await Promise.all(['Same fictional room','  SAME FICTIONAL ROOM '].map(displayName=>request(app.admin,endpoint,'POST',{kind:'room',displayName})));
 assert.deepEqual(replies.map(reply=>reply.status).sort(),[201,409]);assert.equal((await app.admin.request(endpoint)).body.resources.length,1);assert.equal(app.store.schedulingResources.audit().length,1);
});

test('resources receipts and revisions survive a real SQLite restart without changing legacy schedule labels or users',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-resource-restart-'));t.after(()=>rm(directory,{recursive:true,force:true}));const databasePath=join(directory,'fictional.sqlite'),app=await manager(t,{databasePath});
 const accounts=app.store.listUsers(),lesson={course:'public-course',startDate:'2026-10-14',time:'12:30',duration:30,weekdays:[3],endMode:'count',count:3,teacher:'',room:''};
 const scheduled=await request(app.admin,'/api/schedules','POST',lesson);assert.equal(scheduled.status,201,scheduled.text);
 // Reproduce a previously stored text-only record, without permitting new
 // arbitrary labels through the shared scheduling API.
 const inspection=new DatabaseSync(databasePath);try{const data=JSON.parse(inspection.prepare('SELECT data FROM schedules WHERE id=?').get(scheduled.body.schedule.id).data);data.teacher='Unmatched legacy teacher';data.room='Unmatched legacy room';inspection.prepare('UPDATE schedules SET data=? WHERE id=?').run(JSON.stringify(data),scheduled.body.schedule.id);}finally{inspection.close();}
 const schedules=(await app.admin.request('/api/schedules')).body;
 const created=await create(app,{displayName:'Unmatched legacy teacher'},'resource-durable-create'),resource=created.body.resource;
 const input={version:1,active:false},changed=await request(app.admin,`${endpoint}/${resource.id}`,'PATCH',input,'resource-durable-edit');assert.equal(changed.status,200,changed.text);const catalog=(await app.admin.request(endpoint)).body;
 assert.deepEqual((await app.admin.request('/api/schedules')).body,schedules);assert.deepEqual(app.store.listUsers(),accounts);
 await app.close();const reopened=await manager(t,{databasePath});assert.deepEqual((await reopened.admin.request(endpoint)).body,catalog);assert.deepEqual((await reopened.admin.request('/api/schedules')).body,schedules);
 assert.deepEqual((await create(reopened,{displayName:'Unmatched legacy teacher'},'resource-durable-create')).body,created.body);
 assert.deepEqual((await request(reopened.admin,`${endpoint}/${resource.id}`,'PATCH',input,'resource-durable-edit')).body,changed.body);assert.equal(reopened.store.schedulingResources.audit().length,2);assert.deepEqual(reopened.store.listUsers(),accounts);
});

test('a resource audit failure rolls back create edit and receipt together and permits a corrected retry',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-resource-atomic-'));t.after(()=>rm(directory,{recursive:true,force:true}));const databasePath=join(directory,'fictional.sqlite'),app=await manager(t,{databasePath}),inspection=new DatabaseSync(databasePath);
 try{
  const before=(await app.admin.request(endpoint)).body;
  inspection.exec("CREATE TRIGGER fictional_resource_failure BEFORE INSERT ON scheduling_resource_audit_log BEGIN SELECT RAISE(ABORT,'Fictional resource audit failure'); END;");
  const input={kind:'room',displayName:'Fictional atomic room'};error(await request(app.admin,endpoint,'POST',input,'resource-atomic-create'),500);assert.deepEqual((await app.admin.request(endpoint)).body,before);
  assert.equal(inspection.prepare("SELECT COUNT(*) AS count FROM idempotent_creates WHERE request_key='resource-atomic-create'").get().count,0);inspection.exec('DROP TRIGGER fictional_resource_failure');
  const created=await create(app,input,'resource-atomic-create'),resource=created.body.resource,snapshot=(await app.admin.request(endpoint)).body;
  inspection.exec("CREATE TRIGGER fictional_resource_failure BEFORE INSERT ON scheduling_resource_audit_log BEGIN SELECT RAISE(ABORT,'Fictional resource audit failure'); END;");
  const edit={version:1,displayName:'Atomic renamed',active:false};error(await request(app.admin,`${endpoint}/${resource.id}`,'PATCH',edit,'resource-atomic-edit'),500);assert.deepEqual((await app.admin.request(endpoint)).body,snapshot);
  assert.equal(inspection.prepare("SELECT COUNT(*) AS count FROM idempotent_creates WHERE request_key='resource-atomic-edit'").get().count,0);inspection.exec('DROP TRIGGER fictional_resource_failure');
  const updated=await request(app.admin,`${endpoint}/${resource.id}`,'PATCH',edit,'resource-atomic-edit');assert.equal(updated.status,200,updated.text);assert.equal(updated.body.resource.version,2);assert.equal(app.store.schedulingResources.audit().length,2);
 }finally{inspection.close();}
});

test('room resources preserve capacity notes and external-location metadata without granting those fields to teachers',async t=>{
 const app=await manager(t),room=(await create(app,{kind:'room',displayName:'Fictional room A',capacity:6,detail:'Room details',remark:'Room remarks',externalLocation:true})).body.resource;
 assert.equal(room.capacity,6);assert.equal(room.detail,'Room details');assert.equal(room.remark,'Room remarks');assert.equal(room.externalLocation,true);
 const empty=(await create(app,{kind:'room',displayName:'Fictional room B'})).body.resource;assert.equal(empty.capacity,null);assert.equal(empty.detail,'');assert.equal(empty.remark,'');assert.equal(empty.externalLocation,false);
 const edited=await request(app.admin,`${endpoint}/${room.id}`,'PATCH',{version:1,capacity:null,detail:'Updated details',externalLocation:false});assert.equal(edited.status,200,edited.text);assert.equal(edited.body.resource.capacity,null);assert.equal(edited.body.resource.remark,'Room remarks');assert.equal(edited.body.resource.externalLocation,false);
 const teacher=(await create(app,{displayName:'Fictional teacher metadata guard'})).body.resource,before=(await app.admin.request(endpoint)).body;
 for(const capacity of[0,-1,1.5,'6'])error(await request(app.admin,`${endpoint}/${room.id}`,'PATCH',{version:2,capacity}),400);
 for(const fields of[{detail:'x'.repeat(2001)},{remark:null},{externalLocation:'true'}])error(await request(app.admin,`${endpoint}/${room.id}`,'PATCH',{version:2,...fields}),400);
 error(await request(app.admin,`${endpoint}/${teacher.id}`,'PATCH',{version:1,capacity:6}),400);error(await request(app.admin,endpoint,'POST',{kind:'teacher',displayName:'Not a room',detail:'room metadata'}),400);
 assert.deepEqual((await app.admin.request(endpoint)).body,before);
});
