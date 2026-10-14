import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApplication } from '../app.mjs';

async function staticFixture(t) {
  const staticDir = await mkdtemp(join(tmpdir(), 'beamal-static-module-'));
  const source = 'export const fictionalWorkerVersion = "fixture-module";\n';
  await mkdir(join(staticDir, 'assets'));
  await writeFile(join(staticDir, 'index.html'), '<!doctype html><title>Fictional static page</title>');
  await writeFile(join(staticDir, 'assets', 'pdf.worker.min-fixture.mjs'), source);
  let application;
  try {
    application = await createApplication({ staticDir });
    await new Promise(resolve => application.server.listen(0, '127.0.0.1', resolve));
  } catch (error) { await application?.close(); await rm(staticDir, { recursive: true, force: true }); throw error; }
  t.after(async () => { await application.close(); await rm(staticDir, { recursive: true, force: true }); });
  return { base: `http://127.0.0.1:${application.server.address().port}`, source };
}

test('self-hosted PDF worker ES modules receive executable JavaScript MIME while retaining nosniff and exact bytes', async t => {
  const fixture = await staticFixture(t);
  const response = await fetch(fixture.base + '/assets/pdf.worker.min-fixture.mjs');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /^(?:text|application)\/javascript(?:\s*;|$)/i, 'Module workers must not be sent as application/octet-stream under nosniff.');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), fixture.source);
});

test('a missing module asset returns a real 404 rather than the application HTML fallback', async t => {
  const fixture = await staticFixture(t);
  const response = await fetch(fixture.base + '/assets/missing-pdf.worker.mjs');
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type') || '', /^application\/json/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const data = await response.json();
  assert.equal(data.error.code, 'NOT_FOUND');
  assert.doesNotMatch(JSON.stringify(data), /<!doctype|Fictional static page/);
});
