import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {isAbsolute,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createStore} from './store.mjs';
import {DEMO_IDS} from './demo-accounts.mjs';
import {backupRelationalDemo,RELATIONAL_DEMO_IDS} from './relational-demo.mjs';
import {scheduleOccurrences} from '../shared/schedule-occurrences.js';
import {hashPassword} from './security.mjs';

// Explicit local fixture upgrade. Never imported by ordinary application startup.
const marker='complete_demo_25_v1',profileKey='complete-demo-25-v1';
const owned=[DEMO_IDS.studentPerson,...RELATIONAL_DEMO_IDS.students],kept=owned.slice(0,25);
const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function ownership(db){
 const row=db.prepare("SELECT value FROM schema_metadata WHERE name='relational_centre_demo_v1'").get(),source=row&&JSON.parse(row.value);
 if(source?.profileKey!=='relational-centre-demo-v1'||source.phase!=='complete'||JSON.stringify(source.studentIds)!==JSON.stringify(owned))throw Error('Only the explicitly owned 300-student relational demo can be upgraded.');
 for(const id of owned){const row=db.prepare("SELECT snapshot FROM person_audit_log WHERE person_id=? AND action='person.import' AND version=1").get(id),snapshot=row&&JSON.parse(row.snapshot);if(snapshot?.fixture?.profileKey!==(id===DEMO_IDS.studentPerson?'checkpoint-demo3-student-v1':'relational-centre-demo-v1'))throw Error('Demo student ownership could not be verified.');}
 // A non-fixture enrolment must never be silently hidden by this upgrade.
 for(const id of owned.slice(25))if(db.prepare('SELECT id FROM enrollment_orders WHERE student_id=?').get(id)||db.prepare('SELECT student_id FROM student_account_links WHERE student_id=?').get(id))throw Error('A student to archive has live enrolment or login links; review manually.');
 if(db.prepare("SELECT id FROM people WHERE kind='student' AND archived_at IS NULL").all().some(row=>!owned.includes(row.id)))throw Error('Non-fixture active students exist; this upgrade will not change them.');
 return source;
}
function business(store,source,referenceDate){
 const admin={id:DEMO_IDS.users.maya},result={profileKey,referenceDate,students:kept,orderIds:[],recordIds:[],requestIds:[],slotIds:[]};
 const schedules=source.result.scheduleIds.map(id=>store.schedules.get(id));
 if(schedules.length!==6||schedules.some(row=>!row||row.activityDeleted||!row.teacherIds?.length))throw Error('All six demo classes must exist and have teachers.');
 const template=store.studentRecords.create('template',{title:'課堂學習評估',description:'觀察創作過程及課堂參與。',category:'藝術',skills:['專注參與','工具運用','創意表達'],evaluations:['進步中','良好','優秀']},admin);result.recordIds.push(template.id);
 const slots=schedules.map((schedule,index)=>store.availableSlots.create({courseId:schedule.course,date:addDays(referenceDate,28+index),time:'17:00',duration:schedule.duration,teacherIds:schedule.teacherIds,roomIds:schedule.roomIds||[],totalCapacity:8,reschedulingCapacity:8,reschedulingEnabled:true,trialEnabled:false,active:true,publicVisibility:'hide',reschedulingSourceMode:'selected',allowedSourceCourseIds:[schedule.course],remark:'已確認學生調堂的示範時段。'},admin.id));result.slotIds=slots.map(row=>row.id);
 for(const [index,studentId]of kept.entries()){
  const parent={id:index===0?DEMO_IDS.users.chloe:`demo25-parent-${index}`},schedule=schedules[index%6],course=store.getCourse(schedule.course),fee=store.getFee(source.mapping.courses.find(row=>row.id===course.id).feeId);
  if(index>0)store.enrollmentOrders.setAccountLink(studentId,{version:0,userId:parent.id},admin);
  const lessons=scheduleOccurrences(schedule,source.mapping.startDate,addDays(source.mapping.startDate,60)).map(row=>({scheduleId:schedule.id,sequence:row.sequence,sourceVersion:row.item.version}));
  if(!lessons.length)throw Error('A demo class has no lesson occurrences.');
  if(index>0){
   let order=store.enrollmentOrders.create({studentId,amountCents:Math.round(fee.price*100)*(fee.pricingModel==='monthly-lessons'?lessons.length:1),items:[{courseId:course.id,feeId:fee.id,lessons}]},admin);
   order=store.enrollmentOrders.send(order.id,{version:order.version},admin);order=store.enrollmentOrders.respond(order.id,{version:order.version,action:'confirm'},parent);order=store.enrollmentOrders.confirmPayment(order.id,{version:order.version},admin);result.orderIds.push(order.id);
  }
  const timetable=store.enrollmentOrders.timetable(parent,{from:source.mapping.startDate,to:addDays(referenceDate,60)}),studentLessons=timetable.lessons.filter(row=>row.studentId===studentId),original=studentLessons.filter(row=>row.scheduleId===schedule.id).sort((a,b)=>a.sequence-b.sequence);
  if(!original.length)throw Error('Every kept student must have paid lessons.');
  const first=original[0],last=original.at(-1),session=store.enrollmentOrders.roster(first.scheduleId,first.sequence,admin).students.find(row=>row.studentId===studentId);
  store.enrollmentOrders.saveAttendance(session.id,{version:session.version,sourceVersion:session.sourceVersion,...(first.date<referenceDate?{attendance:index%7===0?'late':'present'}:{}),remark:index%2?'能主動分享創作想法。':'請帶圍裙；家長已知悉課堂安排。',showRemark:true,sticker:['yellow','green','blue','pink'][index%4]},admin);
  for(const [kind,data]of [['journal',{studentId,content:`${course.courseName}：能完成課堂練習，下一堂嘗試更多配色及構圖。`,visibility:'student'}],['journal',{studentId,content:'老師跟進：鼓勵學生先觀察再動手，課後與家長分享進度。',visibility:'internal'}],['assessment',{studentId,templateId:template.id,courseId:course.id,ratings:{'專注參與':'良好','工具運用':index%2?'進步中':'良好','創意表達':'優秀'},comment:'投入創作，持續練習可提升細節表達。',status:'graded',visibility:'student'}],['case',{studentId,type:'enrollment',title:'報名及付款跟進',content:`已核對 ${course.courseName} 報名及付款紀錄，家長確認上課安排。`,date:referenceDate,status:'closed',result:'報名完成，已啟用課堂名額。'}],['case',{studentId,type:'leave',title:'調堂跟進',content:'家長因家庭安排申請調堂，已與老師核對可用時段。',date:referenceDate,status:'closed',result:'已安排到同一課程的另一時段；詳見調堂紀錄。'}]])result.recordIds.push(store.studentRecords.create(kind,data,admin).id);
  const request=store.studentLessonRequests.create({studentSessionId:last.id,type:'reschedule',reason:'家庭活動撞期，申請改到同一課程另一時段。',preferredSlotId:slots[index%6].id},parent);
  const assigned=store.studentLessonRequests.assign(request.id,{version:request.version,slotId:slots[index%6].id},admin);result.requestIds.push(assigned.id);
 }
 result.recordIds.push(store.studentRecords.create('notice',{title:'上課準備及家長通知',content:'請帶圍裙及水樽，提早五分鐘到達。如需調堂，請先提交申請。',date:referenceDate,signDeadline:addDays(referenceDate,14),studentIds:kept,status:'published'},admin).id);
 for(const schedule of schedules){const first=scheduleOccurrences(schedule,source.mapping.startDate,addDays(source.mapping.startDate,60))[0];const note=store.lessonNotes.get(schedule.id,first.sequence,admin);if(!note.text)store.lessonNotes.save(schedule.id,first.sequence,{version:note.version,sourceVersion:first.item.version,text:'課前準備：檢查工具及顏料，按學生程度提供創作提示，課後記錄進度。'},admin);}
 return result;
}
export async function completeDemo({databasePath,backupPath,referenceDate}={}){
 if(!isAbsolute(databasePath||'')||!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate||'')||!Number.isFinite(Date.parse(referenceDate+'T00:00:00Z')))throw Error('Provide an absolute database path and referenceDate.');
 let db=new DatabaseSync(databasePath,{readOnly:true}),source,saved;
 try{source=ownership(db);saved=db.prepare('SELECT value FROM schema_metadata WHERE name=?').get(marker);}finally{db.close();}
 if(saved)return {...JSON.parse(saved.value),unchanged:true};
 if(!backupPath)throw Error('A new backup path is required for the explicit demo upgrade.');
 await backupRelationalDemo(databasePath,backupPath);
 const passwordHash=await hashPassword(randomBytes(32).toString('hex'));
 db=new DatabaseSync(databasePath);try{db.exec('BEGIN IMMEDIATE');ownership(db);for(let index=1;index<25;index++){const id=`demo25-parent-${index}`,email=`sample-parent-${index}@beamal.invalid`,row=db.prepare('SELECT id,email,role,archived_at FROM users WHERE id=? OR email=?').get(id,email);if(row&&(row.id!==id||row.email!==email||row.role!=='student'||row.archived_at))throw Error('A sample parent identity conflicts.');if(!row)db.prepare("INSERT INTO users(id,email,display_name,role,password_hash,created_at) VALUES (?,?,?,'student',?,?)").run(id,email,`示範家長 ${index}`,passwordHash,new Date().toISOString());}db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
 const store=await createStore({databasePath});let receipt;
 try{receipt=store.mutateOnce({userId:DEMO_IDS.users.maya,route:'DEMO complete-25-v1',key:'provision',payloadHash:hash({referenceDate,kept}),status:200},()=>business(store,source,referenceDate)).body;}finally{await store.close();}
 db=new DatabaseSync(databasePath);try{db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');const now=new Date().toISOString();for(const id of owned.slice(25))db.prepare('UPDATE people SET archived_at=?,updated_at=?,version=version+1 WHERE id=? AND archived_at IS NULL').run(now,now,id);const counts={activeStudents:db.prepare("SELECT COUNT(*) n FROM people WHERE kind='student' AND archived_at IS NULL").get().n,archivedStudents:275,paidStudents:db.prepare("SELECT COUNT(DISTINCT student_id) n FROM enrollment_orders WHERE payment_status='paid'").get().n};if(counts.activeStudents!==25||counts.paidStudents!==25)throw Error('Demo completeness check failed.');const summary={...receipt,counts,backupPath};db.prepare('INSERT INTO schema_metadata(name,value) VALUES (?,?)').run(marker,JSON.stringify(summary));db.exec('COMMIT');return summary;}catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const args=process.argv.slice(2),arg=name=>args[args.indexOf(name)+1];const result=await completeDemo({databasePath:resolve(arg('--database')),backupPath:resolve(arg('--backup')),referenceDate:arg('--date')});console.log(JSON.stringify({profileKey:result.profileKey,counts:result.counts,backupPath:result.backupPath,unchanged:!!result.unchanged}));}
