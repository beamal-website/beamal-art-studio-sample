import { Worker } from 'node:worker_threads';
import { resolveListenerConfig } from './listener-config.mjs';
import { createApiGateway } from './api-gateway.mjs';

const { host, port } = resolveListenerConfig();
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT or BEAMAL_PORT must be a valid port number.');

const postgresMode = Boolean(process.env.DATABASE_URL);
const applicationWorkerCount = postgresMode ? 2 : 1;
const gateway = createApiGateway({ storage: postgresMode ? 'postgres' : 'sqlite' });
const server = gateway.server;
const applicationWorkers = new Map();
const restartDelays = new Map();
const restartTimers = new Map();
let stopping = false;

function publishBackendPorts() {
  const ports = [...applicationWorkers.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, entry]) => entry.port)
    .filter(Number.isInteger);
  gateway.setBackendPorts(ports);
}

function startApplicationWorker(index) {
  if (stopping) return;
  const worker = new Worker(new URL('./application-worker.mjs', import.meta.url));
  const entry = { worker, port: null };
  applicationWorkers.set(index, entry);
  worker.on('message', message => {
    if (applicationWorkers.get(index) !== entry) return;
    if (message?.type === 'ready') {
      entry.port = message.port;
      publishBackendPorts();
      restartDelays.set(index, 1000);
      console.log(`Application worker ${index + 1}/${applicationWorkerCount} is ready; API requests are being forwarded.`);
      if (index === 0 && applicationWorkerCount > 1 && !applicationWorkers.has(1)) startApplicationWorker(1);
    } else if (message?.type === 'startup-error') {
      console.error(`Application worker ${index + 1} could not initialize.`, message.error);
    }
  });
  worker.on('error', error => {
    if (applicationWorkers.get(index) !== entry) return;
    entry.port = null;
    publishBackendPorts();
    console.error(`Application worker ${index + 1} encountered an error.`, error);
  });
  worker.on('exit', code => {
    if (applicationWorkers.get(index) !== entry) return;
    applicationWorkers.delete(index);
    publishBackendPorts();
    if (stopping) return;
    const delay = restartDelays.get(index) || 1000;
    restartDelays.set(index, Math.min(delay * 2, 30000));
    console.error(`Application worker ${index + 1} exited with code ${code}; restarting in ${delay} ms.`);
    const timer = setTimeout(() => {
      restartTimers.delete(index);
      startApplicationWorker(index);
    }, delay);
    restartTimers.set(index, timer);
    timer.unref();
  });
}

await new Promise((resolve, reject) => {
  const failed = error => reject(error);
  server.once('error', failed);
  server.listen(port, host, () => {
    server.off('error', failed);
    resolve();
  });
});
const address = server.address();
console.log(`Initializing Beamal shared test service gateway with ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}; listener target ${host}:${address.port}.`);
console.log(`Beamal API gateway listening on http://${host}:${address.port}`);
if (postgresMode) console.log('Starting two PostgreSQL application workers; reads will be balanced and writes will stay on one worker.');
startApplicationWorker(0);

async function stop() {
  if (stopping) return;
  stopping = true;
  for (const timer of restartTimers.values()) clearTimeout(timer);
  restartTimers.clear();
  gateway.clearBackendPort();
  const workers = [...applicationWorkers.values()].map(entry => entry.worker);
  applicationWorkers.clear();
  await Promise.all(workers.map(worker => new Promise(resolve => {
    if (worker.threadId === -1) return resolve();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(() => {
      worker.terminate().then(finish, error => {
        console.error('Could not terminate the Beamal application worker.', error);
        finish();
      });
    }, 5000);
    worker.once('exit', finish);
    worker.postMessage({ type: 'stop' });
  })));
  if (server.listening) {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

process.once('SIGINT', () => { stop().catch(error => { console.error('Could not stop the Beamal API gateway.', error); process.exitCode = 1; }); });
process.once('SIGTERM', () => { stop().catch(error => { console.error('Could not stop the Beamal API gateway.', error); process.exitCode = 1; }); });
