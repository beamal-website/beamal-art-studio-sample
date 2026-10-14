import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {fixture,error} from './helpers.mjs';
import {scheduleOccurrence,scheduleOccurrences,scheduleFollowingRule} from '../../shared/schedule-occurrences.js';

const send=(client,path,method,body,key)=>client.request(path,{method,body,...(key?{headers:{'Idempotency-Key':key}}:{})});
const baseRule=fields=>({course:'public-course',startDate:'2026-10-14',time:'12:30',duration:30,weekdays:[3],endMode:'count',count:3,teacher:'',room:'',session:1,...fields});
async function setup(t,options={}){const app=await fixture(t,options),admin=app.client();await admin.login();const createResource=async(kind,displayName,extra={})=>{const reply=await send(admin,'/api/scheduling-resources','POST',{kind,displayName,...extra},`fixture-${kind}-${displayName.replace(/\W/g,'_')}`);assert.equal(reply.status,201,reply.text);return reply.body.resource;};return {...app,admin,a:await createResource('teacher','Fictional Teacher A'),b:await createResource('teacher','Fictional Teacher B'),roomA:await createResource('room','Fictional Room A',{capacity:6}),roomB:await createResource('room','Fictional Room B',{capacity:4})};}
async function create(app,fields={}){const reply=await send(app.admin,'/api/schedules','POST',baseRule(fields));assert.equal(reply.status,201,reply.text);return reply.body.schedule;}
async function patchOccurrence(app,current,sequence,scope,fields){return send(app.admin,`/api/schedules/${current.id}/occurrences/${sequence}`,'PATCH',{...scheduleFollowingRule(current,sequence),...fields,version:current.version,scope});}
const rows=schedule=>scheduleOccurrences(schedule,'2026-10-01','2026-12-31');

test('multiple teacher and room IDs survive shared writes projections and copies without trusting client labels or changing course fees',async t=>{
 const app=await setup(t),catalog=(await app.admin.request('/api/catalog')).body,current=await create(app,{teacherIds:[app.a.id,app.b.id],roomIds:[app.roomA.id,app.roomB.id],teacher:'Spoofed label',room:'Spoofed room',capacity:10});
 assert.deepEqual(current.teacherIds,[app.a.id,app.b.id]);assert.deepEqual(current.roomIds,[app.roomA.id,app.roomB.id]);assert.equal(current.teacher,'Fictional Teacher A, Fictional Teacher B');assert.equal(current.room,'Fictional Room A, Fictional Room B');assert.equal(current.capacity,10,'Room capacity must not silently become a scheduling limit.');
 const other=app.client();await other.login(1);assert.deepEqual((await other.request('/api/schedules')).body.schedules,[current]);assert.equal(rows(current).length,3);
 assert.equal(rows(current).filter(row=>row.item.teacherIds.includes(app.b.id)).length,3);assert.equal(rows(current).filter(row=>row.item.roomIds.includes(app.roomB.id)).length,3);
 const projected=scheduleOccurrence(current,2),opened=scheduleFollowingRule(current,2);projected.item.teacherIds.pop();opened.roomIds.pop();assert.equal(current.teacherIds.length,2);assert.equal(current.roomIds.length,2);
 const copy=await create(app,{teacherIds:current.teacherIds,roomIds:current.roomIds});assert.notEqual(copy.id,current.id);assert.deepEqual(copy.teacherIds,current.teacherIds);assert.deepEqual((await app.admin.request('/api/catalog')).body,catalog);
});

test('new schedules reject arbitrary legacy labels and invalid or inactive resource IDs atomically',async t=>{
 const app=await setup(t),before=(await app.admin.request('/api/schedules')).body;
 for(const fields of[{teacher:'Arbitrary teacher'},{room:'Arbitrary room'},{teacherIds:'not-array'},{teacherIds:[app.a.id,app.a.id]},{teacherIds:[null]},{teacherIds:['missing']},{teacherIds:[app.roomA.id]},{roomIds:[app.a.id]}])error(await send(app.admin,'/api/schedules','POST',baseRule(fields)),400);
 const disabled=await send(app.admin,`/api/scheduling-resources/${app.a.id}`,'PATCH',{version:1,active:false});assert.equal(disabled.status,200,disabled.text);
 const inactive=await send(app.admin,'/api/schedules','POST',baseRule({teacherIds:[app.a.id]}));error(inactive,409);assert.equal(inactive.body.error.code,'RESOURCE_INACTIVE');assert.deepEqual((await app.admin.request('/api/schedules')).body,before);
});

