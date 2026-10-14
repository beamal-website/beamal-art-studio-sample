import {randomUUID,createHash} from 'node:crypto';
import {ApplicationError} from './validation.mjs';
import {scheduleOccurrence,scheduleFollowingRule} from '../shared/schedule-occurrences.js';

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

export function requireOccurrenceRequest(input,editing=false) {
  const version=requireScheduleVersion(input);
  if (!['single','following'].includes(input.scope)) invalid('Choose this lesson only or this and following lessons.');
  const allowed=editing?[...fields,'version','scope']:['version','scope'];
  if (Object.keys(input).some(key=>!allowed.includes(key))) invalid('Unsupported lesson operation field.');
  const data=editing?validateSchedule(Object.fromEntries(fields.filter(key=>Object.hasOwn(input,key)).map(key=>[key,input[key]]))):null;
  return {version,scope:input.scope,data};
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
    CREATE TABLE IF NOT EXISTS schedule_following_cancellation_undo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id TEXT NOT NULL REFERENCES schedules(id), from_sequence INTEGER NOT NULL,
      state TEXT NOT NULL
    );
  `);
  const dto = row => row ? {...JSON.parse(row.data),course:row.course_id,id:row.id,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,...(row.deleted_at?{activityDeleted:true}:{})} : null;
  const get = id => dto(database.prepare('SELECT * FROM schedules WHERE id=?').get(id));
  const administrator = actorId => {
    if (database.prepare('SELECT role FROM users WHERE id=?').get(actorId)?.role !== 'admin') throw new ApplicationError(403,'ROLE_FORBIDDEN','Only an administrator can change schedules.');
  };
  const existingCourse = course => {
    const current = database.prepare('SELECT id,deleted_at FROM courses WHERE id=?').get(course);
    if (!current) invalid('Select an existing course.');
    if (current.deleted_at) throw new ApplicationError(409,'COURSE_DELETED','This course is deleted. Restore it before adding or restoring schedules.');
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
    if (current.segments?.length || current.exceptions?.length) throw new ApplicationError(409,'SCHEDULE_HAS_SCOPED_CHANGES','This schedule has individual or following-lesson changes. Edit the selected lesson instead.');
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
    if (restore) existingCourse(current.course);
    const now=new Date().toISOString();
    const result=database.prepare('UPDATE schedules SET deleted_at=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(restore?null:now,now,id,version);
    if (result.changes !== 1) throw new ApplicationError(409,'VERSION_CONFLICT','This schedule was changed by someone else. Reload it before saving.');
    const schedule=get(id);audit(actorId,restore?'schedule.restore':'schedule.delete',schedule);return schedule;
  });
  const scopedCurrent = (id,version,actorId,sequence) => {
    administrator(actorId);const current=currentVersion(id,version);
    if (current.activityDeleted) throw new ApplicationError(404,'SCHEDULE_NOT_FOUND','Schedule was not found.');
    existingCourse(current.course);
    const occurrence=scheduleOccurrence(current,sequence,{includeCancelled:true});
    if (!occurrence) throw new ApplicationError(404,'SCHEDULE_OCCURRENCE_NOT_FOUND','This lesson no longer exists in the schedule.');
    return {current,occurrence};
  };
  const exception = (current,sequence,overrides,cancelled) => {
    const rows=(current.exceptions||[]).filter(item=>item.sequence!==sequence);
    if (Object.keys(overrides).length || typeof cancelled==='boolean') rows.push({sequence,overrides,...(typeof cancelled==='boolean'?{cancelled}:{})});
    return rows.sort((a,b)=>a.sequence-b.sequence);
  };
  const writeScoped = (current,next,actorId,action) => {
    const {id,course,version,createdAt,updatedAt,activityDeleted,...data}=next;
    if (!data.segments?.length) delete data.segments;
    if (!data.exceptions?.length) delete data.exceptions;
    const now=new Date().toISOString();
    const changed=database.prepare('UPDATE schedules SET data=?,version=version+1,updated_at=? WHERE id=? AND version=? AND deleted_at IS NULL').run(JSON.stringify(data),now,current.id,current.version);
    if (changed.changes!==1) throw new ApplicationError(409,'VERSION_CONFLICT','This schedule was changed by someone else. Reload it before saving.');
    const schedule=get(current.id);audit(actorId,action,schedule);return schedule;
  };
  const segmentAt = (current,sequence) => {
    let result={fromSequence:1,rule:Object.fromEntries(fields.map(key=>[key,current[key]]))};
    for (const segment of current.segments||[]) if (segment.fromSequence<=sequence) result=segment;
    return result;
  };
  const splitAt = (current,sequence) => {
    const segments=[...(current.segments||[])];
    if (!segments.some(segment=>segment.fromSequence===sequence)) {
      const active=segmentAt(current,sequence),base=scheduleOccurrence({...current,exceptions:[]},sequence,{includeCancelled:true});
      const rule={...active.rule,startDate:base.date,session:base.item.session,...(active.rule.endMode==='count'?{count:active.rule.count-(sequence-active.fromSequence)}:{})};
      segments.push({fromSequence:sequence,rule,...(active.cancelled?{cancelled:true}:{})});
    }
    return segments.sort((a,b)=>a.fromSequence-b.fromSequence);
  };
  const recurrenceChanged = (data,opened) => data.startDate!==opened.startDate || JSON.stringify(data.weekdays)!==JSON.stringify(opened.weekdays) || data.endMode!==opened.endMode || data.endMode==='date' && data.endDate!==opened.endDate || data.endMode==='count' && data.count!==opened.count;
  const applyFollowingFields = (current,sequence,data,opened) => {
    const changed=['time','duration','mustAttendAll','teacher','room','capacity','session','color','remark','detail','moreInfo'].filter(key=>data[key]!==opened[key]);
    const segments=splitAt(current,sequence).map(segment=> {
      if (segment.fromSequence<sequence) return segment;
      const rule={...segment.rule};
      for (const key of changed) rule[key]=key==='session'?data.session+segment.fromSequence-sequence:data[key];
      return {...segment,rule:validateSchedule(rule)};
    });
    const exceptions=(current.exceptions||[]).map(item=> {
      if (item.sequence<sequence) return item;
      const overrides={...item.overrides};
      for (const key of changed) delete overrides[key];
      return {...item,overrides};
    }).filter(item=>Object.keys(item.overrides).length || typeof item.cancelled==='boolean');
    return {...current,segments,exceptions};
  };
  const editOccurrence = (id,sequence,input,actorId) => transaction(()=>{
    const {version,scope,data}=requireOccurrenceRequest(input,true),{current,occurrence}=scopedCurrent(id,version,actorId,sequence);
    if (data.course!==current.course) throw new ApplicationError(409,'SCHEDULE_COURSE_MISMATCH','Individual and following lessons must keep the same course.');
    if (occurrence.cancelled) throw new ApplicationError(409,'SCHEDULE_OCCURRENCE_CANCELLED','Restore this lesson before editing it.');
    let next={...current};
    if (scope==='single') {
      const base=scheduleOccurrence({...current,exceptions:[]},sequence,{includeCancelled:true}),overrides={};
      for (const key of ['time','duration','teacher','room','capacity','session','color','remark','detail','moreInfo']) if (data[key]!==base.item[key]) overrides[key]=data[key];
      if (data.startDate!==base.date) overrides.date=data.startDate;
      const previous=(current.exceptions||[]).find(item=>item.sequence===sequence);
      next.exceptions=exception(current,sequence,overrides,previous?.cancelled);
    } else if (!recurrenceChanged(data,scheduleFollowingRule(current,sequence))) {
      // The editor may show a moved lesson's weekday/date boundary even when
      // later slots retain their old weekdays. Unchanged recurrence controls
      // must preserve that calendar and apply only the fields actually edited.
      next=applyFollowingFields(current,sequence,data,scheduleFollowingRule(current,sequence));
    } else {
      // A new following rule intentionally replaces later default rules, but
      // must never silently discard another lesson's explicit exception.
      if ((current.segments||[]).some(segment=>segment.cancelled)) throw new ApplicationError(409,'SCHEDULE_OCCURRENCE_CONFLICT','Restore cancelled following lessons before changing their repeat rule.');
      next.segments=[...(current.segments||[]).filter(segment=>segment.fromSequence<sequence),{fromSequence:sequence,rule:data}];
      next.exceptions=(current.exceptions||[]).filter(item=>item.sequence!==sequence);
      if (next.exceptions.some(item=>!scheduleOccurrence(next,item.sequence,{includeCancelled:true}))) throw new ApplicationError(409,'SCHEDULE_OCCURRENCE_CONFLICT','This repeat rule would remove an individually changed lesson. Resolve that lesson before shortening the schedule.');
    }
    return writeScoped(current,next,actorId,'schedule.occurrence.update');
  });
  const changeOccurrenceDeletion = (id,sequence,input,actorId,restore=false) => transaction(()=>{
    const {version,scope}=requireOccurrenceRequest(input),{current,occurrence}=scopedCurrent(id,version,actorId,sequence);
    if (scope==='single' && restore && !occurrence.cancelled) throw new ApplicationError(409,'SCHEDULE_OCCURRENCE_NOT_CANCELLED','Only a cancelled lesson can be restored.');
    if (scope==='single' && !restore && occurrence.cancelled) throw new ApplicationError(404,'SCHEDULE_OCCURRENCE_NOT_FOUND','This lesson is already cancelled.');
    const next={...current};
    if (scope==='single') {
      const previous=(current.exceptions||[]).find(item=>item.sequence===sequence);
      next.exceptions=exception(current,sequence,previous?.overrides||{},!restore);
    } else {
      const segments=splitAt(current,sequence),exceptions=current.exceptions||[];
      const undo=restore?database.prepare('SELECT id,state FROM schedule_following_cancellation_undo WHERE schedule_id=? AND from_sequence=? ORDER BY id DESC LIMIT 1').get(id,sequence):null;
      const before=undo?JSON.parse(undo.state):null;
      if (!restore) {
        const flags=(rows,key)=>rows.filter(item=>item[key]>=sequence).map(item=>[item[key],typeof item.cancelled==='boolean'?item.cancelled:null]);
        database.prepare('INSERT INTO schedule_following_cancellation_undo(schedule_id,from_sequence,state) VALUES (?,?,?)').run(id,sequence,JSON.stringify({segments:flags(segments,'fromSequence'),exceptions:flags(exceptions,'sequence')}));
      }
      const changeFlags=(rows,key,saved)=> {
        const flags=saved?new Map(saved):null;
        return rows.map(item=> {
          if (item[key]<sequence || restore && flags && !flags.has(item[key])) return item;
          const {cancelled,...kept}=item;
          if (!restore) return {...kept,cancelled:true};
          const previous=flags?.get(item[key]);
          return typeof previous==='boolean'?{...kept,cancelled:previous}:kept;
        });
      };
      // Undo restores only this deletion's flags. Existing single cancellations
      // and all date/teacher/other overrides survive the operation unchanged.
      next.segments=changeFlags(segments,'fromSequence',before?.segments);
      next.exceptions=changeFlags(exceptions,'sequence',before?.exceptions);
      if (undo) database.prepare('DELETE FROM schedule_following_cancellation_undo WHERE id=?').run(undo.id);
    }
    return writeScoped(current,next,actorId,restore?'schedule.occurrence.restore':'schedule.occurrence.delete');
  });
  return {list,get,create,update,editOccurrence,deleteOccurrence:(id,sequence,input,actorId)=>changeOccurrenceDeletion(id,sequence,input,actorId),restoreOccurrence:(id,sequence,input,actorId)=>changeOccurrenceDeletion(id,sequence,input,actorId,true),delete:(id,input,actorId)=>changeDeletion(id,input,actorId),restore:(id,input,actorId)=>changeDeletion(id,input,actorId,true),audit:()=>database.prepare('SELECT * FROM schedule_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)}))};
}
