import { apiFetch } from './catalog';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ModerationStatus = 'VISIBLE' | 'HIDDEN';
export type ReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
export type ReportTargetType = 'LISTING' | 'PROJECT' | 'NURSERY' | 'USER';

export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  created_at: string | null;
  verification_status: VerificationStatus;
  is_suspended: boolean;
  suspension_reason: string | null;
};

export type AdminNursery = {
  user_id: string;
  name: string;
  city: string | null;
  website: string | null;
  verification_status: VerificationStatus;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  created_at: string;
};

export type AdminListing = {
  id: string;
  nursery_user_id: string;
  name: string;
  category: string;
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED';
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  moderated_at: string | null;
  created_at: string;
};

export type AdminProject = {
  id: string;
  organizer_user_id: string;
  title: string;
  location: string;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'ARCHIVED';
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  moderated_at: string | null;
  created_at: string;
};

export type AdminReport = {
  id: string;
  reporter_user_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type AuditEntry = {
  id: string;
  actor_user_id: string;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  target_user_id: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
};

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const fetchAdminUsers = (token: string, filters: Record<string, string | undefined>) =>
  apiFetch<{ users: AdminUser[]; pagination: Pagination }>(`/api/admin/users${query(filters)}`, token);

export const decideUserVerification = (token: string, userId: string, status: VerificationStatus, notes: string) =>
  apiFetch<{ user: unknown }>(`/api/admin/users/${userId}/verification`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes: notes || undefined })
  });

export const suspendAdminUser = (token: string, userId: string, reason: string) =>
  apiFetch<{ user: unknown }>(`/api/admin/users/${userId}/suspend`, token, {
    method: 'POST',
    body: JSON.stringify({ reason, confirm: true })
  });

export const reactivateAdminUser = (token: string, userId: string, notes: string) =>
  apiFetch<{ user: unknown }>(`/api/admin/users/${userId}/reactivate`, token, {
    method: 'POST',
    body: JSON.stringify({ confirm: true, notes: notes || undefined })
  });

export const fetchAdminNurseries = (token: string, filters: Record<string, string | undefined>) =>
  apiFetch<{ nurseries: AdminNursery[]; pagination: Pagination }>(`/api/admin/nurseries${query(filters)}`, token);

export const decideNurseryVerification = (token: string, nurseryUserId: string, status: VerificationStatus, notes: string) =>
  apiFetch<{ nursery: unknown }>(`/api/admin/nurseries/${nurseryUserId}/verification`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes: notes || undefined })
  });

export const fetchAdminListings = (token: string, filters: Record<string, string | undefined>) =>
  apiFetch<{ listings: AdminListing[]; pagination: Pagination }>(`/api/admin/listings${query(filters)}`, token);

export const hideAdminListing = (token: string, listingId: string, reason: string) =>
  apiFetch<{ listing: unknown }>(`/api/admin/listings/${listingId}/hide`, token, {
    method: 'POST',
    body: JSON.stringify({ reason, confirm: true })
  });

export const restoreAdminListing = (token: string, listingId: string, notes: string) =>
  apiFetch<{ listing: unknown }>(`/api/admin/listings/${listingId}/restore`, token, {
    method: 'POST',
    body: JSON.stringify({ notes: notes || undefined })
  });

export const fetchAdminProjects = (token: string, filters: Record<string, string | undefined>) =>
  apiFetch<{ projects: AdminProject[]; pagination: Pagination }>(`/api/admin/projects${query(filters)}`, token);

export const hideAdminProject = (token: string, projectId: string, reason: string) =>
  apiFetch<{ project: unknown }>(`/api/admin/projects/${projectId}/hide`, token, {
    method: 'POST',
    body: JSON.stringify({ reason, confirm: true })
  });

export const restoreAdminProject = (token: string, projectId: string, notes: string) =>
  apiFetch<{ project: unknown }>(`/api/admin/projects/${projectId}/restore`, token, {
    method: 'POST',
    body: JSON.stringify({ notes: notes || undefined })
  });

export const fetchAdminReports = (token: string, filters: Record<string, string | undefined>) =>
  apiFetch<{ reports: AdminReport[]; pagination: Pagination }>(`/api/admin/reports${query(filters)}`, token);

export const updateAdminReportStatus = (token: string, reportId: string, status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED', resolutionNotes: string) =>
  apiFetch<{ report: AdminReport }>(`/api/admin/reports/${reportId}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status, resolutionNotes: resolutionNotes || undefined })
  });

export const fetchAdminAuditLog = (token: string, filters: Record<string, string | undefined>) =>
  apiFetch<{ entries: AuditEntry[]; pagination: Pagination }>(`/api/admin/audit-log${query(filters)}`, token);
