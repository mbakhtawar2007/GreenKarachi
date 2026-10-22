import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/auth';
import {
  accountSuspensionNotification,
  contentModerationNotification,
  createNotification,
  reportUpdatedNotification,
  verificationDecisionNotification
} from './notifications.service';

// Phase 7 domain rules.
// Admins provide the platform's minimum trust and governance controls:
// they decide user and nursery verification, moderate listings and
// projects, handle reported content, and suspend accounts. Every one of
// these actions is admin-only (the routes enforce ADMIN role on the
// server) and is written to the admin_audit_log with the actor, the
// target, and the previous/new state.
//
// Verification is NEVER automatic. Submitting a profile, a listing, or a
// form changes nothing about verification state; only an explicit admin
// decision through this service can move a verification status, and the
// decision is recorded with the deciding admin and the timestamp.
// Verification notes and any document references stay in admin-only
// records and are never selected into public responses.
//
// Destructive or high-impact actions (suspension, rejection, moderation
// takedown) require an explicit confirmation flag and a reason, both
// validated here on the server — the client confirmation dialog is only a
// convenience, never the enforcement.

export const verificationStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const moderationStatuses = ['VISIBLE', 'HIDDEN'] as const;
export const reportTargetTypes = ['LISTING', 'PROJECT', 'NURSERY', 'USER'] as const;
export const reportReasons = ['SPAM', 'FRAUD', 'INAPPROPRIATE', 'INCORRECT_INFORMATION', 'SAFETY', 'OTHER'] as const;
export const reportStatuses = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const;
export const auditActions = [
  'USER_VERIFICATION_CHANGED',
  'NURSERY_VERIFICATION_CHANGED',
  'USER_SUSPENDED',
  'USER_REACTIVATED',
  'LISTING_MODERATION_CHANGED',
  'PROJECT_MODERATION_CHANGED',
  'REPORT_STATUS_CHANGED'
] as const;
export const auditTargetTypes = ['USER', 'NURSERY', 'LISTING', 'PROJECT', 'REPORT'] as const;

export type VerificationStatus = (typeof verificationStatuses)[number];
export type ModerationStatus = (typeof moderationStatuses)[number];
export type ReportTargetType = (typeof reportTargetTypes)[number];
export type ReportStatus = (typeof reportStatuses)[number];
export type AuditAction = (typeof auditActions)[number];

export type AdminActor = { id: string; email?: string | null };

export type AccountStateLike = {
  verification_status?: string | null;
  is_suspended?: boolean | null;
} | null | undefined;

export type AccountStateRow = {
  verification_status?: string | null;
  is_suspended?: boolean | null;
  suspension_reason?: string | null;
};

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const reasonSchema = z.string().trim().min(3, 'A reason of at least 3 characters is required.').max(500);

// A verification decision is explicit: the admin names the outcome. There
// is deliberately no schema anywhere that lets a user set their own
// verification state (profile schemas strip such fields, which the tests
// prove).
export const verificationDecisionSchema = z.object({
  status: z.enum(verificationStatuses),
  notes: z.string().trim().max(1000).optional().or(z.literal(''))
});

export const suspendUserSchema = z.object({
  reason: reasonSchema,
  confirm: z.literal(true, { errorMap: () => ({ message: 'Suspension must be explicitly confirmed.' }) })
});

export const reactivateUserSchema = z.object({
  confirm: z.literal(true, { errorMap: () => ({ message: 'Reactivation must be explicitly confirmed.' }) }),
  notes: z.string().trim().max(1000).optional().or(z.literal(''))
});

export const hideContentSchema = z.object({
  reason: reasonSchema,
  confirm: z.literal(true, { errorMap: () => ({ message: 'Hiding content must be explicitly confirmed.' }) })
});

export const restoreContentSchema = z.object({
  notes: z.string().trim().max(1000).optional().or(z.literal(''))
});

export const reportInputSchema = z.object({
  targetType: z.enum(reportTargetTypes),
  targetId: z.string().uuid(),
  reason: z.enum(reportReasons),
  details: z.string().trim().max(2000).optional().or(z.literal(''))
});

