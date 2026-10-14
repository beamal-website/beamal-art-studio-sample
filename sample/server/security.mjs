import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const parameters = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, parameters);
  return `scrypt-v1:${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [scheme, salt, expected] = String(encoded).split(':');
  if (scheme !== 'scrypt-v1' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(expected)) return false;
  const actual = await scrypt(password, salt, 64, parameters);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

export const randomToken = () => randomBytes(32).toString('base64url');
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const csrfForToken = token => createHash('sha256').update(`beamal-csrf:${token}`).digest('base64url');
export function matchesHash(token, expected) {
  if (typeof token !== 'string' || token.length > 256 || !/^[a-f0-9]{64}$/.test(expected || '')) return false;
  return timingSafeEqual(Buffer.from(tokenHash(token), 'hex'), Buffer.from(expected, 'hex'));
}

export function normaliseEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
