import { Worker } from 'node:worker_threads';
import { resolveListenerConfig } from './listener-config.mjs';
import { createApiGateway } from './api-gateway.mjs';

const { host, port } = resolveListenerConfig();
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT or BEAMAL_PORT must be a valid port number.');

const gateway = createApiGateway({ storage: process.env.DATABASE_URL ? 'postgres' : 'sqlite' });
const server = gateway.server;
let applicationWorker = null;
let restartTimer = null;
let restartDelayMs = 1000;
let stopping = false;

function startApplicationWorker() {
  if (stopping) return;
  const worker = new Worker(new URL('./application-worker.mjs', import.meta.url));
  applicationWorker = worker;
  worker.on('message', message => {
    if (applicationWorker !== worker) return;
    if (message?.type === 'ready') {
      gateway.setBackendPort(message.port);
      restartDelayMs = 1000;
      console.log('Application worker is ready; API requests are being forwarded.');
    } else if (message?.type === 'startup-error') {
      console.error('Application worker could not initialize.', message.error);
    }
  });
  worker.on('error', error => {
    if (applicationWorker !== worker) return;
    gateway.clearBackendPort();
    console.error('Application worker encountered an error.', error);
  });
  worker.on('exit', code => {
    if (applicationWorker !== worker) return;
    applicationWorker = null;
    gateway.clearBackendPort();
    if (stopping) return;
    const delay = restartDelayMs;
    restartDelayMs = Math.min(restartDelayMs * 2, 30000);
    console.error(`Application worker exited with code ${code}; restarting in ${delay} ms.`);
    restartTimer = setTimeout(startApplicationWorker, delay);
    restartTimer.unref();
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
startApplicationWorker();

async function stop() {
  if (stopping) return;
  stopping = true;
  clearTimeout(restartTimer);
  gateway.clearBackendPort();
  const worker = applicationWorker;
  applicationWorker = null;
  if (worker) {
    await new Promise(resolve => {
      const timeout = setTimeout(() => {
        worker.terminate().then(resolve, error => {
          console.error('Could not terminate the Beamal application worker.', error);
          resolve();
        });
      }, 5000);
      worker.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      worker.postMessage({ type: 'stop' });
    });
  }
  if (server.listening) {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

process.once('SIGINT', () => { stop().catch(error => { console.error('Could not stop the Beamal API gateway.', error); process.exitCode = 1; }); });
process.once('SIGTERM', () => { stop().catch(error => { console.error('Could not stop the Beamal API gateway.', error); process.exitCode = 1; }); });
