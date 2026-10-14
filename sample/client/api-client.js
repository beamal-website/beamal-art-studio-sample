import { uploadMaterialAttachment } from './attachment-client.js';

export class ApiError extends Error {
  constructor(message, status = 0, code = 'connection_failed') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Only explicit operations are sent to the service. The browser's legacy
// state is never uploaded wholesale, so another user's work cannot be reset.
export function createApiClient() {
  let csrfToken = '', cookieCsrfToken = '';
  let authEpoch = 0, authMutation = Promise.resolve();
  const superseded = () => new ApiError('The signed-in account changed.', 0, 'AUTH_SUPERSEDED');
  function invalidateSession() { authEpoch++; csrfToken = ''; cookieCsrfToken = ''; }
  function mutateAuth(operation) {
    const epoch = ++authEpoch;
    // Cookie-changing replies must arrive in order. An older logout must not
    // clear the browser cookie after a newer login has already succeeded.
    const pending = authMutation.then(() => {
      if (epoch !== authEpoch) throw superseded();
      return operation(epoch);
    });
    authMutation = pending.catch(() => {});
    return pending;
  }
  async function request(path, { method = 'GET', body, idempotencyKey, authOperation } = {}) {
    const epoch = authEpoch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`/api${path}`, {
        method,
        credentials: 'same-origin',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(method === 'GET' ? {} : { 'X-CSRF-Token': authOperation === 'logout' ? cookieCsrfToken : csrfToken }),
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      let data;
      try { data = await response.json(); }
      catch { throw new ApiError('The shared service is unavailable.', response.status, 'service_unavailable'); }
      // A serialized login may set the browser cookie even when its UI result
      // is obsolete. Keep only its cookie-bound token for the queued logout;
      // never adopt that old response as the current application identity.
      if (response.ok && authOperation === 'login' && typeof data.csrfToken === 'string') cookieCsrfToken = data.csrfToken;
      if (response.ok && authOperation === 'logout') cookieCsrfToken = '';
      if (epoch !== authEpoch) throw superseded();
      if (!response.ok) throw new ApiError(data.error?.message || 'Request failed.', response.status, data.error?.code);
      if (typeof data.csrfToken === 'string') csrfToken = cookieCsrfToken = data.csrfToken;
      return data;
    } catch (error) {
      if (epoch !== authEpoch) throw superseded();
      if (error instanceof ApiError) throw error;
      throw new ApiError('Could not reach the service. Please try again.');
    } finally { clearTimeout(timeout); }
  }
  return {
    health: () => request('/health'),
    session: () => request('/auth/session'),
    invalidateSession,
    login: (email, password) => mutateAuth(() => request('/auth/login', { method: 'POST', body: { email, password }, authOperation: 'login' })),
    logout: () => mutateAuth(async epoch => { const result = await request('/auth/logout', { method: 'POST', authOperation: 'logout' }); if (epoch === authEpoch) csrfToken = ''; return result; }),
    courses: () => request('/courses'),
    fees: () => request('/fees'),
    catalog: (revision = '') => request(`/catalog${revision ? `?since=${encodeURIComponent(revision)}` : ''}`),
    materials: courseId => request(`/courses/${encodeURIComponent(courseId)}/materials`),
    uploadMaterialAttachment: (courseId, file, options) => uploadMaterialAttachment(courseId, file, { ...options, csrfToken }),
    saveMaterial(courseId, material, current, operationKey) {
      return request(current ? `/materials/${encodeURIComponent(current.id)}` : `/courses/${encodeURIComponent(courseId)}/materials`, {
        method: current ? 'PATCH' : 'POST',
        body: { ...material, ...(current ? { version: current.version } : {}) },
        idempotencyKey: operationKey,
      });
    },
    saveFee(fee, current, operationKey) {
      return request(current ? `/fees/${encodeURIComponent(current.id)}` : '/fees', {
        method: current ? 'PATCH' : 'POST',
        body: { ...fee, ...(current ? { version: current.version } : {}) },
        ...(!current ? { idempotencyKey: operationKey } : {}),
      });
    },
    updateCourseMetadata: (id, fields) => request(`/courses/${encodeURIComponent(id)}`, { method: 'PATCH', body: fields }),
    saveCourse(course, current, operationKey) {
      const fields = ['courseName', 'feeName', 'category', 'level', 'pricingModel', 'price', 'months', 'duration', 'packageType', 'packageTotal', 'bookingExpiry', 'onlineStore'];
      const body = Object.fromEntries(fields.filter(key => course[key] !== undefined).map(key => [key, course[key]]));
      if (current) body.version = current.version;
      return request(current ? `/courses/${encodeURIComponent(current.id)}` : '/courses', { method: current ? 'PATCH' : 'POST', body, ...(!current ? { idempotencyKey: operationKey } : {}) });
    },
  };
}
