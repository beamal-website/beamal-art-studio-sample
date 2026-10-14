import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,error,noCredentials,course} from './helpers.mjs';

function fee(courseIds,overrides={}) {
  return {feeName:'Shared tuition',category:'Tuition fee',pricingModel:'monthly-lessons',price:300,duration:60,months:1,bookingExpiry:null,onlineStore:false,courseIds,...overrides};
}

function feePatch(saved,overrides={}) {
  const fields=['feeName','category','pricingModel','price','months','duration','packageType','packageTotal','bookingExpiry','onlineStore','courseIds','version'];
  return {...Object.fromEntries(fields.filter(key=>Object.hasOwn(saved,key)).map(key=>[key,saved[key]])),...overrides};
}

function serverFee(saved) {
  assert.equal(typeof saved.id,'string');assert.ok(saved.id);
  assert.equal(typeof saved.feeCode,'string');assert.ok(saved.feeCode);
  assert.ok(Number.isInteger(saved.version)&&saved.version>=1);
  assert.ok(Number.isFinite(Date.parse(saved.createdAt)));
  assert.ok(Number.isFinite(Date.parse(saved.updatedAt)));
  assert.ok(Array.isArray(saved.courseIds));
  assert.equal(new Set(saved.courseIds).size,saved.courseIds.length);
}

async function state(client) {
  const [courses,fees]=await Promise.all([client.request('/api/courses'),client.request('/api/fees')]);
  assert.equal(courses.status,200,courses.text);assert.equal(fees.status,200,fees.text);
  noCredentials(courses);noCredentials(fees);
  return {courses:courses.body.courses,fees:fees.body.fees};
}

async function manager(t) {
  const application=await fixture(t),client=application.client();await client.login(0);
  return {...application,admin:client};
}

test('Fees API independently enforces authentication, manager roles, CSRF and origin without partial writes',async t=>{
  const app=await manager(t),anonymous=app.client(),teacher=app.client(),student=app.client();
  error(await anonymous.request('/api/fees'),401);
  await teacher.login(2);await student.login(3);
  const before=await state(app.admin),ids=before.courses.map(item=>item.id);
  assert.equal((await teacher.request('/api/fees')).status,200);
  for (const client of [teacher,student]) {
    error(await client.request('/api/fees',{method:'POST',body:fee(ids),headers:{'X-User-Role':'admin'}}),403);
    const saved=before.fees[0];
    error(await client.request(`/api/fees/${saved.id}`,{method:'PATCH',body:feePatch(saved,{feeName:'Unauthorized edit'}),headers:{'X-User-Role':'admin'}}),403);
  }
  for(const options of [{csrf:false},{headers:{'X-CSRF-Token':'invalid'}},{requestOrigin:'https://untrusted.example.test'}]) {
    error(await app.admin.request('/api/fees',{method:'POST',body:fee(ids),...options}),403);
    const saved=before.fees[0];
    error(await app.admin.request(`/api/fees/${saved.id}`,{method:'PATCH',body:feePatch(saved,{feeName:'Refused edit'}),...options}),403);
  }
  assert.deepEqual(await state(app.admin),before);
});

test('one fee links to two courses and one course has multiple fees while legacy primary pricing remains available',async t=>{
  const app=await manager(t),before=await state(app.admin),ids=before.courses.map(item=>item.id);
  const response=await app.admin.request('/api/fees',{method:'POST',body:fee(ids)});
  assert.equal(response.status,201,response.text);serverFee(response.body.fee);
  const shared=response.body.fee;
  assert.deepEqual(new Set(shared.courseIds),new Set(ids));
  const firstOnly=await app.admin.request('/api/fees',{method:'POST',body:fee([ids[0]],{feeName:'First course materials',pricingModel:'package',price:200,packageType:'visits',packageTotal:4,category:'Materials'})});
  assert.equal(firstOnly.status,201,firstOnly.text);serverFee(firstOnly.body.fee);
  const after=await state(app.admin);
  assert.equal(after.fees.length,before.fees.length+2);
  for (const previous of before.courses) {
    const saved=after.courses.find(item=>item.id===previous.id);
    assert.ok(saved.feeIds.includes(shared.id));
    assert.deepEqual(saved.fees.find(item=>item.id===shared.id),shared);
    assert.equal(saved.fees.length,previous.fees.length+(previous.id===ids[0]?2:1));
    assert.equal(saved.feeName,previous.feeName);
    assert.equal(saved.price,previous.price);
    assert.equal(saved.pricingModel,previous.pricingModel);
  }
});

