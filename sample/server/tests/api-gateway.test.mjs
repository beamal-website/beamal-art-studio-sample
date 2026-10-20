import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApiGateway } from '../api-gateway.mjs';

function onceMessage(worker, type) {
  return new Promise((resolve, reject) => {
    const message = value => {
      if (value?.type !== type) return;
      cleanup();
      resolve(value);
    };
    const error = value => {
      cleanup();
      reject(value);
    };
    const exited = code => {
      cleanup();
      reject(new Error(`Worker exited before sending ${type} (code ${code}).`));
    };
    const cleanup = () => {
      worker.off('message', message);
      worker.off('error', error);
      worker.off('exit', exited);
    };
    worker.on('message', message);
    worker.once('error', error);
    worker.once('exit', exited);
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

async function closeServer(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

test('gateway serves health independently of a blocked database-backed worker and proxies requests', async t => {
  const gateway = createApiGateway({ storage: 'postgres' });
  const url = await listen(gateway.server);
  const backend = new Worker(new URL('./fixtures/api-gateway-backend.mjs', import.meta.url), { execArgv: [] });
  t.after(async () => {
    if (backend.threadId !== -1) await backend.terminate().catch(() => {});
    gateway.server.closeAllConnections();
    await closeServer(gateway.server);
  });
  const ready = await onceMessage(backend, 'ready');
  gateway.setBackendPort(ready.port);

  const health = await fetch(`${url}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await health.json(), { mode: 'shared-test', service: 'Beamal', storage: 'postgres' });

  const blocked = fetch(`${url}/block`);
  await onceMessage(backend, 'blocked-request-started');
  const started = performance.now();
  const duringBlock = await fetch(`${url}/api/health`);
  assert.equal(duringBlock.status, 200);
  assert.ok(performance.now() - started < 700, 'health checks should not wait for a blocked application worker');
  const blockedResponse = await blocked;
  assert.equal(await blockedResponse.text(), 'completed');

  const proxied = await fetch(`${url}/echo`, {
    method: 'POST',
    headers: {
      Origin: 'https://beamal-art-studio-sample.vercel.app',
      Cookie: 'beamal_session=test-session',
      'X-Beamal-Client-Address': 'forged-address',
      'X-Beamal-Gateway-Received-At': 'forged-time',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ping: true }),
  });
  assert.equal(proxied.status, 200);
  assert.equal(proxied.headers.get('set-cookie'), 'gateway-test=present; Path=/');
  const proxiedBody = await proxied.json();
  assert.deepEqual(proxiedBody, {
    method: 'POST',
    body: '{"ping":true}',
    origin: 'https://beamal-art-studio-sample.vercel.app',
    cookie: 'beamal_session=test-session',
    clientAddress: '127.0.0.1',
    gatewayReceivedAt: proxiedBody.gatewayReceivedAt,
  });
  assert.match(proxiedBody.gatewayReceivedAt, /^\d+$/);
  assert.notEqual(proxiedBody.gatewayReceivedAt, 'forged-time');
});

test('gateway reports startup readiness and rejects invalid worker ports', async t => {
  const gateway = createApiGateway();
  const url = await listen(gateway.server);
  t.after(() => closeServer(gateway.server));
  const health = await fetch(`${url}/api/health`);
  assert.equal(health.status, 503);
  assert.deepEqual(await health.json(), { mode: 'shared-test', service: 'Beamal', storage: 'sqlite', status: 'starting' });
  const unavailable = await fetch(`${url}/api/auth/login`, { method: 'POST', body: '{}' });
  assert.equal(unavailable.status, 503);
  assert.throws(() => gateway.setBackendPort(0), /valid TCP port/);
});

test('application worker starts the existing API behind the gateway', async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'beamal-api-worker-'));
  const staticDir = join(dataDir, 'public');
  await mkdir(staticDir);
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  const worker = new Worker(new URL('../application-worker.mjs', import.meta.url), {
    execArgv: [],
    env: {
      ...process.env,
      DATABASE_URL: '',
      BEAMAL_DATA_DIR: dataDir,
      BEAMAL_STATIC_DIR: staticDir,
      BEAMAL_ALLOWED_ORIGINS: 'https://beamal-art-studio-sample.vercel.app',
    },
  });
  let stopped = false;
  t.after(async () => {
    if (!stopped && worker.threadId !== -1) await worker.terminate().catch(() => {});
  });
  const ready = await onceMessage(worker, 'ready');
  const gateway = createApiGateway({ storage: 'sqlite' });
  const url = await listen(gateway.server);
  gateway.setBackendPort(ready.port);
  t.after(async () => {
    gateway.server.closeAllConnections();
    await closeServer(gateway.server);
  });

  const login = await fetch(`${url}/api/auth/login`, {
    method: 'POST',
    headers: {
      Origin: 'https://beamal-art-studio-sample.vercel.app',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(login.status, 400);
  assert.equal((await login.json()).error.code, 'INVALID_LOGIN');
  const closed = onceMessage(worker, 'stopped');
  const exited = new Promise(resolve => worker.once('exit', resolve));
  worker.postMessage({ type: 'stop' });
  await closed;
  await exited;
  stopped = true;
});
