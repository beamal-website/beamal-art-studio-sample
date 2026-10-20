import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parentPort } from 'node:worker_threads';
import { createApplication } from './app.mjs';

const sampleDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolve(process.env.BEAMAL_DATA_DIR || resolve(sampleDir, '.data'));
const databasePath = resolve(process.env.BEAMAL_DATABASE_PATH || resolve(dataDir, 'beamal.sqlite'));
const accountPath = resolve(dataDir, 'bootstrap-accounts.json');
const postgresMode = Boolean(process.env.DATABASE_URL);

let application = null;

async function start() {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });

  let accounts = [], bootstrapNewAccounts = false;
  const accountExists = await stat(accountPath).then(() => true).catch(() => false);
  if (postgresMode) {
    accounts = [];
  } else if (accountExists) {
    const saved = JSON.parse(await readFile(accountPath, 'utf8'));
    if (!Array.isArray(saved.accounts)) throw new Error('Bootstrap account file is invalid.');
    accounts = saved.accounts;
  } else {
    let existingUsers = 0;
    if (await stat(databasePath).then(() => true).catch(() => false)) {
      const probe = new DatabaseSync(databasePath, { readOnly: true });
      try {
        if (probe.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()) existingUsers = probe.prepare('SELECT COUNT(*) AS count FROM users').get().count;
      } finally { probe.close(); }
    }
    if (!existingUsers) {
      accounts = [
        { email: 'admin@beamal.test', displayName: 'Test administrator (fictional)', role: 'admin' },
        { email: 'teacher@beamal.test', displayName: 'Test teacher (fictional)', role: 'teacher' },
        { email: 'student@beamal.test', displayName: 'Test student (fictional)', role: 'student' },
      ].map(user => ({ ...user, password: randomBytes(24).toString('base64url') }));
      bootstrapNewAccounts = true;
    }
  }
  const seedCourses = [
    { id: 'art', courseName: 'Course 1', feeName: 'Course 1 package', price: 1000 },
    { id: 'story', courseName: 'Course 2', feeName: 'Course 2 package', price: 1200 },
    { id: 'sewing', courseName: 'Course 3', feeName: 'Course 3 package', price: 1500 },
  ].map(course => ({ ...course, category: 'Fictional test course', level: '', pricingModel: 'package', packageType: 'visits', packageTotal: 4, bookingExpiry: null, onlineStore: true }));
  const staticDir = resolve(process.env.BEAMAL_STATIC_DIR || resolve(sampleDir, 'dist'));
  const options = {
    databasePath,
    databaseUrl: process.env.DATABASE_URL || '',
    seedUsers: accounts,
    seedCourses: postgresMode ? [] : seedCourses,
    staticDir,
    secureCookies: process.env.BEAMAL_SECURE_COOKIES === 'true',
    trustGatewayClientAddress: true,
  };
  if (process.env.BEAMAL_ALLOWED_ORIGINS) options.allowedOrigins = process.env.BEAMAL_ALLOWED_ORIGINS.split(',').map(value => value.trim()).filter(Boolean);
  console.log(`Initializing Beamal shared test application with ${postgresMode ? 'PostgreSQL' : 'SQLite'}.`);
  application = await createApplication(options);
  console.log('Application initialized; opening internal HTTP listener.');
  if (bootstrapNewAccounts) {
    try {
      await writeFile(accountPath, JSON.stringify({ notice: 'Fictional accounts for shared-system testing only. Keep this file private.', createdAt: new Date().toISOString(), accounts }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    } catch (error) {
      await application.close();
      application = null;
      throw error;
    }
  }
  await new Promise((accept, reject) => {
    application.server.once('error', reject);
    application.server.listen(0, '127.0.0.1', accept);
  });
  const address = application.server.address();
  console.log(`Beamal shared test application listening on http://127.0.0.1:${address.port}`);
  console.log(`Fictional test account credentials ${accounts.length ? `are kept locally in ${accountPath}` : 'were not regenerated for the existing database'}.`);
  parentPort.postMessage({ type: 'ready', port: address.port });
  parentPort.on('message', async message => {
    if (message?.type !== 'stop' || !application) return;
    try {
      await application.close();
      application = null;
      parentPort.postMessage({ type: 'stopped' });
    } catch (error) {
      console.error('Could not close the Beamal application worker cleanly.', error);
      process.exitCode = 1;
    } finally {
      parentPort.close();
    }
  });
}

start().catch(async error => {
  if (application) {
    try {
      await application.close();
      application = null;
    } catch (closeError) {
      console.error('Could not close the application after startup failed.', closeError);
    }
  }
  console.error('Beamal application worker failed to start.', error);
  parentPort.postMessage({ type: 'startup-error', error: { message: error.message, code: error.code } });
  parentPort.close();
  process.exitCode = 1;
});
