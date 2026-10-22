"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hideListing = exports.listAdminListings = exports.decideNurseryVerification = exports.listAdminNurseries = exports.reactivateUser = exports.suspendUser = exports.decideUserVerification = exports.listAdminUsers = exports.paginateItems = exports.filterAdminUsers = exports.mergeAdminUser = exports.buildAuditEntry = exports.findLiveDuplicateReport = exports.isLiveReport = exports.canTransitionReport = exports.reportTransitions = exports.isProjectPubliclyVisible = exports.isListingPubliclyVisible = exports.canTransitionModeration = exports.moderationTransitions = exports.canReactivateAccount = exports.canSuspendAccount = exports.isLoginBlocked = exports.isAccountSuspended = exports.canAdminActOnUser = exports.isSelfTarget = exports.applyVerificationDecision = exports.isVerifiedStatus = exports.canTransitionVerification = exports.verificationTransitions = exports.adminAuditFilterSchema = exports.adminReportFilterSchema = exports.adminProjectFilterSchema = exports.adminListingFilterSchema = exports.adminNurseryFilterSchema = exports.adminUserFilterSchema = exports.reportStatusSchema = exports.reportInputSchema = exports.restoreContentSchema = exports.hideContentSchema = exports.reactivateUserSchema = exports.suspendUserSchema = exports.verificationDecisionSchema = exports.auditTargetTypes = exports.auditActions = exports.reportStatuses = exports.reportReasons = exports.reportTargetTypes = exports.moderationStatuses = exports.verificationStatuses = void 0;
exports.listAuditLog = exports.updateReportStatus = exports.listAdminReports = exports.getMyReports = exports.submitReport = exports.restoreProject = exports.hideProject = exports.listAdminProjects = exports.restoreListing = void 0;
const zod_1 = require("zod");
const auth_1 = require("../lib/auth");
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
exports.verificationStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
exports.moderationStatuses = ['VISIBLE', 'HIDDEN'];
exports.reportTargetTypes = ['LISTING', 'PROJECT', 'NURSERY', 'USER'];
exports.reportReasons = ['SPAM', 'FRAUD', 'INAPPROPRIATE', 'INCORRECT_INFORMATION', 'SAFETY', 'OTHER'];
exports.reportStatuses = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];
exports.auditActions = [
    'USER_VERIFICATION_CHANGED',
    'NURSERY_VERIFICATION_CHANGED',
    'USER_SUSPENDED',
    'USER_REACTIVATED',
    'LISTING_MODERATION_CHANGED',
    'PROJECT_MODERATION_CHANGED',
    'REPORT_STATUS_CHANGED'
];
exports.auditTargetTypes = ['USER', 'NURSERY', 'LISTING', 'PROJECT', 'REPORT'];
// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------
const reasonSchema = zod_1.z.string().trim().min(3, 'A reason of at least 3 characters is required.').max(500);
// A verification decision is explicit: the admin names the outcome. There
// is deliberately no schema anywhere that lets a user set their own
// verification state (profile schemas strip such fields, which the tests
// prove).
exports.verificationDecisionSchema = zod_1.z.object({
    status: zod_1.z.enum(exports.verificationStatuses),
    notes: zod_1.z.string().trim().max(1000).optional().or(zod_1.z.literal(''))
});
exports.suspendUserSchema = zod_1.z.object({
    reason: reasonSchema,
    confirm: zod_1.z.literal(true, { errorMap: () => ({ message: 'Suspension must be explicitly confirmed.' }) })
});
exports.reactivateUserSchema = zod_1.z.object({
    confirm: zod_1.z.literal(true, { errorMap: () => ({ message: 'Reactivation must be explicitly confirmed.' }) }),
    notes: zod_1.z.string().trim().max(1000).optional().or(zod_1.z.literal(''))
});
exports.hideContentSchema = zod_1.z.object({
    reason: reasonSchema,
    confirm: zod_1.z.literal(true, { errorMap: () => ({ message: 'Hiding content must be explicitly confirmed.' }) })
});
exports.restoreContentSchema = zod_1.z.object({
    notes: zod_1.z.string().trim().max(1000).optional().or(zod_1.z.literal(''))
});
exports.reportInputSchema = zod_1.z.object({
    targetType: zod_1.z.enum(exports.reportTargetTypes),
    targetId: zod_1.z.string().uuid(),
    reason: zod_1.z.enum(exports.reportReasons),
    details: zod_1.z.string().trim().max(2000).optional().or(zod_1.z.literal(''))
});
exports.reportStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
    resolutionNotes: zod_1.z.string().trim().max(1000).optional().or(zod_1.z.literal(''))
}).superRefine((input, ctx) => {
    if ((input.status === 'RESOLVED' || input.status === 'DISMISSED') && !(input.resolutionNotes ?? '').trim()) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['resolutionNotes'],
            message: 'Resolution notes are required when a report is resolved or dismissed.'
        });
    }
});
const pageFields = {
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(50).default(20)
};
exports.adminUserFilterSchema = zod_1.z.object({
    query: zod_1.z.string().trim().max(120).optional(),
    verificationStatus: zod_1.z.enum(exports.verificationStatuses).optional(),
    suspended: zod_1.z.enum(['true', 'false']).optional(),
    ...pageFields
});
exports.adminNurseryFilterSchema = zod_1.z.object({
    query: zod_1.z.string().trim().max(120).optional(),
    city: zod_1.z.string().trim().max(120).optional(),
    verificationStatus: zod_1.z.enum(exports.verificationStatuses).optional(),
    ...pageFields
});
exports.adminListingFilterSchema = zod_1.z.object({
    query: zod_1.z.string().trim().max(120).optional(),
    status: zod_1.z.enum(['ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED']).optional(),
    moderationStatus: zod_1.z.enum(exports.moderationStatuses).optional(),
    ...pageFields
});
exports.adminProjectFilterSchema = zod_1.z.object({
    query: zod_1.z.string().trim().max(120).optional(),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED', 'ARCHIVED']).optional(),
    moderationStatus: zod_1.z.enum(exports.moderationStatuses).optional(),
    ...pageFields
});
exports.adminReportFilterSchema = zod_1.z.object({
    status: zod_1.z.enum(exports.reportStatuses).optional(),
    targetType: zod_1.z.enum(exports.reportTargetTypes).optional(),
    ...pageFields
});
exports.adminAuditFilterSchema = zod_1.z.object({
    actorUserId: zod_1.z.string().uuid().optional(),
    action: zod_1.z.enum(exports.auditActions).optional(),
    targetType: zod_1.z.enum(exports.auditTargetTypes).optional(),
    targetId: zod_1.z.string().trim().max(120).optional(),
    ...pageFields
});
// ---------------------------------------------------------------------------
// Pure business rules (unit tested without a database)
// ---------------------------------------------------------------------------
// Verification can be revisited: an approval can be revoked, a rejection
// can be overturned, and either can be reset to PENDING for re-review.
// Moving to the state the record is already in is not a decision and is
// rejected so the audit trail only contains real changes.
exports.verificationTransitions = {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['REJECTED', 'PENDING'],
    REJECTED: ['APPROVED', 'PENDING']
};
const canTransitionVerification = (from, to) => exports.verificationTransitions[from]?.includes(to) ?? false;
exports.canTransitionVerification = canTransitionVerification;
const isVerifiedStatus = (status) => status === 'APPROVED';
exports.isVerifiedStatus = isVerifiedStatus;
// The single place verification state is derived. is_verified is a direct
// reflection of an admin APPROVED decision and of nothing else.
const applyVerificationDecision = (currentStatus, decision) => {
    if (!(0, exports.canTransitionVerification)(currentStatus, decision)) {
        throw new Error(`Invalid verification transition from ${currentStatus} to ${decision}.`);
    }
    return { verification_status: decision, is_verified: (0, exports.isVerifiedStatus)(decision) };
};
exports.applyVerificationDecision = applyVerificationDecision;
// Governance hygiene: an admin cannot decide verification for, or
// suspend, their own account. Another admin must do it, so every
// high-impact action has an independent actor in the audit trail.
const isSelfTarget = (actorUserId, targetUserId) => actorUserId === targetUserId;
exports.isSelfTarget = isSelfTarget;
const canAdminActOnUser = (actorUserId, targetUserId) => !(0, exports.isSelfTarget)(actorUserId, targetUserId);
exports.canAdminActOnUser = canAdminActOnUser;
const isAccountSuspended = (state) => state?.is_suspended === true;
exports.isAccountSuspended = isAccountSuspended;
// Suspended accounts are blocked at login time (see auth.service). An
// already-issued token is not re-checked on every request, so suspension
// takes full effect at the next login at the latest.
const isLoginBlocked = (state) => (0, exports.isAccountSuspended)(state);
exports.isLoginBlocked = isLoginBlocked;
const canSuspendAccount = (state) => !(0, exports.isAccountSuspended)(state);
exports.canSuspendAccount = canSuspendAccount;
const canReactivateAccount = (state) => (0, exports.isAccountSuspended)(state);
exports.canReactivateAccount = canReactivateAccount;
// Moderation is a two-state switch kept separate from owner status, so a
// takedown is reversible by restoring visibility without touching the
// owner's own status.
exports.moderationTransitions = {
    VISIBLE: ['HIDDEN'],
    HIDDEN: ['VISIBLE']
};
const canTransitionModeration = (from, to) => exports.moderationTransitions[from]?.includes(to) ?? false;
exports.canTransitionModeration = canTransitionModeration;
// Public visibility rules. Rows created before Phase 7 have no
// moderation_status value in memory, so a missing value means VISIBLE.
const isListingPubliclyVisible = (listing) => listing.status === 'ACTIVE' && (listing.moderation_status ?? 'VISIBLE') === 'VISIBLE';
exports.isListingPubliclyVisible = isListingPubliclyVisible;
const isProjectPubliclyVisible = (project) => (project.status === 'PUBLISHED' || project.status === 'COMPLETED')
    && (project.moderation_status ?? 'VISIBLE') === 'VISIBLE';
