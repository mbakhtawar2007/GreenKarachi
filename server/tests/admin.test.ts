import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Response } from 'express';
import { requireAuth, requireRoles, type RequestWithUser } from '../src/middleware/auth';
import { nurseryProfileSchema } from '../src/services/auth.service';
import {
  adminAuditFilterSchema,
  adminListingFilterSchema,
  adminReportFilterSchema,
  adminUserFilterSchema,
  applyVerificationDecision,
  buildAuditEntry,
  canAdminActOnUser,
  canReactivateAccount,
  canSuspendAccount,
  canTransitionModeration,
  canTransitionReport,
  canTransitionVerification,
  filterAdminUsers,
  findLiveDuplicateReport,
  hideContentSchema,
  isAccountSuspended,
  isListingPubliclyVisible,
  isLoginBlocked,
  isProjectPubliclyVisible,
  isVerifiedStatus,
  mergeAdminUser,
  paginateItems,
  reactivateUserSchema,
  reportInputSchema,
  reportStatusSchema,
  suspendUserSchema,
  verificationDecisionSchema,
  type MergedAdminUser
} from '../src/services/admin.service';
import { canViewProject } from '../src/services/projects.service';

describe('verification decisions (admin-only, never automatic)', () => {
  test('verification transitions allow decisions and reversals but not no-ops', () => {
    assert.equal(canTransitionVerification('PENDING', 'APPROVED'), true);
    assert.equal(canTransitionVerification('PENDING', 'REJECTED'), true);
    assert.equal(canTransitionVerification('APPROVED', 'REJECTED'), true);
    assert.equal(canTransitionVerification('APPROVED', 'PENDING'), true);
    assert.equal(canTransitionVerification('REJECTED', 'APPROVED'), true);
    assert.equal(canTransitionVerification('REJECTED', 'PENDING'), true);
    assert.equal(canTransitionVerification('PENDING', 'PENDING'), false);
    assert.equal(canTransitionVerification('APPROVED', 'APPROVED'), false);
    assert.equal(canTransitionVerification('REJECTED', 'REJECTED'), false);
  });

  test('applying a decision derives is_verified from APPROVED and nothing else', () => {
    assert.deepEqual(applyVerificationDecision('PENDING', 'APPROVED'), { verification_status: 'APPROVED', is_verified: true });
    assert.deepEqual(applyVerificationDecision('PENDING', 'REJECTED'), { verification_status: 'REJECTED', is_verified: false });
    assert.deepEqual(applyVerificationDecision('APPROVED', 'PENDING'), { verification_status: 'PENDING', is_verified: false });
    assert.equal(isVerifiedStatus('APPROVED'), true);
    assert.equal(isVerifiedStatus('PENDING'), false);
    assert.equal(isVerifiedStatus(null), false);
    assert.throws(() => applyVerificationDecision('APPROVED', 'APPROVED'), /Invalid verification transition/);
  });

  test('a decision requires an explicit status', () => {
    assert.equal(verificationDecisionSchema.safeParse({ status: 'APPROVED' }).success, true);
    assert.equal(verificationDecisionSchema.safeParse({}).success, false);
    assert.equal(verificationDecisionSchema.safeParse({ status: 'VERIFIED' }).success, false);
  });

  test('submitting a nursery profile cannot set verification fields', () => {
    // The profile schema has no verification fields, so a nursery owner
    // who submits is_verified / verificationStatus with their profile has
    // them stripped: filling in a form never verifies anyone.
    const parsed = nurseryProfileSchema.parse({
      name: 'Green Nursery',
      is_verified: true,
      verificationStatus: 'APPROVED',
      verification_status: 'APPROVED'
    } as never) as unknown as Record<string, unknown>;
    assert.equal('is_verified' in parsed, false);
    assert.equal('verificationStatus' in parsed, false);
    assert.equal('verification_status' in parsed, false);
  });

  test('an admin cannot decide verification or suspension for their own account', () => {
    assert.equal(canAdminActOnUser('admin-1', 'user-2'), true);
    assert.equal(canAdminActOnUser('admin-1', 'admin-1'), false);
  });
});

