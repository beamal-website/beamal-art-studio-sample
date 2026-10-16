import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {Worker} from 'node:worker_threads';
import {createStore} from '../store.mjs';
import {users,seedCourses} from './helpers.mjs';

const fail=(fn,status,code)=>assert.throws(fn,error=>error.status===status&&(!code||error.code===code));
const key=()=>randomUUID();
async function setup(t,options={}){
 const directory=await mkdtemp(join(tmpdir(),'beamal-trial-applications-')),databasePath=join(directory,'isolated.sqlite');
 const store=await createStore({databasePath,seedUsers:[...users,{email:'second-trial-teacher@example.test',password:'Second-trial-teacher-password!',displayName:'Second teacher',role:'teacher'}],seedCourses,trialFormPolicy:'name-whatsapp',...options});
 t.after(async()=>{await store.close();await rm(directory,{recursive:true,force:true});});
 const admin=store.listUsers().find(row=>row.role==='admin'),teacher=store.listUsers().find(row=>row.email===users[2].email),student=store.listUsers().find(row=>row.role==='student');
 const resource=store.schedulingResources.create({kind:'teacher',displayName:'Trial assigned teacher'},admin.id),other=store.schedulingResources.create({kind:'teacher',displayName:'Different trial teacher'},admin.id);
 store.accessControl.setTeacherLink(resource.id,{version:0,userId:teacher.id},admin.id);
 const slot=store.availableSlots.create({courseId:'public-course',date:'2030-01-02',time:'13:00',duration:60,teacherIds:[resource.id],roomIds:[],totalCapacity:8,trialCapacity:1,reschedulingCapacity:2,trialEnabled:true,reschedulingEnabled:true,active:true,publicVisibility:'default',excludedStudentIds:[],remark:'PRIVATE SLOT NOTE'},admin.id);
 return {store,admin,teacher,student,resource,other,slot,databasePath};
}
function submission(app,applicant={}){
 const from='2030-01-01',days=7,detail=app.store.availableSlots.publicDetail('public-course',{from,days});
 return {courseId:'public-course',slotId:app.slot.id,from,days,revision:detail.revision,applicant:{localName:'  梁同學  ',fullName:'Lin Leung',dateOfBirth:'2018-02-28',gender:'unspecified',school:'Sample school',referrer:'A genuine friend referral',parentName:'Guardian Leung',whatsapp:'+852 5555 1234',email:'guardian@example.test',remark:' Please call after 5pm. ',...applicant}};
}
function counts(path){const db=new DatabaseSync(path);try{return Object.fromEntries(['people','person_audit_log','availability_reservations','trial_applications','trial_application_events','public_trial_receipts','enrollment_orders','student_sessions','student_account_links'].map(name=>[name,db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get().n]));}finally{db.close();}}

test('public Trial production policy remains closed until explicitly chosen and never creates a profile or hold',async t=>{
 const app=await setup(t,{trialFormPolicy:null}),before=counts(app.databasePath);
 assert.deepEqual(app.store.trialApplications.policy(),{policy:null});
 fail(()=>app.store.trialApplications.submit(submission(app),{key:key()}),503,'TRIAL_NOT_OPEN');
 assert.deepEqual(counts(app.databasePath),before);
});

