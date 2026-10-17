import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveListenerConfig } from '../listener-config.mjs';

test('Render PORT selects its port and an externally reachable default host', () => {
  assert.deepEqual(resolveListenerConfig({ PORT: '10000', BEAMAL_PORT: '5180' }), {
    host: '0.0.0.0',
    port: 10000,
  });
});

test('local API defaults to loopback when no platform port is provided', () => {
  assert.deepEqual(resolveListenerConfig({}), {
    host: '127.0.0.1',
    port: 5180,
  });
});

test('explicit Beamal host is honored and its port is used when PORT is absent', () => {
  assert.deepEqual(resolveListenerConfig({ BEAMAL_HOST: '127.0.0.2', BEAMAL_PORT: '5000' }), {
    host: '127.0.0.2',
    port: 5000,
  });
});
