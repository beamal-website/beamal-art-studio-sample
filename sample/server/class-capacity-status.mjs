import {createHash} from 'node:crypto';
import {ApplicationError} from './validation.mjs';
import {scheduleOccurrence} from '../shared/schedule-occurrences.js';

const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const invalid=message=>{throw new ApplicationError(400,'INVALID_CLASS_STATUS',message);};
const recordKey=(scheduleId,sequence)=>JSON.stringify([scheduleId,sequence]);
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&value<='9999-12-31'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export function validateClassStatusQuery(input={}) {
  if(!plain(input)||Object.keys(input).some(key=>!['from','to','courseId','since'].includes(key)))invalid('Unsupported class status query.');
  if(!validDate(input.from)||!validDate(input.to)||input.to<input.from||(Date.parse(input.to)-Date.parse(input.from))/86400000>=366)throw new ApplicationError(400,'INVALID_DATE_RANGE','Choose an inclusive range of at most 366 days.');
  for(const field of['courseId','since'])if(input[field]!==undefined&&(typeof input[field]!=='string'||input[field].length>200))invalid('Choose a course and revision of at most 200 characters.');
  return {from:input.from,to:input.to,courseId:input.courseId||'',since:input.since||''};
}
export function validateClassStatus(input) {
  if(!plain(input))invalid('Class status must be a JSON object.');
  if(!Number.isSafeInteger(input.version)||input.version<0)throw new ApplicationError(409,'VERSION_REQUIRED','Include the current class status version, or zero for an unset status.');
  if(!Number.isSafeInteger(input.sourceVersion)||input.sourceVersion<1)throw new ApplicationError(409,'SOURCE_VERSION_REQUIRED','Reload the lesson and include its current source version.');
  if(Object.keys(input).some(key=>!['version','sourceVersion','manualStatus'].includes(key))||!Object.hasOwn(input,'manualStatus')||![null,'full','available'].includes(input.manualStatus))invalid('Provide only the current versions and Full, Available or an empty manual status.');
  return {version:input.version,sourceVersion:input.sourceVersion,manualStatus:input.manualStatus};
}
export function classCapacityStatusDTO(occurrence,row=null) {
  const item=occurrence.item,manualStatus=row?.manual_status??null;
  return {scheduleId:item.id,sequence:occurrence.sequence,courseId:item.course,date:occurrence.date,time:item.time,duration:item.duration,classCapacity:item.capacity??null,classOccupied:null,automaticStatus:null,manualStatus,effectiveStatus:manualStatus,statusSource:manualStatus===null?'unknown':'manual',version:row?.version??0,sourceVersion:item.version,createdAt:row?.created_at??null,updatedAt:row?.updated_at??null};
}