test('public Trial creates one canonical Applicant and existing Trial hold with truthful audit and real teacher work records',async t=>{
 const app=await setup(t),input=submission(app),before=app.store.listUsers(),ack=app.store.trialApplications.submit(input,{key:key()});
 assert.deepEqual(Object.keys(ack).sort(),['outcome','reference']);assert.equal(ack.outcome,'received');assert.ok(ack.reference.length>8);
 const list=app.store.trialApplications.list({},app.admin);assert.equal(list.total,1);const saved=app.store.trialApplications.get(list.records[0].id,app.admin);
 assert.equal(saved.reference,ack.reference);assert.equal(saved.status,'pending');assert.equal(saved.version,1);assert.equal(saved.canReject,true);
 const person=app.store.people.get(saved.personId,app.admin.id);assert.equal(person.kind,'applicant');assert.equal(person.displayName,'梁同學');assert.equal(person.whatsApp,input.applicant.whatsapp);assert.equal(person.referrer,input.applicant.referrer);assert.equal(saved.applicant.remark,'Please call after 5pm.');
 assert.deepEqual(app.store.people.history(person.id,app.admin.id).map(row=>[row.action,row.actor]),[['person.public-create',{id:null,displayName:'Public trial form'}]]);
 assert.equal(saved.events.length,1);assert.equal(saved.events[0].type,'submitted');assert.deepEqual(saved.events[0].actor,{id:null,displayName:'Public trial form'});
 assert.equal(app.store.availableSlots.get(app.slot.id,app.admin).trialReserved,1);assert.equal(app.store.availableSlots.get(app.slot.id,app.admin).reschedulingReserved,0);
 assert.deepEqual(app.store.listUsers(),before);assert.deepEqual(counts(app.databasePath),{people:1,person_audit_log:1,availability_reservations:1,trial_applications:1,trial_application_events:1,public_trial_receipts:1,enrollment_orders:0,student_sessions:0,student_account_links:0});
 const work=app.store.trialApplications.workSnapshot(app.teacher);assert.equal(work.pendingTotal,1);assert.equal(work.requests[0].id,saved.id);assert.equal(work.notifications[0].applicationId,saved.id);assert.equal(work.notifications[0].type,'submitted');assert.equal(work.hasMoreRequests,false);
 assert.deepEqual(app.store.trialApplications.workSnapshot(app.teacher,{since:work.revision}),{revision:work.revision,unchanged:true,pendingTotal:1});
 for(const secret of[person.id,input.applicant.email,input.applicant.whatsapp,'PRIVATE SLOT NOTE',app.resource.id,'sourceIdentity'])assert.equal(JSON.stringify(ack).includes(secret),false);
});

test('same-key retry survives its own last-seat hold and rejection without duplicate people events or rebooking',async t=>{
 const app=await setup(t),input=submission(app),requestKey=key(),ack=app.store.trialApplications.submit(input,{key:requestKey}),after=counts(app.databasePath);
 assert.deepEqual(app.store.trialApplications.submit(input,{key:requestKey}),ack);assert.deepEqual(counts(app.databasePath),after);
 const reordered={applicant:Object.fromEntries(Object.entries(input.applicant).reverse()),...Object.fromEntries(Object.entries(input).filter(([field])=>field!=='applicant').reverse())};assert.deepEqual(app.store.trialApplications.submit(reordered,{key:requestKey}),ack);
 fail(()=>app.store.trialApplications.submit({...input,applicant:{...input.applicant,parentName:'Another guardian'}},{key:requestKey}),409,'IDEMPOTENCY_CONFLICT');
 fail(()=>app.store.trialApplications.submit({...input,applicant:{...input.applicant,email:'not-an-email'}},{key:requestKey}),409,'IDEMPOTENCY_CONFLICT');
 fail(()=>app.store.trialApplications.submit({...input,unexpected:'a different body'},{key:requestKey}),409,'IDEMPOTENCY_CONFLICT');
 const row=app.store.trialApplications.list({},app.admin).records[0];const rejected=app.store.trialApplications.reject(row.id,{version:1},app.teacher);
 assert.equal(rejected.status,'rejected');assert.equal(rejected.version,2);assert.equal(rejected.canReject,false);assert.equal(rejected.events.length,2);assert.equal(app.store.availableSlots.get(app.slot.id,app.admin).trialReserved,0);
 const heldAfterReject=counts(app.databasePath);assert.deepEqual(app.store.trialApplications.submit(input,{key:requestKey}),ack);assert.deepEqual(counts(app.databasePath),heldAfterReject);
 fail(()=>app.store.trialApplications.reject(row.id,{version:1},app.teacher),409);assert.equal(app.store.trialApplications.workSnapshot(app.teacher).pendingTotal,0);
 assert.equal(app.store.people.get(row.personId,app.admin.id).kind,'applicant');
});

