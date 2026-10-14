import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture,error,course,noCredentials} from './helpers.mjs';

const fee=(courseIds,extra={})=>({feeName:'Safely retried tuition',category:'Tuition',pricingModel:'monthly-lessons',price:300.01,duration:60,months:24,bookingExpiry:null,onlineStore:false,courseIds,...extra});

async function adminFixture(t,options={}){
 const app=await fixture(t,options),admin=app.client();await admin.login(0);
 const courses=(await admin.request('/api/courses')).body.courses;
 return {...app,admin,courses};
}

test('ten concurrent identical idempotency keys create exactly one fee and one fee audit entry',async t=>{
 const app=await adminFixture(t),input=fee(app.courses.map(c=>c.id)),key=randomUUID();
 const beforeFees=(await app.admin.request('/api/fees')).body.fees,auditCount=app.store.feeAudit().length;
 const responses=await Promise.all(Array.from({length:10},()=>app.admin.request('/api/fees',{method:'POST',body:input,headers:{'Idempotency-Key':key}})));
 for(const response of responses){assert.equal(response.status,201,response.text);assert.deepEqual(response.body,responses[0].body);noCredentials(response);}
 const saved=responses[0].body.fee,afterFees=(await app.admin.request('/api/fees')).body.fees;
 assert.equal(afterFees.length,beforeFees.length+1);
 assert.equal(afterFees.filter(f=>f.id===saved.id).length,1);
 assert.equal(app.store.feeAudit().length,auditCount+1);
 assert.deepEqual(new Set(responses[0].body.courses.map(c=>c.id)),new Set(input.courseIds));
 for(const before of app.courses){
  const affected=responses[0].body.courses.find(c=>c.id===before.id);
  assert.equal(affected.version,before.version+1);
  assert.equal(affected.fees.filter(f=>f.id===saved.id).length,1);
 }
 const unchanged=await app.admin.request('/api/fees',{method:'POST',body:fee(input.courseIds,{price:999}),headers:{'Idempotency-Key':key}});
 error(unchanged,409);assert.equal(unchanged.body.error.code,'IDEMPOTENCY_CONFLICT');
 assert.deepEqual((await app.admin.request('/api/fees')).body.fees,afterFees);
 assert.equal(app.store.feeAudit().length,auditCount+1);
});

test('idempotency normalization accepts reordered links and trimmed equivalent names without another write',async t=>{
 const app=await adminFixture(t),ids=app.courses.map(c=>c.id),key=randomUUID(),headers={'Idempotency-Key':key};
 const original=await app.admin.request('/api/fees',{method:'POST',body:fee(ids),headers});
 assert.equal(original.status,201,original.text);
 const auditCount=app.store.feeAudit().length;
 const replay=await app.admin.request('/api/fees',{method:'POST',body:fee([...ids].reverse(),{feeName:'  Safely retried tuition  ',category:' Tuition '}),headers});
 assert.equal(replay.status,201,replay.text);
 assert.deepEqual(replay.body,original.body);
 assert.equal(app.store.feeAudit().length,auditCount);
});

test('idempotency keys are isolated by account and route rather than sharing one global response cache',async t=>{
 const app=await adminFixture(t),other=app.client();await other.login(1);
 const key=randomUUID(),headers={'Idempotency-Key':key},ids=app.courses.map(c=>c.id);
 const first=await app.admin.request('/api/fees',{method:'POST',body:fee(ids),headers});
 const second=await other.request('/api/fees',{method:'POST',body:fee(ids,{price:600.02}),headers});
 assert.equal(first.status,201,first.text);assert.equal(second.status,201,second.text);
 assert.notEqual(first.body.fee.id,second.body.fee.id);
 assert.equal(first.body.fee.price,300.01);assert.equal(second.body.fee.price,600.02);
 const createdCourse=await app.admin.request('/api/courses',{method:'POST',body:course({courseName:'Independent route key'}),headers});
 assert.equal(createdCourse.status,201,createdCourse.text);
 const repeatedCourse=await app.admin.request('/api/courses',{method:'POST',body:course({courseName:'Independent route key'}),headers});
 assert.equal(repeatedCourse.status,201,repeatedCourse.text);
 assert.deepEqual(repeatedCourse.body,createdCourse.body);
 assert.equal((await app.admin.request('/api/courses')).body.courses.length,app.courses.length+1);
});

test('a durable idempotency acknowledgement survives process restart and prevents duplicate fee writes',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-idempotency-qa-'));let second;
 t.after(async()=>{await second?.close();await rm(directory,{recursive:true,force:true});});
 const databasePath=join(directory,'idempotency.sqlite'),first=await adminFixture(t,{databasePath});
 const input=fee(first.courses.map(c=>c.id)),headers={'Idempotency-Key':randomUUID()};
 const original=await first.admin.request('/api/fees',{method:'POST',body:input,headers});
 assert.equal(original.status,201,original.text);
 const feesBefore=(await first.admin.request('/api/fees')).body.fees,auditCount=first.store.feeAudit().length;
 await first.close();
 second=await adminFixture(t,{databasePath});
 const replay=await second.admin.request('/api/fees',{method:'POST',body:input,headers});
 assert.equal(replay.status,201,replay.text);assert.deepEqual(replay.body,original.body);
 assert.deepEqual((await second.admin.request('/api/fees')).body.fees,feesBefore);
 assert.equal(second.store.feeAudit().length,auditCount);
});

test('a fee relink acknowledgement includes both newly linked and unlinked course DTOs with the committed versions',async t=>{
 const app=await adminFixture(t),ids=app.courses.map(c=>c.id),input=fee(ids);
 const created=await app.admin.request('/api/fees',{method:'POST',body:input});
 assert.equal(created.status,201,created.text);
 const before=(await app.admin.request('/api/courses')).body.courses;
 const updated=await app.admin.request(`/api/fees/${created.body.fee.id}`,{method:'PATCH',body:fee([ids[0]],{price:425.75,version:created.body.fee.version})});
 assert.equal(updated.status,200,updated.text);
 assert.deepEqual(new Set(updated.body.courses.map(c=>c.id)),new Set(ids));
 const actual=(await app.admin.request('/api/courses')).body.courses;
 for(const dto of updated.body.courses){
  assert.deepEqual(dto,actual.find(c=>c.id===dto.id));
  assert.equal(dto.version,before.find(c=>c.id===dto.id).version+1);
  assert.equal(dto.fees.some(f=>f.id===updated.body.fee.id),dto.id===ids[0]);
 }
});
