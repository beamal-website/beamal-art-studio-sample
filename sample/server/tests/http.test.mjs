import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {origin,users,seedCourses,course,fixture,error,publicUser,noCredentials,serverCourse,grantTeacherAccess} from './helpers.mjs';

test('HTTP health and anonymous session identify shared test mode without exposing accounts',async t=>{
  const app=await fixture(t),anonymous=app.client();
  const health=await anonymous.request('/api/health');
  assert.equal(health.status,200);
  assert.equal(health.body.mode,'shared-test');
  assert.equal(health.headers.get('cache-control'),'no-store');
  assert.equal(health.headers.get('x-content-type-options'),'nosniff');
  assert.equal(health.headers.get('access-control-allow-origin'),origin);
  assert.equal(health.headers.get('access-control-allow-credentials'),'true');
  noCredentials(health);
  for (const user of users) assert.ok(!health.text.includes(user.email));
  const session=await anonymous.request('/api/auth/session');
  assert.equal(session.status,200);
  assert.equal(session.body.user,null);
  noCredentials(session);
  error(await anonymous.request('/api/courses'),401);
});

test('secure deployment cookies allow credentialed Vercel-to-Render requests',async t=>{
  const app=await fixture(t,{secureCookies:true}),client=app.client(),response=await client.request('/api/auth/login',{method:'POST',body:{email:users[0].email,password:users[0].password},csrf:false});
  assert.equal(response.status,200,response.text);const cookie=response.headers.getSetCookie().join('; ');
  assert.match(cookie,/SameSite=None/i);assert.match(cookie,/\bSecure\b/i);assert.match(cookie,/\bHttpOnly\b/i);assert.doesNotMatch(cookie,/;\s*Domain=/i);
});

test('real password verification rejects invalid credentials and returns only the logged-in public identity',async t=>{
  const app=await fixture(t),client=app.client();
  for (const body of [{email:users[0].email,password:'wrong'},{email:'unknown@example.test',password:users[0].password}]) {
    const response=await client.request('/api/auth/login',{method:'POST',body,csrf:false});
    error(response,401);noCredentials(response);
    assert.equal(client.cookies.size,0);
  }
  const login=await client.login();
  publicUser(login.body.user);noCredentials(login);
  for (const cookie of login.headers.getSetCookie()) {
    assert.match(cookie,/;\s*HttpOnly(?:;|$)/i);
    assert.match(cookie,/;\s*SameSite=(?:Lax|Strict)(?:;|$)/i);
  }
  const session=await client.request('/api/auth/session');
  assert.equal(session.body.user.id,login.body.user.id);
  assert.equal(session.body.csrfToken,login.body.csrfToken);
  publicUser(session.body.user);noCredentials(session);
});

test('separate admin and student sessions retain their own identity and logging out does not log out another browser',async t=>{
  const app=await fixture(t),first=app.client(),second=app.client(),student=app.client();
  const firstLogin=await first.login(0),secondLogin=await second.login(1),studentLogin=await student.login(3);
  assert.notEqual(firstLogin.body.user.id,secondLogin.body.user.id);
  assert.notEqual(firstLogin.body.user.id,studentLogin.body.user.id);
  assert.notEqual(firstLogin.body.csrfToken,secondLogin.body.csrfToken);
  const logout=await first.request('/api/auth/logout',{method:'POST'});
  assert.ok([200,204].includes(logout.status),logout.text);
  assert.equal((await first.request('/api/auth/session')).body.user,null);
  error(await first.request('/api/courses'),401);
  assert.equal((await second.request('/api/auth/session')).body.user.id,secondLogin.body.user.id);
  assert.equal((await student.request('/api/auth/session')).body.user.id,studentLogin.body.user.id);
});

test('student visibility and manager-only writes are enforced by HTTP authorization rather than hidden buttons',async t=>{
  const app=await fixture(t),admin=app.client(),teacher=app.client(),student=app.client();
  await admin.login(0);await teacher.login(2);await student.login(3);
  const all=(await admin.request('/api/courses')).body.courses;
  assert.equal(all.length,seedCourses.length);
  await grantTeacherAccess(app,admin,{courses:all.map(item=>item.id)});
  assert.deepEqual((await teacher.request('/api/courses')).body.courses,all);
  assert.deepEqual((await student.request('/api/courses')).body.courses.map(item=>item.courseName),['Published art']);
  for (const client of [teacher,student]) {
    error(await client.request('/api/courses',{method:'POST',body:course(),headers:{'X-User-Role':'admin'}}),403);
    error(await client.request(`/api/courses/${all[0].id}`,{method:'PATCH',body:course({courseName:'Unauthorized rename',version:all[0].version}),headers:{'X-User-Role':'admin'}}),403);
  }
  assert.deepEqual((await admin.request('/api/courses')).body.courses,all);
});

