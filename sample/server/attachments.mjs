import { createHash, randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { constants } from 'node:fs';
import { open, mkdir, mkdtemp, chmod, rename, rm, readdir, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { ApplicationError } from './validation.mjs';

export const MAX_ATTACHMENT_BYTES = 50_000_000;
const STAGING_TTL = 24 * 60 * 60 * 1000;
const groups = [
  { extensions: ['png'], mime: 'image/png', aliases: ['image/png'] },
  { extensions: ['jpg', 'jpeg'], mime: 'image/jpeg', aliases: ['image/jpeg', 'image/jpg'] },
  { extensions: ['gif'], mime: 'image/gif', aliases: ['image/gif'] },
  { extensions: ['mp4'], mime: 'video/mp4', aliases: ['video/mp4'] },
  { extensions: ['avi'], mime: 'video/vnd.avi', aliases: ['video/vnd.avi', 'video/avi', 'video/x-msvideo'] },
  { extensions: ['mov'], mime: 'video/quicktime', aliases: ['video/quicktime'] },
  { extensions: ['mp3'], mime: 'audio/mpeg', aliases: ['audio/mpeg', 'audio/mp3'] },
  { extensions: ['wav'], mime: 'audio/wav', aliases: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'] },
  { extensions: ['m4a'], mime: 'audio/x-m4a', aliases: ['audio/x-m4a', 'audio/mp4', 'audio/m4a'] },
  { extensions: ['pdf'], mime: 'application/pdf', aliases: ['application/pdf'] },
];
const descriptor = row => ({ id: row.id, name: row.name, mimeType: row.mime_type, size: row.size, createdAt: row.created_at });
const invalid = message => { throw new ApplicationError(400, 'INVALID_ATTACHMENT', message); };
const missing = () => { throw new ApplicationError(404, 'ATTACHMENT_NOT_FOUND', 'Attachment was not found.'); };

export function uploadMetadata(request) {
  const declared = (request.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const group = groups.find(item => item.aliases.includes(declared));
  if (!group) throw new ApplicationError(415, 'UNSUPPORTED_ATTACHMENT_TYPE', 'This attachment type is not supported.');
  let name;
  try { name = decodeURIComponent(request.headers['x-file-name'] || ''); } catch { invalid('File name must be valid URL-encoded text.'); }
  if (!name || !name.trim() || ['.', '..'].includes(name) || [...name].length > 255 || /[\p{Cc}/\\]/u.test(name)) invalid('Use a file name of at most 255 characters without path separators or control characters.');
  const extension = extname(name).slice(1).toLowerCase();
  if (!group.extensions.includes(extension)) invalid('The file name extension must match its declared type.');
  const length = request.headers['content-length'];
  if (length !== undefined && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) invalid('File size is invalid.');
  if (length !== undefined && Number(length) > MAX_ATTACHMENT_BYTES) throw new ApplicationError(413, 'ATTACHMENT_TOO_LARGE', 'Each attachment must be at most 50,000,000 bytes.');
  return { name, mimeType: group.mime, group };
}

// Detection is a bounded worker task: signatures are a hint, not a complete decoder or antivirus scan.
function typeWorker() {
  const { parentPort, workerData } = require('node:worker_threads');
  (async () => {
    const { fileTypeFromFile, fileTypeFromBuffer } = await import(workerData.library);
    const { open } = await import('node:fs/promises');
    let detected = await fileTypeFromFile(workerData.file);
    const expectedBMFF = ['mp4', 'mov', 'm4a'].includes(workerData.extension);
    if (!detected && !expectedBMFF) return parentPort.postMessage(null);
    const file = await open(workerData.file, 'r');
    // Walk actual top-level boxes. Payloads such as a 40 MB free/mdat box are
    // skipped by position, with only a 64 KB reusable cache and the worker deadline.
    const scanBMFF = async size => {
      const cache = Buffer.allocUnsafe(65536);
      let cacheStart = -1, cacheLength = 0, position = 0, hasMovie = false, hasData = false, type = null;
      const readAt = async (at, length) => {
        if (at < cacheStart || at + length > cacheStart + cacheLength) {
          cacheStart = at; cacheLength = 0;
          const target = Math.min(cache.length, size - at);
          while (cacheLength < target) {
            const { bytesRead } = await file.read(cache, cacheLength, target - cacheLength, at + cacheLength);
            if (!bytesRead) break;
            cacheLength += bytesRead;
          }
        }
        return at + length <= cacheStart + cacheLength ? cache.subarray(at - cacheStart, at - cacheStart + length) : null;
      };
      while (position < size) {
        if (size - position < 8) return null;
        const header = await readAt(position, 8);
        if (!header) return null;
        const atom = header.subarray(4, 8).toString('latin1'), smallSize = header.readUInt32BE(0);
        let headerSize = 8, boxSize = smallSize;
        if (smallSize === 1) {
          if (size - position < 16) return null;
          const extended = await readAt(position + 8, 8);
          if (!extended) return null;
          const largeSize = extended.readBigUInt64BE(0);
          if (largeSize > BigInt(size - position)) return null;
          boxSize = Number(largeSize); headerSize = 16;
        } else if (smallSize === 0) boxSize = size - position;
        if (atom === 'uuid') headerSize += 16;
        if (boxSize < headerSize || boxSize > size - position) return null;
        const payloadSize = boxSize - headerSize;
        if (atom === 'ftyp') {
          if (payloadSize < 8 || (payloadSize - 8) % 4 !== 0 || type) return null;
          const brand = await readAt(position + headerSize, 8);
          if (!brand) return null;
          // Normalise only the header for file-type's brand classification;
          // the original 32/64-bit atom and complete boundaries were checked above.
          const probe = Buffer.alloc(16); probe.writeUInt32BE(16); probe.write('ftyp', 4); brand.copy(probe, 8);
          type = await fileTypeFromBuffer(probe);
          if (!type || !['mp4', 'mov', 'm4a'].includes(type.ext)) return null;
        } else if (atom === 'moov') {
          if (payloadSize < 8) return null;
          hasMovie = true;
        } else if (atom === 'mdat') {
          if (!payloadSize) return null;
          hasData = true;
        }
        position += boxSize;
      }
      return hasMovie && hasData ? type || (detected?.ext === 'mov' ? detected : null) : null;
    };
    let structured = false;
    try {
      const info = await file.stat(), head = Buffer.alloc(Math.min(16384, info.size)), tail = Buffer.alloc(Math.min(4096, info.size));
      await file.read(head, 0, head.length, 0); await file.read(tail, 0, tail.length, info.size - tail.length);
      structured = info.size >= 16;
      if (expectedBMFF) {
        detected = info.size >= 32 ? await scanBMFF(info.size) : null;
        structured = !!detected;
      } else if (detected.ext === 'png') {
        structured = info.size >= 45 && head.subarray(12, 16).toString() === 'IHDR' && head.readUInt32BE(16) > 0 && head.readUInt32BE(20) > 0 && tail.includes(Buffer.from('IEND'));
      } else if (detected.ext === 'jpg') structured = info.size >= 32 && tail.includes(Buffer.from([0xff, 0xd9]));
      else if (detected.ext === 'gif') structured = info.size >= 32 && tail.includes(Buffer.from([0x3b])) && head.readUInt16LE(6) > 0 && head.readUInt16LE(8) > 0;
      else if (detected.ext === 'pdf') structured = info.size >= 32 && head.subarray(0, 5).toString() === '%PDF-' && tail.includes(Buffer.from('%%EOF'));
      else if (['wav', 'avi'].includes(detected.ext)) structured = info.size >= 44 && head.subarray(0, 4).toString() === 'RIFF' && head.readUInt32LE(4) + 8 <= info.size;
      else if (['mp4', 'mov', 'm4a'].includes(detected.ext)) structured = false;
      else if (detected.ext === 'mp3') structured = info.size >= 32;
    } finally { await file.close(); }
    parentPort.postMessage(structured ? detected : null);
  })().catch(() => parentPort.postMessage(null));
}

async function detectType(file, extension) {
  return new Promise((accept, reject) => {
    const worker = new Worker(`(${typeWorker.toString()})()`, { eval: true, workerData: { file, extension, library: import.meta.resolve('file-type') } });
    let settled = false;
    const finish = (error, result) => { if (settled) return; settled = true; clearTimeout(timer); worker.terminate(); error ? reject(error) : accept(result); };
    const timer = setTimeout(() => finish(new ApplicationError(400, 'INVALID_ATTACHMENT', 'Could not safely identify this file type.')), 3000);
    worker.once('message', result => finish(null, result));
    worker.once('error', () => finish(new ApplicationError(400, 'INVALID_ATTACHMENT', 'Could not identify this file type.')));
    worker.once('exit', () => { if (!settled) finish(new ApplicationError(400, 'INVALID_ATTACHMENT', 'Could not identify this file type.')); });
  });
}

export async function createAttachmentStore({ database, transaction, directory }) {
  const ownedDirectory = !directory;
  directory ||= await mkdtemp(join(tmpdir(), 'beamal-attachments-'));
  directory = resolve(directory);
  await mkdir(directory, { recursive: true, mode: 0o700 }); await chmod(directory, 0o700);
  try {
  database.exec(`
    CREATE TABLE IF NOT EXISTS material_uploads (
      id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id), actor_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL CHECK(size > 0 AND size <= 50000000),
      sha256 TEXT NOT NULL, file_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, expires_at INTEGER NOT NULL,
      bound_material_id TEXT REFERENCES materials(id)
    );
    CREATE TABLE IF NOT EXISTS material_attachments (
      material_id TEXT NOT NULL REFERENCES materials(id), upload_id TEXT NOT NULL UNIQUE REFERENCES material_uploads(id),
      position INTEGER NOT NULL, PRIMARY KEY(material_id, upload_id)
    );
    CREATE TABLE IF NOT EXISTS material_upload_receipts (
      actor_id TEXT NOT NULL REFERENCES users(id), course_id TEXT NOT NULL REFERENCES courses(id), request_key TEXT NOT NULL,
      payload_hash TEXT NOT NULL, upload_id TEXT NOT NULL REFERENCES material_uploads(id) ON DELETE CASCADE,
      PRIMARY KEY(actor_id, course_id, request_key)
    );
  `);
  const rowsFor = materialId => database.prepare('SELECT material_uploads.* FROM material_uploads JOIN material_attachments ON material_uploads.id = material_attachments.upload_id WHERE material_attachments.material_id = ? ORDER BY material_attachments.position').all(materialId);
  const list = materialId => rowsFor(materialId).map(descriptor);
  const listMany = materialIds => {
    const result = new Map(materialIds.map(id => [id, []]));
    // Keep below conservative SQLite parameter limits and query only the
    // material IDs already selected by the caller's visibility/access policy.
    for (let start = 0; start < materialIds.length; start += 900) {
      const ids = materialIds.slice(start, start + 900);
      const rows = database.prepare(`SELECT material_attachments.material_id AS material_id, material_uploads.* FROM material_uploads JOIN material_attachments ON material_uploads.id = material_attachments.upload_id WHERE material_attachments.material_id IN (${ids.map(() => '?').join(',')}) ORDER BY material_attachments.material_id, material_attachments.position`).all(...ids);
      for (const row of rows) result.get(row.material_id).push(descriptor(row));
    }
    return result;
  };
  const assertIds = ids => {
    if (!Array.isArray(ids) || ids.length > 20 || ids.some(id => typeof id !== 'string' || !id || id.length > 200) || new Set(ids).size !== ids.length) invalid('Select at most 20 different uploaded attachment IDs.');
  };
  const bind = (materialId, courseId, ids, actorId) => {
    assertIds(ids);
    const uploads = ids.map(id => database.prepare('SELECT * FROM material_uploads WHERE id = ?').get(id));
    for (const row of uploads) if (!row || row.course_id !== courseId || (row.bound_material_id ? row.bound_material_id !== materialId : row.actor_id !== actorId || row.expires_at <= Date.now())) missing();
    database.prepare('DELETE FROM material_attachments WHERE material_id = ?').run(materialId);
    for (let index = 0; index < uploads.length; index++) {
      const row = uploads[index];
      database.prepare('UPDATE material_uploads SET bound_material_id = ? WHERE id = ?').run(materialId, row.id);
      database.prepare('INSERT INTO material_attachments(material_id, upload_id, position) VALUES (?, ?, ?)').run(materialId, row.id, index);
    }
  };
  const cleanup = async () => {
    const expired = transaction(() => {
      const rows = database.prepare('SELECT id, file_key FROM material_uploads WHERE bound_material_id IS NULL AND expires_at <= ?').all(Date.now());
      for (const row of rows) database.prepare('DELETE FROM material_uploads WHERE id = ?').run(row.id);
      return rows;
    });
    for (const row of expired) await rm(join(directory, row.file_key), { force: true });
    const tracked = new Set(database.prepare('SELECT file_key FROM material_uploads').all().map(row => row.file_key));
    for (const name of await readdir(directory)) {
      if (!/^[a-f0-9-]{36}\.(bin|part)$/.test(name) || tracked.has(name)) continue;
      const path = join(directory, name), info = await stat(path).catch(() => null);
      if (info && info.mtimeMs <= Date.now() - STAGING_TTL) await rm(path, { force: true });
    }
  };
  const stage = async (request, courseId, actorId, metadata, key = null) => {
    if (!database.prepare('SELECT id FROM courses WHERE id = ?').get(courseId)) throw new ApplicationError(404, 'COURSE_NOT_FOUND', 'Course was not found.');
    const id = randomUUID(), temporary = join(directory, `${id}.part`), final = join(directory, `${id}.bin`);
    let handle, recorded = false, currentSize = 0;
    const hash = createHash('sha256');
    const timeout = () => request.destroy(new Error('Attachment upload timed out.'));
    request.setTimeout(30000, timeout);
    try {
      handle = await open(temporary, 'wx', 0o600);
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        currentSize += chunk.length;
        if (currentSize > MAX_ATTACHMENT_BYTES) throw new ApplicationError(413, 'ATTACHMENT_TOO_LARGE', 'Each attachment must be at most 50,000,000 bytes.');
        hash.update(chunk);
        let offset = 0;
        while (offset < chunk.length) {
          const { bytesWritten } = await handle.write(chunk, offset, chunk.length - offset);
          if (!bytesWritten) throw new Error('Could not write attachment bytes.');
          offset += bytesWritten;
        }
      }
      await handle.sync();
      await handle.close(); handle = null;
      if (!currentSize) invalid('The attachment is empty.');
      const detected = await detectType(temporary, metadata.group.extensions[0]);
      if (!detected || !metadata.group.extensions.includes(detected.ext) || !metadata.group.aliases.includes(detected.mime)) invalid('The actual attachment type does not match its file name or declared type.');
      const sha256 = hash.digest('hex'), digest = createHash('sha256').update(JSON.stringify({ name: metadata.name, mimeType: metadata.mimeType, size: currentSize, sha256 })).digest('hex');
      await rename(temporary, final);
      const result = transaction(() => {
        if (key) {
          const receipt = database.prepare('SELECT payload_hash, upload_id FROM material_upload_receipts WHERE actor_id = ? AND course_id = ? AND request_key = ?').get(actorId, courseId, key);
          if (receipt) {
            if (receipt.payload_hash !== digest) throw new ApplicationError(409, 'IDEMPOTENCY_CONFLICT', 'This upload key was already used for different file contents.');
            const existing = database.prepare('SELECT * FROM material_uploads WHERE id = ?').get(receipt.upload_id);
            if (!existing || !existing.bound_material_id && existing.expires_at <= Date.now()) missing();
            return descriptor(existing);
          }
        }
        database.prepare('INSERT INTO material_uploads(id, course_id, actor_id, name, mime_type, size, sha256, file_key, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, courseId, actorId, metadata.name, metadata.mimeType, currentSize, sha256, `${id}.bin`, new Date().toISOString(), Date.now() + STAGING_TTL);
        if (key) database.prepare('INSERT INTO material_upload_receipts(actor_id, course_id, request_key, payload_hash, upload_id) VALUES (?, ?, ?, ?, ?)').run(actorId, courseId, key, digest, id);
        return descriptor(database.prepare('SELECT * FROM material_uploads WHERE id = ?').get(id));
      });
      recorded = result.id === id;
      return result;
    } catch (error) {
      if (error instanceof ApplicationError && error.status === 413) request.resume();
      if (error instanceof ApplicationError) throw error;
      if (request.aborted || request.destroyed && !request.complete) throw new ApplicationError(400, 'UPLOAD_INTERRUPTED', 'The attachment upload was interrupted.');
      throw error;
    } finally {
      request.setTimeout(0); request.off('timeout', timeout);
      await handle?.close().catch(() => {});
      await rm(temporary, { force: true });
      if (!recorded) await rm(final, { force: true });
    }
  };
  const serve = async (request, response, materialId, attachmentId, user, materials, download) => {
    const material = materials.get(materialId, user);
    if (!material) missing();
    const row = database.prepare('SELECT material_uploads.* FROM material_uploads JOIN material_attachments ON material_uploads.id = material_attachments.upload_id WHERE material_attachments.material_id = ? AND material_uploads.id = ?').get(materialId, attachmentId);
    if (!row) missing();
    if (user.role === 'student' && download && !material.studentDownload) throw new ApplicationError(403, 'DOWNLOAD_FORBIDDEN', 'Student downloads are not enabled for this material.');
    const file = await open(join(directory, row.file_key), constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
    if (!file) missing();
    let ownsFile = true;
    const close = async () => { if (ownsFile) { ownsFile = false; await file.close().catch(() => {}); } };
    try {
      const info = await file.stat(); if (!info.isFile() || info.size !== row.size) { await close(); missing(); }
      if (response.destroyed) { await close(); return; }
      let start = 0, end = row.size - 1, status = 200;
      if (request.headers.range !== undefined) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        if (!range || !range[1] && !range[2]) { response.setHeader('Content-Range', `bytes */${row.size}`); throw new ApplicationError(416, 'INVALID_RANGE', 'This byte range is not available.'); }
        if (!range[1]) { const suffix = Number(range[2]); if (!Number.isSafeInteger(suffix) || suffix <= 0) { response.setHeader('Content-Range', `bytes */${row.size}`); throw new ApplicationError(416, 'INVALID_RANGE', 'This byte range is not available.'); } start = Math.max(0, row.size - suffix); }
        else { start = Number(range[1]); end = range[2] ? Math.min(Number(range[2]), end) : end; }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= row.size || end < start) { response.setHeader('Content-Range', `bytes */${row.size}`); throw new ApplicationError(416, 'INVALID_RANGE', 'This byte range is not available.'); }
        status = 206;
      }
      const ascii = row.name.replace(/[^\x20-\x7e]|["\\]/g, '_'), encoded = encodeURIComponent(row.name).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
      response.setHeader('Content-Type', row.mime_type); response.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encoded}`);
      response.setHeader('Cache-Control', 'private, no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('Content-Length', end - start + 1);
      if (row.mime_type === 'application/pdf') response.setHeader('Content-Security-Policy', 'sandbox');
      if (status === 206) response.setHeader('Content-Range', `bytes ${start}-${end}/${row.size}`);
      response.writeHead(status);
      if (request.method === 'HEAD') { response.end(); await close(); return; }
      const stream = file.createReadStream({ start, end, autoClose: true });
      // The stream alone owns the FileHandle after this transfer. Passing its
      // numeric fd to another owner could close a reused descriptor twice.
      ownsFile = false;
      stream.once('error', () => response.destroy());
      response.once('close', () => stream.destroy());
      stream.pipe(response);
    } catch (error) { await close(); throw error; }
  };
  await cleanup();
  const timer = setInterval(() => cleanup().catch(() => {}), 60_000); timer.unref();
  return { directory, list, listMany, bind, stage, serve, cleanup, async close() { clearInterval(timer); if (ownedDirectory) await rm(directory, { recursive: true, force: true }); } };
  } catch (error) {
    if (ownedDirectory) await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
