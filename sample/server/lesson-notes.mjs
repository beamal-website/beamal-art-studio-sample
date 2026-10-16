import {ApplicationError} from './validation.mjs';
import {scheduleOccurrence} from '../shared/schedule-occurrences.js';

const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const fail=(status,code,message)=>{throw new ApplicationError(status,code,message);};
const invalid=message=>fail(400,'INVALID_LESSON_NOTE',message);

function validateInput(input){
 if(!plain(input))invalid('A lesson note must be a JSON object.');
 if(!Number.isSafeInteger(input.version)||input.version<0)fail(409,'VERSION_REQUIRED','Reload the note and include its current version, or zero for a new note.');
 if(!Number.isSafeInteger(input.sourceVersion)||input.sourceVersion<1)fail(409,'SOURCE_VERSION_REQUIRED','Reload the lesson and include its current source version.');
 if(Object.keys(input).some(field=>!['version','sourceVersion','text'].includes(field))||typeof input.text!=='string'||input.text.length>2000)invalid('Provide only the current versions and note text of at most 2000 characters.');
 return {version:input.version,sourceVersion:input.sourceVersion,text:input.text};
}

export function createLessonNoteStore({database,transaction,schedules,accessControl,getCourse}){
 transaction(()=>database.exec(`
  CREATE TABLE IF NOT EXISTS lesson_notes(
   schedule_id TEXT NOT NULL REFERENCES schedules(id),sequence INTEGER NOT NULL CHECK(sequence>0),
   text TEXT NOT NULL CHECK(length(text)<=2000),version INTEGER NOT NULL CHECK(version>0),
   created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(schedule_id,sequence)
  );
  CREATE TABLE IF NOT EXISTS lesson_note_audit_log(
   id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),
   schedule_id TEXT NOT NULL,sequence INTEGER NOT NULL,action TEXT NOT NULL,
   version INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL,
   FOREIGN KEY(schedule_id,sequence) REFERENCES lesson_notes(schedule_id,sequence)
  );
 `));
 const reader=user=>{
  const actor=database.prepare('SELECT id,role FROM users WHERE id=?').get(user&&typeof user.id==='string'?user.id:'');
  if(!actor||!['admin','teacher'].includes(actor.role))fail(403,'ROLE_FORBIDDEN','Lesson notes are only available to administrators and authorized teachers.');
  return actor;
 };
 const canWrite=(actor,occurrence)=>{
  if(actor.role==='admin')return true;
  const own=new Set(accessControl.ownTeacherResourceIds(actor));
  return (occurrence.item.teacherIds||[]).some(id=>own.has(id));
 };
 const target=(id,sequence,user)=>{
  const actor=reader(user);
  if(typeof id!=='string'||!id||id.trim()!==id||id.length>200||!Number.isSafeInteger(sequence)||sequence<1)invalid('Choose an exact lesson schedule and positive sequence.');
  const schedule=schedules.get(id),course=schedule&&getCourse(schedule.course),occurrence=schedule&&!schedule.activityDeleted&&course&&!course.deletedAt?scheduleOccurrence(schedule,sequence):null;
  if(!occurrence||actor.role==='teacher'&&!accessControl.scopeFor(actor).permits(occurrence))fail(404,'LESSON_NOTE_NOT_FOUND','The active authorized lesson was not found.');
  return {actor,occurrence,canWrite:canWrite(actor,occurrence)};
 };
 const record=(id,sequence)=>database.prepare('SELECT * FROM lesson_notes WHERE schedule_id=? AND sequence=?').get(id,sequence);
 const project=(occurrence,row,writable)=>({
  scheduleId:occurrence.item.id,sequence:occurrence.sequence,courseId:occurrence.item.course,date:occurrence.date,time:occurrence.item.time,
  sourceVersion:occurrence.item.version,version:row?.version??0,text:row?.text??'',updatedAt:row?.updated_at??null,canWrite:writable,
 });
 const writableTarget=(id,sequence,user)=>{
  const current=target(id,sequence,user);
  if(!current.canWrite)fail(403,'ROLE_FORBIDDEN','Only the current responsible teacher or an administrator can save this lesson note.');
  return current;
 };
 const get=(id,sequence,user)=>transaction(()=>{const current=target(id,sequence,user);return project(current.occurrence,record(id,sequence),current.canWrite);},'read');
 const authorizeWrite=(id,sequence,user)=>transaction(()=>{const current=writableTarget(id,sequence,user);return project(current.occurrence,record(id,sequence),true);},'read');
 const save=(id,sequence,input,user)=>transaction(()=>{
  const {actor,occurrence}=writableTarget(id,sequence,user),data=validateInput(input),current=record(id,sequence);
  if(data.version!==(current?.version??0))fail(409,'VERSION_CONFLICT','This lesson note changed. Reload it before saving.');
  if(data.sourceVersion!==occurrence.item.version)fail(409,'SOURCE_VERSION_CONFLICT','This lesson changed. Reload it before saving the note.');
  if(!current&&!data.text.trim())invalid('Enter a note before saving it for the first time.');
  const now=new Date().toISOString();
  if(current){
   const changed=database.prepare('UPDATE lesson_notes SET text=?,version=version+1,updated_at=? WHERE schedule_id=? AND sequence=? AND version=?').run(data.text,now,id,sequence,data.version);
   if(changed.changes!==1)fail(409,'VERSION_CONFLICT','This lesson note changed. Reload it before saving.');
  }else database.prepare('INSERT INTO lesson_notes(schedule_id,sequence,text,version,created_at,updated_at) VALUES (?,?,?,1,?,?)').run(id,sequence,data.text,now,now);
  const note=project(occurrence,record(id,sequence),true);
  database.prepare('INSERT INTO lesson_note_audit_log(actor_id,schedule_id,sequence,action,version,snapshot,created_at) VALUES (?,?,?,?,?,?,?)').run(actor.id,id,sequence,'lesson-note.save',note.version,JSON.stringify(note),now);
  return note;
 });
 const audit=()=>database.prepare('SELECT * FROM lesson_note_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)}));
 return {get,authorizeWrite,save,audit};
}
