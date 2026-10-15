import {createHash,randomUUID} from 'node:crypto';
import {ApplicationError} from './validation.mjs';
import {scheduleOccurrence,scheduleOccurrences,scheduleLastSequence} from '../shared/schedule-occurrences.js';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const invalid=message=>{throw new ApplicationError(400,'INVALID_ACCESS',message);};
const version=input=>{if(!plain(input)||!Number.isSafeInteger(input.version)||input.version<1)throw new ApplicationError(409,'VERSION_REQUIRED','Reload the permission and include its current version.');};
const safeFields=['id','course','version','createdAt','updatedAt','sequence','time','duration','mustAttendAll','color','teacher','room','teacherIds','roomIds','capacity','session','remark','detail','moreInfo','classType'];
// Permission fingerprints ignore time/notes and coalesce equivalent split
// segments. A metadata-only following edit must not look like a new identity.
function assignmentFingerprint(schedule) {
  const segments=[{fromSequence:1,rule:schedule},...(schedule.segments||[])].sort((a,b)=>a.fromSequence-b.fromSequence),ranges=[];
  for(let index=0;index<segments.length;index++){
    const part=segments[index],last=scheduleLastSequence({...part.rule,segments:[],exceptions:[],activityDeleted:false}),end=Math.min(part.fromSequence+last-1,(segments[index+1]?.fromSequence??Infinity)-1);
    if(end<part.fromSequence)continue;
    const state={teacherIds:[...(part.rule.teacherIds||[])].sort(),roomIds:[...(part.rule.roomIds||[])].sort(),cancelled:!!part.cancelled},previous=ranges.at(-1);
    if(previous&&previous.to===part.fromSequence-1&&JSON.stringify(previous.state)===JSON.stringify(state))previous.to=end;
    else ranges.push({from:part.fromSequence,to:end,state});
  }
  const exceptions=[];
  for(const exception of schedule.exceptions||[]){
    const state=ranges.find(range=>range.from<=exception.sequence&&range.to>=exception.sequence)?.state;if(!state)continue;
    const effective={teacherIds:[...(exception.overrides?.teacherIds??state.teacherIds)].sort(),roomIds:[...(exception.overrides?.roomIds??state.roomIds)].sort(),cancelled:exception.cancelled??state.cancelled};
    if(JSON.stringify(effective)!==JSON.stringify(state))exceptions.push({sequence:exception.sequence,state:effective});
  }
  return {ranges,exceptions:exceptions.sort((a,b)=>a.sequence-b.sequence)};
}


