import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSharedLessonContext as resolve} from '../client/shared-lesson-context.js';

const fixture=()=>({sharedMode:true,user:{id:'qa-admin',role:'admin'},identity:'current-account-and-permissions',contextKey:'qa-course:qa-series:2:2026-10-23',record:{kind:'schedule',date:'2026-10-23',sequence:2,item:{id:'qa-series',course:'qa-course',version:4,time:'13:20',duration:40,teacher:'Responsible teacher',room:'Studio A',teacherIds:['qa-teacher'],roomIds:['qa-room']}},course:{id:'qa-course',courseName:'Watercolour'},roster:{scheduleId:'qa-series',sequence:2,ready:true,error:'',students:[{id:'qa-session-first',studentId:'qa-student-first',displayName:'First student private',paymentStatus:'paid',attendance:'present'},{id:'qa-session-second',studentId:'qa-child',displayName:'Exact second student',paymentStatus:'paid',attendance:'unmarked',remark:'Canonical note',stickerColor:'#d8b44a',showRemark:false}]}});
const selected={sessionId:'qa-session-second'};

test('resolves the unique canonical second student and effective occurrence into nested readonly facts',()=>{
 const result=resolve(fixture(),selected);assert.equal(result.status,'ready');assert.deepEqual(result.facts.student,{id:'qa-child',displayName:'Exact second student',attendance:'unmarked',remark:'Canonical note',stickerColor:'#d8b44a',showRemark:false});assert.deepEqual(result.facts.lesson,{id:'qa-session-second',scheduleId:'qa-series',sequence:2,sourceVersion:4,courseId:'qa-course',courseName:'Watercolour',date:'2026-10-23',time:'13:20',duration:40,teacher:'Responsible teacher',room:'Studio A',teacherIds:['qa-teacher'],roomIds:['qa-room']});assert.equal(result.facts.identity,'current-account-and-permissions');assert.equal(result.facts.contextKey,'qa-course:qa-series:2:2026-10-23');assert.deepEqual(result.facts.capabilities,{review:true,save:false});assert.deepEqual(result.facts.availability,{ready:false,slots:[]});assert.doesNotMatch(JSON.stringify(result),/First student private/);
});

test('only actual shared Admin or Teacher identities can resolve a roster review',()=>{
 const m=fixture();assert.equal(resolve({...m,user:{id:'qa-teacher-user',role:'teacher'}},selected).status,'ready');for(const extra of [{sharedMode:false},{sharedMode:'true'},{user:{id:'student',role:'student'}},{user:{id:' ',role:'admin'}},{user:{}},{identity:''},{identity:'\t'},{contextKey:''}]){const result=resolve({...m,...extra},selected);assert.equal(result.status,'unavailable');assert.equal(result.facts,undefined);}
});

test('loading first-read failure and a failed refresh are distinguished without returning private stale facts',()=>{
 const m=fixture();for(const [roster,status]of [[{...m.roster,ready:false},'loading'],[{...m.roster,ready:false,error:'Private SQL failure'},'error'],[{...m.roster,error:'Refresh failed'},'error']]){const result=resolve({...m,roster},selected);assert.deepEqual(result,{status});assert.doesNotMatch(JSON.stringify(result),/Exact second|Canonical note|SQL/);}
});

test('the canonical record course and roster tuple must all identify the same actual schedule occurrence',()=>{
 const m=fixture();for(const extra of [{record:{...m.record,kind:'class'}},{record:{...m.record,item:{...m.record.item,id:''}}},{record:{...m.record,sequence:'2'}},{record:{...m.record,sequence:0}},{record:{...m.record,sequence:Number.MAX_SAFE_INTEGER+1}},{course:{...m.course,id:'other-course'}},{course:null},{roster:{...m.roster,scheduleId:'different-series'}},{roster:{...m.roster,sequence:1}},{roster:{...m.roster,sequence:'2'}}])assert.equal(resolve({...m,...extra},selected).status,'unavailable');
});

test('true dates effective clock times same-day positive durations and source versions are required',()=>{
 const m=fixture();for(const change of [{date:'2026-02-30'},{date:'0000-01-01'},{date:'2026-1-01'},{item:{...m.record.item,time:'24:00'}},{item:{...m.record.item,time:'9:00'}},{item:{...m.record.item,duration:0}},{item:{...m.record.item,duration:NaN}},{item:{...m.record.item,time:'23:45',duration:30}},{item:{...m.record.item,version:0}},{item:{...m.record.item,version:'4'}}])assert.equal(resolve({...m,record:{...m.record,...change}},selected).status,'unavailable');
 assert.equal(resolve({...m,record:{...m.record,item:{...m.record.item,time:'23:45',duration:15}}},selected).status,'ready');
});

test('unknown or omitted session selection never falls back to a first student or a date-matched name',()=>{
 const m=fixture();for(const selection of [{},{sessionId:''},{sessionId:'missing',date:m.record.date,studentId:'qa-child'},{sessionId:'qa-child'},{sessionId:'qa-session-other',studentName:'Exact second student'}])assert.deepEqual(resolve(m,selection),{status:'unavailable'});
});

test('duplicate selected session IDs or duplicate student membership are ambiguous and rejected',()=>{
 const m=fixture();for(const duplicate of [{...m.roster.students[1]},{...m.roster.students[1],studentId:'other-child'},{...m.roster.students[1],id:'other-session'}])assert.deepEqual(resolve({...m,roster:{...m.roster,students:[...m.roster.students,duplicate]}},selected),{status:'unavailable'});
});

