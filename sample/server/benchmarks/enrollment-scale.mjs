import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir,cpus,totalmem,release} from 'node:os';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createStore} from '../store.mjs';
import {createApplication} from '../app.mjs';
import {hashPassword,randomToken,tokenHash,csrfForToken} from '../security.mjs';
import {validatePerson} from '../people.mjs';
import {buildEnrollmentScalePlan,parseEnrollmentScaleArgs} from './enrollment-scale-plan.mjs';

// A repeatable business-flow benchmark, not a concurrent-user/load simulation.
// Usage: node sample/server/benchmarks/enrollment-scale.mjs [--students 12|300] [--class-capacity 8]
// Every business mutation uses the public HTTP API. Only isolated fixture
// identities/profiles and test login sessions may be prearranged directly.
const options=parseEnrollmentScaleArgs(process.argv.slice(2)),plan=buildEnrollmentScalePlan(options),{studentCount,courseCount,teacherCount,classCapacity:capacity,occurrencesPerClass}=plan;
const origin='http://localhost:5173',password='Fictional-enrollment-benchmark-password-123!';
const range='?from=2026-10-01&to=2026-11-30';
const timings=new Map(),started=performance.now();
const ensure=(condition,message)=>{if(!condition)throw new Error(message);};
const elapsed=start=>Math.round((performance.now()-start)*100)/100;
const record=(label,ms)=>{if(!timings.has(label))timings.set(label,[]);timings.get(label).push(ms);};
function summary(values) {
  const ordered=[...values].sort((a,b)=>a-b),percentile=ratio=>Math.round(ordered[Math.max(0,Math.ceil(ordered.length*ratio)-1)]*100)/100;
  return {count:values.length,p50Ms:percentile(.5),p95Ms:percentile(.95),maxMs:percentile(1)};
}
class Client {
  constructor(base){this.base=base;this.cookies=new Map();this.csrf='';}
  async request(path,{method='GET',body,key,expect=200,label=method+' '+path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g,':id')}={}) {
    const start=performance.now(),headers={Origin:origin};
    if(this.cookies.size)headers.Cookie=[...this.cookies].map(([name,value])=>`${name}=${value}`).join('; ');
    if(this.csrf)headers['X-CSRF-Token']=this.csrf;
    if(body!==undefined)headers['Content-Type']='application/json';
    if(key)headers['Idempotency-Key']=key;
    const response=await fetch(this.base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    for(const cookie of response.headers.getSetCookie()) {const pair=cookie.split(';')[0],at=pair.indexOf('=');this.cookies.set(pair.slice(0,at),pair.slice(at+1));}
    const data=await response.json();record(label,performance.now()-start);
    ensure(response.status===expect,`${method} ${path.split('?')[0]} returned ${response.status}, expected ${expect} (${data?.error?.code||'unexpected response'}).`);
    if(data.csrfToken)this.csrf=data.csrfToken;
    return data;
  }
  async login(account){return this.request('/api/auth/login',{method:'POST',body:{email:account.email,password},label:'HTTP login'});}
  arrangeIsolatedSession(store,account) {
    const token=randomToken(),csrf=csrfForToken(token);
    store.createSession({tokenHash:tokenHash(token),userId:account.id,csrfHash:tokenHash(csrf),expiresAt:Date.now()+12*60*60*1000});
    this.cookies.set('beamal_session',token);this.csrf=csrf;
  }
}