export const reportStatusSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
  resolutionNotes: z.string().trim().max(1000).optional().or(z.literal(''))
}).superRefine((input, ctx) => {
  if ((input.status === 'RESOLVED' || input.status === 'DISMISSED') && !(input.resolutionNotes ?? '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['resolutionNotes'],
      message: 'Resolution notes are required when a report is resolved or dismissed.'
    });
  }
});

const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20)
};

export const adminUserFilterSchema = z.object({
  query: z.string().trim().max(120).optional(),
  verificationStatus: z.enum(verificationStatuses).optional(),
  suspended: z.enum(['true', 'false']).optional(),
  ...pageFields
});

export const adminNurseryFilterSchema = z.object({
  query: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  verificationStatus: z.enum(verificationStatuses).optional(),
  ...pageFields
});

export const adminListingFilterSchema = z.object({
  query: z.string().trim().max(120).optional(),
  status: z.enum(['ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED']).optional(),
  moderationStatus: z.enum(moderationStatuses).optional(),
  ...pageFields
});

export const adminProjectFilterSchema = z.object({
  query: z.string().trim().max(120).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED', 'ARCHIVED']).optional(),
  moderationStatus: z.enum(moderationStatuses).optional(),
  ...pageFields
});

export const adminReportFilterSchema = z.object({
  status: z.enum(reportStatuses).optional(),
  targetType: z.enum(reportTargetTypes).optional(),
  ...pageFields
});

export const adminAuditFilterSchema = z.object({
  actorUserId: z.string().uuid().optional(),
  action: z.enum(auditActions).optional(),
  targetType: z.enum(auditTargetTypes).optional(),
  targetId: z.string().trim().max(120).optional(),
  ...pageFields
});

export type VerificationDecisionInput = z.infer<typeof verificationDecisionSchema>;
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type ReportInput = z.infer<typeof reportInputSchema>;
export type ReportStatusInput = z.infer<typeof reportStatusSchema>;
export type AdminUserFilters = z.infer<typeof adminUserFilterSchema>;
export type AdminNurseryFilters = z.infer<typeof adminNurseryFilterSchema>;
export type AdminListingFilters = z.infer<typeof adminListingFilterSchema>;
export type AdminProjectFilters = z.infer<typeof adminProjectFilterSchema>;
export type AdminReportFilters = z.infer<typeof adminReportFilterSchema>;
export type AdminAuditFilters = z.infer<typeof adminAuditFilterSchema>;

// ---------------------------------------------------------------------------
// Pure business rules (unit tested without a database)
// ---------------------------------------------------------------------------

// Verification can be revisited: an approval can be revoked, a rejection
// can be overturned, and either can be reset to PENDING for re-review.
// Moving to the state the record is already in is not a decision and is
// rejected so the audit trail only contains real changes.
export const verificationTransitions: Record<VerificationStatus, VerificationStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['REJECTED', 'PENDING'],
  REJECTED: ['APPROVED', 'PENDING']
};

export const canTransitionVerification = (from: VerificationStatus, to: VerificationStatus): boolean =>
  verificationTransitions[from]?.includes(to) ?? false;

export const isVerifiedStatus = (status?: string | null): boolean => status === 'APPROVED';

// The single place verification state is derived. is_verified is a direct
// reflection of an admin APPROVED decision and of nothing else.
export const applyVerificationDecision = (
  currentStatus: VerificationStatus,
  decision: VerificationStatus
): { verification_status: VerificationStatus; is_verified: boolean } => {
  if (!canTransitionVerification(currentStatus, decision)) {
    throw new Error(`Invalid verification transition from ${currentStatus} to ${decision}.`);
  }
  return { verification_status: decision, is_verified: isVerifiedStatus(decision) };
};

// Governance hygiene: an admin cannot decide verification for, or
// suspend, their own account. Another admin must do it, so every
// high-impact action has an independent actor in the audit trail.
export const isSelfTarget = (actorUserId: string, targetUserId: string): boolean => actorUserId === targetUserId;

