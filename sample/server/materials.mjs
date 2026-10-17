import { randomUUID } from 'node:crypto';
import { ApplicationError } from './validation.mjs';

const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const invalid = message => { throw new ApplicationError(400, 'INVALID_MATERIAL', message); };

export function validateMaterial(input, current = null) {
  if (!plainObject(input)) invalid('Material must be a JSON object.');
  const allowed = new Set(['name', 'description', 'videoLinks', 'visibleToStudents', 'studentDownload', 'version', 'attachments', 'lessonIds']);
  for (const key of Object.keys(input)) if (!allowed.has(key)) invalid(`Unsupported material field: ${key}.`);
  for (const key of ['lessonIds']) {
    if (Object.hasOwn(input, key) && (!Array.isArray(input[key]) || input[key].length)) invalid(`${key} are not available in this material service yet.`);
  }
  if (Object.hasOwn(input, 'attachments') && (!Array.isArray(input.attachments) || input.attachments.length > 20 || input.attachments.some(id => typeof id !== 'string' || !id || id.length > 200) || new Set(input.attachments).size !== input.attachments.length)) invalid('Select at most 20 different uploaded attachment IDs.');
  const source = current ? { ...current, ...input } : input;
  if (typeof source.name !== 'string' || !source.name.trim() || source.name.trim().length > 200) invalid('Name must be non-empty text of at most 200 characters.');
  const description = source.description === undefined ? '' : source.description;
  if (typeof description !== 'string' || description.length > 10000) invalid('Description must be text of at most 10000 characters.');
  const links = source.videoLinks === undefined ? [] : source.videoLinks;
  if (!Array.isArray(links) || links.length > 20) invalid('Provide at most 20 video links.');
  const videoLinks = links.map(value => {
    if (typeof value !== 'string' || value.trim().length > 4096 || !/^https?:\/\//i.test(value.trim())) invalid('Video links must be complete HTTP or HTTPS URLs.');
    let url;
    try { url = new URL(value.trim()); } catch { invalid('Video links must be valid HTTP or HTTPS URLs.'); }
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) invalid('Video links must use HTTP or HTTPS without embedded credentials.');
    return url.href;
  });
  for (const key of ['visibleToStudents', 'studentDownload']) if (source[key] !== undefined && typeof source[key] !== 'boolean') invalid(`${key} must be true or false.`);
  const visibleToStudents = source.visibleToStudents ?? false;
  return { name: source.name.trim(), description: description.trim(), videoLinks, visibleToStudents, studentDownload: visibleToStudents && (source.studentDownload ?? false), attachments: Object.hasOwn(input, 'attachments') ? [...input.attachments] : current?.attachments?.map(file => file.id) || [] };
}

export function requireMaterialVersion(input) {
  if (!plainObject(input) || !Number.isSafeInteger(input.version) || input.version < 1) throw new ApplicationError(409, 'VERSION_REQUIRED', 'Reload the material and include its current version before saving.');
  return input.version;
}

