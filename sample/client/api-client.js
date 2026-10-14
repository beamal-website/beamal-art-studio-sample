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
  let csrfToken = '';
  async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
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
          ...(method === 'GET' ? {} : { 'X-CSRF-Token': csrfToken }),
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      let data;
      try { data = await response.json(); }
      catch { throw new ApiError('The shared service is unavailable.', response.status, 'service_unavailable'); }
      if (!response.ok) throw new ApiError(data.error?.message || 'Request failed.', response.status, data.error?.code);
      if (typeof data.csrfToken === 'string') csrfToken = data.csrfToken;
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Could not reach the service. Please try again.');
    } finally { clearTimeout(timeout); }
  }
  return {
    health: () => request('/health'),
    session: () => request('/auth/session'),
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    async logout() { const result = await request('/auth/logout', { method: 'POST' }); csrfToken = ''; return result; },
    courses: () => request('/courses'),
    fees: () => request('/fees'),
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