test('single and following resource edits preserve other slots and inactive assignments cannot spread to new slots or copied schedules',async t=>{
 const app=await setup(t);let current=await create(app,{teacherIds:[app.a.id],roomIds:[app.roomA.id]});
 let reply=await patchOccurrence(app,current,3,'single',{teacherIds:[app.b.id],roomIds:[app.roomB.id]});assert.equal(reply.status,200,reply.text);current=reply.body.schedule;
 reply=await patchOccurrence(app,current,2,'single',{startDate:'2026-10-22',weekdays:[4]});assert.equal(reply.status,200,reply.text);current=reply.body.schedule;
 reply=await patchOccurrence(app,current,2,'following',{time:'13:15'});assert.equal(reply.status,200,reply.text);current=reply.body.schedule;
 assert.deepEqual(rows(current).map(row=>[row.sequence,row.date,row.item.teacherIds,row.item.roomIds]),[[1,'2026-10-14',[app.a.id],[app.roomA.id]],[2,'2026-10-22',[app.a.id],[app.roomA.id]],[3,'2026-10-28',[app.b.id],[app.roomB.id]]]);
 assert.equal((await send(app.admin,`/api/scheduling-resources/${app.a.id}`,'PATCH',{version:1,active:false})).status,200);
 reply=await patchOccurrence(app,current,2,'single',{time:'14:00'});assert.equal(reply.status,200,reply.text);current=reply.body.schedule;
 const snapshot=(await app.admin.request('/api/schedules')).body;
 const spread=await patchOccurrence(app,current,3,'single',{teacherIds:[app.a.id]});error(spread,409);assert.equal(spread.body.error.code,'RESOURCE_INACTIVE');
 const extend=await patchOccurrence(app,current,2,'following',{startDate:'2026-10-22',weekdays:[4],endMode:'count',count:4,teacherIds:[app.a.id]});error(extend,409);assert.deepEqual((await app.admin.request('/api/schedules')).body,snapshot);
 error(await send(app.admin,'/api/schedules','POST',baseRule({teacherIds:current.teacherIds,roomIds:current.roomIds})),409);
 const cancelled=await send(app.admin,`/api/schedules/${current.id}/occurrences/2`,'DELETE',{version:current.version,scope:'single'});assert.equal(cancelled.status,200,cancelled.text);
 const restored=await send(app.admin,`/api/schedules/${current.id}/occurrences/2/restore`,'POST',{version:cancelled.body.schedule.version,scope:'single'});assert.equal(restored.status,200,restored.text);assert.deepEqual(scheduleOccurrence(restored.body.schedule,2).item.teacherIds,[app.a.id]);
 const allDeleted=await send(app.admin,`/api/schedules/${current.id}`,'DELETE',{version:restored.body.schedule.version});assert.equal(allDeleted.status,200,allDeleted.text);
 const allRestored=await send(app.admin,`/api/schedules/${current.id}/restore`,'POST',{version:allDeleted.body.schedule.version});assert.equal(allRestored.status,200,allRestored.text);assert.deepEqual(allRestored.body.schedule.teacherIds,[app.a.id]);
});