test('fee category is distinct from course category and metadata-only course edits never rewrite any linked fee',async t=>{
  const app=await manager(t),initial=await state(app.admin),ids=initial.courses.map(item=>item.id);
  const added=await app.admin.request('/api/fees',{method:'POST',body:fee(ids,{category:'Membership fees'})});
  assert.equal(added.status,201,added.text);
  const before=await state(app.admin),saved=before.courses[0];
  const edited=await app.admin.request(`/api/courses/${saved.id}`,{method:'PATCH',body:{courseName:'Course metadata changed',category:'Painting course category',level:'Intermediate',version:saved.version}});
  assert.equal(edited.status,200,edited.text);
  assert.equal(edited.body.course.category,'Painting course category');
  assert.equal(edited.body.course.level,'Intermediate');
  assert.equal(edited.body.course.version,saved.version+1);
  const after=await state(app.admin);
  assert.deepEqual(after.fees,before.fees);
  assert.deepEqual(edited.body.course.fees,saved.fees);
  assert.equal(edited.body.course.fees.find(item=>item.id===added.body.fee.id).category,'Membership fees');
  assert.deepEqual(after.courses.find(item=>item.id===before.courses[1].id),before.courses[1]);
});

test('editing a shared fee updates both courses and their versions in another manager session without changing primary fees',async t=>{
  const app=await manager(t),other=app.client();await other.login(1);
  const initial=await state(app.admin),ids=initial.courses.map(item=>item.id);
  const added=await app.admin.request('/api/fees',{method:'POST',body:fee(ids)});
  assert.equal(added.status,201,added.text);
  const saved=added.body.fee,before=await state(other);
  const updated=await other.request(`/api/fees/${saved.id}`,{method:'PATCH',body:feePatch(saved,{feeName:'Shared revised fee',price:425.75,category:'Revised fee category'})});
  assert.equal(updated.status,200,updated.text);serverFee(updated.body.fee);
  assert.equal(updated.body.fee.id,saved.id);
  assert.equal(updated.body.fee.feeCode,saved.feeCode);
  assert.equal(updated.body.fee.createdAt,saved.createdAt);
  assert.equal(updated.body.fee.version,saved.version+1);
  const after=await state(app.admin);
  for(const previous of before.courses) {
    const reloaded=after.courses.find(item=>item.id===previous.id);
    assert.equal(reloaded.version,previous.version+1);
    assert.deepEqual(reloaded.fees.find(item=>item.id===saved.id),updated.body.fee);
    assert.equal(reloaded.price,previous.price);
    assert.equal(reloaded.feeName,previous.feeName);
    assert.equal(reloaded.category,previous.category);
  }
});

test('editing a primary fee updates the legacy course pricing projection while preserving course metadata',async t=>{
  const app=await manager(t),before=await state(app.admin),saved=before.courses[0],primary=saved.fees[0];
  const response=await app.admin.request(`/api/fees/${primary.id}`,{method:'PATCH',body:feePatch(primary,{feeName:'Legacy primary revised',price:1000.01,category:'Separate fee category'})});
  assert.equal(response.status,200,response.text);
  const after=await state(app.admin),updated=after.courses.find(item=>item.id===saved.id);
  assert.equal(updated.feeName,'Legacy primary revised');assert.equal(updated.price,1000.01);
  assert.equal(updated.category,saved.category);
  assert.equal(updated.courseName,saved.courseName);
  assert.equal(updated.fees[0].category,'Separate fee category');
  assert.equal(updated.version,saved.version+1);
  assert.deepEqual(after.courses.find(item=>item.id===before.courses[1].id),before.courses[1]);
});

