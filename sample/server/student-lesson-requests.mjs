import {createHash,randomUUID} from 'node:crypto';
import {ApplicationError} from './validation.mjs';
import {scheduleOccurrence,scheduleOccurrences} from '../shared/schedule-occurrences.js';

const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const fail=(status,code,message)=>{throw new ApplicationError(status,code,message);};
const invalid=message=>fail(400,'INVALID_STUDENT_LESSON_REQUEST',message);

export function createStudentLessonRequestStore({database,transaction,schedules,getCourse,getStudentLesson,postgres=false}){
 database.exec(`
  CREATE TABLE IF NOT EXISTS student_lesson_requests(
   id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES people(id),user_id TEXT NOT NULL REFERENCES users(id),
   schedule_id TEXT NOT NULL REFERENCES schedules(id),sequence INTEGER NOT NULL CHECK(sequence>0),
   request_type TEXT NOT NULL CHECK(request_type IN ('reschedule','sick')),
   data TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','reviewing','approved','rejected')),
   version INTEGER NOT NULL CHECK(version>0),created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS student_lesson_requests_student ON student_lesson_requests(student_id,created_at,id);
  CREATE INDEX IF NOT EXISTS student_lesson_requests_status ON student_lesson_requests(status,created_at,id);
  CREATE TABLE IF NOT EXISTS student_lesson_request_audit_log(
   id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),
   request_id TEXT NOT NULL REFERENCES student_lesson_requests(id),action TEXT NOT NULL,
   snapshot TEXT NOT NULL,created_at TEXT NOT NULL
  );
 `);
 const actor=user=>database.prepare('SELECT id,role FROM users WHERE id=?').get(user?.id||'');
 const authorizedStudents=user=>database.prepare("SELECT people.id,people.display_name FROM people JOIN student_account_links links ON links.student_id=people.id WHERE links.user_id=? AND people.kind='student' ORDER BY people.display_name,people.id").all(user.id);
 const dto=row=>{
  const data=JSON.parse(row.data);
  return {id:row.id,studentId:row.student_id,studentName:row.student_name,type:row.request_type,status:row.status,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,reference:`LR-${row.id.slice(0,8).toUpperCase()}`,scheduleId:row.schedule_id,sequence:row.sequence,lesson:data.lesson,...(data.resolution?{assignedLesson:data.resolution.assignedLesson}:{}),reason:data.reason,reasonZh:data.reason,reasonEn:data.reason,preferredDate:data.preferredDate||'',timeline:[{date:row.created_at.slice(0,10),labelZh:'已提交申請',labelEn:'Request submitted'},...(data.resolution?[{date:data.resolution.at.slice(0,10),labelZh:'已安排到其他課堂',labelEn:'Moved to another class'}]:[])]};
 };
 const query=`SELECT requests.*,people.display_name AS student_name FROM student_lesson_requests requests JOIN people ON people.id=requests.student_id`;
 const upcomingWindow=()=>{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),from=['year','month','day'].map(key=>parts.find(part=>part.type===key).value).join('-');
  const to=new Date(Date.parse(from+'T00:00:00Z')+365*86400000).toISOString().slice(0,10),time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Hong_Kong',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
  return {from,to,time};
 };
 const alternatives=(studentId,courseId,scheduleRows,window)=>{
  const course=getCourse(courseId);
  if(!course||course.deletedAt)return [];
  const matching=scheduleRows.filter(row=>row.course===courseId&&!row.activityDeleted),counts=new Map(),full=new Set(),ids=matching.map(row=>row.id);
  for(let offset=0;offset<ids.length;offset+=200){
   const batch=ids.slice(offset,offset+200),placeholders=batch.map(()=>'?').join(','),rows=database.prepare(`SELECT sessions.schedule_id,sessions.sequence,COUNT(*) AS occupied,SUM(CASE WHEN sessions.student_id=? THEN 1 ELSE 0 END) AS student_enrolled FROM student_sessions AS sessions JOIN enrollment_orders AS orders ON orders.id=sessions.order_id WHERE orders.payment_status='paid' AND sessions.schedule_id IN (${placeholders}) GROUP BY sessions.schedule_id,sessions.sequence`).all(studentId,...batch);
   for(const row of rows)counts.set(JSON.stringify([row.schedule_id,row.sequence]),{occupied:Number(row.occupied),studentEnrolled:Number(row.student_enrolled)>0});
   for(const row of database.prepare(`SELECT schedule_id,sequence FROM class_capacity_statuses WHERE manual_status='full' AND schedule_id IN (${placeholders})`).all(...batch))full.add(JSON.stringify([row.schedule_id,row.sequence]));
  }
  const lessons=[];
  for(const schedule of matching)for(const occurrence of scheduleOccurrences(schedule,window.from,window.to)){
   const item=occurrence.item,key=JSON.stringify([schedule.id,occurrence.sequence]),capacity=Number.isSafeInteger(item.capacity)?item.capacity:null,occupancy=counts.get(key);
   if(occurrence.date===window.from&&item.time<=window.time||occupancy?.studentEnrolled||full.has(key)||capacity!==null&&(occupancy?.occupied||0)>=capacity)continue;
   lessons.push({scheduleId:schedule.id,sequence:occurrence.sequence,courseId,courseName:course.courseName,date:occurrence.date,time:item.time,duration:item.duration,availableSeats:capacity===null?null:capacity-(occupancy?.occupied||0)});
  }
  return lessons.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.scheduleId.localeCompare(b.scheduleId)||a.sequence-b.sequence).slice(0,10);
 };
 const list=user=>transaction(()=>{
  const current=actor(user);if(!current||!['admin','student'].includes(current.role))fail(403,'ROLE_FORBIDDEN','Student lesson requests are not available for this account.');
  const students=authorizedStudents(current),studentIds=new Set(students.map(row=>row.id));
  const requests=database.prepare(`${query} ${current.role==='student'?'WHERE requests.user_id=?':'WHERE requests.status IN (?,?)'} ORDER BY requests.created_at DESC,requests.id DESC`).all(...(current.role==='student'?[current.id]:['pending','reviewing'])).filter(row=>current.role==='admin'||studentIds.has(row.student_id)).map(dto);
  if(current.role==='admin'&&requests.length){
   const scheduleRows=schedules.list().schedules,window=upcomingWindow(),cache=new Map();
   for(const request of requests){
    const lesson=request.lesson,key=JSON.stringify([request.studentId,lesson.courseId]);
    if(!cache.has(key))cache.set(key,alternatives(request.studentId,lesson.courseId,scheduleRows,window));
    request.availableTimes=cache.get(key);
   }
  }
  const revision=createHash('sha256').update(JSON.stringify(requests)).digest('hex');
  return {requests,revision};
 },'read');
 const create=(input,user)=>transaction(()=>{
  const current=actor(user);if(!current||current.role!=='student')fail(403,'ROLE_FORBIDDEN','Only a student may submit a lesson request.');
  if(!plain(input)||Object.keys(input).some(key=>!['studentSessionId','type','reason','preferredDate'].includes(key))||typeof input.studentSessionId!=='string'||!input.studentSessionId||input.studentSessionId.length>200||!['reschedule','sick'].includes(input.type))invalid('Provide a valid lesson and choose rescheduling or sick leave.');
  if(input.reason!==undefined&&(typeof input.reason!=='string'||input.reason.length>2000))invalid('Reason must contain at most 2,000 characters.');
  if(input.preferredDate!==undefined&&input.preferredDate!==''&&input.type!=='reschedule')invalid('Preferred date is only available for rescheduling requests.');
  if(input.preferredDate!==undefined&&input.preferredDate!==''&&(typeof input.preferredDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.preferredDate)||!Number.isFinite(Date.parse(input.preferredDate+'T00:00:00Z'))||new Date(input.preferredDate+'T00:00:00Z').toISOString().slice(0,10)!==input.preferredDate))invalid('Choose a valid preferred date.');
  let lesson;
  try{lesson=getStudentLesson(input.studentSessionId,current);}
  catch(error){if(!(error instanceof ApplicationError))throw error;if(error.code==='ORDER_LESSON_UNAVAILABLE')fail(409,'LESSON_NOT_FOUND','This lesson or course is no longer active. Refresh the timetable and try again.');throw error;}
  if(!lesson)fail(404,'LESSON_NOT_FOUND','The authorized active lesson was not found.');
  if(input.type==='reschedule'&&lesson.studentReschedulingAllowed===false)fail(403,'RESCHEDULING_NOT_ALLOWED','Student rescheduling requests are not allowed for this class type.');
  const now=new Date().toISOString(),id=randomUUID(),reason=(input.reason||'').trim();
  const data={lesson:{studentSessionId:lesson.id,scheduleId:lesson.scheduleId,sequence:lesson.sequence,courseId:lesson.courseId,courseName:lesson.courseName,date:lesson.date,time:lesson.time,duration:lesson.duration},reason,preferredDate:input.type==='reschedule'?input.preferredDate||'':''};
  database.prepare("INSERT INTO student_lesson_requests(id,student_id,user_id,schedule_id,sequence,request_type,data,status,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'pending',1,?,?)").run(id,lesson.studentId,current.id,lesson.scheduleId,lesson.sequence,input.type,JSON.stringify(data),now,now);
  const row=database.prepare(`${query} WHERE requests.id=?`).get(id),request=dto(row);
  database.prepare('INSERT INTO student_lesson_request_audit_log(actor_id,request_id,action,snapshot,created_at) VALUES (?,?,?,?,?)').run(current.id,id,'request.create',JSON.stringify(request),now);
  return request;
 });
 const assign=(id,input,user)=>transaction(()=>{
  const current=actor(user);if(!current||current.role!=='admin')fail(403,'ROLE_FORBIDDEN','Only an administrator may assign a student to another lesson.');
  if(!plain(input)||Object.keys(input).some(key=>!['version','scheduleId','sequence'].includes(key))||!Number.isSafeInteger(input.version)||input.version<1||typeof input.scheduleId!=='string'||!input.scheduleId||input.scheduleId.length>200||!Number.isSafeInteger(input.sequence)||input.sequence<1)invalid('Choose a valid request and available lesson.');
  const row=database.prepare(`${query} WHERE requests.id=?`).get(id);
  if(!row)fail(404,'STUDENT_LESSON_REQUEST_NOT_FOUND','The student lesson request was not found.');
  if(row.version!==input.version)fail(409,'STUDENT_LESSON_REQUEST_VERSION_CONFLICT','This request has changed. Reload it before assigning a lesson.');
  if(!['pending','reviewing'].includes(row.status))fail(409,'STUDENT_LESSON_REQUEST_STATE_CONFLICT','This request has already been resolved.');
  const data=JSON.parse(row.data),source=data.lesson;
  if(postgres)database.prepare('SELECT id FROM schedules WHERE id=? FOR UPDATE').get(input.scheduleId);
  const schedule=schedules.get(input.scheduleId),occurrence=schedule&&!schedule.activityDeleted?scheduleOccurrence(schedule,input.sequence):null,course=getCourse(source.courseId);
  if(!course||course.deletedAt||!occurrence||occurrence.item.course!==source.courseId)fail(409,'ALTERNATIVE_LESSON_UNAVAILABLE','The selected lesson is no longer available for this course.');
  const window=upcomingWindow();
  if(occurrence.date<window.from||occurrence.date===window.from&&occurrence.item.time<=window.time)fail(409,'ALTERNATIVE_LESSON_UNAVAILABLE','The selected lesson is no longer in the future.');
  if(input.scheduleId===row.schedule_id&&input.sequence===row.sequence)fail(409,'ALTERNATIVE_LESSON_UNAVAILABLE','Choose a different lesson from the one in the request.');
  const sourceSession=database.prepare("SELECT sessions.id,sessions.schedule_id,sessions.sequence FROM student_sessions AS sessions JOIN enrollment_orders AS orders ON orders.id=sessions.order_id WHERE sessions.id=? AND sessions.student_id=? AND sessions.schedule_id=? AND sessions.sequence=? AND orders.payment_status='paid'").get(source.studentSessionId,row.student_id,row.schedule_id,row.sequence);
  if(!sourceSession)fail(409,'REQUESTED_LESSON_NOT_ENROLLED','The original paid lesson is no longer assigned to this student.');
  if(database.prepare('SELECT id FROM student_sessions WHERE student_id=? AND schedule_id=? AND sequence=? AND id<>?').get(row.student_id,input.scheduleId,input.sequence,source.studentSessionId))fail(409,'STUDENT_ALREADY_ENROLLED','The student is already enrolled in the selected lesson.');
  const manual=database.prepare('SELECT manual_status FROM class_capacity_statuses WHERE schedule_id=? AND sequence=?').get(input.scheduleId,input.sequence)?.manual_status;
  const occupied=Number(database.prepare("SELECT COUNT(*) AS count FROM student_sessions AS sessions JOIN enrollment_orders AS orders ON orders.id=sessions.order_id WHERE sessions.schedule_id=? AND sessions.sequence=? AND orders.payment_status='paid'").get(input.scheduleId,input.sequence).count);
  if(manual==='full'||Number.isSafeInteger(occurrence.item.capacity)&&occupied>=occurrence.item.capacity)fail(409,'CLASS_CAPACITY_FULL','The selected lesson no longer has an available seat.');
  const now=new Date().toISOString(),assignedLesson={scheduleId:input.scheduleId,sequence:input.sequence,courseId:occurrence.item.course,courseName:course.courseName,date:occurrence.date,time:occurrence.item.time,duration:occurrence.item.duration};
  const moved=database.prepare("UPDATE student_sessions SET schedule_id=?,sequence=?,attendance='unmarked' WHERE id=? AND student_id=? AND schedule_id=? AND sequence=?").run(input.scheduleId,input.sequence,source.studentSessionId,row.student_id,row.schedule_id,row.sequence);
  if(moved.changes!==1)fail(409,'REQUESTED_LESSON_NOT_ENROLLED','The original paid lesson changed. Reload the request before assigning a lesson.');
  data.resolution={assignedLesson,at:now};
  const updated=database.prepare("UPDATE student_lesson_requests SET data=?,status='approved',version=version+1,updated_at=? WHERE id=? AND version=? AND status IN ('pending','reviewing')").run(JSON.stringify(data),now,id,input.version);
  if(updated.changes!==1)fail(409,'STUDENT_LESSON_REQUEST_VERSION_CONFLICT','This request has changed. Reload it before assigning a lesson.');
  const saved=dto(database.prepare(`${query} WHERE requests.id=?`).get(id));
  database.prepare('INSERT INTO student_lesson_request_audit_log(actor_id,request_id,action,snapshot,created_at) VALUES (?,?,?,?,?)').run(current.id,id,'request.assign',JSON.stringify(saved),now);
  return saved;
 });
 return {list,create,assign,audit:()=>database.prepare('SELECT * FROM student_lesson_request_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)}))};
}