test('catalog reordering after resource renames cannot turn a time-only following edit into changed teacher or room assignments',async t=>{
 const app=await setup(t),teacherC=await send(app.admin,'/api/scheduling-resources','POST',{kind:'teacher',displayName:'Fictional Teacher C'}),roomC=await send(app.admin,'/api/scheduling-resources','POST',{kind:'room',displayName:'Fictional Room C'});
 assert.equal(teacherC.status,201,teacherC.text);assert.equal(roomC.status,201,roomC.text);
 let current=await create(app,{teacherIds:[app.a.id,app.b.id],roomIds:[app.roomA.id,app.roomB.id]});
 const exception=await patchOccurrence(app,current,3,'single',{teacherIds:[teacherC.body.resource.id],roomIds:[roomC.body.resource.id]});assert.equal(exception.status,200,exception.text);current=exception.body.schedule;
 for(const resource of[app.a,app.roomA]){const renamed=await send(app.admin,`/api/scheduling-resources/${resource.id}`,'PATCH',{version:1,displayName:`Z renamed ${resource.kind}`});assert.equal(renamed.status,200,renamed.text);}
 const changed=await patchOccurrence(app,current,2,'following',{time:'13:15',teacherIds:[app.b.id,app.a.id],roomIds:[app.roomB.id,app.roomA.id]});assert.equal(changed.status,200,changed.text);current=changed.body.schedule;
 assert.deepEqual(rows(current).map(row=>[row.sequence,row.item.time,row.item.teacherIds,row.item.roomIds]),[[1,'12:30',[app.a.id,app.b.id],[app.roomA.id,app.roomB.id]],[2,'13:15',[app.a.id,app.b.id],[app.roomA.id,app.roomB.id]],[3,'13:15',[teacherC.body.resource.id],[roomC.body.resource.id]]]);
 assert.equal(scheduleOccurrence(current,2).item.teacher,'Fictional Teacher A, Fictional Teacher B','An unchanged assignment preserves its saved label snapshot.');
 assert.equal(scheduleOccurrence(current,2).item.room,'Fictional Room A, Fictional Room B');
 const reorderedCreate=await create(app,{teacherIds:[app.b.id,app.a.id],roomIds:[app.roomB.id,app.roomA.id]});assert.deepEqual(reorderedCreate.teacherIds,[app.b.id,app.a.id]);assert.deepEqual(reorderedCreate.roomIds,[app.roomB.id,app.roomA.id]);
 const reassigned=await patchOccurrence(app,current,2,'following',{teacherIds:[teacherC.body.resource.id,app.b.id],roomIds:[roomC.body.resource.id,app.roomB.id]});assert.equal(reassigned.status,200,reassigned.text);
 assert.deepEqual(rows(reassigned.body.schedule).map(row=>[row.sequence,row.item.teacherIds,row.item.roomIds]),[[1,[app.a.id,app.b.id],[app.roomA.id,app.roomB.id]],[2,[teacherC.body.resource.id,app.b.id],[roomC.body.resource.id,app.roomB.id]],[3,[teacherC.body.resource.id,app.b.id],[roomC.body.resource.id,app.roomB.id]]]);
});

test('existing legacy text may be retained unchanged but cannot be reassigned or used for new schedules',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-legacy-assignment-'));t.after(()=>rm(directory,{recursive:true,force:true}));const databasePath=join(directory,'fictional.sqlite'),app=await setup(t,{databasePath}),current=await create(app),inspection=new DatabaseSync(databasePath);
 try{const data=JSON.parse(inspection.prepare('SELECT data FROM schedules WHERE id=?').get(current.id).data);data.teacher='Unmatched legacy teacher';data.room='Unmatched legacy room';inspection.prepare('UPDATE schedules SET data=? WHERE id=?').run(JSON.stringify(data),current.id);}finally{inspection.close();}
 let legacy=(await app.admin.request('/api/schedules')).body.schedules[0];assert.equal(legacy.teacherIds,undefined);
 const saved=await send(app.admin,`/api/schedules/${legacy.id}`,'PATCH',{version:legacy.version,time:'13:00'});assert.equal(saved.status,200,saved.text);legacy=saved.body.schedule;assert.equal(legacy.teacher,'Unmatched legacy teacher');assert.equal(legacy.room,'Unmatched legacy room');
 error(await send(app.admin,`/api/schedules/${legacy.id}`,'PATCH',{version:legacy.version,teacher:'New arbitrary label'}),400);
 const single=await patchOccurrence(app,legacy,2,'single',{time:'13:15'});assert.equal(single.status,200,single.text);legacy=single.body.schedule;
 const chosen=await patchOccurrence(app,legacy,2,'single',{teacherIds:[app.a.id],roomIds:[]});assert.equal(chosen.status,200,chosen.text);assert.equal(scheduleOccurrence(chosen.body.schedule,2).item.teacher,'Fictional Teacher A');assert.equal(scheduleOccurrence(chosen.body.schedule,2).item.room,'');assert.equal(scheduleOccurrence(chosen.body.schedule,1).item.teacher,'Unmatched legacy teacher');
 const cleared=await patchOccurrence(app,chosen.body.schedule,2,'single',{teacherIds:[]});assert.equal(cleared.status,200,cleared.text);assert.equal(scheduleOccurrence(cleared.body.schedule,2).item.teacher,'');
 const before=(await app.admin.request('/api/schedules')).body;await app.close();const reopened=await setup(t,{databasePath});assert.deepEqual((await reopened.admin.request('/api/schedules')).body,before);
});