test('a selected orphan malformed identity missing name or non-paid row does not become reviewable',()=>{
 const m=fixture();for(const change of [{studentId:''},{studentId:' '},{studentId:null},{studentId:'x'.repeat(201)},{displayName:''},{displayName:null},{paymentStatus:'awaiting-payment'},{paymentStatus:true},{paymentStatus:undefined}]){const students=[m.roster.students[0],{...m.roster.students[1],...change}];assert.equal(resolve({...m,roster:{...m.roster,students}},selected).status,'unavailable');}
});

test('request-supplied names attendance lesson facts and permissions cannot overwrite canonical source values',()=>{
 const result=resolve(fixture(),{...selected,studentId:'other',student:{id:'other',displayName:'Forged',attendance:'present'},lesson:{date:'2030-01-01'},capabilities:{save:true},availability:{ready:true,slots:[{id:'fake'}]},identity:'forged'});assert.equal(result.facts.student.displayName,'Exact second student');assert.equal(result.facts.student.attendance,'unmarked');assert.equal(result.facts.lesson.date,'2026-10-23');assert.equal(result.facts.capabilities.save,false);assert.deepEqual(result.facts.availability,{ready:false,slots:[]});assert.equal(result.facts.identity,'current-account-and-permissions');
});

test('missing attendance annotation and teacher display data remain unknown rather than becoming persisted defaults',()=>{
 const m=fixture();m.roster.students[1]={id:'qa-session-second',studentId:'qa-child',displayName:'Exact second student',paymentStatus:'paid'};delete m.record.item.teacher;delete m.record.item.room;const result=resolve(m,selected);assert.equal(result.status,'ready');for(const key of ['attendance','remark','stickerColor','showRemark'])assert.equal(Object.hasOwn(result.facts.student,key),false,key);assert.equal(result.facts.lesson.teacher,'');assert.equal(result.facts.lesson.room,'');
});

test('explicit blank remarks false visibility and the unmarked source state are preserved exactly',()=>{
 const m=fixture();Object.assign(m.roster.students[1],{remark:'',stickerColor:null,showRemark:false});const result=resolve(m,selected);assert.equal(result.facts.student.remark,'');assert.equal(result.facts.student.stickerColor,null);assert.equal(result.facts.student.showRemark,false);assert.equal(result.facts.student.attendance,'unmarked');
});

test('returned facts cannot mutate the source roster or schedule and do not carry unrelated business state',()=>{
 const m=fixture(),before=structuredClone(m);m.orders=[{paymentStatus:'paid'}];m.packageBalance=4;m.availability={ready:true,slots:[{id:'unverified'}]};const result=resolve(m,selected);result.facts.student.remark='Changed UI draft';result.facts.lesson.teacherIds.push('forged-teacher');assert.deepEqual(m.roster,before.roster);assert.deepEqual(m.record,before.record);assert.equal(result.facts.orders,undefined);assert.equal(result.facts.packageBalance,undefined);assert.deepEqual(result.facts.availability,{ready:false,slots:[]});
});

test('student lesson details preserve explicitly supplied age and course balance with their original units',()=>{
 const source=fixture(),row=source.roster.students[1];
 row.studentDetails={studentId:row.studentId,age:{years:7,months:4,asOf:'2026-10-23'},balance:{courseId:source.course.id,unit:'minutes',remaining:360,total:720}};
 const result=resolve(source,selected);
 assert.deepEqual(result.facts.student.age,{years:7,months:4,asOf:'2026-10-23'});
 assert.deepEqual(result.facts.student.balance,{unit:'minutes',remaining:360,total:720});
 result.facts.student.age.years=99;result.facts.student.balance.remaining=0;
 assert.equal(row.studentDetails.age.years,7);assert.equal(row.studentDetails.balance.remaining,360);
 row.studentDetails.balance={courseId:source.course.id,unit:'visits',remaining:2.5};
 assert.deepEqual(resolve(source,selected).facts.student.balance,{unit:'visits',remaining:2.5});
});

test('unknown unrelated or malformed student details never become an age or remaining count',()=>{
 const source=fixture(),row=source.roster.students[1];
 const valid={studentId:row.studentId,age:{years:7,months:4,asOf:'2026-10-23'},balance:{courseId:source.course.id,unit:'minutes',remaining:360,total:720}};
 for(const details of [undefined,{}, {...valid,studentId:'someone-else'}]){
  row.studentDetails=details;
  const student=resolve(source,{...selected,age:valid.age,balance:valid.balance}).facts.student;
  assert.equal(Object.hasOwn(student,'age'),false);assert.equal(Object.hasOwn(student,'balance'),false);
 }
 for(const age of [{years:-1,months:0,asOf:'2026-10-23'},{years:7,months:12,asOf:'2026-10-23'},{years:7,months:4,asOf:'2026-02-30'},7]){
  row.studentDetails={...valid,age};assert.equal(Object.hasOwn(resolve(source,selected).facts.student,'age'),false);
 }
 for(const balance of [{...valid.balance,courseId:'different-course'},{...valid.balance,unit:'lessons'},{...valid.balance,remaining:-1},{...valid.balance,remaining:Infinity},{...valid.balance,remaining:'360'}]){
  row.studentDetails={...valid,balance};assert.equal(Object.hasOwn(resolve(source,selected).facts.student,'balance'),false);
 }
 row.studentDetails={...valid,balance:{courseId:source.course.id,unit:'minutes',remaining:0,total:null}};
 assert.deepEqual(resolve(source,selected).facts.student.balance,{unit:'minutes',remaining:0});
});
