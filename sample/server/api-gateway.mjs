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

function routeLabel(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const label = parts.slice(0, 2);
  if (parts[1] === 'auth' && parts[2]) label.push(parts[2]);
  return `/${label.join('/')}`;
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

    const startedAt = Date.now(), method = request.method || 'GET', route = routeLabel(pathname);
    let clientDisconnected = false;
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
      upstreamResponse.on('end', () => {
        const elapsed = Date.now() - startedAt;
        if (elapsed >= 5000) console.warn(`Application worker handled ${method} ${route} in ${elapsed} ms with status ${upstreamResponse.statusCode || 502}.`);
      });
      upstreamResponse.pipe(response);
    });
    upstream.on('error', error => {
      const elapsed = Date.now() - startedAt;
      if (clientDisconnected && error.code === 'ECONNRESET') {
        console.warn(`Client disconnected from ${method} ${route} after ${elapsed} ms.`);
        return;
      }
      console.error(`Could not forward ${method} ${route} to the Beamal application worker after ${elapsed} ms.`, error);
      if (response.headersSent) {
        response.destroy(error);
        return;
      }
      sendJson(response, 503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'The application is temporarily unavailable. Please retry shortly.' } });
    });
    request.on('aborted', () => {
      clientDisconnected = true;
      upstream.destroy();
    });
    response.on('close', () => {
      if (!response.writableEnded) {
        clientDisconnected = true;
        upstream.destroy();
      }
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