export function createClassCapacityStatusStore({database,transaction,accessControl}) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS class_capacity_statuses(
      schedule_id TEXT NOT NULL REFERENCES schedules(id),sequence INTEGER NOT NULL CHECK(sequence>0),
      manual_status TEXT CHECK(manual_status IS NULL OR manual_status IN ('full','available')),
      version INTEGER NOT NULL CHECK(version>0),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
      PRIMARY KEY(schedule_id,sequence)
    );
    CREATE TABLE IF NOT EXISTS class_capacity_status_audit_log(
      id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),
      schedule_id TEXT NOT NULL,sequence INTEGER NOT NULL,action TEXT NOT NULL,version INTEGER NOT NULL,
      snapshot TEXT NOT NULL,created_at TEXT NOT NULL,
      FOREIGN KEY(schedule_id,sequence) REFERENCES class_capacity_statuses(schedule_id,sequence)
    );
  `);
  const identity=user=>user&&typeof user.id==='string'?database.prepare('SELECT id,role FROM users WHERE id=?').get(user.id):null;
  const reader=user=>{const person=identity(user);if(!person||!['admin','teacher'].includes(person.role))throw new ApplicationError(403,'ROLE_FORBIDDEN','Class status is only available to administrators and authorized teachers.');return person;};
  const target=(id,sequence,person)=>{
    if(typeof id!=='string'||!id||id.length>200||!Number.isSafeInteger(sequence)||sequence<1)invalid('Choose an existing lesson sequence.');
    const row=database.prepare('SELECT schedules.*,courses.deleted_at AS course_deleted FROM schedules JOIN courses ON courses.id=schedules.course_id WHERE schedules.id=?').get(id);
    const schedule=row&&!row.deleted_at&&!row.course_deleted?{...JSON.parse(row.data),id:row.id,course:row.course_id,version:row.version}:null,occurrence=schedule&&scheduleOccurrence(schedule,sequence);
    if(!occurrence||person.role==='teacher'&&!accessControl.scopeFor(person).permits(occurrence))throw new ApplicationError(404,'CLASS_STATUS_NOT_FOUND','The active authorized lesson was not found.');return occurrence;
  };
  const record=(id,sequence)=>database.prepare('SELECT * FROM class_capacity_statuses WHERE schedule_id=? AND sequence=?').get(id,sequence);
  const get=(id,sequence,user)=>transaction(()=>{const occurrence=target(id,sequence,reader(user));return classCapacityStatusDTO(occurrence,record(id,sequence));},'read');
  const rawMap=()=>new Map(database.prepare('SELECT * FROM class_capacity_statuses ORDER BY schedule_id,sequence').all().map(row=>[recordKey(row.schedule_id,row.sequence),row]));
  const list=(user,input)=>transaction(()=>{
    const person=reader(user),{from,to,courseId,since}=validateClassStatusQuery(input),scope=accessControl.scopeFor(person),statuses=[];
    const rows=database.prepare('SELECT status.*,schedules.data AS schedule_data,schedules.course_id,schedules.version AS schedule_version FROM class_capacity_statuses AS status JOIN schedules ON schedules.id=status.schedule_id JOIN courses ON courses.id=schedules.course_id WHERE schedules.deleted_at IS NULL AND courses.deleted_at IS NULL ORDER BY status.schedule_id,status.sequence').all();
    for(const row of rows){if(courseId&&row.course_id!==courseId)continue;const occurrence=scheduleOccurrence({...JSON.parse(row.schedule_data),id:row.schedule_id,course:row.course_id,version:row.schedule_version},row.sequence);if(occurrence&&occurrence.date>=from&&occurrence.date<=to&&(person.role==='admin'||scope.permits(occurrence)))statuses.push(classCapacityStatusDTO(occurrence,row));}
    statuses.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.scheduleId.localeCompare(b.scheduleId)||a.sequence-b.sequence);
    const revision=createHash('sha256').update(JSON.stringify({scope:scope.revision,from,to,courseId,statuses})).digest('hex');return since===revision?{revision,unchanged:true}:{revision,statuses};
  },'read');
  const update=(id,sequence,input,user)=>transaction(()=>{
    const person=reader(user);if(person.role!=='admin')throw new ApplicationError(403,'ROLE_FORBIDDEN','Only an administrator can change manual class status.');
    const data=validateClassStatus(input),occurrence=target(id,sequence,person),current=record(id,sequence);
    if(data.version!==(current?.version??0))throw new ApplicationError(409,'VERSION_CONFLICT','This class status changed. Reload it before saving.');
    if(data.sourceVersion!==occurrence.item.version)throw new ApplicationError(409,'SOURCE_VERSION_CONFLICT','This lesson changed. Reload it before saving its class status.');
    const now=new Date().toISOString();if(current)database.prepare('UPDATE class_capacity_statuses SET manual_status=?,version=version+1,updated_at=? WHERE schedule_id=? AND sequence=? AND version=?').run(data.manualStatus,now,id,sequence,data.version);else database.prepare('INSERT INTO class_capacity_statuses VALUES (?,?,?,1,?,?)').run(id,sequence,data.manualStatus,now,now);
    const status=classCapacityStatusDTO(occurrence,record(id,sequence));database.prepare('INSERT INTO class_capacity_status_audit_log(actor_id,schedule_id,sequence,action,version,snapshot,created_at) VALUES (?,?,?,?,?,?,?)').run(person.id,id,sequence,'class-capacity-status.update',status.version,JSON.stringify(status),now);return status;
  });
  return {get,list,update,rawMap,audit:()=>database.prepare('SELECT * FROM class_capacity_status_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)}))};
}