export const canAdminActOnUser = (actorUserId: string, targetUserId: string): boolean =>
  !isSelfTarget(actorUserId, targetUserId);

export const isAccountSuspended = (state: AccountStateLike): boolean => state?.is_suspended === true;

// Suspended accounts are blocked at login time (see auth.service). An
// already-issued token is not re-checked on every request, so suspension
// takes full effect at the next login at the latest.
export const isLoginBlocked = (state: AccountStateLike): boolean => isAccountSuspended(state);

export const canSuspendAccount = (state: AccountStateLike): boolean => !isAccountSuspended(state);
export const canReactivateAccount = (state: AccountStateLike): boolean => isAccountSuspended(state);

// Moderation is a two-state switch kept separate from owner status, so a
// takedown is reversible by restoring visibility without touching the
// owner's own status.
export const moderationTransitions: Record<ModerationStatus, ModerationStatus[]> = {
  VISIBLE: ['HIDDEN'],
  HIDDEN: ['VISIBLE']
};

export const canTransitionModeration = (from: ModerationStatus, to: ModerationStatus): boolean =>
  moderationTransitions[from]?.includes(to) ?? false;

// Public visibility rules. Rows created before Phase 7 have no
// moderation_status value in memory, so a missing value means VISIBLE.
export const isListingPubliclyVisible = (listing: {
  status?: string | null;
  moderation_status?: string | null;
}): boolean => listing.status === 'ACTIVE' && (listing.moderation_status ?? 'VISIBLE') === 'VISIBLE';

export const isProjectPubliclyVisible = (project: {
  status?: string | null;
  moderation_status?: string | null;
}): boolean =>
  (project.status === 'PUBLISHED' || project.status === 'COMPLETED')
  && (project.moderation_status ?? 'VISIBLE') === 'VISIBLE';

// Reports move forward through the handling workflow only. Resolved and
// dismissed are terminal: a new concern about the same target is a new
// report, which keeps each handling decision traceable.
export const reportTransitions: Record<ReportStatus, ReportStatus[]> = {
  OPEN: ['UNDER_REVIEW', 'RESOLVED', 'DISMISSED'],
  UNDER_REVIEW: ['RESOLVED', 'DISMISSED'],
  RESOLVED: [],
  DISMISSED: []
};

export const canTransitionReport = (from: ReportStatus, to: ReportStatus): boolean =>
  reportTransitions[from]?.includes(to) ?? false;

export const isLiveReport = (report: { status?: string | null }): boolean =>
  report.status === 'OPEN' || report.status === 'UNDER_REVIEW';

// The duplicate guard behind the unique partial index in the migration:
// one live report per reporter per target.
export const findLiveDuplicateReport = <T extends {
  reporter_user_id: string;
  target_type: string;
  target_id: string;
  status?: string | null;
}>(reports: T[], candidate: { reporter_user_id: string; target_type: string; target_id: string }): T | undefined =>
  reports.find((report) =>
    report.reporter_user_id === candidate.reporter_user_id
    && report.target_type === candidate.target_type
    && report.target_id === candidate.target_id
    && isLiveReport(report));

// Builds the exact admin_audit_log row for an action. The audit trail is
// only trustworthy if every entry carries the actor and the target, so
// both are required here and incomplete entries throw.
export const buildAuditEntry = (input: {
  actor: AdminActor;
  action: AuditAction;
  targetType: (typeof auditTargetTypes)[number];
  targetId: string;
  targetUserId?: string | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  reason?: string | null;
}) => {
  if (!input.actor?.id) throw new Error('An audit entry requires the acting admin.');
  if (!input.targetId) throw new Error('An audit entry requires a target.');
  return {
    actor_user_id: input.actor.id,
    actor_email: input.actor.email ?? null,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    target_user_id: input.targetUserId ?? null,
    previous_state: input.previousState ?? null,
    new_state: input.newState ?? null,
    reason: input.reason?.trim() ? input.reason.trim() : null
  };
};

