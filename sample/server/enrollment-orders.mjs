import {createHash,randomUUID} from 'node:crypto';
import {ApplicationError} from './validation.mjs';
import {scheduleOccurrence,scheduleOccurrences} from '../shared/schedule-occurrences.js';

const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(status,code,message)=>{throw new ApplicationError(status,code,message);};
const invalid=message=>fail(400,'INVALID_ENROLLMENT_ORDER',message);
const key=(scheduleId,sequence)=>JSON.stringify([scheduleId,sequence]);
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&value<='9999-12-31'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
function validateTimetableQuery(input,maximumDays){
 if(!plain(input)||Object.keys(input).some(field=>!['from','to','since'].includes(field)))invalid('Only a date range and revision may be queried.');
 if(!validDate(input.from)||!validDate(input.to)||input.to<input.from||(Date.parse(input.to)-Date.parse(input.from))/86400000>=maximumDays)fail(400,'INVALID_DATE_RANGE',`Choose an inclusive date range of at most ${maximumDays} days.`);
 if(input.since!==undefined&&(typeof input.since!=='string'||input.since.length>200))invalid('Choose a revision of at most 200 characters.');
 return {from:input.from,to:input.to,since:input.since||''};
}
export function validateStudentTimetableQuery(input={}){return validateTimetableQuery(input,366);}
export function validateTimetableFilterFactsQuery(input={}){return validateTimetableQuery(input,62);}
function lessonDateAge(birthDate,asOf){
 if(!validDate(birthDate)||birthDate>asOf)return null;
 const [year,month,day]=asOf.split('-').map(Number),[birthYear,birthMonth,birthDay]=birthDate.split('-').map(Number);
 const months=(year-birthYear)*12+month-birthMonth-(day<birthDay?1:0);
 return {years:Math.floor(months/12),months:months%12,asOf};
}
function requireVersion(input,fields=['version']){
 if(!plain(input)||!Number.isSafeInteger(input.version)||input.version<1)fail(409,'VERSION_REQUIRED','Reload the order and include its current version.');
 if(Object.keys(input).some(field=>!fields.includes(field)))invalid('Unsupported order operation field.');
 return input.version;
}

