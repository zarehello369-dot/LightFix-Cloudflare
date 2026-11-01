import test from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import worker, { internals } from '../src/worker.js';

test('password hash generated for bootstrap matches Worker verification', async () => {
  const salt = Buffer.from('0123456789abcdef').toString('base64');
  const password = 'A-test-passphrase-2026';
  const expected = pbkdf2Sync(password, Buffer.from(salt, 'base64'), 100000, 32, 'sha256').toString('hex');
  assert.equal(await internals.passwordHash(password, salt), expected);
});

test('public report projection excludes reporter contact and staff instructions', () => {
  const result = internals.publicReport({ id: 'a', pole: 'T0001', symptom: 'ไฟไม่ติด', status: 0, created_at: 1,
    contact_type: 'phone', contact_value: 'private', instructions: 'staff only', before_photo_key: null });
  assert.equal(result.pole, 'T0001');
  assert.equal('contactValue' in result, false);
  assert.equal('contact_value' in result, false);
  assert.equal('instructions' in result, false);
});

test('pole and photo validation rejects malformed inputs', () => {
  assert.throws(() => internals.poleNumber('T12'));
  assert.throws(() => internals.decodePhoto('data:image/png;base64,abcd'));
  assert.throws(() => internals.decodePhoto('data:image/svg+xml;base64,PHN2Zz4='));
});

test('staff workspaces require a LightFix login session', async () => {
  for (const path of ['/api/admin/workspace', '/api/workspace']) {
    const response = await worker.fetch(new Request(`https://lightfix.example${path}`), {});
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'LOGIN_REQUIRED');
  }
});