export type MergedAdminUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  created_at: string | null;
  verification_status: VerificationStatus;
  is_suspended: boolean;
  suspension_reason: string | null;
};

// Merges a Supabase Auth user with its account-state row. Missing state
// rows mean the defaults (PENDING, not suspended). Private state fields
// (verification document references, password data) are never carried
// into this shape.
export const mergeAdminUser = (
  authUser: { id: string; email?: string | null; created_at?: string | null; user_metadata?: Record<string, unknown> | null },
  state: AccountStateRow | null | undefined
): MergedAdminUser => ({
  id: authUser.id,
  email: authUser.email ?? '',
  name: String(authUser.user_metadata?.name ?? 'User'),
  roles: Array.isArray(authUser.user_metadata?.roles) ? (authUser.user_metadata!.roles as string[]) : ['BUYER'],
  created_at: authUser.created_at ?? null,
  verification_status: (state?.verification_status as VerificationStatus | undefined) ?? 'PENDING',
  is_suspended: isAccountSuspended(state),
  suspension_reason: state?.suspension_reason ?? null
});

export const filterAdminUsers = (
  users: MergedAdminUser[],
  filters: Pick<AdminUserFilters, 'query' | 'verificationStatus' | 'suspended'>
): MergedAdminUser[] => users.filter((user) => {
  if (filters.query) {
    const term = filters.query.toLowerCase();
    if (!user.email.toLowerCase().includes(term) && !user.name.toLowerCase().includes(term)) return false;
  }
  if (filters.verificationStatus && user.verification_status !== filters.verificationStatus) return false;
  if (filters.suspended === 'true' && !user.is_suspended) return false;
  if (filters.suspended === 'false' && user.is_suspended) return false;
  return true;
});

export const paginateItems = <T>(items: T[], page: number, pageSize: number) => {
  const total = items.length;
  const from = (page - 1) * pageSize;
  return {
    items: items.slice(from, from + pageSize),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
  };
};

const escapeSearchValue = (value: string) => value.replace(/[\\%_*,.()]/g, '\\$&');

const paginationFromCount = (filters: { page: number; pageSize: number }, count: number | null) => ({
  page: filters.page,
  pageSize: filters.pageSize,
  total: count ?? 0,
  totalPages: Math.ceil((count ?? 0) / filters.pageSize)
});

// ---------------------------------------------------------------------------
// Supabase operations (routes enforce ADMIN before these are called)
// ---------------------------------------------------------------------------

const recordAudit = async (
  supabase: SupabaseClient,
  entry: ReturnType<typeof buildAuditEntry>
) => {
  const { error } = await supabase.from('admin_audit_log').insert(entry);
  if (error) throw new Error(error.message);
};

const getAccountState = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from('user_account_states')
    .select('user_id, verification_status, is_suspended, suspension_reason')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as AccountStateRow | null;
};

export const listAdminUsers = async (
  filters: AdminUserFilters,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  // Supabase Auth's admin list has no server-side search, so the page of
  // users is fetched (bounded), merged with account states, then filtered
  // and paginated with the same pure rules the tests exercise.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);
  const users = data.users ?? [];
  const { data: states, error: statesError } = await supabase
    .from('user_account_states')
    .select('user_id, verification_status, is_suspended, suspension_reason');
  if (statesError) throw new Error(statesError.message);
  const stateByUser = new Map((states ?? []).map((row) => [row.user_id as string, row]));
  const merged = users.map((user) => mergeAdminUser(user, stateByUser.get(user.id)));
  const { items, pagination } = paginateItems(filterAdminUsers(merged, filters), filters.page, filters.pageSize);
  return { users: items, pagination };
};

