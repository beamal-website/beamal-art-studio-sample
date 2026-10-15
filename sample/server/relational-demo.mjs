import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {isAbsolute,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {open,readFile,stat,unlink} from 'node:fs/promises';
import {createStore} from './store.mjs';
import {DEMO_IDS} from './demo-accounts.mjs';
import {relationalStudentProfile} from './demo-student-profiles.mjs';
import {scheduleOccurrences} from '../shared/schedule-occurrences.js';

// Deliberately not imported by normal startup. Only an explicit local provision
// call may adopt these records; names are never used to discover ownership.
const profileKey='relational-centre-demo-v1',markerKey='relational_centre_demo_v1';
const studentIds=Array.from({length:299},(_,index)=>`d4300000-0000-4000-8000-${String(index+1).padStart(12,'0')}`);
export const RELATIONAL_DEMO_IDS=Object.freeze({students:Object.freeze(studentIds)});
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const invalid=message=>fail('RELATIONAL_DEMO_INVALID_MAPPING',message);
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const addDays=(date,count)=>{const value=new Date(date+'T00:00:00Z');value.setUTCDate(value.getUTCDate()+count);return value.toISOString().slice(0,10);};
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const allStudentIds=[DEMO_IDS.studentPerson,...studentIds];
function normalizeMapping(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['courses','teachers','rooms','startDate'].includes(key)))invalid('Provide courses, teachers, rooms and startDate explicitly.');
 if(!validDate(value.startDate)||!Array.isArray(value.courses)||value.courses.length!==6||!Array.isArray(value.teachers)||value.teachers.length!==4||!Array.isArray(value.rooms)||!value.rooms.length||value.rooms.length>10)invalid('Choose six courses, four teachers, at least one room and an ISO start date.');
 const courses=value.courses.map(row=>{if(!row||!validId(row.id)||!validId(row.feeId)||Object.keys(row).some(key=>!['id','feeId'].includes(key)))invalid('Each course requires its explicit course id and feeId.');return {id:row.id,feeId:row.feeId};});
 const teachers=['maya','leo','ava','ethan'].map(key=>{const row=value.teachers.find(row=>row?.key===key);if(!row||!validId(row.id)||Object.keys(row).some(field=>!['key','id'].includes(field)))invalid('Use the four named teacher keys and explicit resource IDs.');return {key,id:row.id};});
 const rooms=value.rooms.map(row=>{if(!row||!validId(row.id)||Object.keys(row).some(key=>key!=='id'))invalid('Each room requires its explicit resource ID.');return {id:row.id};});
 if(new Set(courses.map(row=>row.id)).size!==6||new Set(teachers.map(row=>row.id)).size!==4||new Set(rooms.map(row=>row.id)).size!==rooms.length)invalid('Mapped records must be distinct.');
 if(courses[0].id!==DEMO_IDS.course||teachers[0].id!==DEMO_IDS.teachers.maya||teachers[1].id!==DEMO_IDS.teachers.leo)invalid('Reuse the original course and fixed Maya/Leo teacher identities.');
 return {courses,teachers,rooms,startDate:value.startDate};
}
function marker(db){const row=db.prepare('SELECT value FROM schema_metadata WHERE name=?').get(markerKey);if(!row)return null;try{return JSON.parse(row.value);}catch{fail('RELATIONAL_DEMO_CONFLICT','The existing fixture marker cannot be verified.');}}
function verifyMarker(saved,mapping){
 if(saved.profileKey!==profileKey||!['profiles','complete'].includes(saved.phase))fail('RELATIONAL_DEMO_CONFLICT','The fixture marker belongs to another profile.');
 if(saved.mappingHash!==fingerprint(mapping)||JSON.stringify(saved.mapping)!==JSON.stringify(mapping))fail('RELATIONAL_DEMO_MAPPING_DRIFT','The adoption mapping or start date changed. Existing data was not reset.');
 if(JSON.stringify(saved.studentIds)!==JSON.stringify(allStudentIds))fail('RELATIONAL_DEMO_CONFLICT','The fixture student ownership list changed.');
}
function requireOriginalProfile(db){
 let saved,student;
 try{saved=JSON.parse(db.prepare("SELECT value FROM schema_metadata WHERE name='checkpoint_demo3_v1'").get()?.value);student=JSON.parse(db.prepare("SELECT value FROM schema_metadata WHERE name='checkpoint_demo3_student_v1'").get()?.value);}catch{invalid('Provision the original three-account fixture explicitly first.');}
 if(saved?.profileKey!=='checkpoint-demo3-v1'||saved.ids?.users?.maya!==DEMO_IDS.users.maya||saved.ids?.users?.leo!==DEMO_IDS.users.leo||saved.ids?.users?.chloe!==DEMO_IDS.users.chloe||student?.personId!==DEMO_IDS.studentPerson)invalid('The original three-account fixture ownership could not be verified.');
 for(const [id,role]of[[DEMO_IDS.users.maya,'admin'],[DEMO_IDS.users.leo,'teacher'],[DEMO_IDS.users.chloe,'student']])if(db.prepare('SELECT role FROM users WHERE id=?').get(id)?.role!==role)invalid('The original named account role changed.');
 for(const key of['maya','leo'])if(db.prepare('SELECT user_id FROM teacher_account_links WHERE teacher_resource_id=?').get(DEMO_IDS.teachers[key])?.user_id!==DEMO_IDS.users[key])invalid('Keep the explicitly linked Maya and Leo teaching identities.');
 const child=db.prepare("SELECT profile FROM people WHERE id=? AND kind='student'").get(DEMO_IDS.studentPerson);
 if(!child||JSON.parse(child.profile).quitDate)invalid('Chloe must remain an active formal Student.');
 const childLink=db.prepare('SELECT user_id FROM student_account_links WHERE student_id=?').get(DEMO_IDS.studentPerson);
 if(childLink&&childLink.user_id!==DEMO_IDS.users.chloe)fail('RELATIONAL_DEMO_LINK_CONFLICT','Chloe already has a different or explicitly removed account link.');
}
function readAdoption(db,mapping){
 const resource=id=>{const row=db.prepare('SELECT * FROM scheduling_resources WHERE id=?').get(id);return row?{id:row.id,kind:row.kind,active:!!row.active,...JSON.parse(row.metadata)}:null;};
 const schedule=row=>row?{...JSON.parse(row.data),id:row.id,course:row.course_id,version:row.version,...(row.deleted_at?{activityDeleted:true}:{})}:null;
 return {teachers:mapping.teachers.map(row=>resource(row.id)),rooms:mapping.rooms.map(row=>resource(row.id)),courses:mapping.courses.map(({id})=>{const row=db.prepare('SELECT * FROM courses WHERE id=?').get(id);return row?{id,...JSON.parse(row.data),deletedAt:row.deleted_at}:null;}),fees:mapping.courses.map(({feeId})=>{const row=db.prepare('SELECT * FROM fees WHERE id=?').get(feeId);return row?{id:row.id,...JSON.parse(row.data),price:row.price_cents/100,courseIds:db.prepare('SELECT course_id FROM course_fees WHERE fee_id=?').all(feeId).map(row=>row.course_id)}:null;}),reuse:schedule(db.prepare('SELECT * FROM schedules WHERE id=?').get(DEMO_IDS.schedules.leo)),schedules:db.prepare('SELECT * FROM schedules WHERE deleted_at IS NULL').all().map(schedule)};
}
function storeAdoption(store,mapping){return {teachers:mapping.teachers.map(row=>store.schedulingResources.get(row.id)),rooms:mapping.rooms.map(row=>store.schedulingResources.get(row.id)),courses:mapping.courses.map(row=>store.getCourse(row.id)),fees:mapping.courses.map(row=>store.getFee(row.feeId)),reuse:store.schedules.get(DEMO_IDS.schedules.leo),schedules:store.schedules.list().schedules};}
function rulesFor(source,mapping){
 if(source.teachers.some(row=>!row||row.kind!=='teacher'||!row.active)||source.rooms.some(row=>!row||row.kind!=='room'||!row.active))invalid('Mapped teacher and room resources must exist and be active.');
 for(let i=0;i<6;i++)if(!source.courses[i]||source.courses[i].deletedAt||!source.fees[i]?.courseIds.includes(mapping.courses[i].id))invalid('Every selected fee must belong to its existing active course.');
 const reused=source.reuse;
 if(!reused||reused.activityDeleted||reused.course!==mapping.courses[0].id||!reused.teacherIds?.includes(DEMO_IDS.teachers.leo)||!reused.roomIds?.every(id=>mapping.rooms.some(room=>room.id===id))||!Number.isSafeInteger(reused.capacity)||reused.capacity<1||reused.capacity>8)invalid('The original Leo class must remain active, assigned to Leo and a mapped room, with capacity at most eight.');
 if(!scheduleOccurrences(reused,mapping.startDate,addDays(mapping.startDate,35)).length)invalid('The original Leo class has no upcoming lesson in the selected sample period.');
 const teachers=['leo','maya','ava','ethan','maya'],days=[1,1,2,2,2],times=['10:00','12:00','10:00','12:00','14:00'];
 return mapping.courses.slice(1).map((course,index)=>{
  const room=source.rooms[index%source.rooms.length],startDate=addDays(mapping.startDate,days[index]),fee=source.fees[index+1],duration=fee.pricingModel==='monthly-lessons'?fee.duration:60;
  if(!Number.isSafeInteger(duration)||duration<1||duration>120)invalid('The sample plan supports existing lesson durations up to 120 minutes.');
  return {course:course.id,startDate,time:times[index],duration,weekdays:[new Date(startDate+'T00:00:00Z').getUTCDay()],endMode:'count',count:4,mustAttendAll:true,color:'#27777b',teacherIds:[mapping.teachers.find(row=>row.key===teachers[index]).id],roomIds:[room.id],capacity:Math.min(8,room.capacity??8),session:1,remark:'請自備圍裙及飲用水。',detail:'',moreInfo:''};
 });
}
function assertNoConflicts(rules,existing,mapping){
 const planned=[];
 for(const [index,rule]of rules.entries()){
  const schedule={...rule,id:'planned-'+index};
  for(const next of scheduleOccurrences(schedule,mapping.startDate,addDays(mapping.startDate,35))){
   for(const other of[...existing,...planned])for(const prior of scheduleOccurrences(other,next.date,next.date)){
    const shared=['teacherIds','roomIds'].some(key=>(next.item[key]||[]).some(id=>(prior.item[key]||[]).includes(id))),minutes=time=>Number(time.slice(0,2))*60+Number(time.slice(3)),start=minutes(next.item.time),priorStart=minutes(prior.item.time);
    if(shared&&start<priorStart+prior.item.duration&&priorStart<start+next.item.duration)fail('RELATIONAL_DEMO_SCHEDULE_CONFLICT','An existing teacher or room assignment overlaps the sample plan. No existing lesson was moved.');
   }
  }
  planned.push(schedule);
 }
}
function makeStudent(index,startDate){
 return relationalStudentProfile(index,startDate);
}
function importProfiles(databasePath,mapping){
 const db=new DatabaseSync(databasePath);db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE;');
 try{
  const saved=marker(db);if(saved){verifyMarker(saved,mapping);db.exec('COMMIT');return saved;}
  requireOriginalProfile(db);const source=readAdoption(db,mapping),rules=rulesFor(source,mapping);assertNoConflicts(rules,source.schedules,mapping);
  for(const id of studentIds)if(db.prepare('SELECT id FROM people WHERE id=?').get(id))fail('RELATIONAL_DEMO_CONFLICT','An unowned record already uses a requested fixture ID.');
  const now=new Date().toISOString(),actor=db.prepare('SELECT display_name FROM users WHERE id=?').get(DEMO_IDS.users.maya);
  for(const [index,id]of studentIds.entries()){
   const profile=makeStudent(index,mapping.startDate);
   db.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES (?,'student',?,?,?,1,?,?)").run(id,profile.displayName,JSON.stringify(profile),Object.values(profile).filter(value=>typeof value==='string').join('\n').toLowerCase(),now,now);
   db.prepare('INSERT INTO person_audit_log(person_id,actor_id,actor_name,action,version,snapshot,created_at) VALUES (?,?,?,?,1,?,?)').run(id,DEMO_IDS.users.maya,actor.display_name,'person.import',JSON.stringify({...profile,id,kind:'student',version:1,createdAt:now,updatedAt:now,fixture:{profileKey}}),now);
  }
  const next={profileKey,phase:'profiles',mapping,mappingHash:fingerprint(mapping),studentIds:allStudentIds,createdAt:now};
  db.prepare('INSERT INTO schema_metadata(name,value) VALUES (?,?)').run(markerKey,JSON.stringify(next));db.exec('COMMIT');return next;
 }catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
}
function businessBatch(store,mapping){
 const admin={id:DEMO_IDS.users.maya},child={id:DEMO_IDS.users.chloe},source=storeAdoption(store,mapping),rules=rulesFor(source,mapping);assertNoConflicts(rules,source.schedules,mapping);
 const links=store.enrollmentOrders.managementSnapshot(admin).links,current=links.find(row=>row.studentId===DEMO_IDS.studentPerson);
 if(current&&current.userId!==child.id)fail('RELATIONAL_DEMO_LINK_CONFLICT','Chloe already has a different or explicitly removed account link.');
 if(!current)store.enrollmentOrders.setAccountLink(DEMO_IDS.studentPerson,{version:0,userId:child.id},admin);
 const created=rules.map(rule=>store.schedules.create(rule,admin.id)),schedules=[source.reuse,...created],paid=store.enrollmentOrders.list(admin).orders.filter(order=>order.studentId===DEMO_IDS.studentPerson&&order.paymentStatus==='paid'),orderIds=new Set();
 for(const [index,schedule]of schedules.slice(0,2).entries()){
  const lessons=scheduleOccurrences(schedule,mapping.startDate,addDays(mapping.startDate,35)).map(row=>({scheduleId:schedule.id,sequence:row.sequence,sourceVersion:row.item.version})),covering=paid.filter(order=>order.items.some(item=>item.lessons.some(lesson=>lessons.some(next=>next.scheduleId===lesson.scheduleId&&next.sequence===lesson.sequence))));
  const covered=lessons.filter(lesson=>covering.some(order=>order.items.some(item=>item.lessons.some(row=>row.scheduleId===lesson.scheduleId&&row.sequence===lesson.sequence))));
  if(covered.length){if(covered.length!==lessons.length)fail('RELATIONAL_DEMO_PARTIAL_ENROLLMENT','An existing partial enrollment needs explicit review; it was not charged again.');covering.forEach(order=>orderIds.add(order.id));continue;}
  const fee=source.fees[index],amountCents=Math.round(fee.price*100)*(fee.pricingModel==='monthly-lessons'?lessons.length:1),item=mapping.courses[index];
  let order=store.enrollmentOrders.create({studentId:DEMO_IDS.studentPerson,amountCents,items:[{courseId:item.id,feeId:item.feeId,lessons}]},admin);
  order=store.enrollmentOrders.send(order.id,{version:order.version},admin);order=store.enrollmentOrders.respond(order.id,{version:order.version,action:'confirm'},child);order=store.enrollmentOrders.confirmPayment(order.id,{version:order.version},admin);orderIds.add(order.id);
 }
 return {scheduleIds:schedules.map(row=>row.id),createdScheduleIds:created.map(row=>row.id),orderIds:[...orderIds]};
}
function resultFor(db,saved,created){
 for(const {id,key}of saved.mapping.teachers)if(db.prepare('SELECT kind FROM scheduling_resources WHERE id=?').get(id)?.kind!=='teacher')fail('RELATIONAL_DEMO_INCOMPLETE',`The adopted ${key} teaching resource is missing.`);
 for(const {id}of saved.mapping.rooms)if(db.prepare('SELECT kind FROM scheduling_resources WHERE id=?').get(id)?.kind!=='room')fail('RELATIONAL_DEMO_INCOMPLETE','An adopted room is missing.');
 for(const {id}of saved.mapping.courses)if(!db.prepare('SELECT id FROM courses WHERE id=?').get(id))fail('RELATIONAL_DEMO_INCOMPLETE','An adopted course is missing.');
 for(const id of allStudentIds)if(!db.prepare("SELECT id FROM people WHERE id=? AND kind='student'").get(id))fail('RELATIONAL_DEMO_INCOMPLETE','An owned Student is missing. No automatic reset was attempted.');
 for(const id of saved.result.scheduleIds)if(!db.prepare('SELECT id FROM schedules WHERE id=?').get(id))fail('RELATIONAL_DEMO_INCOMPLETE','An owned lesson is missing. No automatic replacement was created.');
 for(const id of saved.result.orderIds)if(!db.prepare('SELECT id FROM enrollment_orders WHERE id=?').get(id))fail('RELATIONAL_DEMO_INCOMPLETE','An owned order is missing. No payment was repeated.');
 const ids=allStudentIds.map(()=>'?').join(','),activeStudents=db.prepare(`SELECT COUNT(*) AS count FROM people WHERE id IN (${ids}) AND kind='student' AND json_extract(profile,'$.quitDate') IS NULL`).get(...allStudentIds).count,paid=db.prepare(`SELECT COUNT(*) AS orders,COUNT(DISTINCT student_id) AS students FROM enrollment_orders WHERE student_id IN (${ids}) AND payment_status='paid'`).get(...allStudentIds),sessions=db.prepare(`SELECT COUNT(*) AS count FROM student_sessions AS s JOIN enrollment_orders AS o ON o.id=s.order_id WHERE s.student_id IN (${ids}) AND o.payment_status='paid'`).get(...allStudentIds).count;
 return {profileKey,phase:'complete',created,mapping:saved.mapping,studentIds:allStudentIds,...saved.result,counts:{teachers:4,courses:6,students:300,activeStudents,paidStudents:paid.students,paidOrders:paid.orders,studentSessions:sessions},notice:'Only Chloe has paid enrollment. The other 299 active profiles have no login, payment or occupied seat.'};
}
export async function backupRelationalDemo(databasePath,backupPath){
 if(!isAbsolute(databasePath||'')||!isAbsolute(backupPath||'')||resolve(databasePath)===resolve(backupPath))throw new Error('Choose distinct absolute database and new backup paths.');
 const destination=await open(backupPath,'wx',0o600);await destination.close();let db;
 try{db=new DatabaseSync(databasePath,{readOnly:true});db.prepare('VACUUM INTO ?').run(backupPath);}catch(error){await unlink(backupPath);throw error;}finally{db?.close();}
 return {backupPath};
}
export async function provisionRelationalDemo({databasePath,mapping,backupPath}={}){
 if(!isAbsolute(databasePath||''))throw new Error('An explicit absolute existing databasePath is required.');
 const normalized=normalizeMapping(mapping);if(!(await stat(databasePath)).isFile())throw new Error('The existing database path must be a file.');
 let probe=new DatabaseSync(databasePath,{readOnly:true});
 try{const saved=marker(probe);if(saved){verifyMarker(saved,normalized);if(saved.phase==='complete')return resultFor(probe,saved,false);}else{requireOriginalProfile(probe);const source=readAdoption(probe,normalized),rules=rulesFor(source,normalized);assertNoConflicts(rules,source.schedules,normalized);}}finally{probe.close();}
 if(backupPath)await backupRelationalDemo(databasePath,backupPath);
 importProfiles(databasePath,normalized);
 const store=await createStore({databasePath});
 try{
  const receipt=store.mutateOnce({userId:DEMO_IDS.users.maya,route:'DEMO relational-centre-v1',key:'provision',payloadHash:fingerprint(normalized),status:200},()=>businessBatch(store,normalized));
  const db=new DatabaseSync(databasePath);db.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE;');
  try{const saved=marker(db);verifyMarker(saved,normalized);saved.phase='complete';saved.result=receipt.body;db.prepare('UPDATE schema_metadata SET value=? WHERE name=?').run(JSON.stringify(saved),markerKey);const result=resultFor(db,saved,true);db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
 }finally{await store.close();}
}
async function cli(){
 const options={},args=process.argv.slice(2);for(let index=0;index<args.length;index+=2){if(!['--database','--mapping','--backup'].includes(args[index])||!args[index+1]||Object.hasOwn(options,args[index]))throw new Error('Use --database /absolute/existing.sqlite --mapping /absolute/mapping.json --backup /absolute/new-backup.sqlite.');options[args[index]]=args[index+1];}
 if(!isAbsolute(options['--mapping']||'')||!options['--backup'])throw new Error('An explicit mapping file and a new backup path are required.');
 const mapping=JSON.parse(await readFile(options['--mapping'],'utf8')),result=await provisionRelationalDemo({databasePath:options['--database'],mapping,backupPath:options['--backup']});console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)cli().catch(error=>{console.error(error.code||'RELATIONAL_DEMO_FAILED',error.message);process.exitCode=1;});