test('unrelated or read-grant-only teacher and Student cannot read contacts or reject a real Trial Request',async t=>{
 const app=await setup(t),ack=app.store.trialApplications.submit(submission(app),{key:key()}),row=app.store.trialApplications.list({},app.admin).records[0];
 storeReadGrant(app,'course','public-course');
 const link=app.store.accessControl.managementSnapshot(app.admin.id).teacherLinks.find(row=>row.teacherResourceId===app.resource.id);
 app.store.accessControl.setTeacherLink(app.resource.id,{version:link.version,userId:null},app.admin.id);
 assert.equal(app.store.trialApplications.list({},app.teacher).total,0);assert.equal(app.store.trialApplications.workSnapshot(app.teacher).pendingTotal,0);
 for(const user of[app.teacher,app.student,{id:'unknown',role:'admin'}]){fail(()=>app.store.trialApplications.get(row.id,user),user===app.teacher?404:403);fail(()=>app.store.trialApplications.authorizeReject(row.id,user),user===app.teacher?404:403);}
 assert.equal(app.store.trialApplications.get(row.id,app.admin).reference,ack.reference);assert.equal(app.store.availableSlots.get(app.slot.id,app.admin).trialReserved,1);
});
function storeReadGrant(app,kind,id){app.store.accessControl.createGrant({userId:app.teacher.id,kind,...(kind==='course'?{courseId:id}:{resourceId:id})},app.admin.id);}

test('the three explicitly configured form policies require only their chosen minimum and all public keys remain strict',async t=>{
 for(const policy of['name-birth-whatsapp','name-whatsapp','name-contact']){
  const app=await setup(t,{trialFormPolicy:policy});assert.deepEqual(app.store.trialApplications.policy(),{policy});
  const valid=submission(app,{localName:'',fullName:'English-only name',dateOfBirth:policy==='name-birth-whatsapp'?'2020-01-01':'',whatsapp:policy==='name-contact'?'':'+852 5555 1111',email:policy==='name-contact'?'contact@example.test':'',gender:'',parentName:''});
  const invalid=[{...valid,forgedPersonId:'existing'},{...valid,days:'7'},{...valid,days:31},{...valid,from:'2030-02-30'},{...valid,revision:'unknown'},
   {...valid,applicant:{...valid.applicant,kind:'student'}},{...valid,applicant:{...valid.applicant,localName:'',fullName:'  '}},{...valid,applicant:{...valid.applicant,email:'invalid'}},
   {...valid,applicant:{...valid.applicant,dateOfBirth:'9999-01-01'}},{...valid,applicant:{...valid.applicant,gender:'unverified'}},{...valid,applicant:{...valid.applicant,whatsapp:'x'.repeat(81)}},{...valid,applicant:{...valid.applicant,remark:null}}];
  if(policy==='name-birth-whatsapp')invalid.push({...valid,applicant:{...valid.applicant,dateOfBirth:''}});
  if(policy!=='name-contact')invalid.push({...valid,applicant:{...valid.applicant,whatsapp:''}});
  else invalid.push({...valid,applicant:{...valid.applicant,email:'',whatsapp:''}});
  const before=counts(app.databasePath);for(const input of invalid){fail(()=>app.store.trialApplications.submit(input,{key:key()}),400);assert.deepEqual(counts(app.databasePath),before);}
  for(const badKey of[undefined,'short','0'.repeat(31),'contains spaces'.repeat(4),true])fail(()=>app.store.trialApplications.submit(valid,{key:badKey}),400);
  assert.equal(app.store.trialApplications.submit(valid,{key:key()}).outcome,'received');
 }
});

