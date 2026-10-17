import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { hashPassword, normaliseEmail } from './security.mjs';
import { validateCourse, ApplicationError } from './validation.mjs';
import { createMaterialSchema, createMaterialStore } from './materials.mjs';
import { createAttachmentStore } from './attachments.mjs';
import { createScheduleStore } from './schedules.mjs';
import { createSchedulingResourceStore } from './scheduling-resources.mjs';
import { createAccessControlStore } from './access-control.mjs';
import { createPeopleStore } from './people.mjs';
import { createAvailableSlotStore } from './available-slots.mjs';
import { createClassCapacityStatusStore } from './class-capacity-status.mjs';
import { createClassTypeStore } from './class-types.mjs';
import { createEnrollmentOrderStore } from './enrollment-orders.mjs';
import { createStaffPersonalProfileStore } from './staff-personal-profiles.mjs';
import { createTrialApplicationStore } from './trial-applications.mjs';
import { createStudentLessonRequestStore } from './student-lesson-requests.mjs';
import { createPostgresDatabase } from './postgres-database.mjs';

const publicUser = row => row ? { id: row.id, email: row.email, displayName: row.display_name, role: row.role } : null;
const pricingKeys = ['feeName', 'pricingModel', 'price', 'months', 'duration', 'packageType', 'packageTotal', 'bookingExpiry', 'onlineStore'];
const metadata = (record, includeClassType = false) => ({ courseName: record.courseName, category: record.category || '', level: record.level || '', ...(includeClassType ? { classTypeId: record.classTypeId ?? null } : {}) });
const pricing = record => Object.fromEntries(pricingKeys.filter(key => Object.hasOwn(record, key)).map(key => [key, record[key]]));
const nameKey = name => name.trim().toLowerCase();
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const deletion = row => row.deleted_at ? { deletedAt: row.deleted_at } : {};

export async function createStore(options = {}) {
  const { databasePath = ':memory:', databaseUrl = process.env.DATABASE_URL || '', seedUsers = [], seedCourses = [], attachmentsDir } = options;
  const postgres=!!databaseUrl;
  if (!postgres&&databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });
  const database = postgres ? await createPostgresDatabase(databaseUrl) : new DatabaseSync(databasePath);
  let databaseClosed = false;
  const closeDatabase = () => {
    if (!databaseClosed) { databaseClosed = true; database.close(); }
  };
  try {
    return await initializeStore({ databasePath, seedUsers, seedCourses, attachmentsDir, database, postgres, closeDatabase });
  } catch (error) {
    closeDatabase();
    throw error;
  }
}

