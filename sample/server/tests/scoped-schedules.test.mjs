import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fixture,error} from './helpers.mjs';

const rule=(extra={})=>({course:'public-course',startDate:'2026-10-14',time:'12:30',duration:30,weekdays:[3],endMode:'count',endDate:'',count:3,mustAttendAll:true,color:'#27777b',teacher:'Original teacher',room:'Room A',capacity:8,session:1,remark:'',detail:'',moreInfo:'',...extra});
const fromSecond=extra=>rule({startDate:'2026-10-21',count:2,session:2,...extra});
const send=(client,path,method,body,key)=>client.request(path,{method,body,...(key?{headers:{'Idempotency-Key':key}}:{})});
async function setup(t,options={}){const app=await fixture(t,options),admin=app.client();await admin.login();const reply=await send(admin,'/api/schedules','POST',rule(options.rule));assert.equal(reply.status,201,reply.text);return {...app,admin,schedule:reply.body.schedule};}
const path=(schedule,sequence=2)=>`/api/schedules/${schedule.id}/occurrences/${sequence}`;
async function patch(app,schedule,record,sequence=2,scope='single',key){return send(app.admin,path(schedule,sequence),'PATCH',{...record,version:schedule.version,scope},key);}
async function items(schedule,from='2026-10-01',to='2026-12-31',options={}){const {scheduleOccurrences}=await import('../../shared/schedule-occurrences.js');return scheduleOccurrences(schedule,from,to,options);}
const summary=entries=>entries.map(entry=>[entry.sequence,entry.date,entry.item.time,entry.item.session]);

test('source-confirmed single and following edits preserve the first lesson course and fees in one shared series',async t=>{
 const app=await setup(t),before=(await app.admin.request('/api/catalog')).body;
 const only=await patch(app,app.schedule,fromSecond({time:'12:45'}));assert.equal(only.status,200,only.text);
 assert.deepEqual(summary(await items(only.body.schedule)),[[1,'2026-10-14','12:30',1],[2,'2026-10-21','12:45',2],[3,'2026-10-28','12:30',3]]);
 const following=await patch(app,only.body.schedule,fromSecond({time:'13:00'}),2,'following');assert.equal(following.status,200,following.text);
 assert.equal(following.body.schedule.id,app.schedule.id);assert.equal(following.body.schedule.course,app.schedule.course);
 assert.deepEqual(summary(await items(following.body.schedule)),[[1,'2026-10-14','12:30',1],[2,'2026-10-21','13:00',2],[3,'2026-10-28','13:00',3]]);
 assert.deepEqual((await app.admin.request('/api/catalog')).body,before);
 const other=app.client();await other.login(1);assert.deepEqual((await other.request('/api/schedules')).body.schedules,[following.body.schedule]);
});

test('single lesson date and teacher changes keep sequence identity including two lessons on the same day',async t=>{
 const app=await setup(t),changed=await patch(app,app.schedule,fromSecond({startDate:'2026-10-28',teacher:'Substitute teacher'}));assert.equal(changed.status,200,changed.text);
 const records=await items(changed.body.schedule);assert.deepEqual(summary(records),[[1,'2026-10-14','12:30',1],[2,'2026-10-28','12:30',2],[3,'2026-10-28','12:30',3]]);
 assert.equal(records.find(item=>item.sequence===2).item.teacher,'Substitute teacher');assert.equal(records.find(item=>item.sequence===3).item.teacher,'Original teacher');
 assert.equal((await items(changed.body.schedule,'2026-10-21','2026-10-21')).length,0);
 assert.deepEqual((await items(changed.body.schedule,'2026-10-28','2026-10-28')).map(item=>item.sequence),[2,3]);
});

test('source-confirmed moved lesson followed by a time-only following edit preserves the existing 14 22 28 calendar',async t=>{
 const app=await setup(t),moved=await patch(app,app.schedule,fromSecond({startDate:'2026-10-22',weekdays:[4],time:'13:00'}));assert.equal(moved.status,200,moved.text);
 // The reference opens Thu22/date-end28 even though the next existing lesson
 // remains Wed28. This unchanged prefill must not replace that real calendar.
 const submitted=fromSecond({startDate:'2026-10-22',weekdays:[4],endMode:'date',endDate:'2026-10-28',time:'13:15'});
 const changed=await patch(app,moved.body.schedule,submitted,2,'following');assert.equal(changed.status,200,changed.text);
 assert.deepEqual(summary(await items(changed.body.schedule)),[[1,'2026-10-14','12:30',1],[2,'2026-10-22','13:15',2],[3,'2026-10-28','13:15',3]]);
 // Actually changing the opened start date/weekday replaces the remaining
 // repeat rule up to the unchanged end boundary: Fri23 only, not Wed28/Thu29.
 const movedFollowing=await patch(app,changed.body.schedule,{...submitted,startDate:'2026-10-23',weekdays:[5]},2,'following');assert.equal(movedFollowing.status,200,movedFollowing.text);
 assert.deepEqual(summary(await items(movedFollowing.body.schedule)),[[1,'2026-10-14','12:30',1],[2,'2026-10-23','13:15',2]]);
 const {scheduleOccurrence}=await import('../../shared/schedule-occurrences.js');assert.equal(scheduleOccurrence(movedFollowing.body.schedule,3),null);
});

