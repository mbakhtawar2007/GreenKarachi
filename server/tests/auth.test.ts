import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  hashPassword,
  isRoleAllowed,
  normalizeRoles,
  sanitizeUser,
  signToken,
  verifyPassword,
  verifyToken
} from '../src/lib/auth';

describe('auth helpers', () => {
  test('hashes and verifies a password', async () => {
    const plainText = 'super-secret-123';
    const hash = await hashPassword(plainText);

    assert.notEqual(hash, plainText);
    assert.equal(await verifyPassword(plainText, hash), true);
  });

  test('normalizes valid roles and defaults to buyer', () => {
    assert.deepEqual(normalizeRoles('nursery_owner'), ['NURSERY_OWNER']);
    assert.deepEqual(normalizeRoles('unknown-role'), ['BUYER']);
    assert.deepEqual(normalizeRoles(undefined), ['BUYER']);
  });

  test('sanitizes user payloads before sending them to the client', () => {
    const user = { id: '1', email: 'demo@example.com', passwordHash: 'abc', name: 'Demo' };
    assert.deepEqual(sanitizeUser(user), { id: '1', email: 'demo@example.com', name: 'Demo' });
  });

  test('role checks allow only configured permissions', () => {
    assert.equal(isRoleAllowed(['ADMIN'], ['ADMIN']), true);
    assert.equal(isRoleAllowed(['BUYER'], ['ADMIN']), false);
  });

  test('JWTs can be signed and verified', () => {
    const payload = { id: 'user-1', email: 'demo@example.com', name: 'Demo', roles: ['BUYER'] as const };
    const token = signToken(payload);
    const decoded = verifyToken(token);

    assert.equal(decoded.id, 'user-1');
    assert.equal(decoded.email, 'demo@example.com');
  });
});