export const decideUserVerification = async (
  actor: AdminActor,
  targetUserId: string,
  input: VerificationDecisionInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  if (!canAdminActOnUser(actor.id, targetUserId)) {
    throw new Error('You do not have permission to decide verification for your own account.');
  }
  const current = await getAccountState(supabase, targetUserId);
  const currentStatus = (current?.verification_status as VerificationStatus | undefined) ?? 'PENDING';
  const next = applyVerificationDecision(currentStatus, input.status);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_account_states')
    .upsert({
      user_id: targetUserId,
      verification_status: next.verification_status,
      verification_notes: input.notes?.trim() || null,
      verified_by: actor.id,
      verified_at: now,
      updated_at: now
    })
    .select('user_id, verification_status, is_suspended')
    .single();
  if (error) throw new Error(error.message);
  await recordAudit(supabase, buildAuditEntry({
    actor,
    action: 'USER_VERIFICATION_CHANGED',
    targetType: 'USER',
    targetId: targetUserId,
    targetUserId,
    previousState: { verification_status: currentStatus },
    newState: { verification_status: next.verification_status },
    reason: input.notes
  }));
  // Phase 8: tell the user their verification status changed. Only the
  // status is shared — the admin's notes never leave the audit record
  // (failure-safe follow-up).
  await createNotification(supabase, verificationDecisionNotification({
    recipientUserId: targetUserId,
    actorUserId: actor.id,
    subject: 'USER',
    status: next.verification_status
  }));
  return data;
};

export const suspendUser = async (
  actor: AdminActor,
  targetUserId: string,
  input: SuspendUserInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  if (!canAdminActOnUser(actor.id, targetUserId)) {
    throw new Error('You do not have permission to suspend your own account.');
  }
  const current = await getAccountState(supabase, targetUserId);
  if (!canSuspendAccount(current)) {
    throw new Error('Invalid status transition: this account is already suspended.');
  }
  // Ban at the auth layer as well as in the account state, so new
  // sessions are refused by Supabase Auth itself; the app-level state is
  // what login checks and admin screens read. ~100 years is Supabase's
  // documented way to express an indefinite ban; reactivation clears it.
  const { error: banError } = await supabase.auth.admin.updateUserById(targetUserId, { ban_duration: '876000h' });
  if (banError) throw new Error(banError.message);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_account_states')
    .upsert({
      user_id: targetUserId,
      is_suspended: true,
      suspended_by: actor.id,
      suspended_at: now,
      suspension_reason: input.reason.trim(),
      updated_at: now
    })
    .select('user_id, verification_status, is_suspended, suspension_reason')
    .single();
  if (error) throw new Error(error.message);
  await recordAudit(supabase, buildAuditEntry({
    actor,
    action: 'USER_SUSPENDED',
    targetType: 'USER',
    targetId: targetUserId,
    targetUserId,
    previousState: { is_suspended: false },
    newState: { is_suspended: true },
    reason: input.reason
  }));
  // Phase 8: tell the user they were suspended, without the admin's
  // reason (failure-safe follow-up).
  await createNotification(supabase, accountSuspensionNotification({
    recipientUserId: targetUserId,
    actorUserId: actor.id,
    suspended: true
  }));
  return data;
};

export const reactivateUser = async (
  actor: AdminActor,
  targetUserId: string,
  notes?: string,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const current = await getAccountState(supabase, targetUserId);
  if (!canReactivateAccount(current)) {
    throw new Error('Invalid status transition: this account is not suspended.');
  }
  const { error: banError } = await supabase.auth.admin.updateUserById(targetUserId, { ban_duration: 'none' });
  if (banError) throw new Error(banError.message);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_account_states')
    .upsert({
      user_id: targetUserId,
      is_suspended: false,
      suspended_by: null,
      suspended_at: null,
      suspension_reason: null,
      updated_at: now
    })
    .select('user_id, verification_status, is_suspended, suspension_reason')
    .single();
  if (error) throw new Error(error.message);
  await recordAudit(supabase, buildAuditEntry({
    actor,
    action: 'USER_REACTIVATED',
    targetType: 'USER',
    targetId: targetUserId,
    targetUserId,
    previousState: { is_suspended: true },
    newState: { is_suspended: false },
    reason: notes
  }));
  // Phase 8: tell the user they can sign in again (failure-safe).
  await createNotification(supabase, accountSuspensionNotification({
    recipientUserId: targetUserId,
    actorUserId: actor.id,
    suspended: false
  }));
  return data;
};