test('following edits support new dates weekdays and end conditions without deleting or adding earlier sequence slots',async t=>{
 const app=await setup(t),thursday=await patch(app,app.schedule,fromSecond({startDate:'2026-10-22',weekdays:[4],time:'14:00'}),2,'following');assert.equal(thursday.status,200,thursday.text);
 assert.deepEqual(summary(await items(thursday.body.schedule)),[[1,'2026-10-14','12:30',1],[2,'2026-10-22','14:00',2],[3,'2026-10-29','14:00',3]]);
 const later=rule({startDate:'2026-11-02',weekdays:[1,3],endMode:'date',endDate:'2026-11-09',count:3,session:3,time:'15:00'});
 const monday=await patch(app,thursday.body.schedule,later,3,'following');assert.equal(monday.status,200,monday.text);
 assert.deepEqual(summary(await items(monday.body.schedule)),[[1,'2026-10-14','12:30',1],[2,'2026-10-22','14:00',2],[3,'2026-11-02','15:00',3],[4,'2026-11-04','15:00',4],[5,'2026-11-09','15:00',5]]);
});

test('following rule changes retain other single exceptions and reject truncation or an old whole-series PATCH that would erase scoped history',async t=>{
 const app=await setup(t,{rule:{count:4}}),single=await patch(app,app.schedule,rule({startDate:'2026-11-05',weekdays:[4],count:1,session:4,teacher:'Retained substitute'}),4);assert.equal(single.status,200,single.text);
 const before=(await app.admin.request('/api/schedules')).body;
 const lost=await patch(app,single.body.schedule,fromSecond({startDate:'2026-10-22',weekdays:[4],count:2}),2,'following','correctable-scope');error(lost,409);assert.equal(lost.body.error.code,'SCHEDULE_OCCURRENCE_CONFLICT');
 assert.deepEqual((await app.admin.request('/api/schedules')).body,before);
 const kept=await patch(app,single.body.schedule,fromSecond({startDate:'2026-10-22',weekdays:[4],count:3}),2,'following','correctable-scope');assert.equal(kept.status,200,kept.text);
 const fourth=(await items(kept.body.schedule)).find(item=>item.sequence===4);assert.equal(fourth.date,'2026-11-05');assert.equal(fourth.item.teacher,'Retained substitute');
 const legacy=await send(app.admin,`/api/schedules/${app.schedule.id}`,'PATCH',{version:kept.body.schedule.version,time:'16:00'});error(legacy,409);assert.equal(legacy.body.error.code,'SCHEDULE_HAS_SCOPED_CHANGES');
});

test('single and following cancellation and restoration preserve sequence slots without replacement lessons',async t=>{
 const app=await setup(t);let current=app.schedule;
 const mutate=async(method,sequence,scope,restore=false)=>{const reply=await send(app.admin,path(current,sequence)+(restore?'/restore':''),method,{version:current.version,scope});assert.equal(reply.status,200,reply.text);current=reply.body.schedule;return current;};
 await mutate('DELETE',2,'single');assert.deepEqual((await items(current)).map(item=>item.sequence),[1,3]);
 assert.deepEqual((await items(current,'2026-10-01','2026-12-31',{includeCancelled:true})).map(item=>[item.sequence,!!item.cancelled]),[[1,false],[2,true],[3,false]]);
 await mutate('POST',2,'single',true);assert.deepEqual((await items(current)).map(item=>item.sequence),[1,2,3]);
 await mutate('DELETE',2,'following');assert.deepEqual((await items(current)).map(item=>item.sequence),[1]);
 await mutate('POST',3,'single',true);assert.deepEqual((await items(current)).map(item=>item.sequence),[1,3]);
 await mutate('POST',2,'following',true);assert.deepEqual((await items(current)).map(item=>item.sequence),[1,2,3]);
 await mutate('DELETE',2,'single');const deleted=await send(app.admin,`/api/schedules/${current.id}`,'DELETE',{version:current.version});assert.equal(deleted.status,200,deleted.text);
 const restored=await send(app.admin,`/api/schedules/${current.id}/restore`,'POST',{version:deleted.body.schedule.version});assert.equal(restored.status,200,restored.text);
 assert.deepEqual((await items(restored.body.schedule)).map(item=>item.sequence),[1,3]);
});