test('mutations require the session CSRF token and an allowed origin; refused requests preserve both data and login',async t=>{
  const app=await fixture(t),client=app.client(),another=app.client();
  await client.login(0);await another.login(1);
  const before=(await client.request('/api/courses')).body.courses;
  for (const options of [{csrf:false},{headers:{'X-CSRF-Token':'wrong-token'}},{headers:{'X-CSRF-Token':another.csrfToken}},{requestOrigin:'https://untrusted.example.test'}]) {
    error(await client.request('/api/courses',{method:'POST',body:course(),...options}),403);
    error(await client.request(`/api/courses/${before[0].id}`,{method:'PATCH',body:course({version:before[0].version}),...options}),403);
    error(await client.request('/api/auth/logout',{method:'POST',...options}),403);
  }
  assert.deepEqual((await client.request('/api/courses')).body.courses,before);
  assert.equal((await client.request('/api/auth/session')).body.user.email,users[0].email);
  const outsider=app.client();
  error(await outsider.request('/api/auth/login',{method:'POST',body:{email:users[0].email,password:users[0].password},requestOrigin:'https://untrusted.example.test',csrf:false}),403);
  assert.equal(outsider.cookies.size,0);
});

test('two logged-in managers share course creation and editing while server identity and creation time stay stable',async t=>{
  const app=await fixture(t),first=app.client(),second=app.client();
  await first.login(0);await second.login(1);
  const added=await first.request('/api/courses',{method:'POST',body:course({bookingExpiry:{value:3,unit:'months'},onlineStore:true})});
  assert.equal(added.status,201,added.text);serverCourse(added.body.course);noCredentials(added);
  const saved=added.body.course;
  assert.equal(saved.version,1);
  assert.deepEqual((await second.request('/api/courses')).body.courses.find(item=>item.id===saved.id),saved);
  const updated=await second.request(`/api/courses/${saved.id}`,{method:'PATCH',body:course({courseName:'Shared updated title',price:375,version:saved.version})});
  assert.equal(updated.status,200,updated.text);serverCourse(updated.body.course);
  assert.equal(updated.body.course.id,saved.id);
  assert.equal(updated.body.course.courseCode,saved.courseCode);
  assert.equal(updated.body.course.createdAt,saved.createdAt);
  assert.equal(updated.body.course.version,saved.version+1);
  assert.equal(updated.body.course.price,375);
  assert.deepEqual((await first.request('/api/courses')).body.courses.find(item=>item.id===saved.id),updated.body.course);
});

test('all pricing models round-trip decimal money and preserve their actual charging fields',async t=>{
  const app=await fixture(t),client=app.client();await client.login();
  const fixtures=[
    course({courseName:'Per lesson',price:0.1,duration:45,months:2}),
    course({courseName:'Fixed month',pricingModel:'fixed-monthly',price:850.25,months:24}),
    course({courseName:'Visit package',pricingModel:'package',price:1200.99,packageType:'visits',packageTotal:4}),
    course({courseName:'Minute package',pricingModel:'package',price:10.01,packageType:'minutes',packageTotal:240}),
  ];
  for (const input of fixtures) {
    const response=await client.request('/api/courses',{method:'POST',body:input});
    assert.equal(response.status,201,response.text);
    const saved=response.body.course;serverCourse(saved);
    assert.equal(saved.price,input.price);
    assert.equal(saved.pricingModel,input.pricingModel);
    const reloaded=(await client.request('/api/courses')).body.courses.find(item=>item.id===saved.id);
    assert.equal(reloaded.price,input.price);
    if(input.pricingModel==='monthly-lessons') assert.equal(reloaded.duration,input.duration);
    if(input.pricingModel==='package') {
      assert.equal(reloaded.packageTotal,input.packageTotal);
      assert.equal(reloaded.packageType,input.packageType);
    } else assert.equal(reloaded.months,input.months);
  }
  const legacy=await client.request('/api/courses',{method:'POST',body:course({courseName:'Legacy lessons package',pricingModel:'package',price:1200,packageType:'lessons',packageTotal:4})});
  assert.equal(legacy.status,201,legacy.text);
  assert.equal(legacy.body.course.packageType,'visits');
  assert.equal(legacy.body.course.packageTotal,4);
});

