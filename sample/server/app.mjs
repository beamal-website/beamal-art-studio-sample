import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { createStore } from './store.mjs';
import { uploadMetadata } from './attachments.mjs';
import { validateMaterial, requireMaterialVersion } from './materials.mjs';
import { validateSchedule, requireScheduleVersion, requireOccurrenceRequest } from './schedules.mjs';
import { validateSchedulingResource } from './scheduling-resources.mjs';
import { ApplicationError, validateCourse, validateCourseMetadata, hasPricingFields, validateFee, requireVersion } from './validation.mjs';
import { hashPassword, verifyPassword, normaliseEmail, randomToken, tokenHash, csrfForToken, matchesHash } from './security.mjs';

const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5180', 'http://127.0.0.1:5180'];
const SESSION_SECONDS = 12 * 60 * 60;
const COOKIE = 'beamal_session';
const BODY_LIMIT = 256 * 1024;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function body(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) throw new ApplicationError(415, 'JSON_REQUIRED', 'Use application/json for this request.');
  const raw = await new Promise((resolveBody, reject) => {
    let bytes = 0, completed = false;
    const chunks = [];
    request.on('data', chunk => {
      if (completed) return;
      bytes += chunk.length;
      if (bytes > BODY_LIMIT) { completed = true; chunks.length = 0; reject(new ApplicationError(413, 'BODY_TOO_LARGE', 'Request body is too large.')); }
      else chunks.push(chunk);
    });
    request.on('end', () => { if (!completed) { completed = true; resolveBody(Buffer.concat(chunks).toString('utf8')); } });
    request.on('error', () => { if (!completed) { completed = true; reject(new ApplicationError(400, 'INVALID_REQUEST', 'Could not read request.')); } });
    request.on('aborted', () => { if (!completed) { completed = true; reject(new ApplicationError(400, 'INVALID_REQUEST', 'Request was interrupted.')); } });
  });
  try { return JSON.parse(raw); }
  catch { throw new ApplicationError(400, 'INVALID_JSON', 'Request contains invalid JSON.'); }
}

function sessionToken(request) {
  if ((request.headers.cookie || '').length > 4096) return '';
  const entries = (request.headers.cookie || '').split(';').map(entry => entry.trim());
  const value = entries.find(entry => entry.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || '';
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : '';
}

function idempotencyKey(request) {
  const key = request.headers['idempotency-key'];
  if (key === undefined) return null;
  if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{1,100}$/.test(key)) throw new ApplicationError(400, 'INVALID_IDEMPOTENCY_KEY', 'Use a request key of 1 to 100 ASCII letters, numbers, dots, colons, underscores or hyphens.');
  return key;
}

function canonicalPayload(value) {
  if (Array.isArray(value)) return value.map(canonicalPayload);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalPayload(key === 'courseIds' && Array.isArray(value[key]) ? [...value[key]].sort() : value[key])]));
  return value;
}

const payloadHash = payload => tokenHash(JSON.stringify(canonicalPayload(payload)));

async function physicalPath(path) {
  const target = resolve(path);
  const actual = await realpath(target).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (actual) return actual;
  const parent = resolve(target, '..');
  if (parent === target) return target;
  return resolve(await physicalPath(parent), target.slice(parent.length + (parent.endsWith(sep) ? 0 : 1)));
}

