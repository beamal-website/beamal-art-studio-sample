import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fixture,error,users} from './helpers.mjs';

const route='/api/staff/personal-profiles';
const profile=(index=0)=>({staffNumber:`BM-T00${index+1}`,fullName:['Maya Lam','Leo Chan','Ava Hui','Ethan Cheng'][index],localName:['林雅晴','陳子朗','許悅童','鄭思澄'][index],gender:index%2?'Male':'Female',contactEmail:`staff-${index+1}@example.test`,phone:'',mobile:`9800000${index}`,position:'Art teacher',employment:'Full-time',joined:'2023-09-01',dateOfBirth:'1992-06-17',detail:'Watercolour and mixed media',remarks:'Personal profile note'});
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'beamal-staff-personal-')),databasePath=join(directory,'test.sqlite'),app=await fixture(t,{databasePath}),admin=app.client(),teacher=app.client(),student=app.client();
 await admin.login();await teacher.login(2);await student.login(3);t.after(()=>rm(directory,{recursive:true,force:true}));
 const adminId=app.store.listUsers().find(row=>row.email===users[0].email).id,teacherId=app.store.listUsers().find(row=>row.email===users[2].email).id;
 const resources=Array.from({length:4},(_,i)=>app.store.schedulingResources.create({kind:'teacher',displayName:profile(i).fullName},adminId));
 const linked=await admin.request('/api/access-control/teacher-links/'+resources[1].id,{method:'PATCH',body:{version:0,userId:teacherId}});assert.equal(linked.status,200,linked.text);
 return {...app,databasePath,admin,teacher,student,adminId,teacherId,resources};
}
const seed=app=>app.resources.map((resource,index)=>app.store.staffPersonalProfiles.createInitial(resource.id,profile(index),app.adminId));
const inspect=(path,callback)=>{const db=new DatabaseSync(path);try{return callback(db);}finally{db.close();}};

test('personal profiles start empty and explicit initial records persist by teacher resource ID without changing other business data',async t=>{
 const app=await setup(t),empty=await app.admin.request(route);assert.equal(empty.status,200,empty.text);assert.deepEqual(empty.body.records,[]);
 const tables=['users','scheduling_resources','schedules','enrollment_orders','student_sessions','enrollment_sales','schema_metadata'],before=inspect(app.databasePath,db=>Object.fromEntries(tables.map(table=>[table,db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()]))),records=seed(app);
 assert.deepEqual(records,app.resources.map((resource,index)=>({staffId:resource.id,version:1,...profile(index)})));const listed=await app.admin.request(route);assert.equal(listed.status,200,listed.text);assert.equal(listed.body.records.length,4);assert.notEqual(listed.body.revision,empty.body.revision);assert.deepEqual((await app.admin.request(route+'?since='+listed.body.revision)).body,{revision:listed.body.revision,unchanged:true});
 inspect(app.databasePath,db=>{assert.deepEqual(Object.fromEntries(tables.map(table=>[table,db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()])),before);const audit=db.prepare('SELECT * FROM staff_personal_profile_audit_log ORDER BY id').all();assert.equal(audit.length,4);assert.ok(audit.every(row=>row.actor_id===app.adminId&&row.action==='staff-profile.create-initial'&&row.version===1));});
 await app.close();const reopened=await fixture(t,{databasePath:app.databasePath}),reader=reopened.client();await reader.login();assert.deepEqual((await reader.request(route)).body,listed.body);
});

test('teachers see only explicit self links and course or resource read grants never expose another staff personal profile',async t=>{
 const app=await setup(t);seed(app);let own=await app.teacher.request(route);assert.equal(own.status,200,own.text);assert.deepEqual(own.body.records,[{staffId:app.resources[1].id,version:1,...profile(1)}]);assert.doesNotMatch(own.text,/Maya Lam|Ava Hui|Ethan Cheng|staff-1@example/);
 for(const body of [{userId:app.teacherId,kind:'resource',resourceId:app.resources[2].id},{userId:app.teacherId,kind:'course',courseId:'public-course'}]){const grant=await app.admin.request('/api/access-control/grants',{method:'POST',body});assert.equal(grant.status,201,grant.text);}
 assert.deepEqual((await app.teacher.request(route)).body,own.body,'Lesson access grants must not even alter this personal-profile snapshot');const admin=(await app.admin.request(route)).body;assert.notEqual(own.body.revision,admin.revision);assert.equal((await app.teacher.request(route+'?since='+admin.revision)).body.unchanged,undefined);
 const unlinked=await app.admin.request('/api/access-control/teacher-links/'+app.resources[1].id,{method:'PATCH',body:{version:1,userId:null}});assert.equal(unlinked.status,200,unlinked.text);const revoked=await app.teacher.request(route+'?since='+own.body.revision);assert.equal(revoked.status,200,revoked.text);assert.deepEqual(revoked.body.records,[]);assert.notEqual(revoked.body.revision,own.body.revision);assert.doesNotMatch(revoked.text,/Leo Chan|staff-2@example/);
 error(await app.student.request(route),403);error(await app.client().request(route),401);
});

