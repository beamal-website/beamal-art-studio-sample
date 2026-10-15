import {DatabaseSync} from 'node:sqlite';
import {isAbsolute,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {createStore} from './store.mjs';
import {hashPassword} from './security.mjs';
import {validateCourse} from './validation.mjs';
import {validateSchedule} from './schedules.mjs';
import {chloeStudentProfile} from './demo-student-profiles.mjs';

// Explicit opt-in local fixture only. Normal application bootstrap does not import
// this module or weaken its ordinary account/password validation.
const profileKey='checkpoint-demo3-v1',metadataKey='checkpoint_demo3_v1';
const studentProfileKey='checkpoint-demo3-student-v1',studentMetadataKey='checkpoint_demo3_student_v1';
const id=number=>`d3000000-0000-4000-8000-${String(number).padStart(12,'0')}`;
const checkpointIds={users:{maya:id(1),leo:id(2),chloe:id(3)},teachers:{maya:id(101),leo:id(102)},room:id(201),course:id(301),fees:[id(401),id(402)],schedules:{leo:id(501),maya:id(502)}};
export const DEMO_IDS=Object.freeze({...checkpointIds,studentPerson:id(601)});
const accounts=[
  {id:checkpointIds.users.maya,email:'admin@gmail.com',displayName:'林雅晴 Maya Lam',role:'admin'},
  {id:checkpointIds.users.leo,email:'teacher@gmail.com',displayName:'陳子朗 Leo Chan',role:'teacher'},
  {id:checkpointIds.users.chloe,email:'student@gmail.com',displayName:'何詠晴 Chloe Ho',role:'student'},
];
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
function nextFriday() {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const day=new Date(['year','month','day'].map(key=>parts.find(part=>part.type===key).value).join('-')+'T00:00:00Z');
  day.setUTCDate(day.getUTCDate()+(5-day.getUTCDay()+7)%7);
  return day.toISOString().slice(0,10);
}
function failure(code,message) {const error=new Error(`${code}: ${message}`);error.code=code;throw error;}
const conflict=()=>failure('CHECKPOINT_PROFILE_CONFLICT','A requested fixture account, ID or name belongs to an unowned record. No existing account or password was changed.');
const incomplete=()=>failure('CHECKPOINT_PROFILE_INCOMPLETE','An owned fixture record is missing. No automatic repair or reset was attempted.');
function savedMarker(database,key) {
  const row=database.prepare('SELECT value FROM schema_metadata WHERE name=?').get(key);
  if(!row)return null;
  try{return JSON.parse(row.value);}catch{conflict();}
}
function verifyCheckpoint(database,saved) {
  if(saved.profileKey!==profileKey||JSON.stringify(saved.ids)!==JSON.stringify(checkpointIds))conflict();
  for(const [table,values]of[['users',Object.values(checkpointIds.users)],['scheduling_resources',[...Object.values(checkpointIds.teachers),checkpointIds.room]],['courses',[checkpointIds.course]],['fees',checkpointIds.fees],['schedules',Object.values(checkpointIds.schedules)]]) {
    for(const recordId of values)if(!database.prepare(`SELECT id FROM ${table} WHERE id=?`).get(recordId))incomplete();
  }
  for(const teacher of Object.values(checkpointIds.teachers))if(!database.prepare('SELECT teacher_resource_id FROM teacher_account_links WHERE teacher_resource_id=?').get(teacher))incomplete();
}
function insertCheckpoint(database,{startDate,passwordHashes,now}) {
  const courseName='創意繪畫',roomName='畫室 A';
  const resources=[
    {id:checkpointIds.teachers.maya,kind:'teacher',displayName:'林雅晴 Maya Lam',metadata:{representativeColor:'#b9772f'}},
    {id:checkpointIds.teachers.leo,kind:'teacher',displayName:'陳子朗 Leo Chan',metadata:{representativeColor:'#426ea8'}},
    {id:checkpointIds.room,kind:'room',displayName:roomName,metadata:{capacity:8,detail:'',remark:'',externalLocation:false}},
  ];
  const primary=validateCourse({courseName,feeName:'每堂60分鐘',category:'Art',level:'Beginner',pricingModel:'monthly-lessons',price:300,duration:60,months:1,bookingExpiry:null,onlineStore:true});
  const secondary=validateCourse({courseName,feeName:'固定月費',category:'Art',level:'Beginner',pricingModel:'fixed-monthly',price:850,months:1,bookingExpiry:null,onlineStore:true});
  const weekday=new Date(startDate+'T00:00:00Z').getUTCDay();
  const makeRule=(teacher,time,count)=>({...validateSchedule({course:checkpointIds.course,startDate,time,duration:60,weekdays:[weekday],endMode:'count',count,mustAttendAll:true,color:'#27777b',teacherIds:[teacher.id],roomIds:[checkpointIds.room],teacher:teacher.displayName,room:roomName,capacity:8,session:1,remark:'請自備圍裙及飲用水。',detail:'',moreInfo:''}),classType:null});
  const rules=[{id:checkpointIds.schedules.leo,data:makeRule(resources[1],'13:00',3)},{id:checkpointIds.schedules.maya,data:makeRule(resources[0],'15:00',1)}];
  for(const account of accounts)if(database.prepare('SELECT id FROM users WHERE id=? OR email=? COLLATE NOCASE').get(account.id,account.email))conflict();
  for(const resource of resources)if(database.prepare('SELECT id FROM scheduling_resources WHERE id=? OR (kind=? AND name_key=?)').get(resource.id,resource.kind,resource.displayName.toLowerCase()))conflict();
  if(database.prepare('SELECT id FROM courses WHERE id=? OR name_key=?').get(checkpointIds.course,courseName.toLowerCase()))conflict();
  for(const recordId of checkpointIds.fees)if(database.prepare('SELECT id FROM fees WHERE id=?').get(recordId))conflict();
  for(const recordId of Object.values(checkpointIds.schedules))if(database.prepare('SELECT id FROM schedules WHERE id=?').get(recordId))conflict();
  accounts.forEach((account,index)=>database.prepare('INSERT INTO users(id,email,display_name,role,password_hash,created_at) VALUES (?,?,?,?,?,?)').run(account.id,account.email,account.displayName,account.role,passwordHashes[index],now));
  for(const resource of resources) {
    database.prepare('INSERT INTO scheduling_resources(id,kind,display_name,name_key,active,version,created_at,updated_at,metadata) VALUES (?,?,?,?,1,1,?,?,?)').run(resource.id,resource.kind,resource.displayName,resource.displayName.toLowerCase(),now,now,JSON.stringify(resource.metadata));
    const snapshot={id:resource.id,kind:resource.kind,displayName:resource.displayName,active:true,version:1,createdAt:now,updatedAt:now,...resource.metadata};
    database.prepare('INSERT INTO scheduling_resource_audit_log(actor_id,resource_id,action,version,snapshot,created_at) VALUES (?,?,?,1,?,?)').run(checkpointIds.users.maya,resource.id,'resource.create',JSON.stringify(snapshot),now);
  }
  const courseSequence=database.prepare('UPDATE course_sequence SET value=value+1 WHERE id=1 RETURNING value').get().value;
  const courseCode=`CO-${String(courseSequence).padStart(3,'0')}`,courseMetadata={courseName,category:primary.category,level:primary.level,classTypeId:null};
  database.prepare('INSERT INTO courses(id,course_code,name_key,data,price_cents,online_store,version,created_at,updated_at) VALUES (?,?,?,?,?,1,1,?,?)').run(checkpointIds.course,courseCode,courseName.toLowerCase(),JSON.stringify(courseMetadata),30000,now,now);
  const feeRecords=[];
  for(const [index,data]of[primary,secondary].entries()) {
    const feeId=checkpointIds.fees[index],number=database.prepare('UPDATE fee_sequence SET value=value+1 WHERE id=1 RETURNING value').get().value,feeCode=`FE-${String(number).padStart(3,'0')}`;
    const {courseName:ignoredName,category:ignoredCategory,level:ignoredLevel,price,...stored}=data;stored.category='Art';
    database.prepare('INSERT INTO fees(id,fee_code,data,price_cents,online_store,version,created_at,updated_at) VALUES (?,?,?,?,1,1,?,?)').run(feeId,feeCode,JSON.stringify(stored),Math.round(price*100),now,now);
    database.prepare('INSERT INTO course_fees(course_id,fee_id,position) VALUES (?,?,?)').run(checkpointIds.course,feeId,index+1);
    const record={...stored,id:feeId,feeCode,price,version:1,createdAt:now,updatedAt:now,courseIds:[checkpointIds.course]};feeRecords.push(record);
    database.prepare('INSERT INTO fee_audit_log(actor_id,action,fee_id,version,snapshot,created_at) VALUES (?,?,?,1,?,?)').run(checkpointIds.users.maya,'fee.create',feeId,JSON.stringify(record),now);
  }
  const courseRecord={...courseMetadata,feeName:primary.feeName,...Object.fromEntries(['pricingModel','price','duration','months','bookingExpiry','onlineStore'].map(key=>[key,primary[key]])),id:checkpointIds.course,courseCode,version:1,createdAt:now,updatedAt:now,fees:feeRecords,feeIds:checkpointIds.fees};
  database.prepare('INSERT INTO audit_log(actor_id,action,course_id,version,snapshot,created_at) VALUES (?,?,?,1,?,?)').run(checkpointIds.users.maya,'course.create',checkpointIds.course,JSON.stringify(courseRecord),now);
  for(const rule of rules) {
    const {course,...stored}=rule.data;
    database.prepare('INSERT INTO schedules(id,course_id,data,version,created_at,updated_at) VALUES (?,?,?,1,?,?)').run(rule.id,course,JSON.stringify(stored),now,now);
    const snapshot={...rule.data,id:rule.id,version:1,createdAt:now,updatedAt:now};
    database.prepare('INSERT INTO schedule_audit_log(actor_id,action,schedule_id,version,snapshot,created_at) VALUES (?,?,?,1,?,?)').run(checkpointIds.users.maya,'schedule.create',rule.id,JSON.stringify(snapshot),now);
  }
  for(const key of ['maya','leo']) {
    const link={teacherResourceId:checkpointIds.teachers[key],userId:checkpointIds.users[key],version:1,createdAt:now,updatedAt:now};
    database.prepare('INSERT INTO teacher_account_links(teacher_resource_id,user_id,version,created_at,updated_at) VALUES (?,?,1,?,?)').run(link.teacherResourceId,link.userId,now,now);
    database.prepare('INSERT INTO access_control_audit_log(actor_id,action,target_id,version,snapshot,created_at) VALUES (?,?,?,1,?,?)').run(checkpointIds.users.maya,'access.teacher-link',link.teacherResourceId,JSON.stringify(link),now);
  }
  const manifest={profileKey,profileVersion:1,createdAt:now,startDate,ids:checkpointIds,accounts,notice:'Entirely fictional local test identities. No payment, booking, Student account link, enrollment or occupied seat was created.'};
  database.prepare('INSERT INTO schema_metadata(name,value) VALUES (?,?)').run(metadataKey,JSON.stringify(manifest));
  return manifest;
}
function importExistingStudent(database,now,startDate) {
  const saved=savedMarker(database,studentMetadataKey);
  if(saved) {
    if(saved.profileKey!==studentProfileKey||saved.personId!==DEMO_IDS.studentPerson)conflict();
    if(!database.prepare('SELECT id FROM people WHERE id=?').get(saved.personId))incomplete();
    return {...saved,created:false};
  }
  const profile=chloeStudentProfile(startDate);
  if(database.prepare("SELECT id FROM people WHERE id=? OR display_name=? COLLATE NOCASE OR json_extract(profile,'$.email')=? COLLATE NOCASE OR json_extract(profile,'$.email')=? COLLATE NOCASE").get(DEMO_IDS.studentPerson,profile.displayName,profile.email,accounts.find(row=>row.id===DEMO_IDS.users.chloe).email))conflict();
  const actor=database.prepare('SELECT id,display_name,role FROM users WHERE id=?').get(checkpointIds.users.maya);
  if(actor?.role!=='admin')incomplete();
  database.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES (?,'student',?,?,?,1,?,?)").run(DEMO_IDS.studentPerson,profile.displayName,JSON.stringify(profile),Object.values(profile).filter(value=>typeof value==='string').join('\n').toLowerCase(),now,now);
  const fixture={profileKey:studentProfileKey,source:'explicit-fictional-existing-student-import'};
  const snapshot={...profile,id:DEMO_IDS.studentPerson,kind:'student',version:1,createdAt:now,updatedAt:now,convertedAt:null,convertedBy:null,fixture};
  database.prepare('INSERT INTO person_audit_log(person_id,actor_id,actor_name,action,version,snapshot,created_at) VALUES (?,?,?,?,1,?,?)').run(DEMO_IDS.studentPerson,actor.id,actor.display_name,'person.import',JSON.stringify(snapshot),now);
  const manifest={profileKey:studentProfileKey,personId:DEMO_IDS.studentPerson,createdAt:now,actorId:actor.id};
  database.prepare('INSERT INTO schema_metadata(name,value) VALUES (?,?)').run(studentMetadataKey,JSON.stringify(manifest));
  return {...manifest,created:true};
}

export async function provisionDemoAccounts({databasePath,startDate=nextFriday()}={}) {
  if(typeof databasePath!=='string'||!isAbsolute(databasePath))throw new Error('An explicit absolute databasePath is required.');
  if(!validDate(startDate))throw new Error('Choose a valid startDate in YYYY-MM-DD format.');
  const initialized=await createStore({databasePath});await initialized.close();
  const database=new DatabaseSync(databasePath);database.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  try {
    // Hashing happens before taking the write lock. Ownership is checked again
    // inside the transaction, so simultaneous invocations cannot duplicate data.
    const observed=savedMarker(database,metadataKey);
    const passwordHashes=observed?null:await Promise.all(accounts.map(()=>hashPassword('000000')));
    database.exec('BEGIN IMMEDIATE');
    try {
      const saved=savedMarker(database,metadataKey),now=new Date().toISOString();
      if(saved)verifyCheckpoint(database,saved);
      const checkpoint=saved||insertCheckpoint(database,{startDate,passwordHashes,now});
      const student=importExistingStudent(database,now,checkpoint.startDate);
      const result={profileKey,profileVersion:1,created:!saved,startDate:checkpoint.startDate,ids:{...checkpointIds,studentPerson:DEMO_IDS.studentPerson},student,notice:'Fictional local demo only. No enrollment, payment, occupied seat or Student account link was created.'};
      database.exec('COMMIT');return result;
    }catch(error){database.exec('ROLLBACK');throw error;}
  }finally{database.close();}
}

async function cli() {
  const options={},args=process.argv.slice(2);
  for(let index=0;index<args.length;index+=2) {
    if(!['--database','--start-date','--manifest'].includes(args[index])||!args[index+1]||Object.hasOwn(options,args[index]))throw new Error('Use --database /absolute/private.sqlite [--start-date YYYY-MM-DD] [--manifest /absolute/manifest.json].');
    options[args[index]]=args[index+1];
  }
  if(options['--manifest']&&!isAbsolute(options['--manifest']))throw new Error('Manifest path must be absolute.');
  const manifest=await provisionDemoAccounts({databasePath:options['--database'],...(options['--start-date']?{startDate:options['--start-date']}:{})});
  if(options['--manifest'])await writeFile(options['--manifest'],JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
  console.log(JSON.stringify(manifest));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)cli().catch(error=>{console.error(error.code||'DEMO_PROVISION_FAILED',error.message);process.exitCode=1;});
