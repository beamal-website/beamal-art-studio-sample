import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, ApiError } from '../client/api-client.js';

test('course lifecycle requests preserve version, authenticated headers and operation keys without resending course or fee data',async t=>{
 const wire=network(t),client=createApiClient();await login(client,wire,'B');
 const current={id:'fictional-course / 一',version:7,courseName:'Preserved course',fees:[{price:300}]},path='/api/courses/'+encodeURIComponent(current.id),deleted={...current,version:8,deletedAt:'2026-10-14T02:00:00Z'};
 wire.reply(path,{course:deleted});assert.deepEqual((await client.deleteCourse(current,'fictional-delete-course-key')).course,deleted);
 let call=wire.calls.at(-1);assert.equal(call.method,'DELETE');assert.deepEqual(JSON.parse(call.body),{version:7});assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');assert.equal(call.headers.get('Idempotency-Key'),'fictional-delete-course-key');assert.equal(call.credentials,'same-origin');
 const restored={...current,version:9};wire.reply(path+'/restore',{course:restored});assert.deepEqual((await client.restoreCourse(deleted,'fictional-restore-course-key')).course,restored);
 call=wire.calls.at(-1);assert.equal(call.method,'POST');assert.deepEqual(JSON.parse(call.body),{version:8});assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');assert.equal(call.headers.get('Idempotency-Key'),'fictional-restore-course-key');assert.equal(call.credentials,'same-origin');
 wire.reply(path,{error:{code:'COURSE_HAS_SCHEDULES',message:'The course still has schedules.'}},409);
 await assert.rejects(client.deleteCourse(restored,'fictional-scheduled-course-key'),error=>error instanceof ApiError&&error.status===409&&error.code==='COURSE_HAS_SCHEDULES');
});

const identity = name => ({ id: `fictional-${name}`, email: `${name}@example.test`, displayName: `Fictional ${name}`, role: 'admin' });
const session = name => ({ user: identity(name), csrfToken: `csrf-fictional-${name}` });
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const deferred = () => { let resolve; const promise = new Promise(accept => { resolve = accept; }); return { promise, resolve }; };
const flush = () => new Promise(resolve => setImmediate(resolve));
const observe = promise => promise.then(value => ({ fulfilled: true, value }), error => ({ fulfilled: false, error }));
const superseded = outcome => {
  assert.equal(outcome.fulfilled, false, 'A superseded request must not return a value that a caller could apply.');
  assert.ok(outcome.error instanceof ApiError);
  assert.equal(outcome.error.code, 'AUTH_SUPERSEDED');
};

function network(t) {
  const previous = globalThis.fetch, queue = [], calls = [];
  globalThis.fetch = async (path, options) => {
    const next = queue.shift();
    assert.ok(next, `Unexpected fictional fetch: ${path}`);
    if(typeof next.path==='function')next.path(path);else assert.equal(path, next.path);
    const call = { path, method: options.method, credentials: options.credentials, headers: new Headers(options.headers), body: options.body };
    calls.push(call);
    return typeof next.result === 'function' ? next.result(call) : next.result;
  };
  t.after(() => { globalThis.fetch = previous; });
  return {
    calls,
    reply(path, data, status = 200) { queue.push({ path, result: response(data, status) }); },
    pending(path) { const wait = deferred(); queue.push({ path, result: wait.promise }); return wait; },
    handler(path, result) { queue.push({ path, result }); },
  };
}

async function login(client, wire, name) {
  wire.reply('/api/auth/login', session(name));
  return client.login(`${name}@example.test`, `FictionalPassword-${name}`);
}

async function save(client, wire, name = 'B') {
  wire.reply('/api/courses/fictional-course/materials', { material: { id: 'fictional-note', name: `Fictional ${name} note` } }, 201);
  const result = await client.saveMaterial('fictional-course', { name: `Fictional ${name} note` }, null, 'fictional-save-key');
  const call = wire.calls.at(-1);
  assert.equal(call.headers.get('X-CSRF-Token'), `csrf-fictional-${name}`);
  assert.equal(call.headers.get('Idempotency-Key'), 'fictional-save-key');
  assert.equal(call.credentials, 'same-origin');
  return result;
}

test('current login keeps its CSRF and stable operation key in the next material save', async t => {
  const wire = network(t), client = createApiClient();
  assert.deepEqual((await login(client, wire, 'B')).user, identity('B'));
  assert.equal((await save(client, wire)).material.name, 'Fictional B note');
});

test('late A session cannot overwrite B CSRF or return an old identity for application', async t => {
  const wire = network(t), client = createApiClient(), applied = [];
  await login(client, wire, 'A');
  const wait = wire.pending('/api/auth/session');
  const old = observe(client.session().then(data => { applied.push(data.user); return data; }));
  await login(client, wire, 'B');
  wait.resolve(response(session('A')));
  const outcome = await old;
  await save(client, wire);
  superseded(outcome);
  assert.deepEqual(applied, []);
});