test('new submissions fail on stale exact range and private source changes without leaving orphan Applicants',async t=>{
 const app=await setup(t),before=counts(app.databasePath),input=submission(app);
 for(const changed of[{slotId:'unknown'},{courseId:'private-course'},{revision:'a'.repeat(64)},{from:'2030-01-03'},{days:14}]){fail(()=>app.store.trialApplications.submit({...input,...changed},{key:key()}),409);assert.deepEqual(counts(app.databasePath),before);}
 app.store.availableSlots.update(app.slot.id,{version:1,publicVisibility:'hide'},app.admin.id);
 fail(()=>app.store.trialApplications.submit(input,{key:key()}),409,'TRIAL_SOURCE_UNAVAILABLE');assert.deepEqual(counts(app.databasePath),before);
 app.store.availableSlots.update(app.slot.id,{version:2,publicVisibility:'show',trialEnabled:false},app.admin.id);
 fail(()=>app.store.trialApplications.submit(submission(app),{key:key()}),409,'TRIAL_SOURCE_UNAVAILABLE');assert.deepEqual(counts(app.databasePath),before);
 app.store.availableSlots.update(app.slot.id,{version:3,trialEnabled:true,active:false},app.admin.id);
 fail(()=>app.store.trialApplications.submit(input,{key:key()}),409,'TRIAL_SOURCE_UNAVAILABLE');assert.deepEqual(counts(app.databasePath),before);
});

test('Class Full and rescheduling use never consume Trial seats and Trial Full never becomes an enrolled Class',async t=>{
 const app=await setup(t),rule={course:'public-course',startDate:'2030-01-02',time:'15:00',duration:60,weekdays:[3],endMode:'count',count:2,teacherIds:[app.resource.id],roomIds:[],capacity:8};
 const schedule=app.store.schedules.create(rule,app.admin.id);
 app.slot=app.store.availableSlots.create({scheduleId:schedule.id,sequence:1,totalCapacity:8,trialCapacity:1,reschedulingCapacity:1,trialEnabled:true,reschedulingEnabled:true,active:true,publicVisibility:'default',excludedStudentIds:[],remark:''},app.admin.id);
 app.store.classCapacityStatuses.update(schedule.id,1,{version:0,sourceVersion:1,manualStatus:'full'},app.admin);
 const db=new DatabaseSync(app.databasePath);try{db.prepare("INSERT INTO availability_reservations(id,slot_id,kind,state) VALUES (?,?,'rescheduling','held')").run(key(),app.slot.id);}finally{db.close();}
 assert.equal(app.store.availableSlots.get(app.slot.id,app.admin).classCapacityStatus.effectiveStatus,'full');
 app.store.trialApplications.submit(submission(app),{key:key()});const row=app.store.trialApplications.list({},app.admin).records[0];
 const full=app.store.availableSlots.get(app.slot.id,app.admin);assert.equal(full.trialReserved,1);assert.equal(full.reschedulingReserved,1);assert.equal(full.classOccupied,0);assert.equal(full.trialStatus,'full');
 app.store.classCapacityStatuses.update(schedule.id,1,{version:1,sourceVersion:1,manualStatus:'available'},app.admin);
 fail(()=>app.store.trialApplications.submit(submission(app),{key:key()}),409,'TRIAL_FULL');
 const rejected=app.store.trialApplications.reject(row.id,{version:1},app.admin);assert.equal(rejected.status,'rejected');const released=app.store.availableSlots.get(app.slot.id,app.admin);assert.equal(released.trialReserved,0);assert.equal(released.reschedulingReserved,1);assert.equal(released.classOccupied,0);
});

test('public submission and Reject roll back canonical profiles holds events and receipts together on audit or receipt failure',async t=>{
 const app=await setup(t),db=new DatabaseSync(app.databasePath),before=counts(app.databasePath);
 try{
  for(const table of['person_audit_log','trial_application_events','public_trial_receipts']){
   db.exec(`CREATE TRIGGER isolated_trial_failure BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT,'isolated trial rollback'); END;`);
   assert.throws(()=>app.store.trialApplications.submit(submission(app),{key:key()}),/isolated trial rollback/);assert.deepEqual(counts(app.databasePath),before);db.exec('DROP TRIGGER isolated_trial_failure');
  }
  const input=submission(app),requestKey=key();app.store.trialApplications.submit(input,{key:requestKey});const row=app.store.trialApplications.list({},app.admin).records[0],savedCounts=counts(app.databasePath);
  db.exec("CREATE TRIGGER isolated_reject_failure BEFORE INSERT ON trial_application_events WHEN NEW.type='rejected' BEGIN SELECT RAISE(ABORT,'isolated reject rollback'); END;");
  assert.throws(()=>app.store.trialApplications.reject(row.id,{version:1},app.admin),/isolated reject rollback/);
  assert.deepEqual(counts(app.databasePath),savedCounts);assert.equal(app.store.trialApplications.get(row.id,app.admin).status,'pending');assert.equal(app.store.availableSlots.get(app.slot.id,app.admin).trialReserved,1);
  db.exec('DROP TRIGGER isolated_reject_failure');assert.equal(app.store.trialApplications.reject(row.id,{version:1},app.admin).status,'rejected');
 }finally{db.close();}
});

