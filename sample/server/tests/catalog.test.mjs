import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fixture,error,course,noCredentials,grantTeacherAccess} from './helpers.mjs';

const pricingFields=['feeName','pricingModel','price','months','duration','packageType','packageTotal','bookingExpiry','onlineStore'];
function expandedCourse(compact,canonicalFees){
 const fees=compact.feeIds.map(id=>{const found=canonicalFees.find(f=>f.id===id);assert.ok(found,`Missing linked fee ${id}`);return found});
 return {...compact,...(fees[0]?Object.fromEntries(pricingFields.filter(key=>Object.hasOwn(fees[0],key)).map(key=>[key,fees[0][key]])):{feeName:''}),fees};
}
async function catalog(client,since){
 const response=await client.request('/api/catalog'+(since===undefined?'':`?since=${encodeURIComponent(since)}`));
 assert.equal(response.status,200,response.text);noCredentials(response);
 assert.match(response.body.revision,/^[a-f0-9]{64}$/);
 return response.body;
}

test('catalog authentication and role scope agree with existing course and fee DTOs without nested pricing duplication',async t=>{
 const app=await fixture(t),anonymous=app.client();error(await anonymous.request('/api/catalog'),401);
 const admin=app.client();await admin.login();await grantTeacherAccess(app,admin,{courses:['public-course','private-course']});
 for(const index of [0,2,3]){
  const client=app.client();await client.login(index);
  const full=await catalog(client),oldCourses=(await client.request('/api/courses')).body.courses,oldFees=(await client.request('/api/fees')).body.fees;
  assert.deepEqual(full.fees,oldFees);
  assert.deepEqual(full.courses.map(c=>expandedCourse(c,full.fees)),oldCourses);
  for(const record of full.courses){
   assert.ok(Array.isArray(record.feeIds));assert.equal(new Set(record.feeIds).size,record.feeIds.length);
   for(const field of ['fees',...pricingFields])assert.equal(Object.hasOwn(record,field),false,`${field} must stay in the canonical fee records`);
  }
  const unchanged=await catalog(client,full.revision);
  assert.deepEqual(unchanged,{revision:full.revision,unchanged:true});
  if(index===3){assert.deepEqual(full.courses.map(c=>c.courseName),['Published art']);assert.ok(full.fees.every(f=>f.onlineStore));}
 }
});

test('catalog revision changes after course and fee edits but not after an idempotent replay',async t=>{
 const app=await fixture(t),client=app.client();await client.login();
 const original=await catalog(client),input=course({courseName:'Catalog added course'}),headers={'Idempotency-Key':randomUUID()};
 const created=await client.request('/api/courses',{method:'POST',body:input,headers});assert.equal(created.status,201,created.text);
 const afterCreate=await catalog(client,original.revision);
 assert.notEqual(afterCreate.revision,original.revision);assert.equal(afterCreate.unchanged,undefined);
 assert.ok(afterCreate.courses.some(c=>c.id===created.body.course.id));
 const replay=await client.request('/api/courses',{method:'POST',body:input,headers});assert.equal(replay.status,201,replay.text);
 assert.deepEqual(await catalog(client,afterCreate.revision),{revision:afterCreate.revision,unchanged:true});
 const edited=await client.request(`/api/courses/${created.body.course.id}`,{method:'PATCH',body:{courseName:'Catalog renamed course',version:created.body.course.version}});assert.equal(edited.status,200,edited.text);
 const afterMetadata=await catalog(client,afterCreate.revision);assert.notEqual(afterMetadata.revision,afterCreate.revision);
 assert.equal(afterMetadata.courses.find(c=>c.id===edited.body.course.id).courseName,'Catalog renamed course');
 const primary=afterMetadata.fees.find(f=>f.id===edited.body.course.feeIds[0]);
 const feeEdited=await client.request(`/api/fees/${primary.id}`,{method:'PATCH',body:{price:425.75,version:primary.version}});assert.equal(feeEdited.status,200,feeEdited.text);
 const afterFee=await catalog(client,afterMetadata.revision);assert.notEqual(afterFee.revision,afterMetadata.revision);
 assert.equal(afterFee.fees.find(f=>f.id===primary.id).price,425.75);
 assert.deepEqual(afterFee.courses.map(c=>expandedCourse(c,afterFee.fees)),(await client.request('/api/courses')).body.courses);
});

