import { createServer, request as proxyRequest } from 'node:http';

const hopByHopHeaders = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Retry-After': '2',
  });
  response.end(JSON.stringify(payload));
}

export function createApiGateway({ storage = 'sqlite' } = {}) {
  if (!['sqlite', 'postgres'].includes(storage)) throw new TypeError('API gateway storage must be sqlite or postgres.');
  let backendPort = null;
  const server = createServer((request, response) => {
    const pathname = (request.url || '/').split('?', 1)[0];
    if (pathname === '/api/health' && request.method === 'GET') {
      const ready = backendPort !== null;
      response.writeHead(ready ? 200 : 503, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...(ready ? {} : { 'Retry-After': '2' }),
      });
      response.end(JSON.stringify({
        mode: 'shared-test',
        service: 'Beamal',
        storage,
        ...(ready ? {} : { status: 'starting' }),
      }));
      return;
    }
    if (backendPort === null) {
      sendJson(response, 503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'The application is starting. Please retry shortly.' } });
      return;
    }

    const headers = {
      ...request.headers,
      host: `127.0.0.1:${backendPort}`,
      'x-beamal-client-address': request.socket.remoteAddress || 'unknown',
    };
    for (const header of hopByHopHeaders) delete headers[header];
    const upstream = proxyRequest({
      hostname: '127.0.0.1',
      port: backendPort,
      method: request.method,
      path: request.url || '/',
      headers,
    }, upstreamResponse => {
      const responseHeaders = { ...upstreamResponse.headers };
      for (const header of hopByHopHeaders) delete responseHeaders[header];
      response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
      upstreamResponse.pipe(response);
    });
    upstream.on('error', error => {
      console.error('Could not forward a request to the Beamal application worker.', error);
      if (response.headersSent) {
        response.destroy(error);
        return;
      }
      sendJson(response, 503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'The application is temporarily unavailable. Please retry shortly.' } });
    });
    request.on('aborted', () => upstream.destroy());
    response.on('close', () => {
      if (!response.writableEnded) upstream.destroy();
    });
    request.pipe(upstream);
  });

  return {
    server,
    setBackendPort(port) {
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new TypeError('Application worker port must be a valid TCP port.');
      backendPort = port;
    },
    clearBackendPort() {
      backendPort = null;
    },
  };
}
