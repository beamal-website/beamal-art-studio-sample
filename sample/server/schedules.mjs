import {randomUUID,createHash} from 'node:crypto';
import {ApplicationError} from './validation.mjs';

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const invalid = message => {throw new ApplicationError(400,'INVALID_SCHEDULE',message);};
const fields = ['course','startDate','time','duration','weekdays','endMode','endDate','count','mustAttendAll','color','teacher','room','capacity','session','remark','detail','moreInfo'];
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value;
const text = (value,label,maximum=200) => {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > maximum) invalid(`${label} must be text of at most ${maximum} characters.`);
  return value.trim();
};

export function requireScheduleVersion(input,versionOnly=false) {
  if (!plain(input) || !Number.isSafeInteger(input.version) || input.version < 1) throw new ApplicationError(409,'VERSION_REQUIRED','Reload the schedule and include its current version before saving.');
  if (versionOnly && Object.keys(input).some(key=>key !== 'version')) invalid('This operation only accepts the current version.');
  return input.version;
}

export function validateSchedule(input,current=null) {
  if (!plain(input)) invalid('Schedule must be a JSON object.');
  for (const key of Object.keys(input)) if (!fields.includes(key) && !(current && key === 'version')) invalid(`Unsupported schedule field: ${key}.`);
  const source = current ? {...current,...input} : input;
  if (typeof source.course !== 'string' || !source.course || source.course.length > 200) invalid('Select an existing course.');
  if (!validDate(source.startDate)) invalid('Choose a valid start date.');
  if (typeof source.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(source.time)) invalid('Choose a valid start time.');
  const minutes = Number(source.time.slice(0,2))*60+Number(source.time.slice(3));
  if (minutes % 15 || !Number.isSafeInteger(source.duration) || source.duration < 15 || source.duration % 15 || minutes+source.duration > 1440) invalid('Start time and duration must use 15-minute intervals and end within the same day.');
  if (!Array.isArray(source.weekdays) || !source.weekdays.length || source.weekdays.length > 7 || source.weekdays.some(day=>!Number.isInteger(day) || day<0 || day>6) || new Set(source.weekdays).size !== source.weekdays.length) invalid('Choose at least one different repeat weekday.');
  if (!['forever','date','count'].includes(source.endMode)) invalid('Choose a valid end condition.');
  if (source.endMode === 'date' && (!validDate(source.endDate) || source.endDate < source.startDate)) invalid('End date must be on or after the start date.');
  const count = source.count ?? 1;
  if (!Number.isSafeInteger(count) || count < 1 || count > 999) invalid('Occurrences must be a whole number from 1 to 999.');
  const capacity = source.capacity === undefined ? null : source.capacity, session = source.session ?? 1;
  if (capacity !== null && (!Number.isSafeInteger(capacity) || capacity < 1) || !Number.isSafeInteger(session) || session < 1) invalid('Capacity and session must be positive whole numbers.');
  if (source.mustAttendAll !== undefined && typeof source.mustAttendAll !== 'boolean') invalid('Must attend all must be true or false.');
  const color = source.color ?? '#27777b';
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) invalid('Choose a valid colour.');
  let occurs = false;
  for (let offset=0;offset<7;offset++) {
    const date = new Date(Date.parse(source.startDate+'T00:00:00Z')+offset*86400000);
    if (date.getUTCFullYear()>9999 || source.endMode === 'date' && date.toISOString().slice(0,10)>source.endDate) break;
    if (source.weekdays.includes(date.getUTCDay())) {occurs=true;break;}
  }
  if (!occurs) invalid('No lessons fall in this date range. Adjust the dates or repeat weekdays.');
  return {
    course:source.course,startDate:source.startDate,time:source.time,duration:source.duration,
    weekdays:[...source.weekdays].sort((a,b)=>(a+6)%7-(b+6)%7),endMode:source.endMode,
    endDate:source.endMode === 'date' ? source.endDate : '',count,mustAttendAll:source.mustAttendAll ?? true,color,
    teacher:text(source.teacher,'Teacher'),room:text(source.room,'Room'),capacity,session,
    remark:text(source.remark,'Remark',2000),detail:text(source.detail,'Detail',2000),moreInfo:text(source.moreInfo,'More info',2000),
  };
}