test('B login waits for pending A logout acknowledgement so a late logout cannot clear B cookie or CSRF', async t => {
  const wire = network(t), client = createApiClient();
  let virtualCookie = 'fictional-cookie-A';
  await login(client, wire, 'A');
  const wait = wire.pending('/api/auth/logout'), old = observe(client.logout());
  await flush();
  const logoutCall = wire.calls.find(call => call.path === '/api/auth/logout');
  wire.reply('/api/catalog', { error: { code: 'AUTH_REQUIRED', message: 'Fictional expired session.' } }, 401);
  await assert.rejects(client.catalog(), error => error.status === 401);
  // A caller can request B login as soon as it notices expiry. The SDK must
  // serialize the actual auth network operations, not merely discard values.
  wire.handler('/api/auth/login', () => { virtualCookie = 'fictional-cookie-B'; return response(session('B')); });
  const next = observe(client.login('B@example.test', 'FictionalPassword-B'));
  await flush();
  const earlyLogin = wire.calls.filter(call => call.path === '/api/auth/login').length > 1;
  virtualCookie = ''; // Arrival of the old logout's Set-Cookie is modelled only in memory.
  wait.resolve(response({ user: null }));
  const [logoutResult, loginResult] = await Promise.all([old, next]);
  wire.reply('/api/courses/fictional-course/materials', { material: { id: 'fictional-note' } }, 201);
  await client.saveMaterial('fictional-course', { name: 'Fictional B note' }, null, 'fictional-save-key');
  const sentToken = wire.calls.at(-1).headers.get('X-CSRF-Token');
  assert.equal(earlyLogin, false, 'B login must not dispatch before A logout finishes, because the browser applies Set-Cookie independently of UI epochs.');
  assert.equal(logoutCall.headers.get('X-CSRF-Token'), 'csrf-fictional-A', 'A valid outgoing logout token must be retained.');
  superseded(logoutResult);
  assert.equal(loginResult.fulfilled, true);
  assert.deepEqual(loginResult.value.user, identity('B'));
  assert.equal(virtualCookie, 'fictional-cookie-B');
  assert.equal(sentToken, 'csrf-fictional-B');
});

test('explicit current-session invalidation clears CSRF and rejects an older session response before it can restore A', async t => {
  const wire = network(t), client = createApiClient();
  assert.equal(typeof client.invalidateSession, 'function', 'The UI needs an explicit invalidation contract for a confirmed current-session 401.');
  await login(client, wire, 'A');
  const wait = wire.pending('/api/auth/session'), old = observe(client.session());
  client.invalidateSession();
  wait.resolve(response(session('A')));
  const outcome = await old;
  wire.reply('/api/courses/fictional-course/materials', { error: { code: 'AUTH_REQUIRED', message: 'Fictional signed-out session.' } }, 401);
  await assert.rejects(client.saveMaterial('fictional-course', { name: 'Fictional signed-out note' }, null, 'fictional-signed-out-key'), error => error.status === 401);
  assert.equal(wire.calls.at(-1).headers.get('X-CSRF-Token'), '');
  superseded(outcome);
  await login(client, wire, 'B');
  await save(client, wire);
});

test('ordinary old material reads reject AUTH_SUPERSEDED without application after invalidation', async t => {
  const wire = network(t), client = createApiClient(), applied = [];
  assert.equal(typeof client.invalidateSession, 'function');
  await login(client, wire, 'A');
  const wait = wire.pending('/api/courses/fictional-course/materials');
  const old = observe(client.materials('fictional-course').then(data => { applied.push(data); return data; }));
  client.invalidateSession();
  wait.resolve(response({ materials: [{ id: 'fictional-old-A-note' }] }));
  superseded(await old);
  assert.deepEqual(applied, []);
});

test('an old 401 response cannot be mistaken for a failure of the newly logged-in B session', async t => {
  const wire = network(t), client = createApiClient();
  await login(client, wire, 'A');
  const wait = wire.pending('/api/catalog'), old = observe(client.catalog());
  await login(client, wire, 'B');
  wait.resolve(response({ error: { code: 'AUTH_REQUIRED', message: 'Old fictional A session.' } }, 401));
  const outcome = await old;
  await save(client, wire);
  superseded(outcome);
});

