import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
export declare const verificationStatuses: readonly ["PENDING", "APPROVED", "REJECTED"];
export declare const moderationStatuses: readonly ["VISIBLE", "HIDDEN"];
export declare const reportTargetTypes: readonly ["LISTING", "PROJECT", "NURSERY", "USER"];
export declare const reportReasons: readonly ["SPAM", "FRAUD", "INAPPROPRIATE", "INCORRECT_INFORMATION", "SAFETY", "OTHER"];
export declare const reportStatuses: readonly ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"];
export declare const auditActions: readonly ["USER_VERIFICATION_CHANGED", "NURSERY_VERIFICATION_CHANGED", "USER_SUSPENDED", "USER_REACTIVATED", "LISTING_MODERATION_CHANGED", "PROJECT_MODERATION_CHANGED", "REPORT_STATUS_CHANGED"];
export declare const auditTargetTypes: readonly ["USER", "NURSERY", "LISTING", "PROJECT", "REPORT"];
export type VerificationStatus = (typeof verificationStatuses)[number];
export type ModerationStatus = (typeof moderationStatuses)[number];
export type ReportTargetType = (typeof reportTargetTypes)[number];
export type ReportStatus = (typeof reportStatuses)[number];
export type AuditAction = (typeof auditActions)[number];
export type AdminActor = {
    id: string;
    email?: string | null;
};
export type AccountStateLike = {
    verification_status?: string | null;
    is_suspended?: boolean | null;
} | null | undefined;
export type AccountStateRow = {
    verification_status?: string | null;
    is_suspended?: boolean | null;
    suspension_reason?: string | null;
};
export declare const verificationDecisionSchema: z.ZodObject<{
    status: z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>;
    notes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    notes?: string | undefined;
}, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    notes?: string | undefined;
}>;
export declare const suspendUserSchema: z.ZodObject<{
    reason: z.ZodString;
    confirm: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    confirm: true;
}, {
    reason: string;
    confirm: true;
}>;
export declare const reactivateUserSchema: z.ZodObject<{
    confirm: z.ZodLiteral<true>;
    notes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    confirm: true;
    notes?: string | undefined;
}, {
    confirm: true;
    notes?: string | undefined;
}>;
export declare const hideContentSchema: z.ZodObject<{
    reason: z.ZodString;
    confirm: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    confirm: true;
}, {
    reason: string;
    confirm: true;
}>;
export declare const restoreContentSchema: z.ZodObject<{
    notes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
}, {
    notes?: string | undefined;
}>;
export declare const reportInputSchema: z.ZodObject<{
    targetType: z.ZodEnum<["LISTING", "PROJECT", "NURSERY", "USER"]>;
    targetId: z.ZodString;
    reason: z.ZodEnum<["SPAM", "FRAUD", "INAPPROPRIATE", "INCORRECT_INFORMATION", "SAFETY", "OTHER"]>;
    details: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    reason: "SPAM" | "FRAUD" | "INAPPROPRIATE" | "INCORRECT_INFORMATION" | "SAFETY" | "OTHER";
    targetType: "LISTING" | "PROJECT" | "NURSERY" | "USER";
    targetId: string;
    details?: string | undefined;
}, {
    reason: "SPAM" | "FRAUD" | "INAPPROPRIATE" | "INCORRECT_INFORMATION" | "SAFETY" | "OTHER";
    targetType: "LISTING" | "PROJECT" | "NURSERY" | "USER";
    targetId: string;
    details?: string | undefined;
}>;
export declare const reportStatusSchema: z.ZodEffects<z.ZodObject<{
    status: z.ZodEnum<["UNDER_REVIEW", "RESOLVED", "DISMISSED"]>;
    resolutionNotes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
    resolutionNotes?: string | undefined;
}, {
    status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
    resolutionNotes?: string | undefined;
}>, {
    status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
    resolutionNotes?: string | undefined;
}, {
    status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
    resolutionNotes?: string | undefined;
}>;
export declare const adminUserFilterSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    query: z.ZodOptional<z.ZodString>;
    verificationStatus: z.ZodOptional<z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>>;
    suspended: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    query?: string | undefined;
    verificationStatus?: "PENDING" | "APPROVED" | "REJECTED" | undefined;
    suspended?: "true" | "false" | undefined;
}, {
    query?: string | undefined;
    verificationStatus?: "PENDING" | "APPROVED" | "REJECTED" | undefined;
    suspended?: "true" | "false" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export declare const adminNurseryFilterSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    query: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    verificationStatus: z.ZodOptional<z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    query?: string | undefined;
    verificationStatus?: "PENDING" | "APPROVED" | "REJECTED" | undefined;
    city?: string | undefined;
}, {
    query?: string | undefined;
    verificationStatus?: "PENDING" | "APPROVED" | "REJECTED" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    city?: string | undefined;
}>;
export declare const adminListingFilterSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    query: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "OUT_OF_STOCK", "ARCHIVED"]>>;
    moderationStatus: z.ZodOptional<z.ZodEnum<["VISIBLE", "HIDDEN"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED" | undefined;
    query?: string | undefined;
    moderationStatus?: "VISIBLE" | "HIDDEN" | undefined;
}, {
    status?: "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED" | undefined;
    query?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    moderationStatus?: "VISIBLE" | "HIDDEN" | undefined;
}>;
export declare const adminProjectFilterSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    query: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "PUBLISHED", "COMPLETED", "ARCHIVED"]>>;
    moderationStatus: z.ZodOptional<z.ZodEnum<["VISIBLE", "HIDDEN"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "ARCHIVED" | "DRAFT" | "PUBLISHED" | "COMPLETED" | undefined;
    query?: string | undefined;
    moderationStatus?: "VISIBLE" | "HIDDEN" | undefined;
}, {
    status?: "ARCHIVED" | "DRAFT" | "PUBLISHED" | "COMPLETED" | undefined;
    query?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    moderationStatus?: "VISIBLE" | "HIDDEN" | undefined;
}>;
export declare const adminReportFilterSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]>>;
    targetType: z.ZodOptional<z.ZodEnum<["LISTING", "PROJECT", "NURSERY", "USER"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED" | undefined;
    targetType?: "LISTING" | "PROJECT" | "NURSERY" | "USER" | undefined;
}, {
    status?: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED" | undefined;
    targetType?: "LISTING" | "PROJECT" | "NURSERY" | "USER" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export declare const adminAuditFilterSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    actorUserId: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodEnum<["USER_VERIFICATION_CHANGED", "NURSERY_VERIFICATION_CHANGED", "USER_SUSPENDED", "USER_REACTIVATED", "LISTING_MODERATION_CHANGED", "PROJECT_MODERATION_CHANGED", "REPORT_STATUS_CHANGED"]>>;
    targetType: z.ZodOptional<z.ZodEnum<["USER", "NURSERY", "LISTING", "PROJECT", "REPORT"]>>;
    targetId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    targetType?: "LISTING" | "PROJECT" | "NURSERY" | "USER" | "REPORT" | undefined;
    targetId?: string | undefined;
    actorUserId?: string | undefined;
    action?: "USER_VERIFICATION_CHANGED" | "NURSERY_VERIFICATION_CHANGED" | "USER_SUSPENDED" | "USER_REACTIVATED" | "LISTING_MODERATION_CHANGED" | "PROJECT_MODERATION_CHANGED" | "REPORT_STATUS_CHANGED" | undefined;
}, {
    targetType?: "LISTING" | "PROJECT" | "NURSERY" | "USER" | "REPORT" | undefined;
    targetId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    actorUserId?: string | undefined;
    action?: "USER_VERIFICATION_CHANGED" | "NURSERY_VERIFICATION_CHANGED" | "USER_SUSPENDED" | "USER_REACTIVATED" | "LISTING_MODERATION_CHANGED" | "PROJECT_MODERATION_CHANGED" | "REPORT_STATUS_CHANGED" | undefined;
}>;
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
export declare const verificationTransitions: Record<VerificationStatus, VerificationStatus[]>;
export declare const canTransitionVerification: (from: VerificationStatus, to: VerificationStatus) => boolean;
export declare const isVerifiedStatus: (status?: string | null) => boolean;
export declare const applyVerificationDecision: (currentStatus: VerificationStatus, decision: VerificationStatus) => {
    verification_status: VerificationStatus;
    is_verified: boolean;
};
export declare const isSelfTarget: (actorUserId: string, targetUserId: string) => boolean;
export declare const canAdminActOnUser: (actorUserId: string, targetUserId: string) => boolean;
export declare const isAccountSuspended: (state: AccountStateLike) => boolean;
export declare const isLoginBlocked: (state: AccountStateLike) => boolean;
export declare const canSuspendAccount: (state: AccountStateLike) => boolean;
export declare const canReactivateAccount: (state: AccountStateLike) => boolean;
export declare const moderationTransitions: Record<ModerationStatus, ModerationStatus[]>;
export declare const canTransitionModeration: (from: ModerationStatus, to: ModerationStatus) => boolean;
export declare const isListingPubliclyVisible: (listing: {
    status?: string | null;
    moderation_status?: string | null;
}) => boolean;
export declare const isProjectPubliclyVisible: (project: {
    status?: string | null;
    moderation_status?: string | null;
}) => boolean;
export declare const reportTransitions: Record<ReportStatus, ReportStatus[]>;
export declare const canTransitionReport: (from: ReportStatus, to: ReportStatus) => boolean;
export declare const isLiveReport: (report: {
    status?: string | null;
}) => boolean;
export declare const findLiveDuplicateReport: <T extends {
    reporter_user_id: string;
    target_type: string;
    target_id: string;
    status?: string | null;
}>(reports: T[], candidate: {
    reporter_user_id: string;
    target_type: string;
    target_id: string;
}) => T | undefined;
export declare const buildAuditEntry: (input: {
    actor: AdminActor;
    action: AuditAction;
    targetType: (typeof auditTargetTypes)[number];
    targetId: string;
    targetUserId?: string | null;
    previousState?: Record<string, unknown> | null;
    newState?: Record<string, unknown> | null;
    reason?: string | null;
}) => {
    actor_user_id: string;
    actor_email: string | null;
    action: "USER_VERIFICATION_CHANGED" | "NURSERY_VERIFICATION_CHANGED" | "USER_SUSPENDED" | "USER_REACTIVATED" | "LISTING_MODERATION_CHANGED" | "PROJECT_MODERATION_CHANGED" | "REPORT_STATUS_CHANGED";
    target_type: "LISTING" | "PROJECT" | "NURSERY" | "USER" | "REPORT";
    target_id: string;
    target_user_id: string | null;
    previous_state: Record<string, unknown> | null;
    new_state: Record<string, unknown> | null;
    reason: string | null;
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
export declare const mergeAdminUser: (authUser: {
    id: string;
    email?: string | null;
    created_at?: string | null;
    user_metadata?: Record<string, unknown> | null;
}, state: AccountStateRow | null | undefined) => MergedAdminUser;
export declare const filterAdminUsers: (users: MergedAdminUser[], filters: Pick<AdminUserFilters, "query" | "verificationStatus" | "suspended">) => MergedAdminUser[];
export declare const paginateItems: <T>(items: T[], page: number, pageSize: number) => {
    items: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
};
export declare const listAdminUsers: (filters: AdminUserFilters, supabase?: SupabaseClient) => Promise<{
    users: MergedAdminUser[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const decideUserVerification: (actor: AdminActor, targetUserId: string, input: VerificationDecisionInput, supabase?: SupabaseClient) => Promise<{
    user_id: any;
    verification_status: any;
    is_suspended: any;
}>;
export declare const suspendUser: (actor: AdminActor, targetUserId: string, input: SuspendUserInput, supabase?: SupabaseClient) => Promise<{
    user_id: any;
    verification_status: any;
    is_suspended: any;
    suspension_reason: any;
}>;
export declare const reactivateUser: (actor: AdminActor, targetUserId: string, notes?: string, supabase?: SupabaseClient) => Promise<{
    user_id: any;
    verification_status: any;
    is_suspended: any;
    suspension_reason: any;
}>;
export declare const listAdminNurseries: (filters: AdminNurseryFilters, supabase?: SupabaseClient) => Promise<{
    nurseries: {
        user_id: any;
        name: any;
        phone: any;
        city: any;
        address: any;
        website: any;
        verification_status: any;
        is_verified: any;
        verified_by: any;
        verified_at: any;
        verification_notes: any;
        created_at: any;
        updated_at: any;
    }[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const decideNurseryVerification: (actor: AdminActor, nurseryUserId: string, input: VerificationDecisionInput, supabase?: SupabaseClient) => Promise<{
    user_id: any;
    name: any;
    verification_status: any;
    is_verified: any;
    verified_by: any;
    verified_at: any;
}>;
export declare const listAdminListings: (filters: AdminListingFilters, supabase?: SupabaseClient) => Promise<{
    listings: any[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const hideListing: (actor: AdminActor, listingId: string, input: {
    reason: string;
}, supabase?: SupabaseClient) => Promise<any>;
export declare const restoreListing: (actor: AdminActor, listingId: string, notes?: string, supabase?: SupabaseClient) => Promise<any>;
export declare const listAdminProjects: (filters: AdminProjectFilters, supabase?: SupabaseClient) => Promise<{
    projects: any[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const hideProject: (actor: AdminActor, projectId: string, input: {
    reason: string;
}, supabase?: SupabaseClient) => Promise<any>;
export declare const restoreProject: (actor: AdminActor, projectId: string, notes?: string, supabase?: SupabaseClient) => Promise<any>;
export declare const submitReport: (reporterUserId: string, input: ReportInput, supabase?: SupabaseClient) => Promise<any>;
export declare const getMyReports: (reporterUserId: string, supabase?: SupabaseClient) => Promise<any[]>;
export declare const listAdminReports: (filters: AdminReportFilters, supabase?: SupabaseClient) => Promise<{
    reports: any[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const updateReportStatus: (actor: AdminActor, reportId: string, input: ReportStatusInput, supabase?: SupabaseClient) => Promise<any>;
export declare const listAuditLog: (filters: AdminAuditFilters, supabase?: SupabaseClient) => Promise<{
    entries: any[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>;