export function createScheduleStore({database,transaction}) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id), data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS schedules_course ON schedules(course_id,deleted_at);
    CREATE TABLE IF NOT EXISTS schedule_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL, schedule_id TEXT NOT NULL REFERENCES schedules(id),
      version INTEGER NOT NULL, snapshot TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
  const dto = row => row ? {...JSON.parse(row.data),course:row.course_id,id:row.id,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,...(row.deleted_at?{activityDeleted:true}:{})} : null;
  const get = id => dto(database.prepare('SELECT * FROM schedules WHERE id=?').get(id));
  const administrator = actorId => {
    if (database.prepare('SELECT role FROM users WHERE id=?').get(actorId)?.role !== 'admin') throw new ApplicationError(403,'ROLE_FORBIDDEN','Only an administrator can change schedules.');
  };
  const existingCourse = course => {
    if (!database.prepare('SELECT id FROM courses WHERE id=?').get(course)) invalid('Select an existing course.');
  };
  const audit = (actorId,action,schedule) => database.prepare('INSERT INTO schedule_audit_log(actor_id,action,schedule_id,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actorId,action,schedule.id,schedule.version,JSON.stringify(schedule),schedule.updatedAt);
  const list = ({since=''}={}) => transaction(()=>{
    const versions = database.prepare('SELECT id,version FROM schedules WHERE deleted_at IS NULL ORDER BY id').all();
    const revision = createHash('sha256').update(JSON.stringify(versions)).digest('hex');
    if (since === revision) return {revision,unchanged:true};
    return {revision,schedules:database.prepare('SELECT * FROM schedules WHERE deleted_at IS NULL ORDER BY created_at,id').all().map(dto)};
  },'read');
  const create = (input,actorId) => transaction(()=>{
    administrator(actorId);const data=validateSchedule(input);existingCourse(data.course);
    const id=randomUUID(),now=new Date().toISOString(),{course,...stored}=data;
    database.prepare('INSERT INTO schedules(id,course_id,data,version,created_at,updated_at) VALUES (?,?,?,1,?,?)').run(id,course,JSON.stringify(stored),now,now);
    const schedule=get(id);audit(actorId,'schedule.create',schedule);return schedule;
  });
  const currentVersion = (id,version) => {
    const schedule=get(id);
    if (!schedule) throw new ApplicationError(404,'SCHEDULE_NOT_FOUND','Schedule was not found.');
    if (schedule.version !== version) throw new ApplicationError(409,'VERSION_CONFLICT','This schedule was changed by someone else. Reload it before saving.');
    return schedule;
  };
  const update = (id,input,actorId) => transaction(()=>{
    administrator(actorId);const version=requireScheduleVersion(input),current=currentVersion(id,version);
    if (current.activityDeleted) throw new ApplicationError(404,'SCHEDULE_NOT_FOUND','Schedule was not found.');
    const data=validateSchedule(input,current);existingCourse(data.course);
    const now=new Date().toISOString(),{course,...stored}=data;
    const result=database.prepare('UPDATE schedules SET course_id=?,data=?,version=version+1,updated_at=? WHERE id=? AND version=? AND deleted_at IS NULL').run(course,JSON.stringify(stored),now,id,version);
    if (result.changes !== 1) throw new ApplicationError(409,'VERSION_CONFLICT','This schedule was changed by someone else. Reload it before saving.');
    const schedule=get(id);audit(actorId,'schedule.update',schedule);return schedule;
  });
  const changeDeletion = (id,input,actorId,restore=false) => transaction(()=>{
    administrator(actorId);const version=requireScheduleVersion(input,true),current=currentVersion(id,version);
    if (restore && !current.activityDeleted) throw new ApplicationError(409,'SCHEDULE_NOT_DELETED','Only a deleted schedule can be restored.');
    if (!restore && current.activityDeleted) throw new ApplicationError(404,'SCHEDULE_NOT_FOUND','Schedule was not found.');
    const now=new Date().toISOString();
    const result=database.prepare('UPDATE schedules SET deleted_at=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(restore?null:now,now,id,version);
    if (result.changes !== 1) throw new ApplicationError(409,'VERSION_CONFLICT','This schedule was changed by someone else. Reload it before saving.');
    const schedule=get(id);audit(actorId,restore?'schedule.restore':'schedule.delete',schedule);return schedule;
  });
  return {list,get,create,update,delete:(id,input,actorId)=>changeDeletion(id,input,actorId),restore:(id,input,actorId)=>changeDeletion(id,input,actorId,true),audit:()=>database.prepare('SELECT * FROM schedule_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)}))};
}