test('logout advances identity epoch at initiation and preserves its own valid outgoing CSRF', async t => {
  const wire = network(t), client = createApiClient();
  await login(client, wire, 'A');
  const sessionWait = wire.pending('/api/auth/session'), old = observe(client.session());
  const logoutWait = wire.pending('/api/auth/logout'), logout = observe(client.logout());
  await flush();
  sessionWait.resolve(response(session('A')));
  const sessionResult = await old;
  logoutWait.resolve(response({ user: null }));
  const logoutResult = await logout;
  assert.equal(wire.calls.find(call => call.path === '/api/auth/logout').headers.get('X-CSRF-Token'), 'csrf-fictional-A');
  superseded(sessionResult);
  assert.equal(logoutResult.fulfilled, true);
  wire.reply('/api/courses/fictional-course/materials', { error: { code: 'AUTH_REQUIRED', message: 'Fictional signed-out session.' } }, 401);
  await assert.rejects(client.saveMaterial('fictional-course', { name: 'Fictional signed-out note' }), error => error.status === 401);
  assert.equal(wire.calls.at(-1).headers.get('X-CSRF-Token'), '');
  await login(client, wire, 'B');
  await save(client, wire);
});

test('parallel reads within one current identity may complete out of order without superseding each other', async t => {
  const wire = network(t), client = createApiClient();
  await login(client, wire, 'B');
  const catalogWait = wire.pending('/api/catalog'), catalog = observe(client.catalog());
  const materialWait = wire.pending('/api/courses/fictional-course/materials'), materials = observe(client.materials('fictional-course'));
  materialWait.resolve(response({ materials: [{ id: 'fictional-current-B-note' }] }));
  catalogWait.resolve(response({ revision: 'fictional-current-B-revision', courses: [], fees: [] }));
  const [left, right] = await Promise.all([catalog, materials]);
  assert.equal(left.fulfilled, true); assert.equal(right.fulfilled, true);
  assert.equal(left.value.revision, 'fictional-current-B-revision');
  assert.equal(right.value.materials[0].id, 'fictional-current-B-note');
  await save(client, wire);
});

test('logout queued after an already dispatched login uses the cookie-bound login token without applying the superseded identity', async t => {
  const wire = network(t), client = createApiClient(), applied = [];
  let virtualCookie = 'fictional-cookie-A';
  await login(client, wire, 'A');
  const wait = wire.pending('/api/auth/login');
  const pendingLogin = observe(client.login('B@example.test', 'FictionalPassword-B').then(data => { applied.push(data.user); return data; }));
  await flush(); // B login is genuinely dispatched before the logout is requested.
  wire.handler('/api/auth/logout', call => {
    const valid = virtualCookie === 'fictional-cookie-B' && call.headers.get('X-CSRF-Token') === 'csrf-fictional-B';
    if (valid) { virtualCookie = ''; return response({ user: null }); }
    return response({ error: { code: 'CSRF_REJECTED', message: 'Fictional cookie B requires its own logout token.' } }, 403);
  });
  const pendingLogout = observe(client.logout());
  virtualCookie = 'fictional-cookie-B';
  wait.resolve(response(session('B')));
  const [loginOutcome, logoutOutcome] = await Promise.all([pendingLogin, pendingLogout]);
  assert.equal(wire.calls.find(call => call.path === '/api/auth/logout').headers.get('X-CSRF-Token'), 'csrf-fictional-B', 'The browser cookie changed even though B login identity was superseded; queued logout needs that cookie-bound token.');
  superseded(loginOutcome);
  assert.deepEqual(applied, []);
  assert.equal(logoutOutcome.fulfilled, true);
  assert.deepEqual(logoutOutcome.value, { user: null });
  assert.equal(virtualCookie, '');
  await login(client, wire, 'C');
  await save(client, wire, 'C');
});

test('a current B session discovered after another tab switches accounts supersedes old A replies and preserves B saves', async t => {
  const wire = network(t), client = createApiClient(), applied = [];
  await login(client, wire, 'A');
  const oldWait = wire.pending('/api/auth/session');
  const old = observe(client.session().then(data => { applied.push(data.user); return data; }));
  // Another tab changed the shared cookie. This client discovers B through a
  // later session read, without calling client.login() or invalidateSession().
  wire.reply('/api/auth/session', session('B'));
  assert.deepEqual((await client.session()).user, identity('B'));
  const currentWait = wire.pending('/api/catalog'), current = observe(client.catalog());
  wire.reply('/api/auth/session', session('B'));
  assert.deepEqual((await client.session()).user, identity('B'));
  currentWait.resolve(response({ revision: 'fictional-B', courses: [], fees: [] }));
  assert.equal((await current).fulfilled, true, 'Confirming the same B identity must not supersede its current reads.');
  oldWait.resolve(response(session('A')));
  const outcome = await old;
  await save(client, wire, 'B');
  superseded(outcome);
  assert.deepEqual(applied, []);
});