export const listAdminNurseries = async (
  filters: AdminNurseryFilters,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const from = (filters.page - 1) * filters.pageSize;
  let query = supabase
    .from('nurseries')
    .select('user_id, name, phone, city, address, website, verification_status, is_verified, verified_by, verified_at, verification_notes, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + filters.pageSize - 1);
  if (filters.query) query = query.ilike('name', `%${escapeSearchValue(filters.query)}%`);
  if (filters.city) query = query.ilike('city', `%${escapeSearchValue(filters.city)}%`);
  if (filters.verificationStatus) query = query.eq('verification_status', filters.verificationStatus);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { nurseries: data ?? [], pagination: paginationFromCount(filters, count) };
};

export const decideNurseryVerification = async (
  actor: AdminActor,
  nurseryUserId: string,
  input: VerificationDecisionInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  if (!canAdminActOnUser(actor.id, nurseryUserId)) {
    throw new Error('You do not have permission to decide verification for your own nursery.');
  }
  const { data: nursery, error: readError } = await supabase
    .from('nurseries')
    .select('user_id, verification_status, is_verified')
    .eq('user_id', nurseryUserId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!nursery) throw new Error('Nursery not found.');
  const currentStatus = (nursery.verification_status as VerificationStatus | null) ?? 'PENDING';
  const next = applyVerificationDecision(currentStatus, input.status);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('nurseries')
    .update({
      verification_status: next.verification_status,
      is_verified: next.is_verified,
      verified_by: actor.id,
      verified_at: now,
      verification_notes: input.notes?.trim() || null,
      updated_at: now
    })
    .eq('user_id', nurseryUserId)
    .select('user_id, name, verification_status, is_verified, verified_by, verified_at')
    .single();
  if (error) throw new Error(error.message);
  await recordAudit(supabase, buildAuditEntry({
    actor,
    action: 'NURSERY_VERIFICATION_CHANGED',
    targetType: 'NURSERY',
    targetId: nurseryUserId,
    targetUserId: nurseryUserId,
    previousState: { verification_status: currentStatus, is_verified: nursery.is_verified },
    newState: { verification_status: next.verification_status, is_verified: next.is_verified },
    reason: input.notes
  }));
  // Phase 8: tell the nursery owner the decision, status only — the
  // admin's notes stay in the audit record (failure-safe follow-up).
  await createNotification(supabase, verificationDecisionNotification({
    recipientUserId: nurseryUserId,
    actorUserId: actor.id,
    subject: 'NURSERY',
    status: next.verification_status
  }));
  return data;
};

export const listAdminListings = async (
  filters: AdminListingFilters,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const from = (filters.page - 1) * filters.pageSize;
  let query = supabase
    .from('plant_listings')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + filters.pageSize - 1);
  if (filters.query) {
    const term = escapeSearchValue(filters.query);
    query = query.or(`name.ilike.%${term}%,species.ilike.%${term}%,category.ilike.%${term}%`);
  }
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.moderationStatus) query = query.eq('moderation_status', filters.moderationStatus);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { listings: data ?? [], pagination: paginationFromCount(filters, count) };
};