export function createAccessControlStore({database,transaction}) {
  let slotSource=()=>[];
  database.exec(`
    CREATE TABLE IF NOT EXISTS teacher_account_links (
      teacher_resource_id TEXT PRIMARY KEY REFERENCES scheduling_resources(id),
      user_id TEXT REFERENCES users(id),version INTEGER NOT NULL CHECK(version>0),
      created_at TEXT NOT NULL,updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS teacher_account_links_user ON teacher_account_links(user_id);
    CREATE TABLE IF NOT EXISTS scoped_read_grants (
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL CHECK(kind IN ('course','resource','occurrence')),
      target_key TEXT NOT NULL,course_id TEXT REFERENCES courses(id),
      resource_id TEXT REFERENCES scheduling_resources(id),schedule_id TEXT REFERENCES schedules(id),sequence INTEGER,
      active INTEGER NOT NULL CHECK(active IN (0,1)),version INTEGER NOT NULL CHECK(version>0),
      created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id,kind,target_key)
    );
    CREATE TABLE IF NOT EXISTS access_control_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,target_id TEXT NOT NULL,version INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL
    );
  `);
  const identity=user=>user&&typeof user.id==='string'?database.prepare('SELECT id,display_name,role FROM users WHERE id=?').get(user.id):null;
  const administrator=actorId=>{if(identity({id:actorId})?.role!=='admin')throw new ApplicationError(403,'ROLE_FORBIDDEN','Only an administrator can manage access.');};
  const recipient=id=>{const user=typeof id==='string'&&identity({id});if(!user||!['admin','teacher'].includes(user.role))invalid('Choose an existing administrator or teacher account.');return user;};
  const linkDTO=row=>row?{teacherResourceId:row.teacher_resource_id,userId:row.user_id,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at}:null;
  const grantDTO=row=>row?{id:row.id,userId:row.user_id,kind:row.kind,...(row.kind==='course'?{courseId:row.course_id}:row.kind==='resource'?{resourceId:row.resource_id}:{scheduleId:row.schedule_id,sequence:row.sequence}),active:!!row.active,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at}:null;
  const getLink=id=>linkDTO(database.prepare('SELECT * FROM teacher_account_links WHERE teacher_resource_id=?').get(id));
  const getGrant=id=>grantDTO(database.prepare('SELECT * FROM scoped_read_grants WHERE id=?').get(id));
  const audit=(actorId,action,targetId,value)=>database.prepare('INSERT INTO access_control_audit_log(actor_id,action,target_id,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actorId,action,targetId,value.version,JSON.stringify(value),value.updatedAt);
  const managementSnapshot=actorId=>transaction(()=>{
    administrator(actorId);
    const accounts=database.prepare("SELECT id,display_name,role FROM users WHERE role IN ('admin','teacher') ORDER BY display_name,id").all().map(row=>({id:row.id,displayName:row.display_name,role:row.role}));
    const teacherLinks=database.prepare('SELECT * FROM teacher_account_links ORDER BY teacher_resource_id').all().map(linkDTO),grants=database.prepare('SELECT * FROM scoped_read_grants ORDER BY id').all().map(grantDTO);
    return {revision:hash({accounts,teacherLinks,grants}),accounts,teacherLinks,grants};
  },'read');
  const setTeacherLink=(id,input,actorId)=>transaction(()=>{
    administrator(actorId);
    if(!plain(input)||!Number.isSafeInteger(input.version)||input.version<0)throw new ApplicationError(409,'VERSION_REQUIRED','Reload the teacher link and include its current version, or zero for a new link.');
    if(Object.keys(input).some(key=>!['version','userId'].includes(key))||!Object.hasOwn(input,'userId'))invalid('Provide only the link version and account.');
    if(database.prepare('SELECT kind FROM scheduling_resources WHERE id=?').get(id)?.kind!=='teacher')invalid('Choose an existing teacher resource.');
    if(input.userId!==null)recipient(input.userId);
    const current=getLink(id);if((current?.version??0)!==input.version)throw new ApplicationError(409,'VERSION_CONFLICT','This teacher link changed. Reload it before saving.');
    const now=new Date().toISOString();
    if(current)database.prepare('UPDATE teacher_account_links SET user_id=?,version=version+1,updated_at=? WHERE teacher_resource_id=? AND version=?').run(input.userId,now,id,input.version);
    else database.prepare('INSERT INTO teacher_account_links(teacher_resource_id,user_id,version,created_at,updated_at) VALUES (?,?,1,?,?)').run(id,input.userId,now,now);
    const teacherLink=getLink(id);audit(actorId,'access.teacher-link',id,teacherLink);return {teacherLink,revision:managementSnapshot(actorId).revision};
  });
  const scheduleDTO=row=>row?{...JSON.parse(row.data),id:row.id,course:row.course_id,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,...(row.deleted_at?{activityDeleted:true}:{})}:null;
  const createGrant=(input,actorId)=>transaction(()=>{
    administrator(actorId);if(!plain(input))invalid('Permission must be a JSON object.');recipient(input.userId);
    const fields=input.kind==='course'?['courseId']:input.kind==='resource'?['resourceId']:input.kind==='occurrence'?['scheduleId','sequence']:null;
    if(!fields||Object.keys(input).some(key=>!['userId','kind',...fields].includes(key)))invalid('Choose a supported permission target.');
    let targetKey;
    if(input.kind==='course'){if(typeof input.courseId!=='string'||!database.prepare('SELECT id FROM courses WHERE id=?').get(input.courseId))invalid('Choose an existing course.');targetKey=input.courseId;}
    if(input.kind==='resource'){if(typeof input.resourceId!=='string'||!database.prepare('SELECT id FROM scheduling_resources WHERE id=?').get(input.resourceId))invalid('Choose an existing resource.');targetKey=input.resourceId;}
    if(input.kind==='occurrence'){const schedule=typeof input.scheduleId==='string'&&scheduleDTO(database.prepare('SELECT * FROM schedules WHERE id=?').get(input.scheduleId));if(!scheduleOccurrence(schedule||{},input.sequence,{includeCancelled:true}))invalid('Choose an existing lesson occurrence.');targetKey=JSON.stringify([input.scheduleId,input.sequence]);}
    if(database.prepare('SELECT id FROM scoped_read_grants WHERE user_id=? AND kind=? AND target_key=?').get(input.userId,input.kind,targetKey))throw new ApplicationError(409,'GRANT_EXISTS','This permission already exists. Restore or update the existing permission.');
    const id=randomUUID(),now=new Date().toISOString();database.prepare('INSERT INTO scoped_read_grants(id,user_id,kind,target_key,course_id,resource_id,schedule_id,sequence,active,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,1,1,?,?)').run(id,input.userId,input.kind,targetKey,input.courseId??null,input.resourceId??null,input.scheduleId??null,input.sequence??null,now,now);
    const grant=getGrant(id);audit(actorId,'access.grant.create',id,grant);return {grant,revision:managementSnapshot(actorId).revision};
  });
  const updateGrant=(id,input,actorId)=>transaction(()=>{
    administrator(actorId);version(input);if(Object.keys(input).some(key=>!['version','active'].includes(key))||typeof input.active!=='boolean')invalid('Provide only the permission version and active status.');
    const current=getGrant(id);if(!current)throw new ApplicationError(404,'GRANT_NOT_FOUND','Permission was not found.');if(current.version!==input.version)throw new ApplicationError(409,'VERSION_CONFLICT','This permission changed. Reload it before saving.');
    database.prepare('UPDATE scoped_read_grants SET active=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(Number(input.active),new Date().toISOString(),id,input.version);
    const grant=getGrant(id);audit(actorId,'access.grant.update',id,grant);return {grant,revision:managementSnapshot(actorId).revision};
  });
  const scopeFor=user=>transaction(()=>{
    const person=identity(user);if(!person)return {courseIds:new Set(),resourceIds:new Set(),revision:hash(null),permits:()=>false,permitsSlot:()=>false,schedules:[]};
    if(person.role!=='teacher')return {revision:hash({policy:1,id:person.id,role:person.role}),courseIds:null,resourceIds:null};
    const links=database.prepare('SELECT * FROM teacher_account_links WHERE user_id=? ORDER BY teacher_resource_id').all(person.id),grants=database.prepare('SELECT * FROM scoped_read_grants WHERE user_id=? ORDER BY id').all(person.id);
    const own=new Set(links.map(row=>row.teacher_resource_id)),active=grants.filter(row=>row.active),courses=new Set(active.filter(row=>row.kind==='course').map(row=>row.course_id)),resources=new Set(active.filter(row=>row.kind==='resource').map(row=>row.resource_id)),occurrences=new Set(active.filter(row=>row.kind==='occurrence').map(row=>JSON.stringify([row.schedule_id,row.sequence])));
    const permits=row=>courses.has(row.item.course)||(row.item.teacherIds||[]).some(id=>own.has(id)||resources.has(id))||(row.item.roomIds||[]).some(id=>resources.has(id))||occurrences.has(JSON.stringify([row.item.id,row.sequence]));
    // Use explicit grants, never courseIds inferred from another assigned lesson.
    const permitsSlot=slot=>courses.has(slot.courseId)||(slot.teacherIds||[]).some(id=>own.has(id)||resources.has(id))||(slot.roomIds||[]).some(id=>resources.has(id))||(slot.scheduleId&&occurrences.has(JSON.stringify([slot.scheduleId,slot.sequence])));
    const courseIds=new Set(courses),resourceIds=new Set([...own,...resources]),effective=[];
    const schedules=database.prepare('SELECT * FROM schedules ORDER BY id').all().map(scheduleDTO);
    for(const schedule of schedules){
      const sample={...schedule,activityDeleted:false},sequences=new Set([1]);
      for(const segment of schedule.segments||[])for(const number of[segment.fromSequence-1,segment.fromSequence])if(number>0)sequences.add(number);
      for(const exception of schedule.exceptions||[])for(const number of[exception.sequence,exception.sequence+1])sequences.add(number);
      for(const grant of active)if(grant.kind==='occurrence'&&grant.schedule_id===schedule.id)sequences.add(grant.sequence);
      const last=scheduleLastSequence(sample);if(Number.isFinite(last)&&last>0)sequences.add(last);
      const authorized=[];
      for(const sequence of [...sequences].sort((a,b)=>a-b)){const row=scheduleOccurrence(sample,sequence,{includeCancelled:true});if(row&&permits(row)){courseIds.add(schedule.course);for(const id of[...(row.item.teacherIds||[]),...(row.item.roomIds||[])])resourceIds.add(id);authorized.push({sequence,teacherIds:row.item.teacherIds||[],roomIds:row.item.roomIds||[],cancelled:!!row.cancelled});}}
      if(authorized.length)effective.push({id:schedule.id,course:schedule.course,deleted:!!schedule.activityDeleted,assignments:assignmentFingerprint(sample)});
    }
    const available=slotSource().filter(permitsSlot).map(slot=>{courseIds.add(slot.courseId);for(const id of[...slot.teacherIds,...slot.roomIds])resourceIds.add(id);return {id:slot.id,courseId:slot.courseId,scheduleId:slot.scheduleId,sequence:slot.sequence,teacherIds:[...slot.teacherIds].sort(),roomIds:[...slot.roomIds].sort(),active:slot.active,sourceAvailable:slot.sourceAvailable};});
    const courseStates=database.prepare('SELECT id,deleted_at FROM courses ORDER BY id').all().filter(row=>courseIds.has(row.id));
    return {courseIds,resourceIds,permits,permitsSlot,schedules,revision:hash({policy:2,id:person.id,role:person.role,links:links.map(linkDTO),grants:grants.map(grantDTO),effective,available,courseStates})};
  },'read');
  const revisionFor=user=>transaction(()=>{
    const person=identity(user);
    if(person?.role!=='student')return scopeFor(user).revision;
    // Each family refreshes only when its explicit profile links change. This
    // invalidates an already open private view after access is reassigned.
    const links=database.prepare('SELECT links.student_id,links.version,people.version AS profile_version FROM student_account_links AS links JOIN people ON people.id=links.student_id WHERE links.user_id=? ORDER BY links.student_id').all(person.id);
    return hash({policy:3,id:person.id,role:person.role,links});
  },'read');
  const canReadCourse=(courseId,user)=>{const scope=scopeFor(user);return scope.courseIds===null||scope.courseIds.has(courseId);};
  const teacherSchedules=(user,{from,to,since=''}={})=>transaction(()=>{
    const scope=scopeFor(user);let occurrences=[];
    try{for(const schedule of scope.schedules)for(const row of scheduleOccurrences(schedule,from,to))if(scope.permits(row))occurrences.push({sequence:row.sequence,date:row.date,item:{...Object.fromEntries(safeFields.filter(key=>Object.hasOwn(row.item,key)).map(key=>[key,Array.isArray(row.item[key])?[...row.item[key]]:row.item[key]])),startDate:row.date}});
      // Validate even an empty catalog, so a missing range cannot silently succeed.
      scheduleOccurrences({startDate:'2000-01-01',weekdays:[6],endMode:'count',count:1,time:'00:00'},from,to);
    }catch(error){if(error instanceof RangeError)throw new ApplicationError(400,'INVALID_DATE_RANGE','Choose an inclusive date range of at most 366 days.');throw error;}
    occurrences.sort((a,b)=>a.date.localeCompare(b.date)||a.item.time.localeCompare(b.item.time)||a.item.id.localeCompare(b.item.id)||a.sequence-b.sequence);
    const revision=hash({scope:scope.revision,from,to,occurrences});return since===revision?{revision,readScope:'occurrences',unchanged:true}:{revision,readScope:'occurrences',occurrences};
  },'read');
  const resourcesSnapshot=(user,resources,{since=''}={})=>transaction(()=>{const scope=scopeFor(user),rows=resources.list().resources.filter(row=>scope.resourceIds===null||scope.resourceIds.has(row.id)),revision=hash({scope:scope.revision,resources:rows});return since===revision?{revision,unchanged:true}:{revision,resources:rows};},'read');
  return {managementSnapshot,setTeacherLink,createGrant,updateGrant,scopeFor,revisionFor,canReadCourse,teacherSchedules,resourcesSnapshot,setSlotSource:read=>{slotSource=read;}};
}