test('invalid course creates and edits never persist partial records, advance versions, or change valid prices',async t=>{
  const app=await fixture(t),client=app.client();await client.login();
  const good=(await client.request('/api/courses',{method:'POST',body:course()})).body.course;
  const before=(await client.request('/api/courses')).body.courses;
  const invalid=[
    {courseName:''},{feeName:' '},{pricingModel:'unknown'},{price:0},{price:-1},{price:null},{price:1.005},{price:1e-9},
    {duration:0},{duration:1.5},{months:0},{months:25},
    {pricingModel:'package',packageType:'unknown',packageTotal:4},
    {pricingModel:'package',packageType:'visits',packageTotal:0},
    {pricingModel:'package',packageType:'minutes',packageTotal:1.5},
    {bookingExpiry:{value:0,unit:'days'}},{bookingExpiry:{value:2,unit:'years'}},
  ];
  for (const fields of invalid) {
    const create=await client.request('/api/courses',{method:'POST',body:course(fields)});
    error(create,400);
    const edit=await client.request(`/api/courses/${good.id}`,{method:'PATCH',body:course({...fields,version:good.version})});
    error(edit,400);
    assert.deepEqual((await client.request('/api/courses')).body.courses,before,JSON.stringify(fields));
  }
});

test('missing and stale versions reject edits and two simultaneous editors cannot silently overwrite each other',async t=>{
  const app=await fixture(t),first=app.client(),second=app.client();await first.login(0);await second.login(1);
  const saved=(await first.request('/api/courses',{method:'POST',body:course()})).body.course;
  error(await first.request(`/api/courses/${saved.id}`,{method:'PATCH',body:course({courseName:'Missing version'})}),409);
  const results=await Promise.all([
    first.request(`/api/courses/${saved.id}`,{method:'PATCH',body:course({courseName:'First editor',version:saved.version})}),
    second.request(`/api/courses/${saved.id}`,{method:'PATCH',body:course({courseName:'Second editor',version:saved.version})}),
  ]);
  assert.deepEqual(results.map(item=>item.status).sort(),[200,409]);
  const winner=results.find(item=>item.status===200).body.course;
  error(results.find(item=>item.status===409),409);
  assert.equal(winner.version,saved.version+1);
  error(await second.request(`/api/courses/${saved.id}`,{method:'PATCH',body:course({courseName:'Outdated late edit',version:saved.version})}),409);
  assert.deepEqual((await first.request('/api/courses')).body.courses.find(item=>item.id===saved.id),winner);
});

test('concurrent course creations allocate distinct server IDs and case-insensitively unique course codes',async t=>{
  const app=await fixture(t),first=app.client(),second=app.client();await first.login(0);await second.login(1);
  const count=20;
  const results=await Promise.all(Array.from({length:count},(_,index)=>(index%2?first:second).request('/api/courses',{method:'POST',body:course({courseName:`Concurrent course ${index}`})})));
  for(const result of results) {assert.equal(result.status,201,result.text);serverCourse(result.body.course);}
  const saved=(await first.request('/api/courses')).body.courses;
  assert.equal(saved.length,seedCourses.length+count);
  assert.equal(new Set(saved.map(item=>item.id)).size,saved.length);
  assert.equal(new Set(saved.map(item=>item.courseCode.toLowerCase())).size,saved.length);
  assert.deepEqual(new Set(saved.filter(item=>item.courseName.startsWith('Concurrent course ')).map(item=>item.courseName)),new Set(Array.from({length:count},(_,index)=>`Concurrent course ${index}`)));
});

test('malformed request JSON fails safely and authenticated read responses do not leak credentials',async t=>{
  const app=await fixture(t),client=app.client();await client.login();
  const before=await client.request('/api/courses');noCredentials(before);
  const malformed=await client.request('/api/courses',{method:'POST',rawBody:'{"courseName":'});
  error(malformed,400);noCredentials(malformed);
  assert.deepEqual((await client.request('/api/courses')).body.courses,before.body.courses);
  const session=await client.request('/api/auth/session');publicUser(session.body.user);noCredentials(session);
});

test('file-backed storage survives server restart without duplicating seeds or changing user and course identity',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'beamal-http-qa-'));
  let second;
  t.after(async()=>{await second?.close();await rm(directory,{recursive:true,force:true});});
  const databasePath=join(directory,'shared.sqlite');
  const first=await fixture(t,{databasePath}),firstClient=first.client();
  const login=await firstClient.login();
  const saved=(await firstClient.request('/api/courses',{method:'POST',body:course({price:99.99,onlineStore:true})})).body.course;
  const edited=await firstClient.request(`/api/courses/${saved.id}`,{method:'PATCH',body:course({price:100.01,onlineStore:true,version:saved.version})});
  assert.equal(edited.status,200,edited.text);
  const before=(await firstClient.request('/api/courses')).body.courses;
  await first.close();
  const stored=(await readFile(databasePath)).toString('utf8');
  for(const {password} of users) assert.ok(!stored.includes(password),'A plaintext account password was written to the database');
  second=await fixture(t,{databasePath});
  const secondClient=second.client();
  assert.equal((await secondClient.login()).body.user.id,login.body.user.id);
  const after=(await secondClient.request('/api/courses')).body.courses;
  assert.deepEqual(after,before);
  assert.equal(after.length,seedCourses.length+1);
  const student=second.client();await student.login(3);
  assert.equal((await student.request('/api/courses')).body.courses.length,2);
});