describe('account suspension', () => {
  test('suspension state rules and login blocking', () => {
    assert.equal(isAccountSuspended({ is_suspended: true }), true);
    assert.equal(isAccountSuspended({ is_suspended: false }), false);
    assert.equal(isAccountSuspended(null), false);
    assert.equal(isLoginBlocked({ is_suspended: true }), true);
    assert.equal(isLoginBlocked({ is_suspended: false }), false);
    assert.equal(isLoginBlocked(null), false);
    assert.equal(canSuspendAccount({ is_suspended: false }), true);
    assert.equal(canSuspendAccount({ is_suspended: true }), false);
    assert.equal(canSuspendAccount(null), true);
    assert.equal(canReactivateAccount({ is_suspended: true }), true);
    assert.equal(canReactivateAccount({ is_suspended: false }), false);
  });

  test('suspension requires an explicit confirmation and a reason', () => {
    assert.equal(suspendUserSchema.safeParse({ reason: 'Repeated fraud reports', confirm: true }).success, true);
    assert.equal(suspendUserSchema.safeParse({ reason: 'Repeated fraud reports' }).success, false);
    assert.equal(suspendUserSchema.safeParse({ reason: 'Repeated fraud reports', confirm: false }).success, false);
    assert.equal(suspendUserSchema.safeParse({ confirm: true }).success, false);
    assert.equal(suspendUserSchema.safeParse({ reason: 'no', confirm: true }).success, false);
    assert.equal(reactivateUserSchema.safeParse({ confirm: true }).success, true);
    assert.equal(reactivateUserSchema.safeParse({}).success, false);
  });
});

describe('content moderation', () => {
  test('moderation transitions are a reversible two-state switch', () => {
    assert.equal(canTransitionModeration('VISIBLE', 'HIDDEN'), true);
    assert.equal(canTransitionModeration('HIDDEN', 'VISIBLE'), true);
    assert.equal(canTransitionModeration('VISIBLE', 'VISIBLE'), false);
    assert.equal(canTransitionModeration('HIDDEN', 'HIDDEN'), false);
  });

  test('hiding requires an explicit confirmation and a reason', () => {
    assert.equal(hideContentSchema.safeParse({ reason: 'Fraudulent listing', confirm: true }).success, true);
    assert.equal(hideContentSchema.safeParse({ reason: 'Fraudulent listing' }).success, false);
    assert.equal(hideContentSchema.safeParse({ confirm: true }).success, false);
  });

  test('hidden content is not publicly visible whatever its owner status', () => {
    assert.equal(isListingPubliclyVisible({ status: 'ACTIVE', moderation_status: 'VISIBLE' }), true);
    assert.equal(isListingPubliclyVisible({ status: 'ACTIVE', moderation_status: 'HIDDEN' }), false);
    assert.equal(isListingPubliclyVisible({ status: 'OUT_OF_STOCK', moderation_status: 'VISIBLE' }), false);
    assert.equal(isListingPubliclyVisible({ status: 'ACTIVE' }), true);
    assert.equal(isProjectPubliclyVisible({ status: 'PUBLISHED', moderation_status: 'VISIBLE' }), true);
    assert.equal(isProjectPubliclyVisible({ status: 'PUBLISHED', moderation_status: 'HIDDEN' }), false);
    assert.equal(isProjectPubliclyVisible({ status: 'DRAFT', moderation_status: 'VISIBLE' }), false);
  });

  test('a hidden project is visible only to its organizer through the project rules', () => {
    const hidden = { organizer_user_id: 'organizer-1', status: 'PUBLISHED', moderation_status: 'HIDDEN' };
    assert.equal(canViewProject(hidden, null), false);
    assert.equal(canViewProject(hidden, 'someone-else'), false);
    assert.equal(canViewProject(hidden, 'someone-else', true), false);
    assert.equal(canViewProject(hidden, 'organizer-1'), true);
  });
});

