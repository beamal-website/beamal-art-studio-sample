import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, ApiError } from '../client/api-client.js';

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
    assert.equal(path, next.path);
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