const setContentModeration = async (
  actor: AdminActor,
  table: 'plant_listings' | 'plantation_projects',
  id: string,
  toStatus: ModerationStatus,
  reason: string | undefined,
  audit: { action: AuditAction; targetType: 'LISTING' | 'PROJECT'; ownerColumn: string },
  supabase: SupabaseClient
) => {
  const { data: row, error: readError } = await supabase
    .from(table)
    .select(`id, moderation_status, ${audit.ownerColumn}`)
    .eq('id', id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!row) throw new Error(`${audit.targetType === 'LISTING' ? 'Listing' : 'Project'} not found.`);
  const currentStatus = ((row as unknown as Record<string, unknown>).moderation_status as ModerationStatus | null) ?? 'VISIBLE';
  if (!canTransitionModeration(currentStatus, toStatus)) {
    throw new Error(`Invalid moderation transition from ${currentStatus} to ${toStatus}.`);
  }
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(table)
    .update({
      moderation_status: toStatus,
      moderated_by: actor.id,
      moderated_at: now,
      moderation_reason: toStatus === 'HIDDEN' ? (reason?.trim() || null) : null,
      updated_at: now
    })
    .eq('id', id)
    .eq('moderation_status', currentStatus)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await recordAudit(supabase, buildAuditEntry({
    actor,
    action: audit.action,
    targetType: audit.targetType,
    targetId: id,
    targetUserId: ((row as unknown as Record<string, unknown>)[audit.ownerColumn] as string | undefined) ?? null,
    previousState: { moderation_status: currentStatus },
    newState: { moderation_status: toStatus },
    reason
  }));
  // Phase 8: tell the owner their content was hidden or restored. The
  // notification names their own content and never carries the
  // moderator's reason (failure-safe follow-up).
  const ownerUserId = ((row as unknown as Record<string, unknown>)[audit.ownerColumn] as string | undefined) ?? null;
  if (ownerUserId) {
    const updated = data as unknown as Record<string, unknown>;
    await createNotification(supabase, contentModerationNotification({
      recipientUserId: ownerUserId,
      actorUserId: actor.id,
      kind: audit.targetType,
      targetId: id,
      name: String(updated.name ?? updated.title ?? 'your content'),
      hidden: toStatus === 'HIDDEN'
    }));
  }
  return data;
};

export const hideListing = async (
  actor: AdminActor,
  listingId: string,
  input: { reason: string },
  supabase: SupabaseClient = getSupabaseClient()
) => setContentModeration(actor, 'plant_listings', listingId, 'HIDDEN', input.reason,
  { action: 'LISTING_MODERATION_CHANGED', targetType: 'LISTING', ownerColumn: 'nursery_user_id' }, supabase);

export const restoreListing = async (
  actor: AdminActor,
  listingId: string,
  notes?: string,
  supabase: SupabaseClient = getSupabaseClient()
) => setContentModeration(actor, 'plant_listings', listingId, 'VISIBLE', notes,
  { action: 'LISTING_MODERATION_CHANGED', targetType: 'LISTING', ownerColumn: 'nursery_user_id' }, supabase);

export const listAdminProjects = async (
  filters: AdminProjectFilters,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const from = (filters.page - 1) * filters.pageSize;
  let query = supabase
    .from('plantation_projects')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + filters.pageSize - 1);
  if (filters.query) {
    const term = escapeSearchValue(filters.query);
    query = query.or(`title.ilike.%${term}%,location.ilike.%${term}%`);
  }
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.moderationStatus) query = query.eq('moderation_status', filters.moderationStatus);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { projects: data ?? [], pagination: paginationFromCount(filters, count) };
};

export const hideProject = async (
  actor: AdminActor,
  projectId: string,
  input: { reason: string },
  supabase: SupabaseClient = getSupabaseClient()
) => setContentModeration(actor, 'plantation_projects', projectId, 'HIDDEN', input.reason,
  { action: 'PROJECT_MODERATION_CHANGED', targetType: 'PROJECT', ownerColumn: 'organizer_user_id' }, supabase);

export const restoreProject = async (
  actor: AdminActor,
  projectId: string,
  notes?: string,
  supabase: SupabaseClient = getSupabaseClient()
) => setContentModeration(actor, 'plantation_projects', projectId, 'VISIBLE', notes,
  { action: 'PROJECT_MODERATION_CHANGED', targetType: 'PROJECT', ownerColumn: 'organizer_user_id' }, supabase);

// ---------------------------------------------------------------------------
// Reported content
// ---------------------------------------------------------------------------

const reportTargetExists = async (
  supabase: SupabaseClient,
  targetType: ReportTargetType,
  targetId: string
): Promise<boolean> => {
  if (targetType === 'USER') {
    const { data, error } = await supabase.auth.admin.getUserById(targetId);
    return !error && Boolean(data.user);
  }
  const table = targetType === 'LISTING' ? 'plant_listings' : targetType === 'PROJECT' ? 'plantation_projects' : 'nurseries';
  const column = targetType === 'NURSERY' ? 'user_id' : 'id';
  const { data, error } = await supabase.from(table).select(column).eq(column, targetId).maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
};