describe('reported content workflow', () => {
  test('reports move forward only and closed reports are terminal', () => {
    assert.equal(canTransitionReport('OPEN', 'UNDER_REVIEW'), true);
    assert.equal(canTransitionReport('OPEN', 'RESOLVED'), true);
    assert.equal(canTransitionReport('OPEN', 'DISMISSED'), true);
    assert.equal(canTransitionReport('UNDER_REVIEW', 'RESOLVED'), true);
    assert.equal(canTransitionReport('RESOLVED', 'UNDER_REVIEW'), false);
    assert.equal(canTransitionReport('DISMISSED', 'OPEN' as never), false);
    assert.equal(canTransitionReport('OPEN', 'OPEN'), false);
  });

  test('report input requires a known target type, a uuid target, and a reason', () => {
    const targetId = '123e4567-e89b-12d3-a456-426614174000';
    assert.equal(reportInputSchema.safeParse({ targetType: 'LISTING', targetId, reason: 'SPAM' }).success, true);
    assert.equal(reportInputSchema.safeParse({ targetType: 'COMMENT', targetId, reason: 'SPAM' }).success, false);
    assert.equal(reportInputSchema.safeParse({ targetType: 'LISTING', targetId: 'not-a-uuid', reason: 'SPAM' }).success, false);
    assert.equal(reportInputSchema.safeParse({ targetType: 'LISTING', targetId }).success, false);
  });

  test('resolving or dismissing a report requires resolution notes', () => {
    assert.equal(reportStatusSchema.safeParse({ status: 'UNDER_REVIEW' }).success, true);
    assert.equal(reportStatusSchema.safeParse({ status: 'RESOLVED', resolutionNotes: 'Listing removed' }).success, true);
    assert.equal(reportStatusSchema.safeParse({ status: 'RESOLVED' }).success, false);
    assert.equal(reportStatusSchema.safeParse({ status: 'DISMISSED' }).success, false);
    assert.equal(reportStatusSchema.safeParse({ status: 'OPEN' }).success, false);
  });

  test('one live report per reporter per target', () => {
    const reports = [
      { reporter_user_id: 'user-1', target_type: 'LISTING', target_id: 'listing-1', status: 'OPEN' },
      { reporter_user_id: 'user-1', target_type: 'LISTING', target_id: 'listing-2', status: 'RESOLVED' },
      { reporter_user_id: 'user-2', target_type: 'LISTING', target_id: 'listing-1', status: 'UNDER_REVIEW' }
    ];
    assert.equal(findLiveDuplicateReport(reports, { reporter_user_id: 'user-1', target_type: 'LISTING', target_id: 'listing-1' })?.status, 'OPEN');
    assert.equal(findLiveDuplicateReport(reports, { reporter_user_id: 'user-1', target_type: 'LISTING', target_id: 'listing-2' }), undefined);
    assert.equal(findLiveDuplicateReport(reports, { reporter_user_id: 'user-3', target_type: 'LISTING', target_id: 'listing-1' }), undefined);
  });
});

describe('audit trail entries', () => {
  test('buildAuditEntry records actor, action, target, and state change', () => {
    const entry = buildAuditEntry({
      actor: { id: 'admin-1', email: 'admin@example.test' },
      action: 'USER_SUSPENDED',
      targetType: 'USER',
      targetId: 'user-9',
      targetUserId: 'user-9',
      previousState: { is_suspended: false },
      newState: { is_suspended: true },
      reason: '  Repeated fraud reports  '
    });
    assert.equal(entry.actor_user_id, 'admin-1');
    assert.equal(entry.actor_email, 'admin@example.test');
    assert.equal(entry.action, 'USER_SUSPENDED');
    assert.equal(entry.target_id, 'user-9');
    assert.deepEqual(entry.previous_state, { is_suspended: false });
    assert.deepEqual(entry.new_state, { is_suspended: true });
    assert.equal(entry.reason, 'Repeated fraud reports');
  });

  test('buildAuditEntry refuses entries without an actor or a target', () => {
    assert.throws(() => buildAuditEntry({
      actor: { id: '' },
      action: 'USER_SUSPENDED',
      targetType: 'USER',
      targetId: 'user-9'
    }), /acting admin/);
    assert.throws(() => buildAuditEntry({
      actor: { id: 'admin-1' },
      action: 'USER_SUSPENDED',
      targetType: 'USER',
      targetId: ''
    }), /requires a target/);
  });
});

