import { createServer } from 'node:http';
import { parentPort } from 'node:worker_threads';

const server = createServer((request, response) => {
  if (request.url === '/block') {
    parentPort.postMessage({ type: 'blocked-request-started' });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)), 0, 0, 1200);
    response.end('completed');
    return;
  }
  const chunks = [];
  request.on('data', chunk => chunks.push(chunk));
  request.on('end', () => {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': 'gateway-test=present; Path=/' });
    response.end(JSON.stringify({
      method: request.method,
      body: Buffer.concat(chunks).toString('utf8'),
      origin: request.headers.origin || null,
      cookie: request.headers.cookie || null,
      clientAddress: request.headers['x-beamal-client-address'] || null,
      gatewayReceivedAt: request.headers['x-beamal-gateway-received-at'] || null,
    }));
  });
});

server.listen(0, '127.0.0.1', () => parentPort.postMessage({ type: 'ready', port: server.address().port }));
parentPort.on('message', async message => {
  if (message?.type !== 'stop') return;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  parentPort.close();
});