test('catalog revision reflects student visibility and relinking while empty-fee courses reconstruct consistently',async t=>{
 const app=await fixture(t),admin=app.client(),student=app.client();await admin.login(0);await student.login(3);
 const originalAdmin=await catalog(admin),originalStudent=await catalog(student),published=originalAdmin.courses.find(c=>c.courseName==='Published art'),internal=originalAdmin.courses.find(c=>c.courseName==='Internal art');
 const primary=originalAdmin.fees.find(f=>f.id===published.feeIds[0]);
 const changed=await admin.request(`/api/fees/${primary.id}`,{method:'PATCH',body:{courseIds:[internal.id],onlineStore:false,version:primary.version}});assert.equal(changed.status,200,changed.text);
 const studentAfter=await catalog(student,originalStudent.revision);assert.notEqual(studentAfter.revision,originalStudent.revision);
 assert.deepEqual(studentAfter.courses,[]);assert.deepEqual(studentAfter.fees,[]);
 const adminAfter=await catalog(admin,originalAdmin.revision);assert.notEqual(adminAfter.revision,originalAdmin.revision);
 assert.deepEqual(adminAfter.courses.find(c=>c.id===published.id).feeIds,[]);
 assert.deepEqual(adminAfter.courses.map(c=>expandedCourse(c,adminAfter.fees)),(await admin.request('/api/courses')).body.courses);
});

test('catalog revisions and canonical records remain deterministic after a file-backed server restart',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-catalog-qa-'));let second;
 t.after(async()=>{await second?.close();await rm(directory,{recursive:true,force:true});});
 const databasePath=join(directory,'catalog.sqlite'),first=await fixture(t,{databasePath}),admin=first.client();await admin.login();
 const created=await admin.request('/api/courses',{method:'POST',body:course({courseName:'Restart catalog'})});assert.equal(created.status,201,created.text);
 const before=await catalog(admin);await first.close();
 second=await fixture(t,{databasePath});const reader=second.client();await reader.login();
 assert.deepEqual(await catalog(reader),before);
 assert.deepEqual(await catalog(reader,before.revision),{revision:before.revision,unchanged:true});
});

test('course, fee and catalog reads use bounded batches instead of a separate database query per record',async t=>{
 const records=Array.from({length:80},(_,index)=>({id:`batch-course-${index}`,...course({courseName:`Batch course ${index}`,onlineStore:index%2===0})}));
 const app=await fixture(t,{seedCourses:records}),prepare=DatabaseSync.prototype.prepare;
 let selects=0;
 DatabaseSync.prototype.prepare=function(sql){if(/^\s*SELECT\b/i.test(sql))selects++;return prepare.call(this,sql)};
 try{
  selects=0;const courses=app.store.listCourses();assert.equal(courses.length,80);assert.ok(selects<=3,`Course read used ${selects} SELECTs for 80 rows`);
  selects=0;const fees=app.store.listFees();assert.equal(fees.length,80);assert.ok(selects<=2,`Fee read used ${selects} SELECTs for 80 rows`);
  selects=0;const full=app.store.catalogSnapshot();assert.equal(full.courses.length,80);assert.equal(full.fees.length,80);assert.ok(selects<=5,`Full catalog used ${selects} SELECTs for 80 rows`);
  selects=0;const unchanged=app.store.catalogSnapshot({since:full.revision});assert.deepEqual(unchanged,{revision:full.revision,unchanged:true});assert.ok(selects<=2,`Unchanged catalog used ${selects} SELECTs for 80 rows`);
 }finally{DatabaseSync.prototype.prepare=prepare;}
});