export function createEnrollmentOrderStore({database,transaction,schedules,resources,accessControl,getCourse,getFee}){
 database.exec(`
  CREATE TABLE IF NOT EXISTS student_account_links(
   student_id TEXT PRIMARY KEY REFERENCES people(id),user_id TEXT REFERENCES users(id),
   version INTEGER NOT NULL CHECK(version>0),created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS student_account_links_user ON student_account_links(user_id);
  CREATE TABLE IF NOT EXISTS enrollment_orders(
   id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES people(id),data TEXT NOT NULL,
   amount_cents INTEGER NOT NULL CHECK(amount_cents>=0),order_status TEXT NOT NULL,
   payment_status TEXT NOT NULL,version INTEGER NOT NULL CHECK(version>0),
   created_at TEXT NOT NULL,updated_at TEXT NOT NULL,paid_at TEXT
  );
  CREATE INDEX IF NOT EXISTS enrollment_orders_student ON enrollment_orders(student_id,created_at,id);
  CREATE TABLE IF NOT EXISTS student_sessions(
   id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES people(id),
   schedule_id TEXT NOT NULL REFERENCES schedules(id),sequence INTEGER NOT NULL CHECK(sequence>0),
   order_id TEXT NOT NULL REFERENCES enrollment_orders(id),attendance TEXT NOT NULL DEFAULT 'unmarked',
   created_at TEXT NOT NULL,UNIQUE(student_id,schedule_id,sequence)
  );
  CREATE INDEX IF NOT EXISTS student_sessions_occurrence ON student_sessions(schedule_id,sequence);
  CREATE INDEX IF NOT EXISTS student_sessions_student ON student_sessions(student_id,order_id);
  CREATE TABLE IF NOT EXISTS enrollment_sales(
   id TEXT PRIMARY KEY,order_id TEXT NOT NULL UNIQUE REFERENCES enrollment_orders(id),
   student_id TEXT NOT NULL REFERENCES people(id),amount_cents INTEGER NOT NULL CHECK(amount_cents>=0),
   actor_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS enrollment_order_audit_log(
   id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),
   action TEXT NOT NULL,target_id TEXT NOT NULL,version INTEGER NOT NULL,
   snapshot TEXT NOT NULL,created_at TEXT NOT NULL
  );
 `);
 const identity=user=>database.prepare('SELECT id,role FROM users WHERE id=?').get(typeof user==='string'?user:user?.id||'');
 const requireRole=(user,roles)=>{const person=identity(user);if(!person||!roles.includes(person.role))fail(403,'ROLE_FORBIDDEN','This account is not permitted to perform this action.');return person;};
 const administrator=user=>requireRole(user,['admin']);
 const formalStudent=id=>{
  if(!validId(id))invalid('Choose an existing formal student.');
  const student=database.prepare("SELECT * FROM people WHERE id=? AND kind='student'").get(id);
  if(!student)invalid('Choose an existing formal student; applicants must be converted separately.');return student;
 };
 const linkDTO=row=>row?{studentId:row.student_id,userId:row.user_id,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at}:null;
 const audit=(actor,action,targetId,value)=>database.prepare('INSERT INTO enrollment_order_audit_log(actor_id,action,target_id,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actor.id,action,targetId,value.version,JSON.stringify(value),new Date().toISOString());
 const managementSnapshot=user=>transaction(()=>{
  administrator(user);
  const students=database.prepare("SELECT id,display_name FROM people WHERE kind='student' ORDER BY display_name,id").all().map(row=>({id:row.id,displayName:row.display_name}));
  const accounts=database.prepare("SELECT id,display_name,email FROM users WHERE role='student' ORDER BY display_name,id").all().map(row=>({id:row.id,displayName:row.display_name,email:row.email}));
  const links=database.prepare('SELECT * FROM student_account_links ORDER BY student_id').all().map(linkDTO);
  return {students,accounts,links,revision:hash({students,accounts,links})};
 },'read');
 const setAccountLink=(id,input,user)=>transaction(()=>{
  const actor=administrator(user);formalStudent(id);
  if(!plain(input)||!Number.isSafeInteger(input.version)||input.version<0)fail(409,'VERSION_REQUIRED','Reload the account link and include its current version, or zero for a new link.');
  if(Object.keys(input).some(field=>!['version','userId'].includes(field))||!Object.hasOwn(input,'userId'))invalid('Provide only the link version and student login account.');
  if(input.userId!==null&&(!validId(input.userId)||identity(input.userId)?.role!=='student'))invalid('Choose an existing student login account.');
  const current=database.prepare('SELECT * FROM student_account_links WHERE student_id=?').get(id);
  if((current?.version??0)!==input.version)fail(409,'VERSION_CONFLICT','This student account link changed. Reload it before saving.');
  const now=new Date().toISOString();
  if(current)database.prepare('UPDATE student_account_links SET user_id=?,version=version+1,updated_at=? WHERE student_id=? AND version=?').run(input.userId,now,id,input.version);
  else database.prepare('INSERT INTO student_account_links VALUES (?,?,1,?,?)').run(id,input.userId,now,now);
  const link=linkDTO(database.prepare('SELECT * FROM student_account_links WHERE student_id=?').get(id));audit(actor,'student.account-link',id,link);
  return {link,revision:managementSnapshot(actor).revision};
 });
 const ownStudents=user=>{
  const actor=requireRole(user,['student']);
  return database.prepare("SELECT people.* FROM people JOIN student_account_links AS links ON links.student_id=people.id WHERE links.user_id=? AND people.kind='student' ORDER BY people.display_name,people.id").all(actor.id);
 };
 const safeProfile=row=>{
  const profile=JSON.parse(row.profile);return {id:row.id,displayName:row.display_name,kind:'student',version:row.version,dateOfBirth:profile.dateOfBirth??null,level:profile.level||'',school:profile.school||''};
 };
 const studentProfile=user=>transaction(()=>({students:ownStudents(user).map(safeProfile)}),'read');
 const ownsStudent=(studentId,userId)=>!!database.prepare("SELECT links.student_id FROM student_account_links AS links JOIN people ON people.id=links.student_id WHERE links.student_id=? AND links.user_id=? AND people.kind='student'").get(studentId,userId);
 const orderDTO=row=>row?{...JSON.parse(row.data),id:row.id,studentId:row.student_id,amountCents:row.amount_cents,orderStatus:row.order_status,paymentStatus:row.payment_status,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,...(row.paid_at?{paidAt:row.paid_at}:{})}:null;
 const readOrder=id=>orderDTO(database.prepare('SELECT * FROM enrollment_orders WHERE id=?').get(id));
 const currentOccurrence=(scheduleId,sequence)=>{
  const schedule=schedules.get(scheduleId);
  const course=schedule&&getCourse(schedule.course);
  const occurrence=schedule&&!schedule.activityDeleted&&course&&!course.deletedAt?scheduleOccurrence(schedule,sequence):null;
  if(!occurrence)fail(409,'ORDER_LESSON_UNAVAILABLE','A selected lesson is no longer active. Create a new order with current lessons.');
  return occurrence;
 };
 const studentLesson=(studentSessionId,user)=>{
  const actor=requireRole(user,['student']);
  if(!validId(studentSessionId))invalid('Choose a valid lesson.');
  const row=database.prepare("SELECT sessions.id,sessions.student_id,sessions.schedule_id,sessions.sequence FROM student_sessions AS sessions JOIN enrollment_orders AS orders ON orders.id=sessions.order_id JOIN student_account_links AS links ON links.student_id=sessions.student_id JOIN people ON people.id=sessions.student_id WHERE sessions.id=? AND links.user_id=? AND people.kind='student' AND orders.payment_status='paid'").get(studentSessionId,actor.id);
  if(!row)return null;
  const occurrence=currentOccurrence(row.schedule_id,row.sequence),course=getCourse(occurrence.item.course);
  return {id:row.id,studentId:row.student_id,scheduleId:row.schedule_id,sequence:row.sequence,courseId:occurrence.item.course,courseName:course.courseName,date:occurrence.date,time:occurrence.item.time,duration:occurrence.item.duration,studentReschedulingAllowed:occurrence.item.classType?.studentReschedulingAllowed};
 };
 const canRead=(order,actor,scope)=>{
  if(actor.role==='admin')return true;
  if(actor.role==='student')return order.orderStatus!=='draft'&&ownsStudent(order.studentId,actor.id);
  if(actor.role!=='teacher')return false;
  return order.items.every(item=>item.lessons.every(lesson=>{
   try{return scope.permits(currentOccurrence(lesson.scheduleId,lesson.sequence));}catch{return false;}
  }));
 };
 const authorizedOrder=(id,user)=>{
  const actor=requireRole(user,['admin','teacher','student']),order=readOrder(id);
  if(!order||!canRead(order,actor,actor.role==='teacher'?accessControl.scopeFor(actor):null))fail(404,'ORDER_NOT_FOUND','The authorized order was not found.');
  return order;
 };
 const get=(id,user)=>transaction(()=>authorizedOrder(id,user),'read');
 const list=user=>transaction(()=>{
  const actor=requireRole(user,['admin','teacher','student']),scope=actor.role==='teacher'?accessControl.scopeFor(actor):null;
  const orders=database.prepare('SELECT * FROM enrollment_orders ORDER BY created_at DESC,id').all().map(orderDTO).filter(order=>canRead(order,actor,scope));
  return {orders,revision:hash({scope:scope?.revision??{id:actor.id,role:actor.role},orders})};
 },'read');
 const create=(input,user)=>transaction(()=>{
  const actor=administrator(user);
  if(!plain(input)||Object.keys(input).some(field=>!['studentId','items','amountCents'].includes(field)))invalid('Provide a formal student, course items and final amount.');
  const student=formalStudent(input.studentId);
  if(!Number.isSafeInteger(input.amountCents)||input.amountCents<0)invalid('The final amount must be a non-negative whole number of cents.');
  if(!Array.isArray(input.items)||!input.items.length||input.items.length>30)invalid('Choose between one and thirty course items.');
  const seen=new Set();let total=0;
  const items=input.items.map(item=>{
   if(!plain(item)||Object.keys(item).some(field=>!['courseId','feeId','lessons'].includes(field))||!validId(item.courseId)||!validId(item.feeId))invalid('Choose an existing course and associated fee.');
   const course=getCourse(item.courseId),fee=getFee(item.feeId);
   if(!course||course.deletedAt||!fee||!fee.courseIds.includes(course.id))invalid('Choose an active course and one of its associated fees.');
   if(!Array.isArray(item.lessons)||!item.lessons.length||item.lessons.length>500||(total+=item.lessons.length)>1000)invalid('Choose one to five hundred lessons per item, and at most one thousand per order.');
   const lessons=item.lessons.map(lesson=>{
    if(!plain(lesson)||Object.keys(lesson).some(field=>!['scheduleId','sequence','sourceVersion'].includes(field))||!validId(lesson.scheduleId)||!Number.isSafeInteger(lesson.sequence)||lesson.sequence<1)invalid('Choose an existing lesson identity.');
    if(!Number.isSafeInteger(lesson.sourceVersion)||lesson.sourceVersion<1)fail(409,'SOURCE_VERSION_REQUIRED','Reload the lesson and include its current source version.');
    const occurrence=currentOccurrence(lesson.scheduleId,lesson.sequence);
    if(occurrence.item.course!==course.id)invalid('The selected lesson must belong to the selected course.');
    if(occurrence.item.version!==lesson.sourceVersion)fail(409,'SOURCE_VERSION_CONFLICT','This lesson changed. Create a new order from current lessons.');
    const identity=key(lesson.scheduleId,lesson.sequence);if(seen.has(identity))invalid('Each lesson may occur only once in an order.');seen.add(identity);
    return {scheduleId:lesson.scheduleId,sequence:lesson.sequence,sourceVersion:lesson.sourceVersion,date:occurrence.date,time:occurrence.item.time,duration:occurrence.item.duration};
   });
   const pricingKeys=['pricingModel','price','months','duration','packageType','packageTotal','bookingExpiry'];
   return {courseId:course.id,courseName:course.courseName,feeId:fee.id,feeName:fee.feeName,pricing:Object.fromEntries(pricingKeys.filter(field=>Object.hasOwn(fee,field)).map(field=>[field,fee[field]])),lessons};
  });
  const id=randomUUID(),now=new Date().toISOString(),data={source:'teacher',studentName:student.display_name,items,purchasedLessons:total};
  database.prepare("INSERT INTO enrollment_orders(id,student_id,data,amount_cents,order_status,payment_status,version,created_at,updated_at) VALUES (?,?,?,?,'draft','draft',1,?,?)").run(id,student.id,JSON.stringify(data),input.amountCents,now,now);
  const order=readOrder(id);audit(actor,'order.create',id,order);return order;
 });
 const currentVersion=(id,input,user,fields)=>{
  const version=requireVersion(input,fields),order=authorizedOrder(id,user);
  if(order.version!==version)fail(409,'VERSION_CONFLICT','This order changed. Reload it before continuing.');return order;
 };
 const saveState=(current,actor,action,orderStatus,paymentStatus,extra={})=>{
  const now=new Date().toISOString(),{id,studentId,amountCents,orderStatus:previousOrder,paymentStatus:previousPayment,version,createdAt,updatedAt,paidAt,...data}=current;
  const changed=database.prepare('UPDATE enrollment_orders SET data=?,order_status=?,payment_status=?,version=version+1,updated_at=?,paid_at=? WHERE id=? AND version=?').run(JSON.stringify({...data,...extra}),orderStatus,paymentStatus,now,paymentStatus==='paid'?now:paidAt??null,id,version);
  if(changed.changes!==1)fail(409,'VERSION_CONFLICT','This order changed. Reload it before continuing.');
  const order=readOrder(id);audit(actor,action,id,order);return order;
 };
 const send=(id,input,user)=>transaction(()=>{
  const actor=administrator(user),order=currentVersion(id,input,actor);
  if(order.orderStatus!=='draft')fail(409,'ORDER_STATE_CONFLICT','Only a draft order may be sent; changing and resending an order requires a separate agreed policy.');
  if(!database.prepare("SELECT links.user_id FROM student_account_links AS links JOIN users ON users.id=links.user_id WHERE links.student_id=? AND users.role='student'").get(order.studentId))fail(409,'STUDENT_ACCOUNT_REQUIRED','Link this student to an existing student login account before sending the order.');
  return saveState(order,actor,'order.send','sent','awaiting-confirmation');
 });
 const respond=(id,input,user)=>transaction(()=>{
  const actor=requireRole(user,['student']),order=currentVersion(id,input,actor,['version','action','reason']);
  if(order.orderStatus!=='sent')fail(409,'ORDER_STATE_CONFLICT','Only a sent order may receive a parent response.');
  if(!['confirm','reject','request-changes'].includes(input.action)||input.reason!==undefined&&(typeof input.reason!=='string'||input.reason.length>2000))invalid('Choose Confirm Order, Reject Order or Request Changes; the optional reason may contain at most two thousand characters.');
  const statuses={confirm:'parent-confirmed',reject:'rejected','request-changes':'changes-requested'};
  return saveState(order,actor,'order.respond',statuses[input.action],input.action==='confirm'?'awaiting-payment':'awaiting-confirmation',{responseReason:(input.reason??'').trim(),respondedAt:new Date().toISOString()});
 });
 const occupied=(scheduleId,sequence)=>database.prepare("SELECT COUNT(*) AS count FROM student_sessions AS sessions JOIN enrollment_orders AS orders ON orders.id=sessions.order_id WHERE sessions.schedule_id=? AND sessions.sequence=? AND orders.payment_status='paid'").get(scheduleId,sequence).count;
 const confirmPayment=(id,input,user)=>transaction(()=>{
  const actor=administrator(user),order=currentVersion(id,input,actor);
  if(order.orderStatus!=='parent-confirmed'||order.paymentStatus!=='awaiting-payment')fail(409,'ORDER_STATE_CONFLICT','Confirm Payment requires a parent-confirmed order that is awaiting payment.');
  formalStudent(order.studentId);
  const lessons=order.items.flatMap(item=>item.lessons.map(lesson=>({...lesson,courseId:item.courseId})));
  for(const lesson of lessons){
   const occurrence=currentOccurrence(lesson.scheduleId,lesson.sequence);
   if(occurrence.item.course!==lesson.courseId||occurrence.item.version!==lesson.sourceVersion)fail(409,'SOURCE_VERSION_CONFLICT','This lesson changed after the order was created. Create a new order from current lessons before confirming payment.');
   if(database.prepare('SELECT id FROM student_sessions WHERE student_id=? AND schedule_id=? AND sequence=?').get(order.studentId,lesson.scheduleId,lesson.sequence))fail(409,'STUDENT_ALREADY_ENROLLED','This student already has an enrollment for a selected lesson. No payment was recorded.');
   const manual=database.prepare('SELECT manual_status FROM class_capacity_statuses WHERE schedule_id=? AND sequence=?').get(lesson.scheduleId,lesson.sequence)?.manual_status;
   if(manual==='full'||occurrence.item.capacity!==null&&occurrence.item.capacity!==undefined&&occupied(lesson.scheduleId,lesson.sequence)>=occurrence.item.capacity)fail(409,'CLASS_CAPACITY_FULL','A selected class is full. No payment or enrollment was recorded.');
  }
  const now=new Date().toISOString();
  for(const lesson of lessons)database.prepare("INSERT INTO student_sessions(id,student_id,schedule_id,sequence,order_id,attendance,created_at) VALUES (?,?,?,?,?,'unmarked',?)").run(randomUUID(),order.studentId,lesson.scheduleId,lesson.sequence,id,now);
  database.prepare('INSERT INTO enrollment_sales(id,order_id,student_id,amount_cents,actor_id,created_at) VALUES (?,?,?,?,?,?)').run(randomUUID(),id,order.studentId,order.amountCents,actor.id,now);
  return saveState(order,actor,'order.confirm-payment','parent-confirmed','paid');
 });
 const timetable=(user,input)=>transaction(()=>{
  const {from,to,since}=validateStudentTimetableQuery(input),students=ownStudents(user).map(safeProfile),studentIds=new Set(students.map(row=>row.id)),names=new Map(students.map(row=>[row.id,row.displayName]));
  const rows=database.prepare("SELECT sessions.* FROM student_sessions AS sessions JOIN enrollment_orders AS orders ON orders.id=sessions.order_id JOIN student_account_links AS links ON links.student_id=sessions.student_id WHERE links.user_id=? AND orders.payment_status='paid' ORDER BY sessions.id").all(identity(user).id),lessons=[];
  for(const row of rows){
   if(!studentIds.has(row.student_id))continue;let occurrence;
   try{occurrence=currentOccurrence(row.schedule_id,row.sequence);}catch(error){if(error instanceof ApplicationError&&error.code==='ORDER_LESSON_UNAVAILABLE')continue;throw error;}
   if(occurrence.date<from||occurrence.date>to)continue;
   const item=occurrence.item,course=getCourse(item.course),teachers=resources.getMany(item.teacherIds||[]).filter(resource=>resource.kind==='teacher').map(resource=>({id:resource.id,displayName:resource.displayName,color:resource.representativeColor||item.color||'#27777b'})),rooms=resources.getMany(item.roomIds||[]).filter(resource=>resource.kind==='room').map(resource=>({id:resource.id,displayName:resource.displayName}));
   lessons.push({id:row.id,studentId:row.student_id,studentName:names.get(row.student_id),scheduleId:row.schedule_id,sequence:row.sequence,courseId:item.course,courseName:course.courseName,date:occurrence.date,time:item.time,duration:item.duration,teachers,rooms,attendance:row.attendance,orderId:row.order_id});
  }
  lessons.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
  const revision=hash({userId:identity(user).id,from,to,students,lessons});return since===revision?{revision,unchanged:true}:{revision,students,lessons};
 },'read');
 const roster=(scheduleId,sequence,user)=>transaction(()=>{
  const actor=requireRole(user,['admin','teacher']);let occurrence;
  try{occurrence=currentOccurrence(scheduleId,sequence);}catch(error){if(error instanceof ApplicationError&&error.code==='ORDER_LESSON_UNAVAILABLE')fail(404,'LESSON_NOT_FOUND','The active authorized lesson was not found.');throw error;}
  if(actor.role==='teacher'&&!accessControl.scopeFor(actor).permits(occurrence))fail(404,'LESSON_NOT_FOUND','The authorized lesson was not found.');
  const students=database.prepare("SELECT sessions.*,people.display_name FROM student_sessions AS sessions JOIN enrollment_orders AS orders ON orders.id=sessions.order_id JOIN people ON people.id=sessions.student_id WHERE sessions.schedule_id=? AND sessions.sequence=? AND orders.payment_status='paid' ORDER BY people.display_name,sessions.id").all(scheduleId,sequence).map(row=>({id:row.id,studentId:row.student_id,displayName:row.display_name,orderId:row.order_id,paymentStatus:'paid',attendance:row.attendance,remark:''}));
  return {students,occupied:students.length,capacity:occurrence.item.capacity??null};
 },'read');
 const filterFacts=(user,input)=>transaction(()=>{
  const actor=requireRole(user,['admin','teacher']),{from,to,since}=validateTimetableFilterFactsQuery(input),scope=actor.role==='teacher'?accessControl.scopeFor(actor):null,entries=new Map();
  for(const schedule of scope?scope.schedules:schedules.list().schedules){
   const course=getCourse(schedule.course);if(schedule.activityDeleted||!course||course.deletedAt)continue;
   for(const occurrence of scheduleOccurrences(schedule,from,to)){
    if(scope&&!scope.permits(occurrence))continue;
    entries.set(key(schedule.id,occurrence.sequence),{fact:{scheduleId:schedule.id,sequence:occurrence.sequence,date:occurrence.date,students:[]},sourceVersion:schedule.version,students:new Map()});
   }
  }
  const values=[...entries.values()],profiles=new Map(),versions=new Map();
  // Query only authorized occurrence identities, in bounded parameter chunks.
  // Never expose family/contact fields in the filter-facts projection.
  for(let offset=0;offset<values.length;offset+=200){
   const chunk=values.slice(offset,offset+200),where=chunk.map(()=>'(sessions.schedule_id=? AND sessions.sequence=?)').join(' OR '),parameters=chunk.flatMap(row=>[row.fact.scheduleId,row.fact.sequence]);
   const rows=database.prepare(`SELECT sessions.schedule_id,sessions.sequence,people.id,people.display_name,people.profile,people.version FROM student_sessions AS sessions JOIN enrollment_orders AS orders ON orders.id=sessions.order_id JOIN people ON people.id=sessions.student_id WHERE orders.payment_status='paid' AND people.kind='student' AND (${where}) ORDER BY people.id,sessions.id`).all(...parameters);
   for(const row of rows){
    const entry=entries.get(key(row.schedule_id,row.sequence));if(!entry||entry.students.has(row.id))continue;
    if(!profiles.has(row.id)){let profile;try{profile=JSON.parse(row.profile);}catch{profile={};}profiles.set(row.id,plain(profile)?profile:{});}
    const profile=profiles.get(row.id),student={id:row.id,displayName:row.display_name},age=lessonDateAge(profile.dateOfBirth,entry.fact.date);
    if(typeof profile.gender==='string'&&profile.gender.length<=200&&profile.gender.trim())student.gender=profile.gender.trim();
    if(age)student.age=age;
    entry.students.set(row.id,student);versions.set(row.id,row.version);
   }
  }
  const sorted=values.sort((a,b)=>a.fact.date.localeCompare(b.fact.date)||a.fact.scheduleId.localeCompare(b.fact.scheduleId)||a.fact.sequence-b.fact.sequence);
  const facts=sorted.map(entry=>({...entry.fact,students:[...entry.students.values()].sort((a,b)=>a.displayName.localeCompare(b.displayName)||a.id.localeCompare(b.id))}));
  const revision=hash({scope:scope?.revision??actor,from,to,facts,profiles:[...versions].sort(([a],[b])=>a.localeCompare(b)),sources:sorted.map(entry=>[entry.fact.scheduleId,entry.fact.sequence,entry.fact.date,entry.sourceVersion])});
  return since===revision?{revision,unchanged:true}:{revision,facts};
 },'read');
 return {managementSnapshot,setAccountLink,studentProfile,studentLesson,create,list,get,authorize:authorizedOrder,send,respond,confirmPayment,occupied,timetable,roster,filterFacts,audit:()=>database.prepare('SELECT * FROM enrollment_order_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)})),sales:()=>database.prepare('SELECT * FROM enrollment_sales ORDER BY created_at,id').all().map(row=>({id:row.id,orderId:row.order_id,studentId:row.student_id,amountCents:row.amount_cents,actorId:row.actor_id,createdAt:row.created_at}))};
}