exports.isProjectPubliclyVisible = isProjectPubliclyVisible;
// Reports move forward through the handling workflow only. Resolved and
// dismissed are terminal: a new concern about the same target is a new
// report, which keeps each handling decision traceable.
exports.reportTransitions = {
    OPEN: ['UNDER_REVIEW', 'RESOLVED', 'DISMISSED'],
    UNDER_REVIEW: ['RESOLVED', 'DISMISSED'],
    RESOLVED: [],
    DISMISSED: []
};
const canTransitionReport = (from, to) => exports.reportTransitions[from]?.includes(to) ?? false;
exports.canTransitionReport = canTransitionReport;
const isLiveReport = (report) => report.status === 'OPEN' || report.status === 'UNDER_REVIEW';
exports.isLiveReport = isLiveReport;
// The duplicate guard behind the unique partial index in the migration:
// one live report per reporter per target.
const findLiveDuplicateReport = (reports, candidate) => reports.find((report) => report.reporter_user_id === candidate.reporter_user_id
    && report.target_type === candidate.target_type
    && report.target_id === candidate.target_id
    && (0, exports.isLiveReport)(report));
exports.findLiveDuplicateReport = findLiveDuplicateReport;
// Builds the exact admin_audit_log row for an action. The audit trail is
// only trustworthy if every entry carries the actor and the target, so
// both are required here and incomplete entries throw.
const buildAuditEntry = (input) => {
    if (!input.actor?.id)
        throw new Error('An audit entry requires the acting admin.');
    if (!input.targetId)
        throw new Error('An audit entry requires a target.');
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
exports.buildAuditEntry = buildAuditEntry;
// Merges a Supabase Auth user with its account-state row. Missing state
// rows mean the defaults (PENDING, not suspended). Private state fields
// (verification document references, password data) are never carried
// into this shape.
const mergeAdminUser = (authUser, state) => ({
    id: authUser.id,
    email: authUser.email ?? '',
    name: String(authUser.user_metadata?.name ?? 'User'),
    roles: Array.isArray(authUser.user_metadata?.roles) ? authUser.user_metadata.roles : ['BUYER'],
    created_at: authUser.created_at ?? null,
    verification_status: state?.verification_status ?? 'PENDING',
    is_suspended: (0, exports.isAccountSuspended)(state),
    suspension_reason: state?.suspension_reason ?? null
});
exports.mergeAdminUser = mergeAdminUser;
const filterAdminUsers = (users, filters) => users.filter((user) => {
    if (filters.query) {
        const term = filters.query.toLowerCase();
        if (!user.email.toLowerCase().includes(term) && !user.name.toLowerCase().includes(term))
            return false;
    }
    if (filters.verificationStatus && user.verification_status !== filters.verificationStatus)
        return false;
    if (filters.suspended === 'true' && !user.is_suspended)
        return false;
    if (filters.suspended === 'false' && user.is_suspended)
        return false;
    return true;
});
exports.filterAdminUsers = filterAdminUsers;
const paginateItems = (items, page, pageSize) => {
    const total = items.length;
    const from = (page - 1) * pageSize;
    return {
        items: items.slice(from, from + pageSize),
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    };
};
exports.paginateItems = paginateItems;
const escapeSearchValue = (value) => value.replace(/[\\%_*,.()]/g, '\\$&');
const paginationFromCount = (filters, count) => ({
    page: filters.page,
    pageSize: filters.pageSize,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / filters.pageSize)
});
// ---------------------------------------------------------------------------
// Supabase operations (routes enforce ADMIN before these are called)
// ---------------------------------------------------------------------------
const recordAudit = async (supabase, entry) => {
    const { error } = await supabase.from('admin_audit_log').insert(entry);
    if (error)
        throw new Error(error.message);
};
const getAccountState = async (supabase, userId) => {
    const { data, error } = await supabase
        .from('user_account_states')
        .select('user_id, verification_status, is_suspended, suspension_reason')
        .eq('user_id', userId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    return data;
};
const listAdminUsers = async (filters, supabase = (0, auth_1.getSupabaseClient)()) => {
    // Supabase Auth's admin list has no server-side search, so the page of
    // users is fetched (bounded), merged with account states, then filtered
    // and paginated with the same pure rules the tests exercise.
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error)
        throw new Error(error.message);
    const users = data.users ?? [];
    const { data: states, error: statesError } = await supabase
        .from('user_account_states')
        .select('user_id, verification_status, is_suspended, suspension_reason');
    if (statesError)
        throw new Error(statesError.message);
    const stateByUser = new Map((states ?? []).map((row) => [row.user_id, row]));
    const merged = users.map((user) => (0, exports.mergeAdminUser)(user, stateByUser.get(user.id)));
    const { items, pagination } = (0, exports.paginateItems)((0, exports.filterAdminUsers)(merged, filters), filters.page, filters.pageSize);
    return { users: items, pagination };
};
exports.listAdminUsers = listAdminUsers;
const decideUserVerification = async (actor, targetUserId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    if (!(0, exports.canAdminActOnUser)(actor.id, targetUserId)) {
        throw new Error('You do not have permission to decide verification for your own account.');
    }
    const current = await getAccountState(supabase, targetUserId);
    const currentStatus = current?.verification_status ?? 'PENDING';
    const next = (0, exports.applyVerificationDecision)(currentStatus, input.status);
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
    if (error)
        throw new Error(error.message);
    await recordAudit(supabase, (0, exports.buildAuditEntry)({
        actor,
        action: 'USER_VERIFICATION_CHANGED',
        targetType: 'USER',
        targetId: targetUserId,
        targetUserId,
        previousState: { verification_status: currentStatus },
        newState: { verification_status: next.verification_status },
        reason: input.notes
    }));
    return data;
};
exports.decideUserVerification = decideUserVerification;
const suspendUser = async (actor, targetUserId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    if (!(0, exports.canAdminActOnUser)(actor.id, targetUserId)) {
        throw new Error('You do not have permission to suspend your own account.');
    }
    const current = await getAccountState(supabase, targetUserId);
    if (!(0, exports.canSuspendAccount)(current)) {
        throw new Error('Invalid status transition: this account is already suspended.');
    }
    // Ban at the auth layer as well as in the account state, so new
    // sessions are refused by Supabase Auth itself; the app-level state is
    // what login checks and admin screens read. ~100 years is Supabase's
    // documented way to express an indefinite ban; reactivation clears it.
    const { error: banError } = await supabase.auth.admin.updateUserById(targetUserId, { ban_duration: '876000h' });
    if (banError)
        throw new Error(banError.message);
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
    if (error)
        throw new Error(error.message);
    await recordAudit(supabase, (0, exports.buildAuditEntry)({
        actor,
        action: 'USER_SUSPENDED',
        targetType: 'USER',
        targetId: targetUserId,
        targetUserId,
        previousState: { is_suspended: false },
        newState: { is_suspended: true },
        reason: input.reason
    }));
    return data;
};
exports.suspendUser = suspendUser;
const reactivateUser = async (actor, targetUserId, notes, supabase = (0, auth_1.getSupabaseClient)()) => {
    const current = await getAccountState(supabase, targetUserId);
    if (!(0, exports.canReactivateAccount)(current)) {
        throw new Error('Invalid status transition: this account is not suspended.');
    }
    const { error: banError } = await supabase.auth.admin.updateUserById(targetUserId, { ban_duration: 'none' });
    if (banError)
        throw new Error(banError.message);
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
    if (error)
        throw new Error(error.message);
    await recordAudit(supabase, (0, exports.buildAuditEntry)({
        actor,
        action: 'USER_REACTIVATED',
        targetType: 'USER',
        targetId: targetUserId,
        targetUserId,
        previousState: { is_suspended: true },
        newState: { is_suspended: false },
        reason: notes
    }));
    return data;
};
exports.reactivateUser = reactivateUser;
const listAdminNurseries = async (filters, supabase = (0, auth_1.getSupabaseClient)()) => {
    const from = (filters.page - 1) * filters.pageSize;
    let query = supabase
        .from('nurseries')
        .select('user_id, name, phone, city, address, website, verification_status, is_verified, verified_by, verified_at, verification_notes, created_at, updated_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + filters.pageSize - 1);
    if (filters.query)
        query = query.ilike('name', `%${escapeSearchValue(filters.query)}%`);
    if (filters.city)
        query = query.ilike('city', `%${escapeSearchValue(filters.city)}%`);
    if (filters.verificationStatus)
        query = query.eq('verification_status', filters.verificationStatus);
    const { data, count, error } = await query;
    if (error)
        throw new Error(error.message);
    return { nurseries: data ?? [], pagination: paginationFromCount(filters, count) };
};
exports.listAdminNurseries = listAdminNurseries;
const decideNurseryVerification = async (actor, nurseryUserId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    if (!(0, exports.canAdminActOnUser)(actor.id, nurseryUserId)) {
        throw new Error('You do not have permission to decide verification for your own nursery.');
    }
    const { data: nursery, error: readError } = await supabase
        .from('nurseries')
        .select('user_id, verification_status, is_verified')
        .eq('user_id', nurseryUserId)
        .maybeSingle();
    if (readError)
        throw new Error(readError.message);
    if (!nursery)
        throw new Error('Nursery not found.');
    const currentStatus = nursery.verification_status ?? 'PENDING';
    const next = (0, exports.applyVerificationDecision)(currentStatus, input.status);
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
    if (error)
        throw new Error(error.message);
    await recordAudit(supabase, (0, exports.buildAuditEntry)({
        actor,
        action: 'NURSERY_VERIFICATION_CHANGED',
        targetType: 'NURSERY',
        targetId: nurseryUserId,
        targetUserId: nurseryUserId,
        previousState: { verification_status: currentStatus, is_verified: nursery.is_verified },
        newState: { verification_status: next.verification_status, is_verified: next.is_verified },
        reason: input.notes
    }));
    return data;
};
exports.decideNurseryVerification = decideNurseryVerification;
const listAdminListings = async (filters, supabase = (0, auth_1.getSupabaseClient)()) => {
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
    if (filters.status)
        query = query.eq('status', filters.status);
    if (filters.moderationStatus)
        query = query.eq('moderation_status', filters.moderationStatus);
    const { data, count, error } = await query;
    if (error)
        throw new Error(error.message);
    return { listings: data ?? [], pagination: paginationFromCount(filters, count) };
};
exports.listAdminListings = listAdminListings;
const setContentModeration = async (actor, table, id, toStatus, reason, audit, supabase) => {
    const { data: row, error: readError } = await supabase
        .from(table)
        .select(`id, moderation_status, ${audit.ownerColumn}`)
        .eq('id', id)
        .maybeSingle();
    if (readError)
        throw new Error(readError.message);
    if (!row)
        throw new Error(`${audit.targetType === 'LISTING' ? 'Listing' : 'Project'} not found.`);
    const currentStatus = row.moderation_status ?? 'VISIBLE';
    if (!(0, exports.canTransitionModeration)(currentStatus, toStatus)) {
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
    if (error)
        throw new Error(error.message);
    await recordAudit(supabase, (0, exports.buildAuditEntry)({
        actor,
        action: audit.action,
        targetType: audit.targetType,
        targetId: id,
        targetUserId: row[audit.ownerColumn] ?? null,
        previousState: { moderation_status: currentStatus },
        newState: { moderation_status: toStatus },
        reason
    }));
    return data;
};
const hideListing = async (actor, listingId, input, supabase = (0, auth_1.getSupabaseClient)()) => setContentModeration(actor, 'plant_listings', listingId, 'HIDDEN', input.reason, { action: 'LISTING_MODERATION_CHANGED', targetType: 'LISTING', ownerColumn: 'nursery_user_id' }, supabase);
exports.hideListing = hideListing;
const restoreListing = async (actor, listingId, notes, supabase = (0, auth_1.getSupabaseClient)()) => setContentModeration(actor, 'plant_listings', listingId, 'VISIBLE', notes, { action: 'LISTING_MODERATION_CHANGED', targetType: 'LISTING', ownerColumn: 'nursery_user_id' }, supabase);
exports.restoreListing = restoreListing;
const listAdminProjects = async (filters, supabase = (0, auth_1.getSupabaseClient)()) => {
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
    if (filters.status)
        query = query.eq('status', filters.status);
    if (filters.moderationStatus)
        query = query.eq('moderation_status', filters.moderationStatus);
    const { data, count, error } = await query;
    if (error)
        throw new Error(error.message);
    return { projects: data ?? [], pagination: paginationFromCount(filters, count) };
};
exports.listAdminProjects = listAdminProjects;
const hideProject = async (actor, projectId, input, supabase = (0, auth_1.getSupabaseClient)()) => setContentModeration(actor, 'plantation_projects', projectId, 'HIDDEN', input.reason, { action: 'PROJECT_MODERATION_CHANGED', targetType: 'PROJECT', ownerColumn: 'organizer_user_id' }, supabase);
exports.hideProject = hideProject;
const restoreProject = async (actor, projectId, notes, supabase = (0, auth_1.getSupabaseClient)()) => setContentModeration(actor, 'plantation_projects', projectId, 'VISIBLE', notes, { action: 'PROJECT_MODERATION_CHANGED', targetType: 'PROJECT', ownerColumn: 'organizer_user_id' }, supabase);
exports.restoreProject = restoreProject;
// ---------------------------------------------------------------------------
// Reported content
// ---------------------------------------------------------------------------
const reportTargetExists = async (supabase, targetType, targetId) => {
    if (targetType === 'USER') {
        const { data, error } = await supabase.auth.admin.getUserById(targetId);
        return !error && Boolean(data.user);
    }
    const table = targetType === 'LISTING' ? 'plant_listings' : targetType === 'PROJECT' ? 'plantation_projects' : 'nurseries';
    const column = targetType === 'NURSERY' ? 'user_id' : 'id';
    const { data, error } = await supabase.from(table).select(column).eq(column, targetId).maybeSingle();
    if (error)
        throw new Error(error.message);
    return Boolean(data);
};
const submitReport = async (reporterUserId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
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
    if (existingError)
        throw new Error(existingError.message);
    if ((0, exports.findLiveDuplicateReport)(existing ?? [], {
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
        if (error.code === '23505') {
            throw new Error('You already have an open report for this content.');
        }
        throw new Error(error.message);
    }
    return data;
};
exports.submitReport = submitReport;
const getMyReports = async (reporterUserId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .eq('reporter_user_id', reporterUserId)
        .order('created_at', { ascending: false });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
exports.getMyReports = getMyReports;
const listAdminReports = async (filters, supabase = (0, auth_1.getSupabaseClient)()) => {
    const from = (filters.page - 1) * filters.pageSize;
    let query = supabase
        .from('content_reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + filters.pageSize - 1);
    if (filters.status)
        query = query.eq('status', filters.status);
    if (filters.targetType)
        query = query.eq('target_type', filters.targetType);
    const { data, count, error } = await query;
    if (error)
        throw new Error(error.message);
    return { reports: data ?? [], pagination: paginationFromCount(filters, count) };
};
exports.listAdminReports = listAdminReports;
const updateReportStatus = async (actor, reportId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data: report, error: readError } = await supabase
        .from('content_reports')
        .select('id, status, target_type, target_id, reporter_user_id')
        .eq('id', reportId)
        .maybeSingle();
    if (readError)
        throw new Error(readError.message);
    if (!report)
        throw new Error('Report not found.');
    const currentStatus = report.status;
    if (!(0, exports.canTransitionReport)(currentStatus, input.status)) {
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
    if (error)
        throw new Error(error.message);
    await recordAudit(supabase, (0, exports.buildAuditEntry)({
        actor,
        action: 'REPORT_STATUS_CHANGED',
        targetType: 'REPORT',
        targetId: reportId,
        targetUserId: report.reporter_user_id,
        previousState: { status: currentStatus },
        newState: { status: input.status, target_type: report.target_type, target_id: report.target_id },
        reason: input.resolutionNotes
    }));
    return data;
};
exports.updateReportStatus = updateReportStatus;
// ---------------------------------------------------------------------------
// Audit history
// ---------------------------------------------------------------------------
const listAuditLog = async (filters, supabase = (0, auth_1.getSupabaseClient)()) => {
    const from = (filters.page - 1) * filters.pageSize;
    let query = supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + filters.pageSize - 1);
    if (filters.actorUserId)
        query = query.eq('actor_user_id', filters.actorUserId);
    if (filters.action)
        query = query.eq('action', filters.action);
    if (filters.targetType)
        query = query.eq('target_type', filters.targetType);
    if (filters.targetId)
        query = query.eq('target_id', filters.targetId);
    const { data, count, error } = await query;
    if (error)
        throw new Error(error.message);
    return { entries: data ?? [], pagination: paginationFromCount(filters, count) };
};
exports.listAuditLog = listAuditLog;