export const submitReport = async (
  reporterUserId: string,
  input: ReportInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  if (!(await reportTargetExists(supabase, input.targetType, input.targetId))) {
    throw new Error('Reported content not found.');
  }
  const { data: existing, error: existingError } = await supabase
    .from('content_reports')
    .select('reporter_user_id, target_type, target_id, status')
    .eq('reporter_user_id', reporterUserId)
    .eq('target_type', input.targetType)
    .eq('target_id', input.targetId)
    .in('status', ['OPEN', 'UNDER_REVIEW']);
  if (existingError) throw new Error(existingError.message);
  if (findLiveDuplicateReport(existing ?? [], {
    reporter_user_id: reporterUserId,
    target_type: input.targetType,
    target_id: input.targetId
  })) {
    throw new Error('You already have an open report for this content.');
  }
  const { data, error } = await supabase
    .from('content_reports')
    .insert({
      reporter_user_id: reporterUserId,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
      details: input.details?.trim() || null,
      status: 'OPEN'
    })
    .select('*')
    .single();
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new Error('You already have an open report for this content.');
    }
    throw new Error(error.message);
  }
  return data;
};

export const getMyReports = async (
  reporterUserId: string,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .eq('reporter_user_id', reporterUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const listAdminReports = async (
  filters: AdminReportFilters,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const from = (filters.page - 1) * filters.pageSize;
  let query = supabase
    .from('content_reports')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + filters.pageSize - 1);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.targetType) query = query.eq('target_type', filters.targetType);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { reports: data ?? [], pagination: paginationFromCount(filters, count) };
};

export const updateReportStatus = async (
  actor: AdminActor,
  reportId: string,
  input: ReportStatusInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const { data: report, error: readError } = await supabase
    .from('content_reports')
    .select('id, status, target_type, target_id, reporter_user_id')
    .eq('id', reportId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!report) throw new Error('Report not found.');
  const currentStatus = report.status as ReportStatus;
  if (!canTransitionReport(currentStatus, input.status)) {
    throw new Error(`Invalid report status transition from ${currentStatus} to ${input.status}.`);
  }
  const now = new Date().toISOString();
  const closed = input.status === 'RESOLVED' || input.status === 'DISMISSED';
  const { data, error } = await supabase
    .from('content_reports')
    .update({
      status: input.status,
      resolved_by: closed ? actor.id : null,
      resolution_notes: input.resolutionNotes?.trim() || null,
      resolved_at: closed ? now : null,
      updated_at: now
    })
    .eq('id', reportId)
    .eq('status', currentStatus)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await recordAudit(supabase, buildAuditEntry({
    actor,
    action: 'REPORT_STATUS_CHANGED',
    targetType: 'REPORT',
    targetId: reportId,
    targetUserId: report.reporter_user_id,
    previousState: { status: currentStatus },
    newState: { status: input.status, target_type: report.target_type, target_id: report.target_id },
    reason: input.resolutionNotes
  }));
  // Phase 8: tell the reporter the outcome, status only — resolution
  // notes stay in the admin record (failure-safe follow-up).
  await createNotification(supabase, reportUpdatedNotification({
    recipientUserId: report.reporter_user_id,
    actorUserId: actor.id,
    reportId,
    status: input.status
  }));
  return data;
};

// ---------------------------------------------------------------------------
// Audit history
// ---------------------------------------------------------------------------

export const listAuditLog = async (
  filters: AdminAuditFilters,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const from = (filters.page - 1) * filters.pageSize;
  let query = supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + filters.pageSize - 1);
  if (filters.actorUserId) query = query.eq('actor_user_id', filters.actorUserId);
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.targetType) query = query.eq('target_type', filters.targetType);
  if (filters.targetId) query = query.eq('target_id', filters.targetId);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { entries: data ?? [], pagination: paginationFromCount(filters, count) };
};
