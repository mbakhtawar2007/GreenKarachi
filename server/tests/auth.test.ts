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
import { nurseryProfileSchema, registerSchema } from '../src/services/auth.service';

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

  test('registration schema rejects ADMIN as a self-registered role', () => {
    assert.throws(() =>
      registerSchema.parse({
        name: 'Attacker',
        email: 'attacker@example.com',
        password: 'Password123',
        role: 'ADMIN'
      })
    );
  });

  test('registration schema accepts the public roles', () => {
    for (const role of ['BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR', 'DONOR_INVESTOR']) {
      const parsed = registerSchema.parse({
        name: 'Legit User',
        email: 'legit@example.com',
        password: 'Password123',
        role
      });
      assert.equal(parsed.role, role);
    }
  });

  test('nursery website must be an http(s) URL', () => {
    const base = { name: 'Test Nursery', phone: '', city: '', address: '', website: '' };
    assert.equal(nurseryProfileSchema.parse({ ...base, website: 'https://example.com' }).website, 'https://example.com');
    assert.equal(nurseryProfileSchema.parse({ ...base, website: '' }).website, '');
    assert.throws(() => nurseryProfileSchema.parse({ ...base, website: 'javascript:alert(1)' }));
    assert.throws(() => nurseryProfileSchema.parse({ ...base, website: 'example.com' }));
  });

  test('session tokens expire after 48 hours', () => {
    const payload = { id: 'user-1', email: 'demo@example.com', name: 'Demo', roles: ['BUYER'] as const };
    const before = Math.floor(Date.now() / 1000);
    const decoded = verifyToken(signToken(payload)) as { exp?: number };
    const after = Math.floor(Date.now() / 1000);

    assert.ok(decoded.exp !== undefined);
    assert.ok(decoded.exp - before >= 48 * 60 * 60 - 5);
    assert.ok(decoded.exp - after <= 48 * 60 * 60 + 5);
  });
});
