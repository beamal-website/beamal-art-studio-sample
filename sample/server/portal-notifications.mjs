import {createHash} from 'node:crypto';
import {scheduleOccurrence} from '../shared/schedule-occurrences.js';
import {ApplicationError} from './validation.mjs';
export function createPortalNotificationStore({database,transaction,trialApplications,accessControl,schedules}){
 database.exec(`CREATE TABLE IF NOT EXISTS portal_notification_reads(user_id TEXT NOT NULL REFERENCES users(id),notification_id TEXT NOT NULL,read_at TEXT NOT NULL,PRIMARY KEY(user_id,notification_id));`);
 const actor=user=>{const current=database.prepare('SELECT id,role FROM users WHERE id=?').get(user?.id||'');if(!current||!['admin','teacher','student'].includes(current.role))throw new ApplicationError(403,'ROLE_FORBIDDEN','Notifications are unavailable for this account.');return current;};
 const rows=current=>{
  const notifications=[],scope=current.role==='teacher'?accessControl.scopeFor(current):null;
  const permittedLesson=lesson=>{const schedule=schedules.get(lesson.scheduleId);if(!schedule||schedule.activityDeleted)return false;const occurrence=scheduleOccurrence(schedule,lesson.sequence,{includeCancelled:true});return !!occurrence&&scope.permits(occurrence);};
  if(current.role!=='student')for(const row of database.prepare('SELECT * FROM trial_application_acceptances ORDER BY created_at DESC,application_id DESC').all()){
   let application;try{application=trialApplications.get(row.application_id,current);}catch(error){if([403,404].includes(error.status))continue;throw error;}
   const {applicant,slot}=application,name=applicant.displayName;
   notifications.push({id:'trial:'+application.id,type:'trial-confirmed',createdAt:row.created_at,titleZh:'試堂已確認',titleEn:'Trial confirmed',bodyZh:`${name} 的試堂已確認：${slot.courseName}，${slot.date} ${slot.time}。`,bodyEn:`${name}'s trial is confirmed: ${slot.courseName}, ${slot.date} ${slot.time}.`});
  }
  {
   const owned=new Set(current.role==='student'?database.prepare('SELECT student_id FROM student_account_links WHERE user_id=?').all(current.id).map(row=>row.student_id):[]);
   for(const row of database.prepare("SELECT requests.*,people.display_name FROM student_lesson_requests requests JOIN people ON people.id=requests.student_id WHERE requests.request_type='reschedule' AND requests.status='approved' ORDER BY requests.updated_at DESC,requests.id DESC").all()){
    if(current.role==='student'&&!owned.has(row.student_id))continue;
    const data=JSON.parse(row.data),from=data.lesson,to=data.resolution?.assignedLesson;if(!from||!to)continue;
    if(scope&&![from,to].some(permittedLesson))continue;
    notifications.push({id:'reschedule:'+row.id,type:'rescheduling-confirmed',createdAt:data.resolution.at||row.updated_at,titleZh:'調堂已確認',titleEn:'Rescheduling confirmed',bodyZh:`${row.display_name} 的調堂已確認：由 ${from.courseName}，${from.date} ${from.time}，調至 ${to.courseName}，${to.date} ${to.time}。`,bodyEn:`${row.display_name}'s rescheduling is confirmed: from ${from.courseName}, ${from.date} ${from.time}, to ${to.courseName}, ${to.date} ${to.time}.`});
   }
  }
  if(scope){
   const previous=new Map();
   for(const event of database.prepare('SELECT * FROM schedule_audit_log ORDER BY id').all()){
    const snapshot=JSON.parse(event.snapshot),before=previous.get(event.schedule_id);previous.set(event.schedule_id,snapshot);
    if(!before||event.action==='schedule.create')continue;
    const currentSchedule=schedules.get(event.schedule_id);if(!currentSchedule||currentSchedule.activityDeleted)continue;
    const sequences=new Set([1,...[before,snapshot].flatMap(row=>[...(row.exceptions||[]).map(item=>item.sequence),...(row.segments||[]).map(item=>item.fromSequence)])]);
    const comparable=row=>row?JSON.stringify({...row,item:Object.fromEntries(Object.entries(row.item).filter(([key])=>!['version','createdAt','updatedAt'].includes(key)))}):null;
    const changed=[...sequences].some(sequence=>{
     const old=scheduleOccurrence(before,sequence,{includeCancelled:true}),next=scheduleOccurrence(snapshot,sequence,{includeCancelled:true}),now=scheduleOccurrence(currentSchedule,sequence,{includeCancelled:true});
     return now&&scope.permits(now)&&comparable(old)!==comparable(next);
    });
    if(!changed)continue;
    const course=database.prepare('SELECT data FROM courses WHERE id=? AND deleted_at IS NULL').get(currentSchedule.course);if(!course)continue;
    const name=JSON.parse(course.data).courseName;
    notifications.push({id:'schedule:'+event.id,type:'schedule-updated',createdAt:event.created_at,titleZh:'課堂安排已更新',titleEn:'Lesson arrangement updated',bodyZh:`${name} 的課堂安排已由管理員更新，請查看最新時間表。`,bodyEn:`An administrator updated the lesson arrangement for ${name}. Please check the latest timetable.`});
   }
  }
  const read=new Set(database.prepare('SELECT notification_id FROM portal_notification_reads WHERE user_id=?').all(current.id).map(row=>row.notification_id));
  return notifications.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id)).slice(0,100).map(row=>({...row,read:read.has(row.id)}));
 };
 const list=(user,{since=''}={})=>transaction(()=>{
  if(typeof since!=='string'||since.length>200)throw new ApplicationError(400,'INVALID_NOTIFICATION_QUERY','Use a valid notification revision.');
  const current=actor(user),notifications=rows(current),unread=notifications.filter(row=>!row.read).length,revision=createHash('sha256').update(JSON.stringify([current,notifications])).digest('hex');
  return since===revision?{revision,unchanged:true,unread}:{revision,notifications,unread};
 },'read');
 const markRead=(id,user)=>transaction(()=>{
  const current=actor(user);if(typeof id!=='string'||!rows(current).some(row=>row.id===id))throw new ApplicationError(404,'NOTIFICATION_NOT_FOUND','Notification was not found.');
  database.prepare('INSERT OR IGNORE INTO portal_notification_reads(user_id,notification_id,read_at) VALUES (?,?,?)').run(current.id,id,new Date().toISOString());return {id,read:true};
 });
 return {list,markRead};
}