export function createMaterialSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id),
      name TEXT NOT NULL, description TEXT NOT NULL, video_links TEXT NOT NULL,
      visible_to_students INTEGER NOT NULL CHECK(visible_to_students IN (0, 1)),
      student_download INTEGER NOT NULL CHECK(student_download IN (0, 1)),
      owner_id TEXT NOT NULL REFERENCES users(id),
      version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      CHECK(visible_to_students = 1 OR student_download = 0)
    );
    CREATE INDEX IF NOT EXISTS materials_course ON materials(course_id, created_at, id);
    CREATE TABLE IF NOT EXISTS course_material_access (
      course_id TEXT NOT NULL REFERENCES courses(id), user_id TEXT NOT NULL REFERENCES users(id),
      PRIMARY KEY(course_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS material_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL, material_id TEXT NOT NULL REFERENCES materials(id),
      version INTEGER NOT NULL, snapshot TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
}

export function createMaterialStore({ database, transaction, attachments, accessControl }) {
  const identity = user => user && typeof user.id === 'string' ? database.prepare('SELECT id, display_name, role FROM users WHERE id = ?').get(user.id) : null;
  const courseRecord = id => typeof id === 'string' ? database.prepare('SELECT id, deleted_at FROM courses WHERE id = ?').get(id) : null;
  const activeCourse = id => {
    const course = courseRecord(id);
    if (!course) throw new ApplicationError(404, 'COURSE_NOT_FOUND', 'Course was not found.');
    if (course.deleted_at) throw new ApplicationError(409, 'COURSE_DELETED', 'This course is deleted. Restore it before adding materials or access.');
    return course;
  };
  const access = (courseId, userId) => !!database.prepare('SELECT 1 FROM course_material_access WHERE course_id = ? AND user_id = ?').get(courseId, userId);
  const canReadCourse = (courseId, person) => {
    const course = person && courseRecord(courseId);
    return course && (person.role === 'admin' || person.role === 'teacher' && accessControl.canReadCourse(courseId, person) || person.role === 'student' && !course.deleted_at && access(courseId, person.id));
  };
  const dto = (row, attachmentMap = null) => row ? {
    id: row.id, courseId: row.course_id, name: row.name, description: row.description,
    videoLinks: JSON.parse(row.video_links), visibleToStudents: !!row.visible_to_students, studentDownload: !!row.student_download,
    owner: { id: row.owner_id, displayName: row.owner_name }, version: row.version,
    createdAt: row.created_at, updatedAt: row.updated_at,
    attachments: attachmentMap ? attachmentMap.get(row.id) || [] : attachments?.list(row.id) || [],
  } : null;
  const select = 'SELECT materials.*, users.display_name AS owner_name FROM materials JOIN users ON users.id = materials.owner_id';
  const record = id => database.prepare(`${select} WHERE materials.id = ?`).get(id);
  const get = (id, user) => {
    const person = identity(user), row = record(id);
    return row && canReadCourse(row.course_id, person) && (person.role !== 'student' || row.visible_to_students) ? dto(row) : null;
  };
  const list = (courseId, user) => transaction(() => {
    const person = identity(user);
    if (!canReadCourse(courseId, person)) throw new ApplicationError(404, 'COURSE_NOT_FOUND', 'Course was not found.');
    const rows = database.prepare(`${select} WHERE materials.course_id = ? ${person.role === 'student' ? 'AND materials.visible_to_students = 1' : ''} ORDER BY materials.created_at, materials.id`).all(courseId);
    const attachmentMap = attachments?.listMany(rows.map(row => row.id)) || null;
    return rows.map(row => dto(row, attachmentMap));
  }, 'read');
  const administrator = actor => {
    const person = identity(actor);
    if (person?.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change materials.');
    return person;
  };
  const audit = (actor, action, material) => database.prepare('INSERT INTO material_audit_log(actor_id, action, material_id, version, snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(actor.id, action, material.id, material.version, JSON.stringify(material), material.updatedAt);
  const create = (courseId, input, actor) => transaction(() => {
    const person = administrator(actor);
    activeCourse(courseId);
    const fields = validateMaterial(input), id = randomUUID(), now = new Date().toISOString();
    database.prepare('INSERT INTO materials(id, course_id, name, description, video_links, visible_to_students, student_download, owner_id, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)').run(id, courseId, fields.name, fields.description, JSON.stringify(fields.videoLinks), Number(fields.visibleToStudents), Number(fields.studentDownload), person.id, now, now);
    attachments?.bind(id, courseId, fields.attachments, person.id);
    const material = dto(record(id));
    audit(person, 'material.create', material);
    return material;
  });
  const update = (id, input, version, actor) => transaction(() => {
    const person = administrator(actor), current = dto(record(id));
    if (!current) throw new ApplicationError(404, 'MATERIAL_NOT_FOUND', 'Material was not found.');
    if (!Number.isSafeInteger(version) || version < 1) throw new ApplicationError(409, 'VERSION_REQUIRED', 'Reload the material and include its current version before saving.');
    if (current.version !== version) throw new ApplicationError(409, 'VERSION_CONFLICT', 'This material was changed by someone else. Reload it before saving.');
    const fields = validateMaterial(input, current), now = new Date().toISOString();
    const changed = database.prepare('UPDATE materials SET name = ?, description = ?, video_links = ?, visible_to_students = ?, student_download = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?').run(fields.name, fields.description, JSON.stringify(fields.videoLinks), Number(fields.visibleToStudents), Number(fields.studentDownload), now, id, version);
    if (changed.changes !== 1) throw new ApplicationError(409, 'VERSION_CONFLICT', 'This material was changed by someone else. Reload it before saving.');
    if (Object.hasOwn(input, 'attachments')) attachments?.bind(id, current.courseId, fields.attachments, person.id);
    const material = dto(record(id));
    audit(person, 'material.update', material);
    return material;
  });
  // Access is granted only by trusted seed/enrolment code, never by a public HTTP route.
  const grantCourseAccess = (courseId, userId) => transaction(() => {
    const person = identity({ id: userId });
    if (!courseRecord(courseId) || person?.role !== 'student') throw new ApplicationError(400, 'INVALID_MATERIAL_ACCESS', 'Material access requires an existing course and student.');
    // Bootstrap may re-assert an existing grant when reopening a deleted course;
    // deletion preserves it, but must not create any new student access.
    if (!access(courseId, userId)) activeCourse(courseId);
    database.prepare('INSERT OR IGNORE INTO course_material_access(course_id, user_id) VALUES (?, ?)').run(courseId, userId);
  });
  return { list, get, create, update, grantCourseAccess, audit: () => database.prepare('SELECT * FROM material_audit_log ORDER BY id').all().map(row => ({ ...row, snapshot: JSON.parse(row.snapshot) })) };
}