describe('admin list filters and pagination', () => {
  const users: MergedAdminUser[] = [
    { id: 'u1', email: 'ayesha@example.test', name: 'Ayesha', roles: ['BUYER'], created_at: null, verification_status: 'PENDING', is_suspended: false, suspension_reason: null },
    { id: 'u2', email: 'bilal@example.test', name: 'Bilal', roles: ['NURSERY_OWNER'], created_at: null, verification_status: 'APPROVED', is_suspended: false, suspension_reason: null },
    { id: 'u3', email: 'green@example.test', name: 'Green Nursery', roles: ['NURSERY_OWNER'], created_at: null, verification_status: 'REJECTED', is_suspended: true, suspension_reason: 'Fraud' }
  ];

  test('mergeAdminUser applies account-state defaults and keeps private fields out', () => {
    const merged = mergeAdminUser(
      { id: 'u9', email: 'new@example.test', user_metadata: { name: 'New User', roles: ['BUYER'] } },
      null
    );
    assert.equal(merged.verification_status, 'PENDING');
    assert.equal(merged.is_suspended, false);
    assert.equal('verification_document_ref' in merged, false);
    assert.equal('passwordHash' in merged, false);
  });

  test('filterAdminUsers filters by query, verification status, and suspension', () => {
    assert.deepEqual(filterAdminUsers(users, {}).map((user) => user.id), ['u1', 'u2', 'u3']);
    assert.deepEqual(filterAdminUsers(users, { query: 'green' }).map((user) => user.id), ['u3']);
    assert.deepEqual(filterAdminUsers(users, { query: 'BILAL@' }).map((user) => user.id), ['u2']);
    assert.deepEqual(filterAdminUsers(users, { verificationStatus: 'APPROVED' }).map((user) => user.id), ['u2']);
    assert.deepEqual(filterAdminUsers(users, { suspended: 'true' }).map((user) => user.id), ['u3']);
    assert.deepEqual(filterAdminUsers(users, { suspended: 'false' }).map((user) => user.id), ['u1', 'u2']);
  });

  test('paginateItems slices pages and reports totals', () => {
    const page2 = paginateItems([1, 2, 3, 4, 5], 2, 2);
    assert.deepEqual(page2.items, [3, 4]);
    assert.deepEqual(page2.pagination, { page: 2, pageSize: 2, total: 5, totalPages: 3 });
    assert.deepEqual(paginateItems([], 1, 20).pagination, { page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });

  test('admin filter schemas apply pagination defaults and reject bad values', () => {
    const parsed = adminUserFilterSchema.parse({});
    assert.equal(parsed.page, 1);
    assert.equal(parsed.pageSize, 20);
    assert.equal(adminUserFilterSchema.safeParse({ verificationStatus: 'VERIFIED' }).success, false);
    assert.equal(adminListingFilterSchema.safeParse({ moderationStatus: 'HIDDEN' }).success, true);
    assert.equal(adminListingFilterSchema.safeParse({ moderationStatus: 'GONE' }).success, false);
    assert.equal(adminReportFilterSchema.safeParse({ status: 'OPEN' }).success, true);
    assert.equal(adminAuditFilterSchema.safeParse({ action: 'USER_SUSPENDED' }).success, true);
    assert.equal(adminAuditFilterSchema.safeParse({ action: 'USER_DELETED' }).success, false);
    assert.equal(adminUserFilterSchema.safeParse({ pageSize: 500 }).success, false);
  });
});

describe('role permissions for admin endpoints', () => {
  const makeResponse = () => {
    const state = { statusCode: 200 };
    const response = {
      status(code: number) { state.statusCode = code; return this; },
      json() { return this; }
    } as unknown as Response;
    return { state, response };
  };
  const asUser = (id: string, roles: string[]) => ({
    user: { id, email: `${id}@example.test`, name: id, roles }
  }) as unknown as RequestWithUser;

  test('unauthenticated requests are rejected by requireAuth', () => {
    let statusCode = 200;
    let continued = false;
    const response = {
      status(code: number) { statusCode = code; return this; },
      json() { return this; }
    } as unknown as Response;
    requireAuth({ headers: {} } as RequestWithUser, response, () => { continued = true; });
    assert.equal(statusCode, 401);
    assert.equal(continued, false);
  });

  test('every non-admin role is rejected from admin route groups', () => {
    // routes/admin.ts mounts requireAuth + requireRoles('ADMIN') on the
    // whole router, so this guard is what protects the users, nurseries,
    // listings, projects, reports, and audit route groups alike.
    for (const role of ['BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR_INVESTOR']) {
      const { state, response } = makeResponse();
      let continued = false;
      requireRoles('ADMIN')(asUser('user-1', [role]), response, () => { continued = true; });
      assert.equal(state.statusCode, 403, `${role} should be rejected`);
      assert.equal(continued, false);
    }
  });

  test('admins pass the admin role guard', () => {
    const { state, response } = makeResponse();
    let continued = false;
    requireRoles('ADMIN')(asUser('admin-1', ['ADMIN']), response, () => { continued = true; });
    assert.equal(state.statusCode, 200);
    assert.equal(continued, true);
  });
});