test('scoped schedule writes use immutable occurrence paths, opened version, chosen scope and stable authenticated operation keys',async t=>{
 const wire=network(t),client=createApiClient();await login(client,wire,'B');
 const current={id:'fictional-series / 一',version:7},path='/api/schedules/'+encodeURIComponent(current.id)+'/occurrences/2',record={course:'fictional-course',startDate:'2026-10-21',endMode:'count',count:2,weekdays:[3],time:'12:45',duration:45,session:2},saved={...current,version:8,exceptions:[{sequence:2,overrides:{date:'2026-10-21',time:'12:45'}}]};
 wire.reply(path,{schedule:saved});assert.deepEqual((await client.saveScheduleOccurrence(record,current,2,'single','fictional-occurrence-save-key')).schedule,saved);
 let call=wire.calls.at(-1);assert.equal(call.method,'PATCH');assert.deepEqual(JSON.parse(call.body),{...record,version:7,scope:'single'});assert.equal(call.headers.get('Idempotency-Key'),'fictional-occurrence-save-key');assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');assert.equal(call.credentials,'same-origin');
 wire.reply(path,{schedule:{...saved,version:9}});await client.deleteScheduleOccurrence(saved,2,'following','fictional-occurrence-delete-key');call=wire.calls.at(-1);assert.equal(call.method,'DELETE');assert.deepEqual(JSON.parse(call.body),{version:8,scope:'following'});assert.equal(call.headers.get('Idempotency-Key'),'fictional-occurrence-delete-key');assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');
 wire.reply(path+'/restore',{schedule:{...saved,version:10}});await client.restoreScheduleOccurrence({...saved,version:9},2,'following','fictional-occurrence-restore-key');call=wire.calls.at(-1);assert.equal(call.method,'POST');assert.deepEqual(JSON.parse(call.body),{version:9,scope:'following'});assert.equal(call.headers.get('Idempotency-Key'),'fictional-occurrence-restore-key');assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');
 wire.reply(path,{error:{code:'VERSION_CONFLICT',message:'The series changed in another session.'}},409);await assert.rejects(client.saveScheduleOccurrence(record,current,2,'single','fictional-occurrence-save-key'),error=>error instanceof ApiError&&error.status===409&&error.code==='VERSION_CONFLICT');
});