const directory=await mkdtemp(join(tmpdir(),'beamal-enrollment-scale-'));
const databasePath=join(directory,'fictional.sqlite');
let application,stage='initialize',successful=false;
try {
  const setupStarted=performance.now(),initialized=await createStore({databasePath});await initialized.close();
  const sharedHash=await hashPassword(password),now=new Date().toISOString();
  const administrator={id:randomUUID(),email:'scale-admin@example.test',displayName:'Fictional scale administrator',role:'admin'};
  const teachers=Array.from({length:teacherCount},(_,index)=>({id:randomUUID(),email:`scale-teacher-${index+1}@example.test`,displayName:`Fictional scale teacher ${index+1}`,role:'teacher'}));
  const students=Array.from({length:studentCount},(_,index)=>({id:randomUUID(),personId:randomUUID(),email:`scale-student-${String(index+1).padStart(3,'0')}@example.test`,displayName:`Fictional scale student ${String(index+1).padStart(3,'0')}`,role:'student',age:3+index%16,...plan.students[index]}));
  const seed=new DatabaseSync(databasePath);seed.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE;');
  try {
    for(const account of[administrator,...teachers,...students])seed.prepare('INSERT INTO users(id,email,display_name,role,password_hash,created_at) VALUES (?,?,?,?,?,?)').run(account.id,account.email,account.displayName,account.role,sharedHash,now);
    for(const student of students) {
      const profile=validatePerson({displayName:student.displayName,email:student.email,dateOfBirth:`${2026-student.age}-04-01`,parentName:`Fictional guardian ${student.displayName}`,contact1Email:`guardian-${student.personId}@example.test`,enrollmentDate:'2026-10-01',quitDate:null,promotion:false,remark:'Isolated benchmark fixture; private profile must not appear in Student timetable.'});
      seed.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES (?,'student',?,?,?,1,?,?)").run(student.personId,profile.displayName,JSON.stringify(profile),Object.values(profile).filter(value=>typeof value==='string').join('\n').toLowerCase(),now,now);
      seed.prepare('INSERT INTO person_audit_log(person_id,actor_id,actor_name,action,version,snapshot,created_at) VALUES (?,?,?,?,1,?,?)').run(student.personId,administrator.id,administrator.displayName,'person.import',JSON.stringify({...profile,id:student.personId,kind:'student',version:1,fixture:'isolated-enrollment-scale'}),now);
    }
    seed.exec('COMMIT');
  }catch(error){seed.exec('ROLLBACK');throw error;}finally{seed.close();}
  application=await createApplication({databasePath,allowedOrigins:[origin]});
  await new Promise((accept,reject)=>{application.server.once('error',reject);application.server.listen(0,'127.0.0.1',accept);});
  const base=`http://127.0.0.1:${application.server.address().port}`,admin=new Client(base);
  await admin.login(administrator);
  const teacherClients=[];
  for(const teacher of teachers) {const client=new Client(base);await client.login(teacher);teacherClients.push(client);}
  const studentClients=[];
  for(const [index,student]of students.entries()) {
    const client=new Client(base);
    if(index<2)await client.login(student);else client.arrangeIsolatedSession(application.store,student);
    studentClients.push(client);
  }
  const setupMs=elapsed(setupStarted);
  stage='create courses and schedules';
  const courseRecords=[],scheduleRecords=[],teacherResources=[],rooms=[];
  for(const [index,teacher]of teachers.entries()) {
    const {resource}=await admin.request('/api/scheduling-resources',{method:'POST',expect:201,body:{kind:'teacher',displayName:teacher.displayName,representativeColor:['#17777b','#426ea8','#b9772f','#8856a7'][index]},label:'Create teacher resource'});
    await admin.request(`/api/access-control/teacher-links/${resource.id}`,{method:'PATCH',body:{version:0,userId:teacher.id},label:'Link teacher account'});teacherResources.push(resource);
  }
  for(let index=0;index<courseCount;index++) {
    const {course}=await admin.request('/api/courses',{method:'POST',expect:201,body:{courseName:`Fictional scale course ${index+1}`,feeName:`Three-lesson scale package ${index+1}`,category:'Isolated scale fixture',level:'Ages 3–18',pricingModel:'package',price:900,packageType:'visits',packageTotal:3,bookingExpiry:null,onlineStore:true},label:'Create course'});
    courseRecords.push(course);
  }
  for(let index=0;index<plan.roomCount;index++){
    const {resource}=await admin.request('/api/scheduling-resources',{method:'POST',expect:201,body:{kind:'room',displayName:`Fictional scale room ${index+1}`,capacity},label:'Create room'});rooms.push(resource);
  }
  for(const group of plan.classes){
    const course=courseRecords[group.courseIndex],rule={course:course.id,startDate:group.startDate,time:group.time,duration:group.duration,weekdays:[group.weekday],endMode:'count',count:occurrencesPerClass,mustAttendAll:true,color:'#27777b',teacherIds:[teacherResources[group.teacherIndex].id],roomIds:[rooms[group.roomIndex].id],capacity:group.capacity,remark:'PRIVATE SCALE LESSON NOTE',detail:'PRIVATE SCALE DETAIL'};
    const {schedule}=await admin.request('/api/schedules',{method:'POST',expect:201,body:rule,label:'Create recurring schedule'});
    scheduleRecords.push({...schedule,plan:group,fixtureRule:rule});
  }
  const scheduleByClass=new Map(scheduleRecords.map(schedule=>[schedule.plan.id,schedule]));
  const catalogMs=elapsed(setupStarted)-setupMs;
  stage='link students';
  const linkStarted=performance.now();
  for(const student of students)await admin.request(`/api/people/${student.personId}/account-link`,{method:'PATCH',body:{userId:student.id,version:0},label:'Link Student account'});
  const linkMs=elapsed(linkStarted);
  stage='complete enrollment payment through HTTP';
  const enrollmentStarted=performance.now(),orders=[];
  for(const [index,student]of students.entries()) {
    const course=courseRecords[student.courseIndex],schedule=scheduleByClass.get(student.classId);
    const created=await admin.request('/api/orders',{method:'POST',expect:201,key:`scale-order-${index}`,body:{studentId:student.personId,amountCents:90000,items:[{courseId:course.id,feeId:course.feeIds[0],lessons:Array.from({length:occurrencesPerClass},(_,sequence)=>({scheduleId:schedule.id,sequence:sequence+1,sourceVersion:schedule.version}))}]},label:'Create order'});
    const sent=await admin.request(`/api/orders/${created.order.id}/send`,{method:'POST',body:{version:created.order.version},key:`scale-send-${index}`,label:'Send order'});
    const confirmed=await studentClients[index].request(`/api/orders/${created.order.id}/respond`,{method:'POST',body:{version:sent.order.version,action:'confirm'},key:`scale-respond-${index}`,label:'Student confirms order'});
    const paid=await admin.request(`/api/orders/${created.order.id}/confirm-payment`,{method:'POST',body:{version:confirmed.order.version},key:`scale-payment-${index}`,label:'Confirm payment'});
    ensure(paid.order.paymentStatus==='paid','A confirmed payment did not become Paid.');orders.push(paid.order);
    if((index+1)%50===0)console.error(JSON.stringify({kind:'progress',stage,completed:index+1,total:studentCount}));
  }
  const enrollmentMs=elapsed(enrollmentStarted);
  stage='verify active dataset and occupancy';
  const verificationStarted=performance.now(),formalStudents=[];
  for(let page=1;formalStudents.length<studentCount;page++) {
    const result=await admin.request(`/api/people?kind=student&page=${page}&pageSize=100`,{label:'Read formal Students page'});
    ensure(result.people.length>0,'Formal Student pagination ended before the expected count.');formalStudents.push(...result.people);
  }
  ensure(new Set(formalStudents.map(person=>person.id)).size===studentCount,'Expected distinct formal Student records.');
  ensure(formalStudents.every(person=>person.kind==='student'&&person.quitDate===null),'All fixture Students must be active formal profiles.');
  const sql=new DatabaseSync(databasePath,{readOnly:true});let stored;
  try {stored={students:sql.prepare("SELECT COUNT(*) AS count FROM people WHERE kind='student'").get().count,paidOrders:sql.prepare("SELECT COUNT(*) AS count FROM enrollment_orders WHERE payment_status='paid'").get().count,sessions:sql.prepare('SELECT COUNT(*) AS count FROM student_sessions').get().count,sales:sql.prepare('SELECT COUNT(*) AS count FROM enrollment_sales').get().count};}finally{sql.close();}
  ensure(stored.students===studentCount&&stored.paidOrders===studentCount&&stored.sessions===studentCount*occurrencesPerClass&&stored.sales===studentCount,'Durable Student/order/session/sales totals do not match HTTP-confirmed payments.');
  const occupancies=[];let automaticFullOccurrences=0,automaticAvailableOccurrences=0;
  for(const schedule of scheduleRecords)for(let sequence=1;sequence<=occurrencesPerClass;sequence++) {
    const result=await admin.request(`/api/schedules/${schedule.id}/occurrences/${sequence}/students`,{label:'Read class roster'});
    const expectedIds=new Set(schedule.plan.studentIndices.map(index=>students[index].personId)),expectedCount=expectedIds.size;
    ensure(result.occupied===expectedCount&&result.students.length===expectedCount&&result.students.every(row=>expectedIds.has(row.studentId))&&new Set(result.students.map(row=>row.studentId)).size===expectedCount,'A class roster differs from its exact planned Student identities or occupied-seat total.');
    const status=await admin.request(`/api/schedules/${schedule.id}/occurrences/${sequence}/capacity-status`,{label:'Read automatic capacity'});
    const expectedStatus=expectedCount>=schedule.plan.capacity?'full':'available';ensure(status.status.classOccupied===expectedCount&&status.status.automaticStatus===expectedStatus,'Paid enrollments did not produce the truthful planned capacity status.');
    if(expectedStatus==='full')automaticFullOccurrences++;else automaticAvailableOccurrences++;
    occupancies.push(result.occupied);
  }
  stage='verify Student and Teacher isolation';
  const sampledStudents=Array.from({length:Math.min(24,studentCount)},(_,index)=>Math.floor(index*studentCount/Math.min(24,studentCount))),studentReads=new Map();
  for(const index of sampledStudents){
    const projection=await studentClients[index].request('/api/student/timetable'+range,{label:'Student timetable full'}),expectedSchedule=scheduleByClass.get(students[index].classId);studentReads.set(index,projection);
    ensure(projection.lessons.length===occurrencesPerClass&&projection.lessons.every(lesson=>lesson.studentId===students[index].personId&&lesson.scheduleId===expectedSchedule.id&&lesson.courseId===courseRecords[students[index].courseIndex].id),'A Student timetable contained another Student, wrong planned class/course or incorrect lesson count.');
    ensure(projection.students.length===1&&projection.students[0].id===students[index].personId,'A Student profile projection leaked another Student.');
    ensure(!JSON.stringify(projection).includes('PRIVATE SCALE')&&!JSON.stringify(projection).includes('guardian-'),'Student timetable leaked private lesson/profile details.');
    const ownOrders=await studentClients[index].request('/api/orders',{label:'Student orders'});
    ensure(ownOrders.orders.length===1&&ownOrders.orders[0].studentId===students[index].personId,'Student orders were not own-only.');
  }
  const first=studentReads.get(0),second=studentReads.get(1)||await studentClients[1].request('/api/student/timetable'+range,{label:'Student timetable comparison source'});
  await studentClients[0].request(`/api/orders/${orders[1].id}`,{expect:404,label:'Block foreign Student order'});
  await studentClients[0].request('/api/student/timetable'+range+'&studentId='+students[1].personId,{expect:400,label:'Block Student identity override'});
  await studentClients[0].request(`/api/schedules/${scheduleRecords[0].id}/occurrences/1/students`,{expect:403,label:'Block Student class roster'});
  const teacherOccurrenceCounts=[];
  for(let round=0;round<6;round++)for(const [index,client]of teacherClients.entries()) {
    const allowed=scheduleRecords.filter(schedule=>schedule.plan.teacherIndex===index),allowedIds=new Set(allowed.map(schedule=>schedule.id));
    const projection=await client.request('/api/schedules'+range,{label:'Teacher scoped timetable'});
    ensure(projection.occurrences.length===allowed.length*occurrencesPerClass&&projection.occurrences.every(lesson=>allowedIds.has(lesson.item.id)),'A Teacher timetable exceeded the linked Teacher scope.');
    if(round===0)teacherOccurrenceCounts.push(projection.occurrences.length);
  }
  await teacherClients[0].request(`/api/schedules/${scheduleRecords[0].id}/occurrences/1/students`,{label:'Teacher own roster'});
  await teacherClients[0].request(`/api/schedules/${scheduleRecords[1].id}/occurrences/1/students`,{expect:404,label:'Block foreign Teacher roster'});
  stage='verify live shared reschedule projection';
  const schedule=scheduleRecords[0],moveStarted=performance.now();
  await admin.request(`/api/schedules/${schedule.id}/occurrences/1`,{method:'PATCH',body:{...schedule.fixtureRule,version:schedule.version,scope:'single',time:'08:45'},key:'scale-move-one',label:'Move first occurrence'});
  const changed=await studentClients[0].request('/api/student/timetable'+range+'&since='+first.revision,{label:'Student timetable after move'});
  ensure(changed.unchanged!==true&&changed.revision!==first.revision,'Student timetable did not detect the shared reschedule.');
  const before=first.lessons.find(lesson=>lesson.sequence===1),after=changed.lessons.find(lesson=>lesson.sequence===1);
  ensure(before.id===after.id&&before.scheduleId===after.scheduleId&&after.time==='08:45','Reschedule did not preserve the same StudentSession and occurrence identity.');
  ensure(changed.lessons.filter(lesson=>lesson.sequence!==1).every(lesson=>lesson.time===schedule.fixtureRule.time),'Single-occurrence move changed following lessons.');
  const unaffected=await studentClients[1].request('/api/student/timetable'+range+'&since='+second.revision,{label:'Unrelated Student unchanged'});
  ensure(unaffected.unchanged===true,'Unrelated Student timetable changed during another class move.');
  const synchronizationMs=elapsed(moveStarted),verificationMs=elapsed(verificationStarted);
  const result={ok:true,kind:'isolated-enrollment-scale',node:process.version,hardware:{cpu:cpus()[0]?.model||'unknown',logicalCpus:cpus().length,memoryGiB:Math.round(totalmem()/2**30*10)/10,platform:process.platform,architecture:process.arch,osRelease:release()},
    dataset:{activeFormalStudents:stored.students,ageRange:[Math.min(...students.map(student=>student.age)),Math.max(...students.map(student=>student.age))],courses:courseCount,teachers:teacherCount,classrooms:rooms.length,classes:scheduleRecords.length,studentsPerCourse:studentCount/courseCount,classCapacity:capacity,...(options.classCapacity===undefined?{capacityPerCourse:capacity}:{}),occurrencesPerClass,occurrencesPerCourse:scheduleRecords.filter(schedule=>schedule.plan.courseIndex===0).length*occurrencesPerClass,totalClassOccurrences:scheduleRecords.length*occurrencesPerClass,paidOrders:stored.paidOrders,studentSessions:stored.sessions,sales:stored.sales,scheduledDates:{from:plan.classes.map(group=>group.startDate).sort()[0],to:new Date(Date.parse(plan.classes.map(group=>group.startDate).sort().at(-1)+'T00:00:00Z')+(occurrencesPerClass-1)*7*86400000).toISOString().slice(0,10)},queryRange:{from:'2026-10-01',to:'2026-11-30'}},
    authentication:{realHTTPLogins:7,prearrangedDistinctStudentSessions:Math.max(0,studentCount-2),rateLimitUnchanged:true},
    verification:{allBusinessWrites:'real HTTP: create order → send → Student confirm → administrator confirm payment',paidRowsInsertedDirectly:false,verifiedClassRosters:occupancies.length,automaticFullOccurrences,automaticAvailableOccurrences,rosterOccupancyRange:[Math.min(...occupancies),Math.max(...occupancies)],exactPlannedRosterMembership:true,ownStudentLessons:occurrencesPerClass,freshStudentTimetableSamples:timings.get('Student timetable full')?.length||0,freshTeacherTimetableSamples:timings.get('Teacher scoped timetable')?.length||0,teacherOccurrenceCounts,foreignStudentOrderBlocked:true,studentIdentityOverrideBlocked:true,foreignTeacherRosterBlocked:true,sharedSingleOccurrenceMovePreservesIdentity:true,sharedMoveTime:'08:45',unrelatedStudentRevisionUnchanged:true},
    timing:{totalMs:elapsed(started),identityAndAuthenticationSetupMs:setupMs,catalogAndScheduleSetupMs:Math.round(catalogMs*100)/100,studentLinkMs:linkMs,enrollmentBusinessFlowMs:enrollmentMs,verificationMs,sharedMoveAndFreshStudentReadMs:synchronizationMs,httpRequests:[...timings.values()].reduce((sum,values)=>sum+values.length,0),requests:Object.fromEntries([...timings].map(([label,values])=>[label,summary(values)]))},
    limits:'Sequential local HTTP and isolated file SQLite. Only benchmark identities/profiles and the remaining distinct login sessions are prearranged. All enrollment create/send/Student confirm/Admin payment steps use real business HTTP. This does not claim 300 simultaneous users, hosted performance, real customer data, browser layout, attendance or complete Goal acceptance.'};
  await writeFile(join(directory,'result.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(result));successful=true;
}catch(error) {
  console.error(JSON.stringify({ok:false,kind:'isolated-enrollment-scale',stage,message:String(error.message).slice(0,400),evidenceDirectory:directory}));process.exitCode=1;
}finally {
  if(application)await application.close();
  if(successful)await rm(directory,{recursive:true,force:true});
}
