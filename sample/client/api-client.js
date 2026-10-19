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
export function createApiClient({ baseUrl = import.meta.env?.VITE_BEAMAL_API_BASE_URL || '' } = {}) {
  // Keep production browser requests on the Vercel origin so Safari accepts the session cookie.
  const apiBaseUrl=import.meta.env?.PROD?'':String(baseUrl).replace(/\/+$/,'');
  let csrfToken = '', cookieCsrfToken = '', identityKey = '';
  let authEpoch = 0, authMutation = Promise.resolve();
  const superseded = () => new ApiError('The signed-in account changed.', 0, 'AUTH_SUPERSEDED');
  function invalidateSession() { authEpoch++; csrfToken = ''; cookieCsrfToken = ''; identityKey = ''; }
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
    let epoch = authEpoch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${apiBaseUrl}/api${path}`, {
        method,
        credentials: apiBaseUrl ? 'include' : 'same-origin',
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
      if (path === '/auth/session' || authOperation) {
        const nextIdentity = data.user ? `${data.user.id}:${data.user.role}:${data.user.accessRevision??''}` : '';
        if (path === '/auth/session' && identityKey !== nextIdentity) epoch = ++authEpoch;
        identityKey = nextIdentity;
        if (!nextIdentity) csrfToken = cookieCsrfToken = '';
      }
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
    feeHistory: id => request(`/fees/${encodeURIComponent(id)}/history`),
    packageContents: id => request(`/fees/${encodeURIComponent(id)}/package-contents`),
    savePackageContents: (id,input,operationKey) => request(`/fees/${encodeURIComponent(id)}/package-contents`, {method:'PATCH',body:{version:input.version,feeVersion:input.feeVersion,components:input.components},idempotencyKey:operationKey}),
    availability(range, revision = '') {
      const query = new URLSearchParams();
      for (const key of ['from', 'to', 'courseId']) if (range?.[key]) query.set(key, range[key]);
      if (revision) query.set('since', revision);
      return request(`/available-slots?${query}`);
    },
    availableSlot: id => request(`/available-slots/${encodeURIComponent(id)}`),
    saveAvailableSlot(profile, current, operationKey) {
      return request(current ? `/available-slots/${encodeURIComponent(current.id)}` : '/available-slots', {
        method: current ? 'PATCH' : 'POST',
        body: { ...profile, ...(current ? { version: current.version } : {}) },
        idempotencyKey: operationKey,
      });
    },
    availabilityPublicSettings: () => request('/availability-public-settings'),
    saveAvailabilityPublicSettings(settings, current, operationKey) {
      return request('/availability-public-settings', {
        method: 'PATCH',
        body: { showFullTrialSlots: settings.showFullTrialSlots, showReschedulingSlots: settings.showReschedulingSlots, ...(Object.hasOwn(settings, 'rangeDays') ? { rangeDays: settings.rangeDays } : {}), version: current.version },
        idempotencyKey: operationKey,
      });
    },
    publicNews: () => request('/public/news'),
    websiteNews: () => request('/news'),
    saveWebsiteNews: (post,current,key) => request(current?'/news/'+encodeURIComponent(current.id):'/news',{method:current?'PATCH':'POST',body:{...post,...(current?{version:current.version}:{})},idempotencyKey:key}),
    importWebsiteNews: (posts,key) => request('/news/import',{method:'POST',body:{posts},idempotencyKey:key}),
    publicCatalog: (revision = '') => request(`/public/catalog${revision ? '?since=' + encodeURIComponent(revision) : ''}`),
    publicTrialTimes: (courseId, revision = '') => request(`/public/courses/${encodeURIComponent(courseId)}/trial-times${revision ? '?since=' + encodeURIComponent(revision) : ''}`),
    createTrialApplication: application => request('/trial-applications', { method: 'POST', body: application }),
    publicTimetable(from, revision = '', days) {
      const query = new URLSearchParams();
      if (from) query.set('from', from);
      if (revision) query.set('since', revision);
      if (days !== undefined) query.set('days', days);
      return request(`/public/timetable${query.size ? '?' + query : ''}`);
    },
    publicCourses: (revision = '') => request(`/public/courses${revision ? '?since=' + encodeURIComponent(revision) : ''}`),
    publicTrialPolicy: () => request('/public/trial-form-policy'),
    submitPublicTrial: (input, operationKey) => request('/public/trial-applications', { method: 'POST', body: input, idempotencyKey: operationKey }),
    trialApplications(query = {}, revision = '') {
      const params = new URLSearchParams();
      for (const key of ['personId','status','page','pageSize']) if (query[key] !== undefined && query[key] !== '') params.set(key,String(query[key]));
      if (revision) params.set('since',revision);
      return request('/trial-applications' + (params.size ? '?' + params : ''));
    },
    trialApplication: id => request('/trial-applications/' + encodeURIComponent(id)),
    trialWork: (revision = '') => request('/trial-applications/work' + (revision ? '?since=' + encodeURIComponent(revision) : '')),
    rejectTrialApplication: (id, version, operationKey) => request('/trial-applications/' + encodeURIComponent(id) + '/reject', { method:'POST',body:{version},idempotencyKey:operationKey }),
    publicCourseDetails(id, from, revision = '', days) {
      const query = new URLSearchParams();
      if (from) query.set('from', from);
      if (revision) query.set('since', revision);
      if (days !== undefined) query.set('days', days);
      return request(`/public/courses/${encodeURIComponent(id)}${query.size ? '?' + query : ''}`);
    },
    people: (query = {}, revision = '') => {
      const parameters = new URLSearchParams();
      for (const field of ['kind', 'q', 'page', 'pageSize', 'sort', 'direction']) {
        if (query[field] !== undefined && query[field] !== '') parameters.set(field, String(query[field]));
      }
      if (revision) parameters.set('since', revision);
      return request(`/people${parameters.size ? '?' + parameters.toString() : ''}`);
    },
    person: id => request(`/people/${encodeURIComponent(id)}`),
    personHistory: id => request(`/people/${encodeURIComponent(id)}/history`),
    studentWorkspace: id => request('/people/'+encodeURIComponent(id)+'/workspace'),
    studentRecords(query={}) {const params=new URLSearchParams();for(const key of ['kind','studentId','q','page','pageSize','status','visibility','type','date','period'])if(query[key]!==undefined&&query[key]!=='')params.set(key,query[key]);return request('/student-records?'+params);},
    studentRecord: id => request('/student-records/'+encodeURIComponent(id)),
    saveStudentRecord: (fields,current,key) => request(current?'/student-records/'+encodeURIComponent(current.id):'/student-records',{method:current?'PATCH':'POST',body:{...fields,...(current?{version:current.version}:{})},idempotencyKey:key}),
    studentFamilyRecords: () => request('/student/records'),
    signStudentNotice: (id,fields,key) => request('/student-records/'+encodeURIComponent(id)+'/sign',{method:'POST',body:fields,idempotencyKey:key}),
    savePerson(profile, current, operationKey) {
      return request(current ? `/people/${encodeURIComponent(current.id)}` : '/people', {
        method: current ? 'PATCH' : 'POST',
        body: { ...profile, ...(current ? { version: current.version } : {}) },
        idempotencyKey: operationKey,
      });
    },
    studentAccountLinks: () => request('/student-account-links'),
    saveStudentAccountLink: (studentId, userId, version, operationKey) => request(`/people/${encodeURIComponent(studentId)}/account-link`, {method:'PATCH',body:{userId,version},idempotencyKey:operationKey}),
    studentProfile: () => request('/student/profile'),
    studentReschedulingTimes: id => request('/student/lessons/'+encodeURIComponent(id)+'/rescheduling-times'),
    availabilityRuleOptions: () => request('/availability-rule-options'),
    lessonRequests: () => request('/lesson-requests'),
    createLessonRequest: (fields, operationKey) => request('/lesson-requests', {method:'POST',body:fields,idempotencyKey:operationKey}),
    assignLessonRequest: (id, fields, operationKey) => request(`/lesson-requests/${encodeURIComponent(id)}/assign`, {method:'POST',body:fields,idempotencyKey:operationKey}),
    orders: () => request('/orders'),
    order: id => request(`/orders/${encodeURIComponent(id)}`),
    createOrder: (order, operationKey) => request('/orders', {method:'POST',body:order,idempotencyKey:operationKey}),
    sendOrder: (current, operationKey) => request(`/orders/${encodeURIComponent(current.id)}/send`, {method:'POST',body:{version:current.version},idempotencyKey:operationKey}),
    respondOrder: (current, action, reason, operationKey) => request(`/orders/${encodeURIComponent(current.id)}/respond`, {method:'POST',body:{version:current.version,action,reason},idempotencyKey:operationKey}),
    confirmOrderPayment: (current, operationKey) => request(`/orders/${encodeURIComponent(current.id)}/confirm-payment`, {method:'POST',body:{version:current.version},idempotencyKey:operationKey}),
    studentTimetable(range, revision='') {const parameters=new URLSearchParams();for(const key of ['from','to'])if(range?.[key])parameters.set(key,range[key]);if(revision)parameters.set('since',revision);return request(`/student/timetable?${parameters}`);},
    timetableFilterFacts(range, revision='') {const parameters=new URLSearchParams();for(const key of ['from','to'])if(range?.[key])parameters.set(key,range[key]);if(revision)parameters.set('since',revision);return request(`/timetable/filter-facts?${parameters}`);},
    staffPersonalProfiles: (revision='') => request(`/staff/personal-profiles${revision?'?since='+encodeURIComponent(revision):''}`),
    lessonStudents: (scheduleId, sequence) => request(`/schedules/${encodeURIComponent(scheduleId)}/occurrences/${encodeURIComponent(sequence)}/students`),
    pendingArrangement: id => request('/student-sessions/'+encodeURIComponent(id)+'/arrangement'),
    parentMessageContext: id => request('/student-sessions/'+encodeURIComponent(id)+'/parent-message-context'),
    parentMessageTemplates(query={},revision='') {const parameters=new URLSearchParams();for(const key of ['q','status','page','pageSize'])if(query[key]!==undefined)parameters.set(key,query[key]);if(revision)parameters.set('since',revision);return request('/parent-message-templates'+(parameters.size?'?'+parameters:''));},
    parentMessageTemplate: id => request('/parent-message-templates/'+encodeURIComponent(id)),
    createParentMessageTemplate: (fields,operationKey) => request('/parent-message-templates',{method:'POST',body:{title:fields.title,body:fields.body},idempotencyKey:operationKey}),
    updateParentMessageTemplate: (id,fields,operationKey) => request('/parent-message-templates/'+encodeURIComponent(id),{method:'PATCH',body:{version:fields.version,title:fields.title,body:fields.body},idempotencyKey:operationKey}),
    archiveParentMessageTemplate: (id,version,operationKey) => request('/parent-message-templates/'+encodeURIComponent(id)+'/archive',{method:'POST',body:{version},idempotencyKey:operationKey}),
    restoreParentMessageTemplate: (id,version,operationKey) => request('/parent-message-templates/'+encodeURIComponent(id)+'/restore',{method:'POST',body:{version},idempotencyKey:operationKey}),
    sendParentMessage: (id,fields,operationKey) => request('/student-sessions/'+encodeURIComponent(id)+'/parent-messages',{method:'POST',body:{revision:fields.revision,message:fields.message},idempotencyKey:operationKey}),
    parentMessagesInbox(query={},revision='') {const parameters=new URLSearchParams();for(const key of ['page','pageSize'])if(query[key]!==undefined)parameters.set(key,query[key]);if(revision)parameters.set('since',revision);return request('/parent-messages/inbox'+(parameters.size?'?'+parameters:''));},
    savePendingArrangement: (id, fields, operationKey) => request('/student-sessions/'+encodeURIComponent(id)+'/pending-arrangement',{method:'PATCH',body:fields,idempotencyKey:operationKey}),
    availabilityPendingArrangements() {return request('/availability-pending-arrangements');},
    pendingArrangementWork(query={},revision='') {const parameters=new URLSearchParams();for(const key of ['page','pageSize'])if(query[key]!==undefined)parameters.set(key,query[key]);if(revision)parameters.set('since',revision);return request('/pending-arrangements'+(parameters.size?'?'+parameters:''));},
    catalog: (revision = '') => request(`/catalog${revision ? `?since=${encodeURIComponent(revision)}` : ''}`),
    materials: courseId => request(`/courses/${encodeURIComponent(courseId)}/materials`),
    schedules: (revision = '', range = {}) => {const query=[...(revision?[['since',revision]]:[]),...(range.from?[['from',range.from]]:[]),...(range.to?[['to',range.to]]:[])].map(([key,value])=>`${key}=${encodeURIComponent(value)}`).join('&');return request(`/schedules${query?'?'+query:''}`)},
    schedulingResources: (revision = '') => request(`/scheduling-resources${revision ? `?since=${encodeURIComponent(revision)}` : ''}`),
    classTypes: (revision = '') => request(`/class-types${revision ? `?since=${encodeURIComponent(revision)}` : ''}`),
    createClassType(fields, operationKey) {
      const body = Object.fromEntries(['name', 'studentReschedulingAllowed', 'active'].map(key => [key, fields[key]]));
      return request('/class-types', { method: 'POST', body, idempotencyKey: operationKey });
    },
    updateClassType(current, fields, operationKey) {
      const body = Object.fromEntries(['name', 'studentReschedulingAllowed', 'active'].map(key => [key, fields[key]]));
      return request(`/class-types/${encodeURIComponent(current.id)}`, { method: 'PATCH', body: { ...body, version: current.version }, idempotencyKey: operationKey });
    },
    classCapacityStatuses(revision = '', range = {}) {
      const parameters = new URLSearchParams();
      for (const key of ['from', 'to', 'courseId']) if (range[key]) parameters.set(key, range[key]);
      if (revision) parameters.set('since', revision);
      return request(`/class-capacity-statuses${parameters.size ? '?' + parameters.toString() : ''}`);
    },
    classCapacityStatus: (scheduleId, sequence) => request(`/schedules/${encodeURIComponent(scheduleId)}/occurrences/${encodeURIComponent(sequence)}/capacity-status`),
    saveClassCapacityStatus(current, manualStatus, operationKey) {
      return request(`/schedules/${encodeURIComponent(current.scheduleId)}/occurrences/${encodeURIComponent(current.sequence)}/capacity-status`, {
        method: 'PATCH', body: { version: current.version, sourceVersion: current.sourceVersion, manualStatus }, idempotencyKey: operationKey,
      });
    },
    accessControl: (revision = '') => request(`/access-control${revision ? `?since=${encodeURIComponent(revision)}` : ''}`),
    saveTeacherLink(teacherResourceId, userId, version, operationKey) {
      return request(`/access-control/teacher-links/${encodeURIComponent(teacherResourceId)}`, {
        method: 'PATCH', body: { userId, version }, idempotencyKey: operationKey,
      });
    },
    createScopeGrant(grant, operationKey) {
      return request('/access-control/grants', { method: 'POST', body: grant, idempotencyKey: operationKey });
    },
    setScopeGrantActive(grant, active, operationKey) {
      return request(`/access-control/grants/${encodeURIComponent(grant.id)}`, {
        method: 'PATCH', body: { version: grant.version, active }, idempotencyKey: operationKey,
      });
    },
    saveSchedulingResource(resource, current, operationKey) {
      const {kind,...fields}=resource;
      return request(current ? `/scheduling-resources/${encodeURIComponent(current.id)}` : '/scheduling-resources', {
        method: current ? 'PATCH' : 'POST', body: {...fields,...(current ? {version:current.version} : {kind})}, idempotencyKey:operationKey,
      });
    },
    saveSchedule(schedule, current, operationKey) {
      return request(current ? `/schedules/${encodeURIComponent(current.id)}` : '/schedules', {
        method: current ? 'PATCH' : 'POST', body: { ...schedule, ...(current ? { version: current.version } : {}) }, idempotencyKey: operationKey,
      });
    },
    saveScheduleOccurrence(schedule, current, sequence, scope, operationKey) {
      return request(`/schedules/${encodeURIComponent(current.id)}/occurrences/${encodeURIComponent(sequence)}`, {
        method: 'PATCH', body: { ...schedule, version: current.version, scope }, idempotencyKey: operationKey,
      });
    },
    deleteScheduleOccurrence: (current, sequence, scope, operationKey) => request(`/schedules/${encodeURIComponent(current.id)}/occurrences/${encodeURIComponent(sequence)}`, { method: 'DELETE', body: { version: current.version, scope }, idempotencyKey: operationKey }),
    restoreScheduleOccurrence: (current, sequence, scope, operationKey) => request(`/schedules/${encodeURIComponent(current.id)}/occurrences/${encodeURIComponent(sequence)}/restore`, { method: 'POST', body: { version: current.version, scope }, idempotencyKey: operationKey }),
    deleteSchedule: (current, operationKey) => request(`/schedules/${encodeURIComponent(current.id)}`, { method: 'DELETE', body: { version: current.version }, idempotencyKey: operationKey }),
    restoreSchedule: (current, operationKey) => request(`/schedules/${encodeURIComponent(current.id)}/restore`, { method: 'POST', body: { version: current.version }, idempotencyKey: operationKey }),
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
    deleteCourse: (current, operationKey) => request(`/courses/${encodeURIComponent(current.id)}`, { method: 'DELETE', body: { version: current.version }, idempotencyKey: operationKey }),
    restoreCourse: (current, operationKey) => request(`/courses/${encodeURIComponent(current.id)}/restore`, { method: 'POST', body: { version: current.version }, idempotencyKey: operationKey }),
    recordStudentAttendance: (sessionId, fields, operationKey) => request(`/student-sessions/${encodeURIComponent(sessionId)}/attendance`, { method: 'PATCH', body: fields, idempotencyKey: operationKey }),
    dateNoteIndicators: (from,to) => request(`/date-notes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    dateNote: date => request(`/date-notes/${encodeURIComponent(date)}`),
    saveDateNote: (date, fields, operationKey) => request(`/date-notes/${encodeURIComponent(date)}`, {method:'PATCH',body:fields,idempotencyKey:operationKey}),
    lessonNote: (scheduleId, sequence) => request(`/schedules/${encodeURIComponent(scheduleId)}/occurrences/${encodeURIComponent(sequence)}/note`),
    saveLessonNote: (scheduleId, sequence, fields, operationKey) => request(`/schedules/${encodeURIComponent(scheduleId)}/occurrences/${encodeURIComponent(sequence)}/note`, { method: 'PATCH', body: fields, idempotencyKey: operationKey }),
    updateCourseMetadata: (id, fields, operationKey) => request(`/courses/${encodeURIComponent(id)}`, { method: 'PATCH', body: fields, idempotencyKey: operationKey }),
    saveCourse(course, current, operationKey) {
      const fields = ['courseName', 'courseNameEn', 'feeName', 'feeNameEn', 'category', 'level', 'publicColor', 'classTypeId', 'classTypeVersion', 'pricingModel', 'price', 'months', 'duration', 'packageType', 'packageTotal', 'bookingExpiry', 'onlineStore'];
      const body = Object.fromEntries(fields.filter(key => course[key] !== undefined).map(key => [key, course[key]]));
      if (current) body.version = current.version;
      return request(current ? `/courses/${encodeURIComponent(current.id)}` : '/courses', { method: current ? 'PATCH' : 'POST', body, ...(!current ? { idempotencyKey: operationKey } : {}) });
    },
  };
}