test('legacy combined course editing remains connected to its actual primary fee',async t=>{
  const app=await manager(t),before=await state(app.admin),saved=before.courses[0],primary=saved.fees[0];
  const response=await app.admin.request(`/api/courses/${saved.id}`,{method:'PATCH',body:{courseName:'Legacy combined title',category:'Course category kept separate',feeName:'Legacy combined fee',price:1499.99,pricingModel:'package',packageType:'visits',packageTotal:8,bookingExpiry:{value:2,unit:'months'},onlineStore:true,version:saved.version}});
  assert.equal(response.status,200,response.text);
  const updated=response.body.course,after=await state(app.admin),feeAfter=after.fees.find(item=>item.id===primary.id);
  assert.equal(updated.id,saved.id);assert.equal(updated.courseCode,saved.courseCode);
  assert.equal(updated.version,saved.version+1);
  assert.equal(updated.price,1499.99);assert.equal(updated.feeName,'Legacy combined fee');
  assert.equal(feeAfter.price,1499.99);assert.equal(feeAfter.packageTotal,8);
  assert.equal(feeAfter.version,primary.version+1);
  assert.equal(feeAfter.category,primary.category);
  assert.equal(updated.category,'Course category kept separate');
  assert.deepEqual(updated.fees.find(item=>item.id===primary.id),feeAfter);
});

test('duplicate, missing or unknown fee-course links and invalid prices are rejected atomically on create and edit',async t=>{
  const app=await manager(t),initial=await state(app.admin),ids=initial.courses.map(item=>item.id);
  const added=await app.admin.request('/api/fees',{method:'POST',body:fee(ids)});
  assert.equal(added.status,201,added.text);
  const saved=added.body.fee,before=await state(app.admin);
  const invalid=[{courseIds:[ids[0],ids[0]]},{courseIds:['missing-course']},{courseIds:[ids[0],'missing-course']},{courseIds:[]},{courseIds:ids[0]},{courseIds:[null]},{courseIds:undefined},{price:0},{price:1.005},{price:1e-9},{category:{text:'invalid'}},{months:25}];
  for(const fields of invalid) {
    error(await app.admin.request('/api/fees',{method:'POST',body:fee(ids,fields)}),400);
    const edit=feePatch(saved,fields);
    // PATCH omission preserves an existing link set; undefined in a partial edit is not an invalid replacement.
    if(fields.courseIds!==undefined||!Object.hasOwn(fields,'courseIds')) error(await app.admin.request(`/api/fees/${saved.id}`,{method:'PATCH',body:edit}),400);
    assert.deepEqual(await state(app.admin),before,JSON.stringify(fields));
  }
});

test('fee stale versions and concurrent edits prevent lost updates in both fee records and linked course projections',async t=>{
  const app=await manager(t),other=app.client();await other.login(1);
  const initial=await state(app.admin),ids=initial.courses.map(item=>item.id);
  const added=await app.admin.request('/api/fees',{method:'POST',body:fee(ids)});
  assert.equal(added.status,201,added.text);
  const saved=added.body.fee,before=await state(app.admin),withoutVersion=feePatch(saved);delete withoutVersion.version;
  error(await app.admin.request(`/api/fees/${saved.id}`,{method:'PATCH',body:withoutVersion}),409);
  const results=await Promise.all([
    app.admin.request(`/api/fees/${saved.id}`,{method:'PATCH',body:feePatch(saved,{price:350})}),
    other.request(`/api/fees/${saved.id}`,{method:'PATCH',body:feePatch(saved,{price:450})}),
  ]);
  assert.deepEqual(results.map(item=>item.status).sort(),[200,409]);
  const winner=results.find(item=>item.status===200).body.fee;
  error(results.find(item=>item.status===409),409);
  error(await other.request(`/api/fees/${saved.id}`,{method:'PATCH',body:feePatch(saved,{price:999})}),409);
  const after=await state(app.admin);
  assert.deepEqual(after.fees.find(item=>item.id===saved.id),winner);
  assert.equal(winner.version,saved.version+1);
  for(const previous of before.courses) {
    const updated=after.courses.find(item=>item.id===previous.id);
    assert.equal(updated.version,previous.version+1);
    assert.deepEqual(updated.fees.find(item=>item.id===saved.id),winner);
  }
});