async function initializeStore({ databasePath, seedUsers, seedCourses, attachmentsDir, database, postgres, closeDatabase }) {
  let closed = false;
  if (postgres) console.log('PostgreSQL connection ready; initializing schema and application stores.');
  if (!postgres&&databasePath !== ':memory:') chmodSync(databasePath, 0o600);
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','teacher','student')),
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      csrf_hash TEXT NOT NULL, expires_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS course_sequence (id INTEGER PRIMARY KEY CHECK(id = 1), value INTEGER NOT NULL);
    INSERT OR IGNORE INTO course_sequence(id, value) VALUES (1, 0);
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY, course_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      data TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents > 0),
      online_store INTEGER NOT NULL CHECK(online_store IN (0, 1)),
      version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT REFERENCES users(id),
      action TEXT NOT NULL, course_id TEXT NOT NULL REFERENCES courses(id),
      version INTEGER NOT NULL, snapshot TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS fee_sequence (id INTEGER PRIMARY KEY CHECK(id = 1), value INTEGER NOT NULL);
    INSERT OR IGNORE INTO fee_sequence(id, value) VALUES (1, 0);
    CREATE TABLE IF NOT EXISTS fees (
      id TEXT PRIMARY KEY, fee_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      data TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents > 0),
      online_store INTEGER NOT NULL CHECK(online_store IN (0, 1)),
      version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS course_fees (
      course_id TEXT NOT NULL REFERENCES courses(id), fee_id TEXT NOT NULL REFERENCES fees(id),
      position INTEGER NOT NULL, PRIMARY KEY(course_id, fee_id)
    );
    CREATE INDEX IF NOT EXISTS course_fees_fee ON course_fees(fee_id);
    CREATE TABLE IF NOT EXISTS fee_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT REFERENCES users(id),
      action TEXT NOT NULL, fee_id TEXT NOT NULL REFERENCES fees(id),
      version INTEGER NOT NULL, snapshot TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS schema_metadata (name TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS idempotent_creates (
      user_id TEXT NOT NULL REFERENCES users(id), route TEXT NOT NULL, request_key TEXT NOT NULL,
      payload_hash TEXT NOT NULL, response_status INTEGER NOT NULL, response_body TEXT NOT NULL,
      created_at TEXT NOT NULL, PRIMARY KEY(user_id, route, request_key)
    );
  `);
  if (postgres && database.prepare('PRAGMA table_info(sessions)').all().some(column => column.name === 'expires_at' && column.type.toLowerCase() === 'integer')) {
    database.exec('ALTER TABLE sessions ALTER COLUMN expires_at TYPE BIGINT');
  }
  if (!database.prepare('PRAGMA table_info(courses)').all().some(column => column.name === 'name_key')) database.exec('ALTER TABLE courses ADD COLUMN name_key TEXT');
  if (!database.prepare('PRAGMA table_info(courses)').all().some(column => column.name === 'deleted_at')) database.exec('ALTER TABLE courses ADD COLUMN deleted_at TEXT');
  database.exec('CREATE UNIQUE INDEX IF NOT EXISTS course_name_key_unique ON courses(name_key)');
  let transactionDepth = 0, savepointCounter = 0;
  const transaction = (callback, mode = 'write') => {
    const outer = transactionDepth === 0, savepoint = `nested_${++savepointCounter}`;
    database.exec(outer ? (mode === 'read' ? 'BEGIN' : 'BEGIN IMMEDIATE') : `SAVEPOINT ${savepoint}`);
    transactionDepth++;
    try {
      const result = callback();
      database.exec(outer ? 'COMMIT' : `RELEASE SAVEPOINT ${savepoint}`);
      return result;
    } catch (error) {
      database.exec(outer ? 'ROLLBACK' : `ROLLBACK TO SAVEPOINT ${savepoint}; RELEASE SAVEPOINT ${savepoint}`);
      throw error;
    } finally { transactionDepth--; }
  };
  const classTypes = createClassTypeStore({ database, transaction });
  const courseMetadata = (data, current = null) => {
    const classTypeId = Object.hasOwn(data, 'classTypeId') ? data.classTypeId : current?.classTypeId ?? null;
    if (Object.hasOwn(data, 'classTypeId') && classTypeId !== null) classTypes.snapshot(classTypeId, data.classTypeVersion);
    return metadata({ ...data, classTypeId }, true);
  };
  const parseFee = row => row ? {
    ...JSON.parse(row.data), id: row.id, feeCode: row.fee_code, price: row.price_cents / 100,
    version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
    courseIds: database.prepare('SELECT course_id FROM course_fees WHERE fee_id = ? ORDER BY course_id').all(row.id).map(link => link.course_id),
  } : null;
  const getFee = id => parseFee(database.prepare('SELECT * FROM fees WHERE id = ?').get(id));
  const parseCourse = (row, publicOnly = false) => {
    if (!row) return null;
    const fees = database.prepare(`SELECT fees.* FROM fees JOIN course_fees ON fees.id = course_fees.fee_id WHERE course_fees.course_id = ? ${publicOnly ? 'AND fees.online_store = 1' : ''} ORDER BY course_fees.position, fees.fee_code`).all(row.id).map(parseFee);
    return {
      ...metadata(JSON.parse(row.data), !publicOnly), feeName: '', ...pricing(fees[0] || {}),
      id: row.id, courseCode: row.course_code, version: row.version,
      createdAt: row.created_at, updatedAt: row.updated_at, ...deletion(row), fees, feeIds: fees.map(fee => fee.id),
    };
  };
  const getCourse = id => parseCourse(database.prepare('SELECT * FROM courses WHERE id = ?').get(id));
  const visibleCourses = publicOnly => publicOnly ? 'WHERE courses.deleted_at IS NULL AND EXISTS (SELECT 1 FROM course_fees JOIN fees ON fees.id = course_fees.fee_id WHERE course_fees.course_id = courses.id AND fees.online_store = 1)' : '';
  const visibleFees = publicOnly => publicOnly ? 'WHERE online_store = 1 AND EXISTS (SELECT 1 FROM course_fees JOIN courses ON courses.id = course_fees.course_id WHERE course_fees.fee_id = fees.id AND courses.deleted_at IS NULL)' : '';
  const feeCatalog = (feeRows, links) => {
    const courseIdsByFee = new Map(), feeIdsByCourse = new Map();
    for (const link of links) {
      if (!courseIdsByFee.has(link.fee_id)) courseIdsByFee.set(link.fee_id, []);
      courseIdsByFee.get(link.fee_id).push(link.course_id);
      if (!feeIdsByCourse.has(link.course_id)) feeIdsByCourse.set(link.course_id, []);
      feeIdsByCourse.get(link.course_id).push(link.fee_id);
    }
    const fees = feeRows.map(row => ({
      ...JSON.parse(row.data), id: row.id, feeCode: row.fee_code, price: row.price_cents / 100,
      version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
      courseIds: courseIdsByFee.get(row.id) || [],
    }));
    return { fees, feesById: new Map(fees.map(fee => [fee.id, fee])), feeIdsByCourse };
  };
  const readCatalog = (publicOnly, allowedIds = null) => {
    const rows = database.prepare(`
      SELECT 'course' AS kind, courses.id, courses.version, courses.course_code, NULL AS fee_code,
        courses.data, courses.price_cents, courses.online_store, courses.created_at, courses.updated_at,
        courses.name_key, courses.deleted_at, NULL AS course_id, NULL AS fee_id, NULL AS position
      FROM courses ${visibleCourses(publicOnly)}
      UNION ALL
      SELECT 'fee', fees.id, fees.version, NULL, fees.fee_code, fees.data, fees.price_cents, fees.online_store,
        fees.created_at, fees.updated_at, NULL, NULL, NULL, NULL, NULL
      FROM fees ${visibleFees(publicOnly)}
      UNION ALL
      SELECT 'link', NULL, NULL, NULL, fees.fee_code, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
        course_fees.course_id, course_fees.fee_id, course_fees.position
      FROM course_fees
      JOIN fees ON fees.id = course_fees.fee_id
      JOIN courses ON courses.id = course_fees.course_id
      ${publicOnly ? 'WHERE fees.online_store = 1 AND courses.deleted_at IS NULL' : ''}
    `).all();
    const courseRows = [], feeRows = [], links = [];
    for (const row of rows) {
      if (row.kind === 'course') courseRows.push({
        id: row.id, version: row.version, course_code: row.course_code, data: row.data,
        price_cents: row.price_cents, online_store: row.online_store, created_at: row.created_at,
        updated_at: row.updated_at, name_key: row.name_key, deleted_at: row.deleted_at,
      });
      else if (row.kind === 'fee') feeRows.push({
        id: row.id, version: row.version, fee_code: row.fee_code, data: row.data,
        price_cents: row.price_cents, online_store: row.online_store, created_at: row.created_at,
        updated_at: row.updated_at,
      });
      else if (row.kind === 'link') links.push({
        course_id: row.course_id, fee_id: row.fee_id, position: row.position, fee_code: row.fee_code,
      });
    }
    courseRows.sort((left, right) => compareText(left.course_code, right.course_code));
    feeRows.sort((left, right) => compareText(left.fee_code, right.fee_code));
    links.sort((left, right) => compareText(left.course_id, right.course_id) || left.position - right.position || compareText(left.fee_code, right.fee_code));
    const scopedCourseRows = courseRows.filter(row => allowedIds === null || allowedIds.has(row.id));
    const scopedLinks = links.filter(row => allowedIds === null || allowedIds.has(row.course_id));
    const feeIds = new Set(scopedLinks.map(row => row.fee_id));
    const scopedFeeRows = feeRows.filter(row => (allowedIds === null || feeIds.has(row.id)));
    return { courseRows: scopedCourseRows, ...feeCatalog(scopedFeeRows, scopedLinks) };
  };
  const catalogVersions = publicOnly => {
    const courses = [], fees = [];
    for (const row of database.prepare(`
      SELECT 'course' AS kind, id, version FROM courses ${visibleCourses(publicOnly)}
      UNION ALL
      SELECT 'fee', id, version FROM fees ${visibleFees(publicOnly)}
      ORDER BY kind, id
    `).all()) {
      const target = row.kind === 'course' ? courses : fees;
      target.push({ id: row.id, version: row.version });
    }
    courses.sort((left, right) => compareText(left.id, right.id));
    fees.sort((left, right) => compareText(left.id, right.id));
    return { courses, fees };
  };
  const snapshotRevision = (publicOnly, courses, fees) => createHash('sha256').update(JSON.stringify({ publicOnly, courses, fees })).digest('hex');
  const catalogRevision = (publicOnly, catalog) => snapshotRevision(
    publicOnly,
    catalog.courseRows.map(({ id, version }) => ({ id, version })).sort((left, right) => compareText(left.id, right.id)),
    catalog.fees.map(({ id, version }) => ({ id, version })).sort((left, right) => compareText(left.id, right.id)),
  );
  const compactCourse = (row, feeIds, publicOnly = false) => ({
    ...metadata(JSON.parse(row.data), !publicOnly), id: row.id, courseCode: row.course_code, version: row.version,
    createdAt: row.created_at, updatedAt: row.updated_at, ...deletion(row), feeIds,
  });
  const listCourses = ({ publicOnly = false, user = null } = {}) => transaction(() => {
    const { courseRows, feesById, feeIdsByCourse } = readCatalog(publicOnly, user?.role === 'teacher' ? accessControl.scopeFor(user).courseIds : null);
    return courseRows.map(row => {
      const feeIds = feeIdsByCourse.get(row.id) || [], fees = feeIds.map(id => feesById.get(id));
      return {
        ...metadata(JSON.parse(row.data), !publicOnly), feeName: '', ...pricing(fees[0] || {}),
        id: row.id, courseCode: row.course_code, version: row.version,
        createdAt: row.created_at, updatedAt: row.updated_at, ...deletion(row), fees, feeIds,
      };
    });
  }, 'read');
  const listFees = ({ publicOnly = false, user = null } = {}) => transaction(() => readCatalog(publicOnly, user?.role === 'teacher' ? accessControl.scopeFor(user).courseIds : null).fees, 'read');
  const catalogSnapshot = ({ publicOnly = false, since = '', user = null } = {}) => transaction(() => {
    if (user?.role === 'teacher') {
      const scope = accessControl.scopeFor(user), catalog = readCatalog(publicOnly, scope.courseIds);
      const courses = catalog.courseRows.map(row => compactCourse(row, catalog.feeIdsByCourse.get(row.id) || [])), fees = catalog.fees;
      const revision = createHash('sha256').update(JSON.stringify({ access: scope.revision, courses, fees })).digest('hex');
      return since === revision ? { revision, unchanged: true } : { revision, courses, fees };
    }
    if (since) {
      const { courses, fees } = catalogVersions(publicOnly), revision = snapshotRevision(publicOnly, courses, fees);
      if (since === revision) return { revision, unchanged: true };
      const catalog = readCatalog(publicOnly);
      return {
        revision,
        courses: catalog.courseRows.map(row => compactCourse(row, catalog.feeIdsByCourse.get(row.id) || [], publicOnly)),
        fees: catalog.fees,
      };
    }
    const catalog = readCatalog(publicOnly);
    const revision = catalogRevision(publicOnly, catalog);
    return {
      revision,
      courses: catalog.courseRows.map(row => compactCourse(row, catalog.feeIdsByCourse.get(row.id) || [], publicOnly)),
      fees: catalog.fees,
    };
  }, 'read');
  const auditCourse = (actor, action, record) => database.prepare('INSERT INTO audit_log(actor_id, action, course_id, version, snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(actor || null, action, record.id, record.version, JSON.stringify(record), record.updatedAt);
  const auditFee = (actor, action, record) => database.prepare('INSERT INTO fee_audit_log(actor_id, action, fee_id, version, snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(actor || null, action, record.id, record.version, JSON.stringify(record), record.updatedAt);
  const bumpCourses = (ids, actor, now, action = 'course.fee.update') => {
    for (const id of new Set(ids)) {
      database.prepare('UPDATE courses SET version = version + 1, updated_at = ? WHERE id = ?').run(now, id);
      auditCourse(actor, action, getCourse(id));
    }
  };
  const ensureCourseIds = (ids, existingIds = []) => {
    const existing = new Set(existingIds);
    for (const id of ids) {
      const course = database.prepare('SELECT id, deleted_at FROM courses WHERE id = ?').get(id);
      if (!course) throw new ApplicationError(400, 'INVALID_COURSE_LINK', 'One of the selected courses no longer exists. Reload the course list.');
      if (course.deleted_at && !existing.has(id)) throw new ApplicationError(409, 'COURSE_DELETED', 'A selected course is deleted. Restore it before adding a new fee association.');
    }
  };
  const duplicateCourseName = row => {
    if (row.deleted_at) throw new ApplicationError(409, 'COURSE_NAME_DELETED', 'A deleted course already has this name. Restore that course instead.');
    throw new ApplicationError(409, 'COURSE_NAME_EXISTS', 'A course with this name already exists. Add a fee to the existing course instead.');
  };
  const ensureUniqueCourseName = (name, exceptId = null) => {
    const key = nameKey(name);
    const duplicate = database.prepare('SELECT id, deleted_at FROM courses WHERE name_key = ? AND id <> ?').get(key, exceptId || '');
    if (duplicate) duplicateCourseName(duplicate);
    // Also inspect old rows whose duplicate names predate the uniqueness rule.
    for (const row of database.prepare('SELECT id, data, deleted_at FROM courses WHERE name_key IS NULL').all()) {
      if (row.id !== exceptId && nameKey(JSON.parse(row.data).courseName) === key) duplicateCourseName(row);
    }
    return key;
  };
  const appendLinks = (feeId, ids) => {
    for (const id of ids) {
      const position = database.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS position FROM course_fees WHERE course_id = ?').get(id).position;
      database.prepare('INSERT INTO course_fees(course_id, fee_id, position) VALUES (?, ?, ?)').run(id, feeId, position);
    }
  };
  const insertFee = (data, ids, now, actor, audit = true) => {
    ensureCourseIds(ids);
    const sequence = database.prepare('UPDATE fee_sequence SET value = value + 1 WHERE id = 1 RETURNING value').get().value;
    const id = randomUUID(), feeCode = `FE-${String(sequence).padStart(3, '0')}`;
    const { price, courseIds, ...stored } = data;
    database.prepare('INSERT INTO fees(id, fee_code, data, price_cents, online_store, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)').run(id, feeCode, JSON.stringify(stored), Math.round(price * 100), Number(data.onlineStore), now, now);
    appendLinks(id, ids);
    const fee = getFee(id);
    if (audit) auditFee(actor, 'fee.create', fee);
    return fee;
  };
  const replaceFee = (current, data, actor, now) => {
    const { price, courseIds, ...stored } = data;
    const nextIds = courseIds || current.courseIds;
    ensureCourseIds(nextIds, current.courseIds);
    const result = database.prepare('UPDATE fees SET data = ?, price_cents = ?, online_store = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?').run(JSON.stringify(stored), Math.round(price * 100), Number(data.onlineStore), now, current.id, current.version);
    if (result.changes !== 1) throw new ApplicationError(409, 'VERSION_CONFLICT', 'This fee was changed by someone else. Reload it before saving.');
    const removed = current.courseIds.filter(id => !nextIds.includes(id));
    const added = nextIds.filter(id => !current.courseIds.includes(id));
    for (const id of removed) database.prepare('DELETE FROM course_fees WHERE course_id = ? AND fee_id = ?').run(id, current.id);
    appendLinks(current.id, added);
    const fee = getFee(current.id);
    auditFee(actor, 'fee.update', fee);
    return fee;
  };
  const createCourse = (data, actor = null, seedId = null) => transaction(() => {
    const storedMetadata = courseMetadata(data);
    const key = ensureUniqueCourseName(data.courseName);
    const sequence = database.prepare('UPDATE course_sequence SET value = value + 1 WHERE id = 1 RETURNING value').get().value;
    const id = seedId || randomUUID(), courseCode = `CO-${String(sequence).padStart(3, '0')}`;
    const now = new Date().toISOString();
    // The old columns remain only for database compatibility; API pricing is always read from normalized fees.
    database.prepare('INSERT INTO courses(id, course_code, name_key, data, price_cents, online_store, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)').run(id, courseCode, key, JSON.stringify(storedMetadata), Math.round(data.price * 100), Number(data.onlineStore), now, now);
    insertFee({ ...pricing(data), category: '' }, [id], now, actor);
    const record = getCourse(id);
    auditCourse(actor, 'course.create', record);
    return record;
  });
  const updateCourse = (id, data, version, actor, updatePricing = true) => transaction(() => {
    const current = getCourse(id);
    if (!current) throw new ApplicationError(404, 'COURSE_NOT_FOUND', 'Course was not found.');
    if (current.deletedAt) throw new ApplicationError(409, 'COURSE_DELETED', 'This course is deleted. Restore it before making changes.');
    if (current.version !== version) throw new ApplicationError(409, 'VERSION_CONFLICT', 'This course was changed by someone else. Reload it before saving.');
    const key = ensureUniqueCourseName(data.courseName, id);
    const now = new Date().toISOString();
    database.prepare('UPDATE courses SET data = ?, name_key = ? WHERE id = ?').run(JSON.stringify(courseMetadata(data, current)), key, id);
    const affected = new Set([id]);
    if (updatePricing) {
      if (current.fees.length) {
        const primary = current.fees[0];
        replaceFee(primary, { ...pricing(data), category: primary.category, courseIds: primary.courseIds }, actor, now);
        primary.courseIds.forEach(courseId => affected.add(courseId));
      } else insertFee({ ...pricing(data), category: '' }, [id], now, actor);
    }
    for (const courseId of affected) {
      database.prepare('UPDATE courses SET version = version + 1, updated_at = ? WHERE id = ?').run(now, courseId);
      auditCourse(actor, courseId === id ? 'course.update' : 'course.fee.update', getCourse(courseId));
    }
    return getCourse(id);
  });
  const changeCourseDeletion = (id, version, actor, restore = false) => transaction(() => {
    if (database.prepare('SELECT role FROM users WHERE id = ?').get(actor)?.role !== 'admin') throw new ApplicationError(403, 'ROLE_FORBIDDEN', 'Only an administrator can change courses.');
    const current = getCourse(id);
    if (!current) throw new ApplicationError(404, 'COURSE_NOT_FOUND', 'Course was not found.');
    if (current.version !== version) throw new ApplicationError(409, 'VERSION_CONFLICT', 'This course was changed by someone else. Reload it before saving.');
    if (restore && !current.deletedAt) throw new ApplicationError(409, 'COURSE_NOT_DELETED', 'Only a deleted course can be restored.');
    if (!restore && current.deletedAt) throw new ApplicationError(409, 'COURSE_DELETED', 'This course is already deleted. Restore it before making changes.');
    if (!restore && database.prepare('SELECT 1 FROM schedules WHERE course_id = ? AND deleted_at IS NULL LIMIT 1').get(id)) throw new ApplicationError(409, 'COURSE_HAS_SCHEDULES', 'This course still has schedules. Delete its schedules before deleting the course.');
    const now = new Date().toISOString();
    const changed = database.prepare('UPDATE courses SET deleted_at = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?').run(restore ? null : now, now, id, version);
    if (changed.changes !== 1) throw new ApplicationError(409, 'VERSION_CONFLICT', 'This course was changed by someone else. Reload it before saving.');
    const course = getCourse(id);
    auditCourse(actor, restore ? 'course.restore' : 'course.delete', course);
    return course;
  });
  const createFee = (data, actor) => transaction(() => {
    const now = new Date().toISOString();
    const fee = insertFee(data, data.courseIds, now, actor);
    bumpCourses(data.courseIds, actor, now, 'course.fee.add');
    return fee;
  });
  const updateFee = (id, data, version, actor, includeCourses = false) => transaction(() => {
    const current = getFee(id);
    if (!current) throw new ApplicationError(404, 'FEE_NOT_FOUND', 'Fee was not found.');
    if (current.version !== version) throw new ApplicationError(409, 'VERSION_CONFLICT', 'This fee was changed by someone else. Reload it before saving.');
    const now = new Date().toISOString();
    const fee = replaceFee(current, data, actor, now);
    const affected = [...new Set([...current.courseIds, ...data.courseIds])];
    bumpCourses(affected, actor, now);
    return includeCourses ? { fee, courses: affected.map(courseId => getCourse(courseId)) } : fee;
  });
  const mutateOnce = ({ userId, route, key = null, payloadHash, status = 201 }, operation) => transaction(() => {
    if (key) {
      const saved = database.prepare('SELECT payload_hash, response_status, response_body FROM idempotent_creates WHERE user_id = ? AND route = ? AND request_key = ?').get(userId, route, key);
      if (saved) {
        if (saved.payload_hash !== payloadHash) throw new ApplicationError(409, 'IDEMPOTENCY_CONFLICT', 'This request key was already used for a different operation.');
        return { status: saved.response_status, body: JSON.parse(saved.response_body) };
      }
    }
    const body = operation();
    if (key) database.prepare('INSERT INTO idempotent_creates(user_id, route, request_key, payload_hash, response_status, response_body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, route, key, payloadHash, status, JSON.stringify(body), new Date().toISOString());
    return { status, body };
  });
  const createOnce = (options, operation) => mutateOnce({ ...options, status: 201 }, operation);
  try {
    transaction(() => {
      const highestCourseCode = database.prepare('SELECT course_code FROM courses').all().reduce((highest, row) => {
        const match = /^CO-(\d+)$/i.exec(row.course_code), number = match ? Number(match[1]) : 0;
        return Number.isSafeInteger(number) ? Math.max(highest, number) : highest;
      }, 0);
      database.prepare('UPDATE course_sequence SET value = MAX(value, ?) WHERE id = 1').run(highestCourseCode);
      for (const row of database.prepare('SELECT id, data FROM courses WHERE name_key IS NULL ORDER BY course_code').all()) {
        const key = nameKey(JSON.parse(row.data).courseName);
        if (!database.prepare('SELECT id FROM courses WHERE name_key = ?').get(key)) database.prepare('UPDATE courses SET name_key = ? WHERE id = ?').run(key, row.id);
      }
    });
    // One atomic migration preserves old identifiers, values, versions and timestamps.
    if (!database.prepare("SELECT value FROM schema_metadata WHERE name = 'normalized_fees_v1'").get()) transaction(() => {
      for (const row of database.prepare('SELECT * FROM courses ORDER BY course_code').all()) {
        const old = JSON.parse(row.data);
        insertFee({ ...pricing({ ...old, price: row.price_cents / 100 }), category: '' }, [row.id], row.created_at, null, false);
      }
      database.prepare('INSERT INTO schema_metadata(name, value) VALUES (?, ?)').run('normalized_fees_v1', '1');
    });
    for (const seed of seedUsers) {
      const email = normaliseEmail(seed.email);
      if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['admin', 'teacher', 'student'].includes(seed.role) || typeof seed.password !== 'string' || seed.password.length < 12 || seed.password.length > 1024 || typeof seed.displayName !== 'string' || !seed.displayName.trim() || seed.displayName.trim().length > 200) throw new Error('Invalid seed user configuration.');
      if (database.prepare('SELECT id FROM users WHERE email = ?').get(email)) continue;
      const passwordHash = await hashPassword(seed.password);
      database.prepare('INSERT OR IGNORE INTO users(id, email, display_name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), email, seed.displayName.trim(), seed.role, passwordHash, new Date().toISOString());
    }
    for (const seed of seedCourses) {
      if (!seed.id || typeof seed.id !== 'string' || seed.id.length > 200) throw new Error('Seed course requires a valid id.');
      if (getCourse(seed.id)) continue;
      const fields = ['courseName', 'feeName', 'category', 'level', 'classTypeId', 'classTypeVersion', ...pricingKeys.slice(1)];
      const input = Object.fromEntries(fields.filter(field => Object.hasOwn(seed, field)).map(field => [field, seed[field]]));
      createCourse(validateCourse(input), null, seed.id);
    }
  } catch (error) { closeDatabase(); throw error; }
  let materials, attachments, schedules, schedulingResources, accessControl, people, availableSlots, classCapacityStatuses, enrollmentOrders, staffPersonalProfiles, trialApplications, studentLessonRequests;
  try {
    createMaterialSchema(database);
    attachments = await createAttachmentStore({ database, transaction, directory: attachmentsDir || (databasePath === ':memory:' ? undefined : `${resolve(databasePath)}.attachments`), postgres });
    schedulingResources = createSchedulingResourceStore({ database, transaction });
    schedules = createScheduleStore({ database, transaction, resources: schedulingResources, classTypes });
    accessControl = createAccessControlStore({ database, transaction });
    staffPersonalProfiles = createStaffPersonalProfileStore({ database, transaction, resources: schedulingResources, accessControl });
    materials = createMaterialStore({ database, transaction, attachments, accessControl });
    people = createPeopleStore({ database, transaction });
    trialApplications = createTrialApplicationStore({ database, transaction });
    classCapacityStatuses = createClassCapacityStatusStore({ database, transaction, accessControl });
    availableSlots = createAvailableSlotStore({ database, transaction, accessControl, classCapacityStatuses });
    accessControl.setSlotSource(() => availableSlots.scopeFacts());
    enrollmentOrders = createEnrollmentOrderStore({ database, transaction, schedules, resources: schedulingResources, accessControl, getCourse, getFee });
    studentLessonRequests = createStudentLessonRequestStore({ database, transaction, schedules, getCourse, getStudentLesson: enrollmentOrders.studentLesson, postgres });
    classCapacityStatuses.setOccupancySource?.(enrollmentOrders.occupied);
  }
  catch (error) { await attachments?.close(); closeDatabase(); throw error; }
  if (postgres) console.log('PostgreSQL schema and application stores ready.');
  return {
    listCourses, getCourse, createCourse, updateCourse, deleteCourse: (id, version, actor) => changeCourseDeletion(id, version, actor), restoreCourse: (id, version, actor) => changeCourseDeletion(id, version, actor, true), listFees, getFee, createFee, updateFee, createOnce, mutateOnce, catalogSnapshot, materials, attachments, schedules, schedulingResources, accessControl, people, availableSlots, classCapacityStatuses, classTypes, enrollmentOrders, studentLessonRequests, staffPersonalProfiles, trialApplications,
    listUsers: () => database.prepare('SELECT * FROM users ORDER BY email').all().map(publicUser),
    userByEmail: email => database.prepare('SELECT * FROM users WHERE email = ?').get(email),
    publicUser,
    createSession({ tokenHash, userId, csrfHash, expiresAt }) {
      database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
      database.prepare('INSERT INTO sessions(token_hash, user_id, csrf_hash, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash, userId, csrfHash, expiresAt);
    },
    getSession(tokenHash) {
      const row = database.prepare('SELECT sessions.csrf_hash, sessions.expires_at, users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ?').get(tokenHash);
      if (!row) return null;
      if (row.expires_at <= Date.now()) { database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash); return null; }
      return { user: publicUser(row), csrfHash: row.csrf_hash, expiresAt: row.expires_at };
    },
    deleteSession: tokenHash => database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash),
    audit: () => database.prepare('SELECT * FROM audit_log ORDER BY id').all().map(row => ({ ...row, snapshot: JSON.parse(row.snapshot) })),
    feeAudit: () => database.prepare('SELECT * FROM fee_audit_log ORDER BY id').all().map(row => ({ ...row, snapshot: JSON.parse(row.snapshot) })),
    close() { if (!closed) { closed = true; const cleanup = attachments.close(); closeDatabase(); return cleanup; } },
    };
}