test('scoped endpoints enforce permissions CSRF origin immutable course and opened versions with exact retry receipts',async t=>{
 const app=await setup(t),teacher=app.client(),student=app.client();await teacher.login(2);await student.login(3);
 const input={...fromSecond({time:'13:00'}),version:1,scope:'single'};
 for(const [method,endpoint,body]of[['PATCH',path(app.schedule),input],['DELETE',path(app.schedule),{version:1,scope:'single'}],['POST',path(app.schedule)+'/restore',{version:1,scope:'single'}]]){
  error(await send(app.client(),endpoint,method,body),401);for(const client of[teacher,student])error(await send(client,endpoint,method,body),403);
  error(await app.admin.request(endpoint,{method,body,csrf:false}),403);error(await app.admin.request(endpoint,{method,body,requestOrigin:'https://hostile.example.test'}),403);
 }
 error(await patch(app,app.schedule,fromSecond(),0),400);error(await patch(app,app.schedule,fromSecond(),9),404);
 error(await patch(app,app.schedule,fromSecond({course:'private-course'})),409);error(await patch(app,app.schedule,fromSecond(),2,'unknown'),400);
 const results=await Promise.all(Array.from({length:5},()=>send(app.admin,path(app.schedule),'PATCH',input,'scoped-retry')));
 for(const result of results){assert.equal(result.status,200,result.text);assert.deepEqual(result.body,results[0].body);}
 const current=results[0].body.schedule;assert.equal(current.version,2);error(await send(app.admin,path(app.schedule),'PATCH',{...input,time:'14:00'},'scoped-retry'),409);
 const race=await Promise.all(['14:00','15:00'].map(time=>patch(app,current,fromSecond({time}),2,'single')));assert.deepEqual(race.map(result=>result.status).sort(),[200,409]);
});

test('scoped history and receipts survive restart while a real audit failure rolls back the entire operation',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-scoped-schedules-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const databasePath=join(directory,'fictional.sqlite'),app=await setup(t,{databasePath}),inspection=new DatabaseSync(databasePath);
 const request={...fromSecond({time:'13:00'}),version:1,scope:'single'};
 try{
  const before=(await app.admin.request('/api/schedules')).body;
  inspection.exec("CREATE TRIGGER fictional_scoped_failure BEFORE INSERT ON schedule_audit_log WHEN NEW.action LIKE 'schedule.occurrence.%' BEGIN SELECT RAISE(ABORT,'Fictional scoped audit failure'); END;");
  error(await send(app.admin,path(app.schedule),'PATCH',request,'scoped-durable'),500);assert.deepEqual((await app.admin.request('/api/schedules')).body,before);
  assert.equal(inspection.prepare("SELECT COUNT(*) AS count FROM idempotent_creates WHERE request_key='scoped-durable'").get().count,0);inspection.exec('DROP TRIGGER fictional_scoped_failure');
 }finally{inspection.close();}
 const saved=await send(app.admin,path(app.schedule),'PATCH',request,'scoped-durable');assert.equal(saved.status,200,saved.text);const snapshot=(await app.admin.request('/api/schedules')).body;
 await app.close();const reopened=await fixture(t,{databasePath}),admin=reopened.client();await admin.login();
 assert.deepEqual((await admin.request('/api/schedules')).body,snapshot);assert.deepEqual((await send(admin,path(app.schedule),'PATCH',request,'scoped-durable')).body,saved.body);
 assert.deepEqual(summary(await items(saved.body.schedule)),[[1,'2026-10-14','12:30',1],[2,'2026-10-21','13:00',2],[3,'2026-10-28','12:30',3]]);
});

test('Undo following cancellation restores only that operation and preserves an earlier single cancellation and its edits',async t=>{
 const app=await setup(t);let current=app.schedule;
 const edited=await patch(app,current,rule({startDate:'2026-10-27',weekdays:[2],count:1,session:3,time:'14:00',teacher:'Retained substitute',remark:'Keep the independent change'}),3);assert.equal(edited.status,200,edited.text);current=edited.body.schedule;
 const cancelThird=await send(app.admin,path(current,3),'DELETE',{version:current.version,scope:'single'});assert.equal(cancelThird.status,200,cancelThird.text);current=cancelThird.body.schedule;
 assert.deepEqual((await items(current)).map(item=>item.sequence),[1,2]);
 const cancelFollowing=await send(app.admin,path(current,2),'DELETE',{version:current.version,scope:'following'});assert.equal(cancelFollowing.status,200,cancelFollowing.text);current=cancelFollowing.body.schedule;assert.deepEqual((await items(current)).map(item=>item.sequence),[1]);
 const undo=await send(app.admin,path(current,2)+'/restore','POST',{version:current.version,scope:'following'});assert.equal(undo.status,200,undo.text);
 assert.deepEqual((await items(undo.body.schedule)).map(item=>item.sequence),[1,2],'Undo must not revive a lesson that was already cancelled before the following deletion');
 const slots=await items(undo.body.schedule,'2026-10-01','2026-12-31',{includeCancelled:true});assert.deepEqual(slots.map(item=>[item.sequence,!!item.cancelled]),[[1,false],[2,false],[3,true]]);
 const third=slots.find(item=>item.sequence===3);assert.equal(third.date,'2026-10-27');assert.equal(third.item.time,'14:00');assert.equal(third.item.teacher,'Retained substitute');assert.equal(third.item.remark,'Keep the independent change');
});