export async function createApplication({ databasePath = ':memory:', seedUsers = [], seedCourses = [], seedMaterialAccess = [], allowedOrigins = defaultOrigins, staticDir = null, secureCookies = false, attachmentsDir } = {}) {
  const origins = new Set(allowedOrigins.map(value => {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== value) throw new Error('Allowed origins must be complete http or https origins without paths.');
    return parsed.origin;
  }));
  const storagePath = attachmentsDir ? resolve(attachmentsDir) : databasePath === ':memory:' ? null : `${resolve(databasePath)}.attachments`;
  if (staticDir && storagePath && (storagePath === resolve(staticDir) || storagePath.startsWith(`${resolve(staticDir)}${sep}`))) throw new Error('Attachment storage must be outside the public static directory.');
  const staticRoot = staticDir ? await realpath(resolve(staticDir)).catch(() => null) : null;
  const insideStatic = path => staticRoot && (path === staticRoot || path.startsWith(`${staticRoot}${sep}`));
  if (storagePath && insideStatic(await physicalPath(storagePath))) throw new Error('Attachment storage must be outside the public static directory.');
  const store = await createStore({ databasePath, seedUsers, seedCourses, attachmentsDir });
  const materials = store.materials;
  const attachments = store.attachments;
  try {
    if (insideStatic(await realpath(attachments.directory))) throw new Error('Attachment storage must be outside the public static directory.');
    if (!Array.isArray(seedMaterialAccess)) throw new Error('Material access seeds must be an array.');
    for (const seed of seedMaterialAccess) {
      if (!seed || typeof seed !== 'object' || Array.isArray(seed) || Object.keys(seed).some(key => !['courseId', 'email'].includes(key)) || typeof seed.courseId !== 'string' || !seed.courseId || seed.courseId.length > 200 || !normaliseEmail(seed.email)) throw new Error('Material access seeds require an existing course ID and student email.');
      const person = store.userByEmail(normaliseEmail(seed.email));
      if (!person || person.role !== 'student') throw new Error('Material access may only be seeded for an existing student.');
      materials.grantCourseAccess(seed.courseId, person.id);
    }
  } catch (error) { await store.close(); throw error; }
  const dummyHash = await hashPassword(randomToken());
  const attempts = new Map();
  const cookie = (value, seconds) => `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secureCookies ? '; Secure' : ''}`;
  const allowedOrigin = (request, origin) => {
    if (typeof origin !== 'string') return false;
    if (origins.has(origin)) return true;
    // Local self-hosting may use an ephemeral test port. Only loopback hosts get this allowance.
    try {
      const self = new URL(`${secureCookies ? 'https' : 'http'}://${request.headers.host}`);
      return ['localhost', '127.0.0.1', '[::1]'].includes(self.hostname) && origin === self.origin;
    } catch { return false; }
  };
  const requireOrigin = request => {
    if (!allowedOrigin(request, request.headers.origin)) throw new ApplicationError(403, 'ORIGIN_REJECTED', 'This request origin is not allowed.');
  };
  const requireSession = request => {
    const token = sessionToken(request);
    const session = token ? store.getSession(tokenHash(token)) : null;
    if (!session) throw new ApplicationError(401, 'AUTH_REQUIRED', 'Please sign in to continue.');
    return { ...session, token };
  };
  const requireMutation = request => {
    requireOrigin(request);
    const session = requireSession(request);
    if (!matchesHash(request.headers['x-csrf-token'], session.csrfHash)) throw new ApplicationError(403, 'CSRF_REJECTED', 'Reload your session before saving.');
    return session;
  };
  function throttle(request, email) {
    const now = Date.now();
    for (const [key, attempt] of attempts) if (attempt.until <= now) attempts.delete(key);
    const ip = request.socket.remoteAddress || 'unknown';
    for (const [key, max] of [[`ip:${ip}`, 50], [`login:${ip}:${email}`, 10]]) {
      const attempt = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
      if (attempt.count >= max) throw new ApplicationError(429, 'LOGIN_RATE_LIMIT', 'Too many sign-in attempts. Please try again later.');
      attempt.count++;
      attempts.set(key, attempt);
    }
  }
  const serveStatic = async (request, response, pathname) => {
    if (!staticRoot) throw new ApplicationError(404, 'NOT_FOUND', 'Resource was not found.');
    if (request.method !== 'GET') throw new ApplicationError(405, 'METHOD_NOT_ALLOWED', 'This resource is read-only.');
    let decoded;
    try { decoded = decodeURIComponent(pathname); } catch { throw new ApplicationError(400, 'INVALID_PATH', 'Invalid URL path.'); }
    if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').includes('..')) throw new ApplicationError(400, 'INVALID_PATH', 'Invalid URL path.');
    let candidate = resolve(staticRoot, `.${decoded}`);
    if (candidate !== staticRoot && !candidate.startsWith(`${staticRoot}${sep}`)) throw new ApplicationError(403, 'PATH_REJECTED', 'This path is not allowed.');
    if (!(await stat(candidate).catch(() => null))?.isFile()) {
      if (extname(decoded)) throw new ApplicationError(404, 'NOT_FOUND', 'Resource was not found.');
      candidate = resolve(staticRoot, 'index.html');
    }
    const file = await realpath(candidate).catch(() => null);
    if (!file || !file.startsWith(`${staticRoot}${sep}`)) throw new ApplicationError(404, 'NOT_FOUND', 'Resource was not found.');
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': data.length });
    response.end(data);
  };
  const server = createServer({ maxHeaderSize: 16 * 1024, requestTimeout: 600000 }, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    if (allowedOrigin(request, request.headers.origin)) {
      response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Vary', 'Origin');
    }
    try {
      const requestUrl = new URL(request.url, 'http://localhost'), pathname = requestUrl.pathname;
      if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
        requireOrigin(request);
        response.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, HEAD, POST, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token, Idempotency-Key, X-File-Name, Range', 'Access-Control-Max-Age': '600' });
        response.end(); return;
      }
      if (pathname === '/api/health' && request.method === 'GET') { json(response, 200, { mode: 'shared-test', service: 'Beamal', storage: 'sqlite' }); return; }
      if (pathname === '/api/auth/session' && request.method === 'GET') {
        const token = sessionToken(request), session = token ? store.getSession(tokenHash(token)) : null;
        json(response, 200, session ? { user: session.user, csrfToken: csrfForToken(token) } : { user: null }); return;
      }
      if (pathname === '/api/auth/login' && request.method === 'POST') {
        requireOrigin(request);
        const input = await body(request), email = normaliseEmail(input?.email);
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['email', 'password'].includes(key)) || !email || email.length > 254 || typeof input.password !== 'string' || !input.password || input.password.length > 1024) throw new ApplicationError(400, 'INVALID_LOGIN', 'Enter an email address and password.');
        throttle(request, email);
        const user = store.userByEmail(email);
        const valid = await verifyPassword(input.password, user?.password_hash || dummyHash);
        if (!user || !valid) throw new ApplicationError(401, 'LOGIN_FAILED', 'The email address or password is incorrect.');
        const previous = sessionToken(request);
        if (previous) store.deleteSession(tokenHash(previous));
        const token = randomToken(), csrfToken = csrfForToken(token);
        store.createSession({ tokenHash: tokenHash(token), userId: user.id, csrfHash: tokenHash(csrfToken), expiresAt: Date.now() + SESSION_SECONDS * 1000 });
        response.setHeader('Set-Cookie', cookie(token, SESSION_SECONDS));
        json(response, 200, { user: store.publicUser(user), csrfToken }); return;
      }
      if (pathname === '/api/auth/logout' && request.method === 'POST') {
        const session = requireMutation(request);
        store.deleteSession(tokenHash(session.token));
        response.setHeader('Set-Cookie', cookie('', 0));
        json(response, 200, { user: null }); return;
      }
      if (pathname === '/api/catalog' && request.method === 'GET') {
        const session = requireSession(request);
        json(response, 200, store.catalogSnapshot({ publicOnly: session.user.role === 'student', since: requestUrl.searchParams.get('since') || '' })); return;
      }
      if (pathname === '/api/scheduling-resources' && request.method === 'GET') {
        const session = requireSession(request);
        if (!['admin', 'teacher'].includes(session.user.role)) throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Scheduling resources are not available for this role.');
        json(response, 200, store.schedulingResources.list({ since: requestUrl.searchParams.get('since') || '' })); return;
      }
      if (pathname === '/api/scheduling-resources' && request.method === 'POST') {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change scheduling resources.');
        const input = validateSchedulingResource(await body(request)), key = idempotencyKey(request);
        const result = store.createOnce({ userId: session.user.id, route: pathname, key, payloadHash: payloadHash(input) }, () => ({ resource: store.schedulingResources.create(input, session.user.id) }));
        json(response, result.status, result.body); return;
      }
      if (pathname === '/api/schedules' && request.method === 'GET') {
        const session = requireSession(request);
        if (!['admin', 'teacher'].includes(session.user.role)) throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'School schedules are not available for this role.');
        json(response, 200, store.schedules.list({ since: requestUrl.searchParams.get('since') || '' })); return;
      }
      if (pathname === '/api/schedules' && request.method === 'POST') {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change schedules.');
        const key = idempotencyKey(request), input = validateSchedule(await body(request));
        const result = store.createOnce({ userId: session.user.id, route: pathname, key, payloadHash: payloadHash(input) }, () => ({ schedule: store.schedules.create(input, session.user.id) }));
        json(response, result.status, result.body); return;
      }
      const courseMaterialMatch = /^\/api\/courses\/([^/]+)\/materials$/.exec(pathname);
      const uploadMatch = /^\/api\/courses\/([^/]+)\/material-uploads$/.exec(pathname);
      const attachmentMatch = /^\/api\/materials\/([^/]+)\/attachments\/([^/]+)$/.exec(pathname);
      const materialMatch = /^\/api\/materials\/([^/]+)$/.exec(pathname);
      const decodeId = part => {
        try { return decodeURIComponent(part); } catch { throw new ApplicationError(400, 'INVALID_PATH', 'Invalid resource identifier.'); }
      };
      const schedulingResourceMatch = /^\/api\/scheduling-resources\/([^/]+)$/.exec(pathname);
      if (schedulingResourceMatch && request.method === 'PATCH') {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change scheduling resources.');
        const input = validateSchedulingResource(await body(request), { update: true }), id = decodeId(schedulingResourceMatch[1]), key = idempotencyKey(request);
        const route = `PATCH /api/scheduling-resources/${encodeURIComponent(id)}`;
        const result = store.mutateOnce({ userId: session.user.id, route, key, payloadHash: payloadHash(input), status: 200 }, () => ({ resource: store.schedulingResources.update(id, input, session.user.id) }));
        json(response, result.status, result.body); return;
      }
      const courseLifecycleMatch = /^\/api\/courses\/([^/]+)(\/restore)?$/.exec(pathname);
      if (courseLifecycleMatch && ((!courseLifecycleMatch[2] && request.method === 'DELETE') || (courseLifecycleMatch[2] && request.method === 'POST'))) {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change courses.');
        const input = await body(request), version = requireVersion(input);
        if (Object.keys(input).some(key => key !== 'version')) throw new ApplicationError(400, 'INVALID_COURSE', 'This operation only accepts the current version.');
        const id = decodeId(courseLifecycleMatch[1]), restore = !!courseLifecycleMatch[2], key = idempotencyKey(request);
        const route = `${request.method} /api/courses/${encodeURIComponent(id)}${restore ? '/restore' : ''}`;
        const result = store.mutateOnce({ userId: session.user.id, route, key, payloadHash: payloadHash(input), status: 200 }, () => ({ course: store[restore ? 'restoreCourse' : 'deleteCourse'](id, version, session.user.id) }));
        json(response, result.status, result.body); return;
      }
      const scheduleMatch = /^\/api\/schedules\/([^/]+)(\/restore)?$/.exec(pathname);
      const occurrenceMatch = /^\/api\/schedules\/([^/]+)\/occurrences\/([^/]+)(\/restore)?$/.exec(pathname);
      if (occurrenceMatch && ((!occurrenceMatch[3] && ['PATCH', 'DELETE'].includes(request.method)) || (occurrenceMatch[3] && request.method === 'POST'))) {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change lessons.');
        const id = decodeId(occurrenceMatch[1]), sequenceText = decodeId(occurrenceMatch[2]), sequence = Number(sequenceText);
        if (!/^\d+$/.test(sequenceText) || !Number.isSafeInteger(sequence) || sequence < 1) throw new ApplicationError(400, 'INVALID_SCHEDULE', 'Select a valid lesson sequence.');
        const input = await body(request), action = occurrenceMatch[3] ? 'restoreOccurrence' : request.method === 'DELETE' ? 'deleteOccurrence' : 'editOccurrence';
        requireOccurrenceRequest(input, action === 'editOccurrence');
        const key = idempotencyKey(request), route = `${request.method} /api/schedules/${encodeURIComponent(id)}/occurrences/${sequence}${occurrenceMatch[3] || ''}`;
        const result = store.mutateOnce({ userId: session.user.id, route, key, payloadHash: payloadHash(input), status: 200 }, () => ({ schedule: store.schedules[action](id, sequence, input, session.user.id) }));
        json(response, result.status, result.body); return;
      }
      if (scheduleMatch && ((!scheduleMatch[2] && ['PATCH', 'DELETE'].includes(request.method)) || (scheduleMatch[2] && request.method === 'POST'))) {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change schedules.');
        const input = await body(request), action = scheduleMatch[2] ? 'restore' : request.method === 'DELETE' ? 'delete' : 'update';
        requireScheduleVersion(input, action !== 'update');
        const id = decodeId(scheduleMatch[1]), key = idempotencyKey(request);
        const route = `${request.method} /api/schedules/${encodeURIComponent(id)}${scheduleMatch[2] || ''}`;
        const result = store.mutateOnce({ userId: session.user.id, route, key, payloadHash: payloadHash(input), status: 200 }, () => ({ schedule: store.schedules[action](id, input, session.user.id) }));
        json(response, result.status, result.body); return;
      }
      if (uploadMatch && request.method === 'POST') {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can upload materials.');
        const courseId = decodeId(uploadMatch[1]), key = idempotencyKey(request);
        const course = store.getCourse(courseId);
        if (course?.deletedAt) { request.resume(); throw new ApplicationError(409, 'COURSE_DELETED', 'This course is deleted. Restore it before uploading materials.'); }
        let metadata;
        try { metadata = uploadMetadata(request); } catch (error) { request.resume(); throw error; }
        const upload = await attachments.stage(request, courseId, session.user.id, metadata, key);
        json(response, 201, { upload }); return;
      }
      if (attachmentMatch && ['GET', 'HEAD'].includes(request.method)) {
        const session = requireSession(request);
        await attachments.serve(request, response, decodeId(attachmentMatch[1]), decodeId(attachmentMatch[2]), session.user, materials, requestUrl.searchParams.get('download') === '1'); return;
      }
      if (courseMaterialMatch && request.method === 'GET') {
        const session = requireSession(request);
        json(response, 200, { materials: materials.list(decodeId(courseMaterialMatch[1]), session.user) }); return;
      }
      if (courseMaterialMatch && request.method === 'POST') {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change materials.');
        const courseId = decodeId(courseMaterialMatch[1]), key = idempotencyKey(request), material = validateMaterial(await body(request));
        const result = store.createOnce({ userId: session.user.id, route: `/api/courses/${encodeURIComponent(courseId)}/materials`, key, payloadHash: payloadHash(material) }, () => ({ material: materials.create(courseId, material, session.user) }));
        json(response, result.status, result.body); return;
      }
      if (materialMatch && request.method === 'GET') {
        const session = requireSession(request), material = materials.get(decodeId(materialMatch[1]), session.user);
        if (!material) throw new ApplicationError(404, 'MATERIAL_NOT_FOUND', 'Material was not found.');
        json(response, 200, { material }); return;
      }
      if (materialMatch && request.method === 'PATCH') {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change materials.');
        const input = await body(request), version = requireMaterialVersion(input), id = decodeId(materialMatch[1]), key = idempotencyKey(request);
        const result = store.mutateOnce({ userId: session.user.id, route: `PATCH /api/materials/${encodeURIComponent(id)}`, key, payloadHash: payloadHash(input), status: 200 }, () => ({ material: materials.update(id, input, version, session.user) }));
        json(response, result.status, result.body); return;
      }
      if (pathname === '/api/courses' && request.method === 'GET') {
        const session = requireSession(request);
        json(response, 200, { courses: store.listCourses({ publicOnly: session.user.role === 'student' }) }); return;
      }
      if (pathname === '/api/courses' && request.method === 'POST') {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change courses.');
        const key = idempotencyKey(request);
        const course = validateCourse(await body(request));
        const result = store.createOnce({ userId: session.user.id, route: pathname, key, payloadHash: payloadHash(course) }, () => ({ course: store.createCourse(course, session.user.id) }));
        json(response, result.status, result.body); return;
      }
      const match = /^\/api\/courses\/([^/]+)$/.exec(pathname);
      if (match && request.method === 'PATCH') {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change courses.');
        const input = await body(request), version = requireVersion(input);
        let id;
        try { id = decodeURIComponent(match[1]); } catch { throw new ApplicationError(400, 'INVALID_PATH', 'Invalid course identifier.'); }
        const current = store.getCourse(id);
        if (!current) throw new ApplicationError(404, 'COURSE_NOT_FOUND', 'Course was not found.');
        if (current.deletedAt) throw new ApplicationError(409, 'COURSE_DELETED', 'This course is deleted. Restore it before making changes.');
        if (current.version !== version) throw new ApplicationError(409, 'VERSION_CONFLICT', 'This course was changed by someone else. Reload it before saving.');
        const updatePricing = hasPricingFields(input);
        const course = updatePricing ? validateCourse(input, current) : validateCourseMetadata(input, current);
        json(response, 200, { course: store.updateCourse(id, course, version, session.user.id, updatePricing) }); return;
      }
      if (pathname === '/api/fees' && request.method === 'GET') {
        const session = requireSession(request);
        json(response, 200, { fees: store.listFees({ publicOnly: session.user.role === 'student' }) }); return;
      }
      if (pathname === '/api/fees' && request.method === 'POST') {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change fees.');
        const key = idempotencyKey(request);
        const fee = validateFee(await body(request));
        const result = store.createOnce({ userId: session.user.id, route: pathname, key, payloadHash: payloadHash(fee) }, () => {
          const saved = store.createFee(fee, session.user.id);
          return { fee: saved, courses: saved.courseIds.map(id => store.getCourse(id)) };
        });
        json(response, result.status, result.body); return;
      }
      const feeMatch = /^\/api\/fees\/([^/]+)$/.exec(pathname);
      if (feeMatch && request.method === 'PATCH') {
        const session = requireMutation(request);
        if (session.user.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change fees.');
        const input = await body(request), version = requireVersion(input);
        let id;
        try { id = decodeURIComponent(feeMatch[1]); } catch { throw new ApplicationError(400, 'INVALID_PATH', 'Invalid fee identifier.'); }
        const current = store.getFee(id);
        if (!current) throw new ApplicationError(404, 'FEE_NOT_FOUND', 'Fee was not found.');
        if (current.version !== version) throw new ApplicationError(409, 'VERSION_CONFLICT', 'This fee was changed by someone else. Reload it before saving.');
        const fee = validateFee(input, current);
        json(response, 200, store.updateFee(id, fee, version, session.user.id, true)); return;
      }
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        const known = match || feeMatch || courseMaterialMatch || materialMatch || uploadMatch || attachmentMatch || scheduleMatch || occurrenceMatch || courseLifecycleMatch || schedulingResourceMatch || ['/api/health', '/api/auth/session', '/api/auth/login', '/api/auth/logout', '/api/courses', '/api/fees', '/api/catalog', '/api/schedules', '/api/scheduling-resources'].includes(pathname);
        throw new ApplicationError(known ? 405 : 404, known ? 'METHOD_NOT_ALLOWED' : 'NOT_FOUND', 'API route or method is not available.');
      }
      await serveStatic(request, response, pathname);
    } catch (error) {
      if (response.destroyed || response.writableEnded) return;
      if (response.headersSent) { response.destroy(); return; }
      if (error instanceof ApplicationError) {
        if (error.status === 429) response.setHeader('Retry-After', '900');
        json(response, error.status, { error: { code: error.code, message: error.message } });
      } else json(response, 500, { error: { code: 'INTERNAL_ERROR', message: 'Could not complete this request. Please try again.' } });
    }
  });
  let closed = false;
  return {
    server, store, materials, attachments, attachmentsDir: attachments.directory,
    async close() {
      if (closed) return;
      closed = true;
      if (server.listening) await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
      await store.close();
    },
  };
}
