import {randomUUID} from 'node:crypto';
import {ApplicationError} from './validation.mjs';
import {reschedulingRulesAllow} from '../shared/rescheduling-rules.js';
import {scheduleOccurrence} from '../shared/schedule-occurrences.js';
const unavailable=()=>{throw new ApplicationError(409,'RESCHEDULING_SLOT_UNAVAILABLE','This time is not open to this student or no longer has a place.');};
export function createReschedulingAvailability({database,transaction,availableSlots,schedules,getCourse,postgres=false}){
 database.exec('CREATE TABLE IF NOT EXISTS availability_rescheduling_targets(slot_id TEXT PRIMARY KEY REFERENCES available_slots(id),schedule_id TEXT NOT NULL REFERENCES schedules(id))');
 for(const [name,type] of [['student_session_id','TEXT'],['target_schedule_id','TEXT'],['target_sequence','INTEGER']])if(!database.prepare('PRAGMA table_info(availability_reservations)').all().some(row=>row.name===name))database.exec(`ALTER TABLE availability_reservations ADD COLUMN ${name} ${type}`);
 const now=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),part=key=>parts.find(row=>row.type===key).value;return part('year')+'-'+part('month')+'-'+part('day')+' '+part('hour')+':'+part('minute');};
 const target=slot=>slot.scheduleId?{scheduleId:slot.scheduleId,sequence:slot.sequence}:(()=>{const record=database.prepare('SELECT schedule_id FROM availability_rescheduling_targets WHERE slot_id=?').get(slot.id);return record?{scheduleId:record.schedule_id,sequence:1}:null;})();
 const remaining=(slot,source)=>{
  if(!slot.active||!slot.sourceAvailable||!slot.reschedulingEnabled||!reschedulingRulesAllow(slot,source)||slot.date+' '+slot.time<=now())return 0;
  let places=slot.reschedulingRemaining;
  if(slot.totalCapacity>0)places=Math.min(places,slot.totalCapacity-slot.trialReserved-slot.reschedulingReserved);
  const destination=target(slot);
  if(destination){
   if(destination.scheduleId===source.scheduleId&&destination.sequence===source.sequence)return 0;
   const schedule=schedules.get(destination.scheduleId),occurrence=schedule&&!schedule.activityDeleted?scheduleOccurrence(schedule,destination.sequence):null;
   if(!occurrence||occurrence.item.course!==slot.courseId||occurrence.date!==slot.date||occurrence.item.time!==slot.time||occurrence.item.duration!==slot.duration)return 0;
   if(database.prepare('SELECT id FROM student_sessions WHERE student_id=? AND schedule_id=? AND sequence=?').get(source.studentId,destination.scheduleId,destination.sequence))return 0;
   if(database.prepare('SELECT manual_status FROM class_capacity_statuses WHERE schedule_id=? AND sequence=?').get(destination.scheduleId,destination.sequence)?.manual_status==='full')return 0;
   const occupied=Number(database.prepare("SELECT COUNT(*) AS count FROM student_sessions sessions JOIN enrollment_orders orders ON orders.id=sessions.order_id WHERE orders.payment_status='paid' AND sessions.schedule_id=? AND sessions.sequence=?").get(destination.scheduleId,destination.sequence).count);
   if(Number.isSafeInteger(occurrence.item.capacity))places=Math.min(places,(slot.formalManaged?slot.totalCapacity:occurrence.item.capacity)-occupied-(slot.classTrialReserved??slot.trialReserved));
  }
  return Math.max(0,places);
 };
 const options=source=>availableSlots.scopeFacts().filter(slot=>remaining(slot,source)>0).map(slot=>({id:slot.id,slotId:slot.id,courseId:slot.courseId,courseName:getCourse(slot.courseId)?.courseName||slot.courseName,courseNameEn:getCourse(slot.courseId)?.courseNameEn||'',date:slot.date,time:slot.time,duration:slot.duration,teacherNames:slot.teacherNames,roomNames:slot.roomNames,availableSeats:remaining(slot,source),...(target(slot)||{})})).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
 const reserve=(slotId,source,sessionId,actorId)=>transaction(()=>{
  if(!availableSlots.scopeFacts().some(row=>row.id===slotId))unavailable();availableSlots.ensureSlot(slotId);if(postgres)database.prepare('SELECT id FROM available_slots WHERE id=? FOR UPDATE').get(slotId);
  let slot=availableSlots.scopeFacts().find(row=>row.id===slotId);if(!slot||remaining(slot,source)<1)unavailable();
  let destination=target(slot);
  if(!destination){
   const schedule=schedules.createAvailableTime(slot,actorId);destination={scheduleId:schedule.id,sequence:1};database.prepare('INSERT INTO availability_rescheduling_targets(slot_id,schedule_id) VALUES (?,?)').run(slotId,schedule.id);
  }
  if(postgres)database.prepare('SELECT id FROM schedules WHERE id=? FOR UPDATE').get(destination.scheduleId);
  slot=availableSlots.scopeFacts().find(row=>row.id===slotId);if(remaining(slot,source)<1)unavailable();
  database.prepare("UPDATE availability_reservations SET state='released' WHERE kind='rescheduling' AND student_session_id=? AND state='held'").run(sessionId);
  const id=randomUUID();database.prepare("INSERT INTO availability_reservations(id,slot_id,kind,state,source_identity,student_session_id,target_schedule_id,target_sequence) VALUES (?,?,'rescheduling','held',NULL,?,?,?)").run(id,slotId,sessionId,destination.scheduleId,destination.sequence);
  return {...destination,reservationId:id};
 });
 return {options,reserve};
}
