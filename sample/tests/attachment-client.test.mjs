import test from 'node:test';
import assert from 'node:assert/strict';
import { attachmentIssue, uploadMaterialAttachment } from '../client/attachment-client.js';
import { materialAttachmentDrafts, materialAttachmentList } from '../client/attachments-ui.js';

function fixture() {
  const request = {
    upload: {}, headers: {}, status: 0, responseText: '',
    open(method, url) { this.method = method; this.url = url; },
    setRequestHeader(name, value) { this.headers[name] = value; },
    send(file) { this.file = file; },
    abort() { this.aborted = true; this.onabort?.(); },
  };
  return { request, createRequest: () => request };
}
const file = (name = '顏色練習.pdf', size = 1200) => ({ name, size, type: 'application/pdf' });
const helpers = { t: (_, english) => english, esc: value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) };

test('attachment drafts show transfer progress and escaped file names, while queued files have no server preview link', () => {
  const html = materialAttachmentDrafts([{ localId: 'draft-1', name: '<img onerror=alert(1)>.pdf', size: 1200, status: 'uploading', percent: 45 }], helpers);
  assert.match(html, /&lt;img/); assert.doesNotMatch(html, /<img|href=/);
  assert.match(html, /role="progressbar"/); assert.match(html, /aria-valuenow="45"/);
  assert.match(html, /45%/);
});

test('persisted attachment links remain private service URLs and download controls follow the caller permission', () => {
  const material = { id: 'material / 一', attachments: [{ id: 'file / 一', name: '圖片 <example>.png', mimeType: 'image/png', size: 1200 }] };
  const readonly = materialAttachmentList(material, helpers, { canDownload: false });
  assert.match(readonly, /\/attachment-preview\.html\?materialId=material%20%2F%20%E4%B8%80&amp;attachmentId=file%20%2F%20%E4%B8%80/);
  assert.match(readonly, /圖片 &lt;example&gt;\.png/); assert.doesNotMatch(readonly, /download=1/);
  assert.match(materialAttachmentList(material, helpers, { canDownload: true }), /download=1/);
});

test('file choices reject unsupported, empty, unsafe and over-50MB files before transfer, while all supported extensions and the exact limit are accepted', () => {
  for (const name of ['a.PNG', 'a.jpeg', 'a.jpg', 'a.gif', 'a.mp4', 'a.avi', 'a.mov', 'a.mp3', 'a.wav', 'a.m4a', 'a.pdf']) assert.equal(attachmentIssue(file(name, 50_000_000)), '', name);
  assert.equal(attachmentIssue(file('a.pdf', 50_000_001)), 'size');
  assert.equal(attachmentIssue(file('a.pdf', 0)), 'empty');
  assert.equal(attachmentIssue(file('a.html')), 'type');
  for (const name of ['../a.pdf', 'a\\b.pdf', 'a\n.pdf', '']) assert.equal(attachmentIssue(file(name)), 'name');
});

test('uploads send binary data with encoded names, CSRF and stable retry keys, expose progress, and wait for the server acknowledgement', async () => {
  const fx = fixture(), chosen = file(), progress = [];
  const pending = uploadMaterialAttachment('course / 一', chosen, { ...fx, csrfToken: 'csrf-fixture', operationKey: 'stable-file-key', onProgress: value => progress.push(value) });
  assert.equal(fx.request.method, 'POST');
  assert.equal(fx.request.url, '/api/courses/course%20%2F%20%E4%B8%80/material-uploads');
  assert.equal(fx.request.file, chosen);
  assert.equal(fx.request.headers['X-File-Name'], encodeURIComponent(chosen.name));
  assert.equal(fx.request.headers['X-CSRF-Token'], 'csrf-fixture');
  assert.equal(fx.request.headers['Idempotency-Key'], 'stable-file-key');
  assert.equal(fx.request.headers['Content-Type'], 'application/pdf');
  let settled = false; pending.then(() => { settled = true; });
  fx.request.upload.onprogress({ lengthComputable: true, loaded: 600, total: 1200 });
  assert.deepEqual(progress, [{ loaded: 600, total: 1200, percent: 50 }]);
  await Promise.resolve(); assert.equal(settled, false);
  fx.request.status = 201; fx.request.responseText = JSON.stringify({ upload: { id: 'upload-1', name: chosen.name, size: chosen.size, mimeType: chosen.type } }); fx.request.onload();
  assert.equal((await pending).upload.id, 'upload-1');
});

test('interrupted uploads abort their request and distinguish cancellation from network failure for a safe retry', async () => {
  const fx = fixture(), controller = new AbortController();
  const pending = uploadMaterialAttachment('course-1', file(), { ...fx, signal: controller.signal, operationKey: 'retry-key' });
  controller.abort(); await assert.rejects(pending, error => error.code === 'UPLOAD_CANCELLED'); assert.equal(fx.request.aborted, true);
  const next = fixture(), retry = uploadMaterialAttachment('course-1', file(), { ...next, operationKey: 'retry-key' });
  next.request.onerror(); await assert.rejects(retry, error => error.code === 'UPLOAD_CONNECTION_FAILED');
  const preAborted = new AbortController(); preAborted.abort();
  await assert.rejects(uploadMaterialAttachment('course-1', file(), { signal: preAborted.signal, createRequest() { assert.fail('An already cancelled transfer must not start'); } }), error => error.code === 'UPLOAD_CANCELLED');
});

test('structured server failures preserve their status, while an invalid success acknowledgement and timeouts are not treated as a saved upload', async () => {
  const fx = fixture(), conflict = uploadMaterialAttachment('course-1', file(), fx);
  fx.request.status = 409; fx.request.responseText = JSON.stringify({ error: { code: 'IDEMPOTENCY_CONFLICT', message: 'The file changed.' } }); fx.request.onload();
  await assert.rejects(conflict, error => error.status === 409 && error.code === 'IDEMPOTENCY_CONFLICT');
  const bad = fixture(), invalid = uploadMaterialAttachment('course-1', file(), bad);
  bad.request.status = 201; bad.request.responseText = '{}'; bad.request.onload();
  await assert.rejects(invalid, error => error.code === 'INVALID_UPLOAD_RESPONSE');
  const timeout = fixture(), slow = uploadMaterialAttachment('course-1', file(), timeout);
  timeout.request.ontimeout(); await assert.rejects(slow, error => error.code === 'UPLOAD_TIMEOUT');
});