test('independent fee creation allocates unique codes and never invents extra courses',async t=>{
  const app=await manager(t),before=await state(app.admin),ids=before.courses.map(item=>item.id);
  const responses=await Promise.all(Array.from({length:10},(_,index)=>app.admin.request('/api/fees',{method:'POST',body:fee(ids,{feeName:`Concurrent fee ${index}`})})));
  for(const response of responses){assert.equal(response.status,201,response.text);serverFee(response.body.fee);}
  const after=await state(app.admin);
  assert.equal(after.courses.length,before.courses.length);
  assert.equal(after.fees.length,before.fees.length+10);
  assert.equal(new Set(after.fees.map(item=>item.id)).size,after.fees.length);
  assert.equal(new Set(after.fees.map(item=>item.feeCode.toLowerCase())).size,after.fees.length);
  for(const saved of after.courses) assert.equal(saved.fees.length,before.courses.find(item=>item.id===saved.id).fees.length+10);
});

test('moving the last linked fee leaves a valid zero-fee course with no stale legacy price',async t=>{
  const app=await manager(t),before=await state(app.admin),source=before.courses[0],destination=before.courses[1],primary=source.fees[0];
  assert.equal(source.fees.length,1);
  const moved=await app.admin.request(`/api/fees/${primary.id}`,{method:'PATCH',body:feePatch(primary,{courseIds:[destination.id]})});
  assert.equal(moved.status,200,moved.text);
  assert.deepEqual(moved.body.fee.courseIds,[destination.id]);
  const after=await state(app.admin),empty=after.courses.find(item=>item.id===source.id),joined=after.courses.find(item=>item.id===destination.id);
  assert.deepEqual(empty.fees,[]);assert.deepEqual(empty.feeIds,[]);
  for(const key of ['feeName','price','pricingModel','months','duration','packageType','packageTotal','bookingExpiry']) assert.ok(empty[key]===undefined||empty[key]===null||empty[key]==='',`Stale fee field ${key}: ${empty[key]}`);
  assert.equal(empty.courseName,source.courseName);assert.equal(empty.category,source.category);
  assert.equal(empty.version,source.version+1);
  assert.equal(joined.version,destination.version+1);
  assert.equal(joined.fees.length,destination.fees.length+1);
  assert.deepEqual(joined.fees.find(item=>item.id===primary.id),moved.body.fee);
  assert.equal(after.fees.length,before.fees.length);
});

test('course names are unique after trimming and case folding and rejected duplicates leave courses and fees intact',async t=>{
  const app=await manager(t),before=await state(app.admin),source=before.courses[0],other=before.courses[1];
  error(await app.admin.request('/api/courses',{method:'POST',body:course({courseName:`  ${source.courseName.toUpperCase()}  `})}),409);
  error(await app.admin.request(`/api/courses/${other.id}`,{method:'PATCH',body:{courseName:source.courseName.toUpperCase(),version:other.version}}),409);
  // The compatibility edit also carries fee changes; a name collision must undo those changes.
  error(await app.admin.request(`/api/courses/${other.id}`,{method:'PATCH',body:course({courseName:` ${source.courseName} `,feeName:'Must not be saved',price:888.88,version:other.version})}),409);
  assert.deepEqual(await state(app.admin),before);
  const valid=await app.admin.request('/api/courses',{method:'POST',body:course({courseName:'A genuinely different course'})});
  assert.equal(valid.status,201,valid.text);
});

test('two simultaneous requests for the same normalized course name create exactly one course and one fee',async t=>{
  const app=await manager(t),other=app.client();await other.login(1);
  const before=await state(app.admin);
  const results=await Promise.all([
    app.admin.request('/api/courses',{method:'POST',body:course({courseName:'Shared duplicate race'})}),
    other.request('/api/courses',{method:'POST',body:course({courseName:'  SHARED DUPLICATE RACE  '})}),
  ]);
  assert.deepEqual(results.map(item=>item.status).sort(),[201,409]);
  error(results.find(item=>item.status===409),409);
  const winner=results.find(item=>item.status===201).body.course,after=await state(app.admin);
  assert.equal(after.courses.length,before.courses.length+1);
  assert.equal(after.fees.length,before.fees.length+1);
  assert.deepEqual(after.courses.find(item=>item.id===winner.id),winner);
  assert.equal(after.courses.filter(item=>item.courseName.trim().toLowerCase()==='shared duplicate race').length,1);
});
