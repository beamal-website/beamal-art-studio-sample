import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers.mjs';

test('paid-seat source drives automatic capacity and revisions without treating trial quota or manual Available as more seats',async t=>{
  const app=await fixture(t),admin=app.client();await admin.login();
  const result=await admin.request('/api/schedules',{method:'POST',body:{course:'public-course',startDate:'2026-10-16',time:'13:00',duration:60,weekdays:[5],endMode:'count',count:2,teacherIds:[],roomIds:[],capacity:2}});
  assert.equal(result.status,201,result.text);const schedule=result.body.schedule;
  assert.equal(typeof app.store.classCapacityStatuses.setOccupancySource,'function');
  let occupied=0;app.store.classCapacityStatuses.setOccupancySource((id,sequence)=>id===schedule.id&&sequence===1?occupied:0);
  const path=`/api/schedules/${schedule.id}/occurrences/1/capacity-status`,range='/api/class-capacity-statuses?from=2026-10-16&to=2026-10-23';
  const initial=(await admin.request(path)).body.status;
  assert.equal(initial.classOccupied,0);assert.equal(initial.automaticStatus,'available');assert.equal(initial.effectiveStatus,'available');assert.equal(initial.statusSource,'automatic');
  const before=(await admin.request(range)).body;assert.equal(before.statuses.length,2);
  occupied=2;
  const full=(await admin.request(path)).body.status;assert.equal(full.classOccupied,2);assert.equal(full.automaticStatus,'full');assert.equal(full.effectiveStatus,'full');
  const changed=(await admin.request(range+'&since='+before.revision)).body;assert.equal(changed.unchanged,undefined);assert.notEqual(changed.revision,before.revision);
  const override=await admin.request(path,{method:'PATCH',body:{version:0,sourceVersion:1,manualStatus:'available'}});
  assert.equal(override.status,200,override.text);assert.equal(override.body.status.manualStatus,'available');assert.equal(override.body.status.effectiveStatus,'available');assert.equal(override.body.status.classOccupied,2);assert.equal(override.body.status.automaticStatus,'full');
  const clear=await admin.request(path,{method:'PATCH',body:{version:1,sourceVersion:1,manualStatus:null}});
  assert.equal(clear.status,200,clear.text);assert.equal(clear.body.status.effectiveStatus,'full');assert.equal(clear.body.status.statusSource,'automatic');
  occupied=1;assert.equal((await admin.request(path)).body.status.effectiveStatus,'available');
});