test('shared scheduling resource requests preserve revision, immutable record identity, opened version and stable authenticated keys',async t=>{
 const wire=network(t),client=createApiClient();await login(client,wire,'B');
 const revision='fictional-resource-revision / 一';wire.reply('/api/scheduling-resources?since='+encodeURIComponent(revision),{revision,unchanged:true});assert.deepEqual(await client.schedulingResources(revision),{revision,unchanged:true});assert.equal(wire.calls.at(-1).method,'GET');
 const record={kind:'teacher',displayName:'Fictional teaching artist',active:true},created={...record,id:'fictional-resource / 一',version:1,createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T00:00:00Z'};wire.reply('/api/scheduling-resources',{resource:created},201);assert.deepEqual((await client.saveSchedulingResource(record,null,'fictional-resource-create-key')).resource,created);
 let call=wire.calls.at(-1);assert.equal(call.method,'POST');assert.deepEqual(JSON.parse(call.body),record);assert.equal(call.headers.get('Idempotency-Key'),'fictional-resource-create-key');assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');assert.equal(call.credentials,'same-origin');
 const fields={displayName:'Renamed teaching artist',active:false},updated={...created,...fields,version:2},path='/api/scheduling-resources/'+encodeURIComponent(created.id);wire.reply(path,{resource:updated});assert.deepEqual((await client.saveSchedulingResource({...fields,kind:'teacher'},created,'fictional-resource-update-key')).resource,updated);
 call=wire.calls.at(-1);assert.equal(call.method,'PATCH');assert.deepEqual(JSON.parse(call.body),{...fields,version:1});assert.equal(call.headers.get('Idempotency-Key'),'fictional-resource-update-key');assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');assert.equal(call.credentials,'same-origin');
 wire.reply(path,{error:{code:'VERSION_CONFLICT',message:'The resource changed in another session.'}},409);await assert.rejects(client.saveSchedulingResource(fields,created,'fictional-resource-update-key'),error=>error instanceof ApiError&&error.status===409&&error.code==='VERSION_CONFLICT');
});

test('schedule reads send the requested date window and revision while retaining the original unbounded admin request',async t=>{
 const wire=network(t),client=createApiClient();await login(client,wire,'B');const revision='scope revision / 一',range={from:'2026-12-29',to:'2027-01-11'},payload={revision:'next-scope',readScope:'occurrences',occurrences:[]};
 wire.reply(path=>{const url=new URL(path,'http://fictional.test');assert.equal(url.pathname,'/api/schedules');assert.equal(url.searchParams.get('since'),revision);assert.equal(url.searchParams.get('from'),range.from);assert.equal(url.searchParams.get('to'),range.to);assert.deepEqual([...url.searchParams.keys()].sort(),['from','since','to']);},payload);
 assert.deepEqual(await client.schedules(revision,range),payload);assert.equal(wire.calls.at(-1).method,'GET');assert.equal(wire.calls.at(-1).credentials,'same-origin');wire.reply('/api/schedules',{revision:'admin-view',schedules:[]});assert.deepEqual(await client.schedules(),{revision:'admin-view',schedules:[]});
});

test('a changed access revision supersedes old private reads for the same teacher while an unchanged scope keeps current reads usable',async t=>{
 const wire=network(t),client=createApiClient(),user={...identity('teacher'),role:'teacher',accessRevision:'scope-A'};wire.reply('/api/auth/session',{user,csrfToken:'csrf-scope-A'});await client.session();
 const wait=wire.pending('/api/catalog?since=scope-A'),old=observe(client.catalog('scope-A'));wire.reply('/api/auth/session',{user:{...user,accessRevision:'scope-B'},csrfToken:'csrf-scope-B'});await client.session();
 const currentWait=wire.pending('/api/catalog'),current=observe(client.catalog());wire.reply('/api/auth/session',{user:{...user,accessRevision:'scope-B'},csrfToken:'csrf-scope-B'});await client.session();currentWait.resolve(response({revision:'scope-B',courses:[],fees:[]}));assert.equal((await current).fulfilled,true,'The same identity and access scope must not invalidate legitimate current reads');
 wait.resolve(response({revision:'scope-A',courses:[{id:'revoked-course',courseName:'Private revoked class'}],fees:[]}));superseded(await old);
});

test('access-control requests preserve encoded targets, first-link version zero, unlink versions and stable keys without resending unrelated account data',async t=>{
 const wire=network(t),client=createApiClient();await login(client,wire,'B');const revision='access revision / 一',snapshot={revision,accounts:[{id:'teacher-account',displayName:'Artist',role:'teacher'}],teacherLinks:[],grants:[]};wire.reply('/api/access-control?since='+encodeURIComponent(revision),snapshot);assert.deepEqual(await client.accessControl(revision),snapshot);
 const resourceId='teacher resource / 一',path='/api/access-control/teacher-links/'+encodeURIComponent(resourceId),link={resourceId,userId:'teacher-account',version:1};wire.reply(path,{teacherLink:link});assert.deepEqual((await client.saveTeacherLink(resourceId,'teacher-account',0,'fictional-first-link')).teacherLink,link);let call=wire.calls.at(-1);assert.equal(call.method,'PATCH');assert.deepEqual(JSON.parse(call.body),{userId:'teacher-account',version:0});assert.equal(call.headers.get('Idempotency-Key'),'fictional-first-link');assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');
 wire.reply(path,{teacherLink:{...link,userId:null,version:2}});await client.saveTeacherLink(resourceId,null,1,'fictional-unlink');call=wire.calls.at(-1);assert.deepEqual(JSON.parse(call.body),{userId:null,version:1});assert.equal(call.headers.get('Idempotency-Key'),'fictional-unlink');
 const input={userId:'teacher-account',kind:'occurrence',scheduleId:'series / 一',sequence:2},grant={...input,id:'grant / 一',active:true,version:1};wire.reply('/api/access-control/grants',{grant},201);assert.deepEqual((await client.createScopeGrant(input,'fictional-grant-create')).grant,grant);call=wire.calls.at(-1);assert.equal(call.method,'POST');assert.deepEqual(JSON.parse(call.body),input);assert.equal(call.headers.get('Idempotency-Key'),'fictional-grant-create');
 const grantPath='/api/access-control/grants/'+encodeURIComponent(grant.id);wire.reply(grantPath,{grant:{...grant,active:false,version:2}});await client.setScopeGrantActive(grant,false,'fictional-grant-revoke');call=wire.calls.at(-1);assert.equal(call.method,'PATCH');assert.deepEqual(JSON.parse(call.body),{version:1,active:false},'Revocation must send only the opened version and chosen active flag');assert.equal(call.headers.get('Idempotency-Key'),'fictional-grant-revoke');assert.equal(call.credentials,'same-origin');
 wire.reply(grantPath,{error:{code:'ROLE_FORBIDDEN',message:'Administrator access is required.'}},403);await assert.rejects(client.setScopeGrantActive(grant,true,'fictional-role-rejected'),error=>error instanceof ApiError&&error.status===403&&error.code==='ROLE_FORBIDDEN');
});

test('formal people reads encode the complete list query and revision and fetch one profile and its administrative history by stable encoded ID',async t=>{
 const wire=network(t),client=createApiClient();await login(client,wire,'B');const query={kind:'applicant',q:'Zoë & 陳 / 一',page:2,pageSize:25,sort:'displayName',direction:'desc'},revision='people revision / 一',person={id:'person / 一',kind:'applicant',displayName:'Zoë 陳',dateOfBirth:null,parentName:'',whatsApp:'',email:'',version:7,createdAt:'2026-10-15T00:00:00Z',updatedAt:'2026-10-15T01:00:00Z'},list={people:[person],page:2,pageSize:25,total:43,revision:'people-next'};
 wire.reply(path=>{const url=new URL(path,'http://fictional.test');assert.equal(url.pathname,'/api/people');for(const[key,value]of Object.entries(query))assert.equal(url.searchParams.get(key),String(value));assert.equal(url.searchParams.get('since'),revision);assert.deepEqual([...url.searchParams.keys()].sort(),[...Object.keys(query),'since'].sort());},list);assert.deepEqual(await client.people(query,revision),list);assert.equal(wire.calls.at(-1).method,'GET');assert.equal(wire.calls.at(-1).credentials,'same-origin');
 const path='/api/people/'+encodeURIComponent(person.id);wire.reply(path,{person});assert.deepEqual(await client.person(person.id),{person});const history=[{id:1,action:'person.create',version:1,actor:{id:'fictional-B',displayName:'Fictional B'},createdAt:'2026-10-15T00:00:00Z',snapshot:{...person,version:1}},{id:2,action:'person.update',version:7,actor:{id:'fictional-B',displayName:'Fictional B'},createdAt:'2026-10-15T01:00:00Z',snapshot:person}];wire.reply(path+'/history',{history});assert.deepEqual(await client.personHistory(person.id),{history},'The SDK must retain administrative snapshots without inventing trial history');
});

test('formal applicant saves preserve optional blank data, stable operation keys and the opened version while propagating a stale edit conflict',async t=>{
 const wire=network(t),client=createApiClient();await login(client,wire,'B');const profile={displayName:'陳 Applicant',dateOfBirth:null,parentName:'',whatsApp:'',email:'',school:'',referrer:'',contact1Name:'First guardian',contact1Phone:'82222222',contact1Email:'one@example.test',contact2Name:'Second guardian',contact2Phone:'83333333',contact2Email:'two@example.test',promotion:null,enrollmentDate:null,quitDate:null},created={...profile,id:'applicant / 一',kind:'applicant',version:1,convertedAt:null,convertedBy:null,createdAt:'2026-10-15T00:00:00Z',updatedAt:'2026-10-15T00:00:00Z'};
 wire.reply('/api/people',{person:created},201);assert.deepEqual(await client.savePerson(profile,null,'fictional-person-create'),{person:created});let call=wire.calls.at(-1);assert.equal(call.method,'POST');assert.deepEqual(JSON.parse(call.body),profile);assert.equal(call.headers.get('Idempotency-Key'),'fictional-person-create');assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');assert.equal(call.credentials,'same-origin');
 const edited={displayName:'Updated applicant',dateOfBirth:'2000-02-29'},current={...created,version:7},path='/api/people/'+encodeURIComponent(created.id),updated={...current,...edited,version:8};wire.reply(path,{person:updated});assert.deepEqual(await client.savePerson(edited,current,'fictional-person-edit'),{person:updated});call=wire.calls.at(-1);assert.equal(call.method,'PATCH');assert.deepEqual(JSON.parse(call.body),{...edited,version:7},'The SDK must not resend profile metadata or silently replace the opened version');assert.equal(call.headers.get('Idempotency-Key'),'fictional-person-edit');assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');
 wire.reply(path,{error:{code:'VERSION_CONFLICT',message:'Another administrator changed this person.'}},409);await assert.rejects(client.savePerson(edited,current,'fictional-person-edit'),error=>error instanceof ApiError&&error.status===409&&error.code==='VERSION_CONFLICT');
});

test('formal available slot requests encode their bounded query and stable ID and preserve opened versions and authenticated retry keys',async t=>{
 const wire=network(t),client=createApiClient();await login(client,wire,'B');const range={from:'2026-12-29',to:'2027-01-11',courseId:'course / 一'},revision='availability revision / 一',profile={courseId:range.courseId,date:'2026-12-30',time:'13:00',duration:60,teacherIds:['teacher-one'],roomIds:['room-one'],totalCapacity:8,trialCapacity:2,reschedulingCapacity:1,trialEnabled:true,reschedulingEnabled:false,active:true,publicVisibility:'default',excludedStudentIds:[],remark:'Private preparation note'},slot={...profile,id:'slot / 一',version:7,createdAt:'2026-10-15T00:00:00Z',updatedAt:'2026-10-15T00:00:00Z'};
 wire.reply(path=>{const url=new URL(path,'http://fictional.test');assert.equal(url.pathname,'/api/available-slots');for(const[key,value]of Object.entries(range))assert.equal(url.searchParams.get(key),value);assert.equal(url.searchParams.get('since'),revision);assert.deepEqual([...url.searchParams.keys()].sort(),['courseId','from','since','to']);},{slots:[slot],revision:'next-availability'});assert.deepEqual(await client.availability(range,revision),{slots:[slot],revision:'next-availability'});assert.equal(wire.calls.at(-1).method,'GET');
 const path='/api/available-slots/'+encodeURIComponent(slot.id);wire.reply(path,{slot});assert.deepEqual(await client.availableSlot(slot.id),{slot});
 wire.reply('/api/available-slots',{slot:{...slot,version:1}},201);await client.saveAvailableSlot(profile,null,'fictional-slot-create');let call=wire.calls.at(-1);assert.equal(call.method,'POST');assert.deepEqual(JSON.parse(call.body),profile);assert.equal(call.headers.get('Idempotency-Key'),'fictional-slot-create');assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');assert.equal(call.credentials,'same-origin');
 const edited={...profile,time:'13:45',version:999};wire.reply(path,{slot:{...slot,time:'13:45',version:8}});await client.saveAvailableSlot(edited,slot,'fictional-slot-edit');call=wire.calls.at(-1);assert.equal(call.method,'PATCH');assert.deepEqual(JSON.parse(call.body),{...edited,version:7},'A forged profile version must not replace the current opened snapshot version');assert.equal(call.headers.get('Idempotency-Key'),'fictional-slot-edit');assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');
 wire.reply(path,{error:{code:'VERSION_CONFLICT',message:'The slot changed in another browser.'}},409);await assert.rejects(client.saveAvailableSlot(edited,slot,'fictional-slot-edit'),error=>error instanceof ApiError&&error.status===409&&error.code==='VERSION_CONFLICT');
});

test('availability public setting requests send only display booleans with initial version zero and stable authenticated keys',async t=>{
 const wire=network(t),client=createApiClient();await login(client,wire,'B');const current={showFullTrialSlots:false,showReschedulingSlots:false,rangeDays:7,version:0},settings={showFullTrialSlots:true,showReschedulingSlots:false},saved={...current,...settings,version:1};wire.reply('/api/availability-public-settings',{settings:current});assert.deepEqual(await client.availabilityPublicSettings(),{settings:current});
 wire.reply('/api/availability-public-settings',{settings:saved});assert.deepEqual(await client.saveAvailabilityPublicSettings(settings,current,'fictional-public-settings'),{settings:saved});const call=wire.calls.at(-1);assert.equal(call.method,'PATCH');assert.deepEqual(JSON.parse(call.body),{...settings,version:0},'The fixed range and other slot content must not be sent as display settings');assert.equal(call.headers.get('Idempotency-Key'),'fictional-public-settings');assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');assert.equal(call.credentials,'same-origin');
 wire.reply('/api/availability-public-settings',{error:{code:'VERSION_CONFLICT',message:'The settings changed in another browser.'}},409);await assert.rejects(client.saveAvailabilityPublicSettings(settings,current,'fictional-public-settings'),error=>error instanceof ApiError&&error.status===409&&error.code==='VERSION_CONFLICT');
});

test('public course availability reads work without login and encode their independent public revision and seven-day start query',async t=>{
 const wire=network(t),client=createApiClient(),revision='public revision / 一',course={id:'public course / 一',courseName:'Published studio',category:'Art',level:'Beginner'},publicList={courses:[course],revision:'public-next'};
 wire.reply(path=>{const url=new URL(path,'http://fictional.test');assert.equal(url.pathname,'/api/public/courses');assert.equal(url.searchParams.get('since'),revision);assert.deepEqual([...url.searchParams.keys()],['since']);},publicList);assert.deepEqual(await client.publicCourses(revision),publicList);
 const path='/api/public/courses/'+encodeURIComponent(course.id),from='2026-12-29',detail={course,slots:[{id:'published-slot',courseId:course.id,date:'2026-12-30',time:'13:00',duration:60}],from,to:'2027-01-04',rangeDays:7,revision:'detail-next'};wire.reply(input=>{const url=new URL(input,'http://fictional.test');assert.equal(url.pathname,path);assert.equal(url.searchParams.get('from'),from);assert.equal(url.searchParams.get('since'),revision);assert.deepEqual([...url.searchParams.keys()].sort(),['from','since']);},detail);assert.deepEqual(await client.publicCourseDetails(course.id,from,revision),detail);
 wire.reply('/api/public/courses',{courses:[],revision:'empty-public'});await client.publicCourses();wire.reply(path,{error:{code:'COURSE_NOT_FOUND',message:'This course is not publicly available.'}},404);await assert.rejects(client.publicCourseDetails(course.id),error=>error instanceof ApiError&&error.status===404);assert.ok(wire.calls.every(call=>call.path.startsWith('/api/public/')),'Anonymous reads must not call session, private catalogue or a login endpoint');assert.ok(wire.calls.every(call=>call.method==='GET'));
});

test('formal class capacity status reads encode their bounded window and immutable occurrence identity without using the lesson date as its key',async t=>{
 const wire=network(t),client=createApiClient();await login(client,wire,'B');
 const query={from:'2026-12-29',to:'2027-01-11',courseId:'course / 一'},revision='class status revision / 一',status={scheduleId:'series / 一',sequence:2,courseId:query.courseId,date:'2027-01-02',time:'13:00',duration:60,classCapacity:8,classOccupied:null,automaticStatus:null,manualStatus:null,effectiveStatus:null,statusSource:'unknown',version:0,sourceVersion:7,createdAt:null,updatedAt:null};
 wire.reply(path=>{const url=new URL(path,'http://fictional.test');assert.equal(url.pathname,'/api/class-capacity-statuses');for(const[key,value]of Object.entries(query))assert.equal(url.searchParams.get(key),value);assert.equal(url.searchParams.get('since'),revision);assert.deepEqual([...url.searchParams.keys()].sort(),['courseId','from','since','to']);},{statuses:[status],revision:'next-class-status'});
 assert.deepEqual(await client.classCapacityStatuses(revision,query),{statuses:[status],revision:'next-class-status'});assert.equal(wire.calls.at(-1).method,'GET');assert.equal(wire.calls.at(-1).body,undefined);
 wire.reply(path=>{const url=new URL(path,'http://fictional.test');assert.equal(url.pathname,'/api/class-capacity-statuses');assert.equal(url.searchParams.get('since'),'next-class-status');assert.equal(url.searchParams.get('from'),query.from);assert.equal(url.searchParams.get('to'),query.to);},{unchanged:true,revision:'next-class-status'});
 assert.deepEqual(await client.classCapacityStatuses('next-class-status',query),{unchanged:true,revision:'next-class-status'});
 const path='/api/schedules/'+encodeURIComponent(status.scheduleId)+'/occurrences/2/capacity-status';wire.reply(path,{status});assert.deepEqual(await client.classCapacityStatus(status.scheduleId,status.sequence),{status});assert.equal(wire.calls.at(-1).method,'GET');assert.equal(wire.calls.at(-1).body,undefined);
});

test('manual class Full Available and clear saves preserve the opened status and source versions and stable authenticated retry key without sending capacity or quota',async t=>{
 const wire=network(t),client=createApiClient();await login(client,wire,'B');
 const current={scheduleId:'series / 一',sequence:2,courseId:'fictional-course',date:'2026-10-22',time:'13:00',duration:60,classCapacity:8,classOccupied:null,automaticStatus:null,manualStatus:null,effectiveStatus:null,statusSource:'unknown',version:0,sourceVersion:7,createdAt:null,updatedAt:null},path='/api/schedules/'+encodeURIComponent(current.scheduleId)+'/occurrences/2/capacity-status',key='fictional-class-status-fixed-key',full={...current,manualStatus:'full',effectiveStatus:'full',statusSource:'manual',version:1,createdAt:'2026-10-15T00:00:00Z',updatedAt:'2026-10-15T00:00:00Z'};
 for(let attempt=0;attempt<2;attempt++){
  wire.reply(path,{status:full});assert.deepEqual(await client.saveClassCapacityStatus(current,'full',key),{status:full});const call=wire.calls.at(-1);assert.equal(call.method,'PATCH');assert.deepEqual(JSON.parse(call.body),{version:0,sourceVersion:7,manualStatus:'full'});assert.equal(call.headers.get('Idempotency-Key'),key);assert.equal(call.headers.get('X-CSRF-Token'),'csrf-fictional-B');assert.equal(call.credentials,'same-origin');
 }
 const available={...full,version:2,manualStatus:'available',effectiveStatus:'available'};wire.reply(path,{status:available});assert.deepEqual(await client.saveClassCapacityStatus(full,'available','fictional-class-available-key'),{status:available});assert.deepEqual(JSON.parse(wire.calls.at(-1).body),{version:1,sourceVersion:7,manualStatus:'available'});
 const cleared={...available,version:3,manualStatus:null,effectiveStatus:null,statusSource:'unknown'};wire.reply(path,{status:cleared});assert.deepEqual(await client.saveClassCapacityStatus(available,null,'fictional-class-clear-key'),{status:cleared});assert.deepEqual(JSON.parse(wire.calls.at(-1).body),{version:2,sourceVersion:7,manualStatus:null});
 wire.reply(path,{error:{code:'VERSION_CONFLICT',message:'The class or its manual status changed.'}},409);await assert.rejects(client.saveClassCapacityStatus(current,'full',key),error=>error instanceof ApiError&&error.status===409&&error.code==='VERSION_CONFLICT');
});