test('person audit upgrade preserves old IDs sequence custom index and trigger while new anonymous history survives restart',async t=>{
 const app=await setup(t),person=app.store.people.create({displayName:'Existing audited applicant'},app.admin.id),history=app.store.people.history(person.id,app.admin.id),input=submission(app),requestKey=key();
 await app.store.close();const old=new DatabaseSync(app.databasePath);
 try{old.exec(`ALTER TABLE person_audit_log RENAME TO old_person_audit;
  CREATE TABLE person_audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT,person_id TEXT NOT NULL REFERENCES people(id),actor_id TEXT NOT NULL REFERENCES users(id),actor_name TEXT NOT NULL,action TEXT NOT NULL,version INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL);
  INSERT INTO person_audit_log SELECT * FROM old_person_audit;DROP TABLE old_person_audit;
  CREATE INDEX person_audit_person ON person_audit_log(person_id,id);
  CREATE INDEX isolated_preserved_index ON person_audit_log(action);
  CREATE TABLE isolated_audit_probe(id INTEGER);
  CREATE TRIGGER isolated_preserved_trigger AFTER INSERT ON person_audit_log BEGIN INSERT INTO isolated_audit_probe VALUES(NEW.id); END;
  UPDATE sqlite_sequence SET seq=999 WHERE name='person_audit_log';`);
 }finally{old.close();}
 const reopened=await createStore({databasePath:app.databasePath,trialFormPolicy:'name-whatsapp'});
 try{
  assert.deepEqual(reopened.people.history(person.id,app.admin.id),history);const ack=reopened.trialApplications.submit(input,{key:requestKey}),rows=reopened.trialApplications.list({},app.admin).records;
  assert.equal(rows.length,1);const audit=reopened.people.history(rows[0].personId,app.admin.id);assert.equal(audit[0].id,1000);assert.equal(audit[0].actor.id,null);
  const inspect=new DatabaseSync(app.databasePath);try{assert.equal(inspect.prepare('PRAGMA table_info(person_audit_log)').all().find(row=>row.name==='actor_id').notnull,0);assert.equal(inspect.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('isolated_preserved_index','isolated_preserved_trigger','person_audit_person')").get().n,3);assert.equal(inspect.prepare('SELECT id FROM isolated_audit_probe').get().id,1000);assert.deepEqual(inspect.prepare('PRAGMA foreign_key_check').all(),[]);}finally{inspect.close();}
  const saved=reopened.trialApplications.get(rows[0].id,app.admin);await reopened.close();const again=await createStore({databasePath:app.databasePath,trialFormPolicy:null});
  try{assert.deepEqual(again.trialApplications.get(rows[0].id,app.admin),saved);assert.deepEqual(again.trialApplications.submit(input,{key:requestKey}),ack);fail(()=>again.trialApplications.submit({...input,applicant:{...input.applicant,remark:'different'}},{key:requestKey}),409);fail(()=>again.trialApplications.submit(input,{key:key()}),503);assert.deepEqual(again.people.history(person.id,app.admin.id),history);}finally{await again.close();}
 }finally{await reopened.close();}
});

test('real Request pages and Teacher work expose bounded records with exact totals and canonical profile updates',async t=>{
 const app=await setup(t);app.store.availableSlots.update(app.slot.id,{version:1,trialCapacity:55},app.admin.id);
 for(let n=0;n<53;n++)app.store.trialApplications.submit(submission(app,{localName:'Applicant '+n}),{key:key()});
 const first=app.store.trialApplications.list({page:1,pageSize:20},app.teacher),second=app.store.trialApplications.list({page:2,pageSize:20},app.teacher);assert.equal(first.total,53);assert.equal(first.records.length,20);assert.equal(second.records.length,20);assert.equal(new Set([...first.records,...second.records].map(row=>row.id)).size,40);assert.notEqual(first.revision,second.revision);
 assert.deepEqual(app.store.trialApplications.list({page:1,pageSize:20,since:first.revision},app.teacher),{revision:first.revision,unchanged:true,page:1,pageSize:20,total:53});
 const work=app.store.trialApplications.workSnapshot(app.teacher);assert.equal(work.pendingTotal,53);assert.equal(work.requests.length,50);assert.equal(work.notifications.length,50);assert.equal(work.hasMoreRequests,true);assert.equal(work.hasMoreNotifications,true);
 const exact=first.records[0];assert.deepEqual(app.store.trialApplications.list({personId:exact.personId},app.admin).records.map(row=>row.id),[exact.id]);
 app.store.people.update(exact.personId,{version:1,referrer:'A corrected canonical referral'},app.admin.id);const changed=app.store.trialApplications.list({page:1,pageSize:20,since:first.revision},app.teacher);assert.equal(changed.unchanged,undefined);assert.equal(changed.records.find(row=>row.id===exact.id).applicant.referrer,'A corrected canonical referral');
 for(const query of[{status:'paid'},{status:null},{page:0},{pageSize:101},{sort:'private'},{personId:null}])fail(()=>app.store.trialApplications.list(query,app.admin),400);
 for(const options of[{since:null},{private:'unexpected'},null])fail(()=>app.store.trialApplications.workSnapshot(app.admin,options),400);
 app.store.trialApplications.reject(exact.id,{version:1},app.teacher);assert.equal(app.store.trialApplications.list({status:'rejected'},app.teacher).total,1);assert.equal(app.store.trialApplications.workSnapshot(app.teacher).pendingTotal,52);
});

test('two isolated processes competing for the last Trial seat leave exactly one applicant application hold and receipt',async t=>{
 const app=await setup(t),input=submission(app),moduleUrl=new URL('../store.mjs',import.meta.url).href;
 const launch=()=>new Promise((resolve,reject)=>{
  const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');
   (async()=>{const {createStore}=await import(workerData.moduleUrl),store=await createStore({databasePath:workerData.databasePath,trialFormPolicy:'name-whatsapp'});
    parentPort.once('message',async()=>{let result;try{result={status:201,ack:store.trialApplications.submit(workerData.input,{key:workerData.key})};}catch(error){result={status:error.status||500,code:error.code};}finally{await store.close();}parentPort.postMessage(result);});parentPort.postMessage({ready:true});
   })().catch(error=>{parentPort.postMessage({fatal:error.message});process.exitCode=1;});`,{eval:true,workerData:{databasePath:app.databasePath,moduleUrl,input,key:key()}});
  worker.once('error',reject);worker.once('message',message=>{if(message.fatal)reject(new Error(message.fatal));else resolve({worker,result:new Promise((done,failed)=>{worker.once('error',failed);worker.once('message',done);})});});
 });
 const competitors=await Promise.all([launch(),launch()]);for(const contender of competitors)contender.worker.postMessage('submit');const results=await Promise.all(competitors.map(row=>row.result));
 assert.deepEqual(results.map(row=>row.status).sort(),[201,409]);assert.equal(results.find(row=>row.status===409).code,'TRIAL_FULL');
 assert.equal(app.store.trialApplications.list({},app.admin).total,1);assert.equal(app.store.availableSlots.get(app.slot.id,app.admin).trialReserved,1);
 assert.deepEqual(counts(app.databasePath),{people:1,person_audit_log:1,availability_reservations:1,trial_applications:1,trial_application_events:1,public_trial_receipts:1,enrollment_orders:0,student_sessions:0,student_account_links:0});
});

test('Admin cleanup remains possible after linked cancellation and public withdrawal without changing the immutable receipt',async t=>{
 const app=await setup(t),rule={course:'public-course',startDate:'2030-01-02',time:'16:00',duration:60,weekdays:[3],endMode:'count',count:2,teacherIds:[app.resource.id],roomIds:[],capacity:8},schedule=app.store.schedules.create(rule,app.admin.id);
 app.slot=app.store.availableSlots.create({scheduleId:schedule.id,sequence:1,totalCapacity:8,trialCapacity:1,reschedulingCapacity:0,trialEnabled:true,reschedulingEnabled:false,active:true,publicVisibility:'default',excludedStudentIds:[],remark:''},app.admin.id);
 const input=submission(app),requestKey=key(),ack=app.store.trialApplications.submit(input,{key:requestKey}),row=app.store.trialApplications.list({},app.admin).records[0];
 app.store.availableSlots.update(app.slot.id,{version:1,publicVisibility:'hide'},app.admin.id);assert.deepEqual(app.store.trialApplications.submit(input,{key:requestKey}),ack);
 app.store.schedules.deleteOccurrence(schedule.id,1,{version:1,scope:'single'},app.admin.id);assert.equal(app.store.trialApplications.list({},app.teacher).total,0);fail(()=>app.store.trialApplications.get(row.id,app.teacher),404);
 const rejected=app.store.trialApplications.reject(row.id,{version:1},app.admin);assert.equal(rejected.status,'rejected');assert.equal(app.store.availableSlots.get(app.slot.id,app.admin).trialReserved,0);assert.deepEqual(app.store.trialApplications.submit(input,{key:requestKey}),ack);
 const text=JSON.stringify(app.store.availableSlots.publicTimetable({from:'2030-01-01',days:7}));for(const secret of[row.personId,input.applicant.email,input.applicant.whatsapp,'reservation_id','source_identity'])assert.equal(text.includes(secret),false);
});


test('a newly responsible Teacher can reject a moved linked Trial hold while the former Teacher loses Request access',async t=>{
 const app=await setup(t),newTeacher=app.store.listUsers().find(row=>row.email==='second-trial-teacher@example.test');
 app.store.accessControl.setTeacherLink(app.other.id,{version:0,userId:newTeacher.id},app.admin.id);
 const rule={course:'public-course',startDate:'2030-01-02',time:'14:00',duration:60,weekdays:[3],endMode:'count',count:2,teacherIds:[app.resource.id],roomIds:[],capacity:8};
 const schedule=app.store.schedules.create(rule,app.admin.id);
 app.slot=app.store.availableSlots.create({scheduleId:schedule.id,sequence:1,totalCapacity:8,trialCapacity:1,reschedulingCapacity:0,trialEnabled:true,reschedulingEnabled:false,active:true,publicVisibility:'default',excludedStudentIds:[],remark:''},app.admin.id);
 const originalInput=submission(app),requestKey=key(),ack=app.store.trialApplications.submit(originalInput,{key:requestKey}),row=app.store.trialApplications.list({},app.teacher).records[0];
 app.store.schedules.editOccurrence(schedule.id,1,{...rule,version:1,scope:'single',teacherIds:[app.other.id],time:'15:00'},app.admin.id);
 assert.equal(app.store.availableSlots.get(app.slot.id,app.admin).unavailableReason,'HELD_SOURCE_CHANGED');
 fail(()=>app.store.trialApplications.get(row.id,app.teacher),404);
 assert.equal(app.store.trialApplications.list({},newTeacher).total,1);
 assert.equal(app.store.trialApplications.workSnapshot(newTeacher).pendingTotal,1);
 assert.equal(app.store.trialApplications.get(row.id,newTeacher).slot.time,'14:00');
 const rejected=app.store.trialApplications.reject(row.id,{version:1},newTeacher);assert.equal(rejected.status,'rejected');
 assert.equal(app.store.availableSlots.get(app.slot.id,app.admin).trialReserved,0);
 assert.deepEqual(app.store.trialApplications.submit(originalInput,{key:requestKey}),ack);
});