test('initial-only creation refuses collisions foreign resources private fields and non-admin actors without overwriting a profile',async t=>{
 const app=await setup(t),first=app.store.staffPersonalProfiles.createInitial(app.resources[0].id,profile(),app.adminId),before=app.store.staffPersonalProfiles.list({id:app.adminId});
 assert.throws(()=>app.store.staffPersonalProfiles.createInitial(app.resources[0].id,{...profile(),fullName:'Overwritten'},app.adminId),error=>error.status===409);assert.deepEqual(app.store.staffPersonalProfiles.list({id:app.adminId}),before);
 const room=app.store.schedulingResources.create({kind:'room',displayName:'Room'},app.adminId);assert.throws(()=>app.store.staffPersonalProfiles.createInitial(room.id,profile(),app.adminId),error=>error.status===400);assert.throws(()=>app.store.staffPersonalProfiles.createInitial('missing',profile(),app.adminId),error=>error.status===404);assert.throws(()=>app.store.staffPersonalProfiles.createInitial(app.resources[1].id,profile(1),app.teacherId),error=>error.status===403);
 for(const extra of [{salary:40000},{citizenId:'SECRET_ID'},{userId:app.teacherId},{version:7},{bankAccount:'PRIVATE_BANK'},{position:{invalid:true}},{contactEmail:'invalid'},{dateOfBirth:'2026-02-30'},{joined:'not-date'},{remarks:'x'.repeat(2001)}])assert.throws(()=>app.store.staffPersonalProfiles.createInitial(app.resources[1].id,{...profile(1),...extra},app.adminId),error=>error.status===400);
 assert.deepEqual(app.store.staffPersonalProfiles.list({id:app.adminId}).records,[first]);assert.equal(app.store.staffPersonalProfiles.audit().length,1);
});

test('the read DTO excludes even unknown stored salary bank identity and account fields and no mutation HTTP endpoint is available',async t=>{
 const app=await setup(t);seed(app);inspect(app.databasePath,db=>{const row=db.prepare('SELECT profile FROM staff_personal_profiles WHERE teacher_resource_id=?').get(app.resources[0].id),data={...JSON.parse(row.profile),salary:'SECRET_SALARY',bankAccount:'SECRET_BANK',citizenId:'SECRET_ID',password:'SECRET_PASSWORD',userId:'SECRET_USER'};db.prepare('UPDATE staff_personal_profiles SET profile=? WHERE teacher_resource_id=?').run(JSON.stringify(data),app.resources[0].id);});
 const result=await app.admin.request(route);assert.equal(result.status,200,result.text);assert.doesNotMatch(result.text,/SECRET|salary|bankAccount|citizenId|password|userId|profile"/);assert.deepEqual(Object.keys(result.body.records[0]).sort(),['staffId','version',...Object.keys(profile())].sort());
 for(const suffix of ['?staffId='+app.resources[0].id,'?userId='+app.teacherId,'?since=x&since=y','?since='+('x'.repeat(201))])error(await app.admin.request(route+suffix),400);
 for(const method of ['POST','PATCH','DELETE'])error(await app.admin.request(route,{method,body:profile()}),405);
});

test('an initial profile audit failure rolls back its data and a later explicit retry creates only one version and one audit',async t=>{
 const app=await setup(t);inspect(app.databasePath,db=>db.exec("CREATE TRIGGER staff_profile_audit_failure BEFORE INSERT ON staff_personal_profile_audit_log BEGIN SELECT RAISE(ABORT,'Fictional staff profile audit failure'); END;"));
 assert.throws(()=>app.store.staffPersonalProfiles.createInitial(app.resources[0].id,profile(),app.adminId),/Fictional staff profile audit failure/);assert.deepEqual(app.store.staffPersonalProfiles.list({id:app.adminId}).records,[]);assert.deepEqual(app.store.staffPersonalProfiles.audit(),[]);inspect(app.databasePath,db=>db.exec('DROP TRIGGER staff_profile_audit_failure'));
 const saved=app.store.staffPersonalProfiles.createInitial(app.resources[0].id,profile(),app.adminId);assert.equal(saved.version,1);assert.equal(app.store.staffPersonalProfiles.audit().length,1);
});

test('the read whitelist also rejects nested or malformed values inside otherwise allowed stored profile fields',async t=>{
 const app=await setup(t);seed(app);inspect(app.databasePath,db=>{const row=db.prepare('SELECT profile FROM staff_personal_profiles WHERE teacher_resource_id=?').get(app.resources[0].id),data={...JSON.parse(row.profile),fullName:{bankAccount:'NESTED_SECRET'},contactEmail:['PRIVATE_EMAIL'],dateOfBirth:{identity:'PRIVATE_ID'}};db.prepare('UPDATE staff_personal_profiles SET profile=? WHERE teacher_resource_id=?').run(JSON.stringify(data),app.resources[0].id);});
 const reply=await app.admin.request(route);assert.equal(reply.status,200,reply.text);const actual=reply.body.records.find(row=>row.staffId===app.resources[0].id);assert.equal(actual.fullName,'');assert.equal(actual.contactEmail,'');assert.equal(actual.dateOfBirth,null);assert.doesNotMatch(reply.text,/NESTED_SECRET|PRIVATE_EMAIL|PRIVATE_ID|bankAccount/);
});
