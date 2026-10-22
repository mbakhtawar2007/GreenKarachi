import React from 'react';
import type { AuthSession } from '../App';
import {
  decideNurseryVerification,
  decideUserVerification,
  fetchAdminAuditLog,
  fetchAdminListings,
  fetchAdminNurseries,
  fetchAdminProjects,
  fetchAdminReports,
  fetchAdminUsers,
  hideAdminListing,
  hideAdminProject,
  reactivateAdminUser,
  restoreAdminListing,
  restoreAdminProject,
  suspendAdminUser,
  updateAdminReportStatus,
  type AdminListing,
  type AdminNursery,
  type AdminProject,
  type AdminReport,
  type AdminUser,
  type AuditEntry,
  type Pagination,
  type VerificationStatus
} from '../api/admin';

// Phase 7 admin console. Every action here calls an ADMIN-only API; the
// server enforces the role again, and high-impact actions (verification
// rejection, suspension, content takedown) go through the confirmation
// panel below, which collects the reason the server requires and records
// in the audit trail.

type PendingAction = {
  title: string;
  description: string;
  needsReason: boolean;
  reasonLabel: string;
  needsConfirm: boolean;
  confirmLabel: string;
  actionLabel: string;
  run: (text: string) => Promise<void>;
};

type SectionProps = {
  token: string;
  refreshKey: number;
  requestAction: (action: PendingAction) => void;
};

const badge = (text: string, tone: 'green' | 'amber' | 'red' | 'gray' = 'gray') => {
  const tones = {
    green: 'bg-green-100 text-green-900',
    amber: 'bg-amber-100 text-amber-900',
    red: 'bg-red-100 text-red-900',
    gray: 'bg-gray-100 text-gray-800'
  } as const;
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{text}</span>;
};

const verificationBadge = (status: VerificationStatus) =>
  status === 'APPROVED' ? badge('APPROVED', 'green') : status === 'REJECTED' ? badge('REJECTED', 'red') : badge('PENDING', 'amber');

const useAdminList = <T,>(load: () => Promise<{ items: T[]; pagination: Pagination }>, deps: unknown[]) => {
  const [items, setItems] = React.useState<T[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    load()
      .then((data) => { if (active) { setItems(data.items); setPagination(data.pagination); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { items, pagination, loading, error };
};

const ListShell: React.FC<{
  loading: boolean;
  error: string;
  empty: boolean;
  emptyText: string;
  pagination: Pagination | null;
  page: number;
  onPage: (page: number) => void;
  children: React.ReactNode;
}> = ({ loading, error, empty, emptyText, pagination, page, onPage, children }) => (
  <>
    {loading && <p className="py-6 text-center text-gray-600" role="status">Loading...</p>}
    {!loading && error && <div className="border-l-4 border-red-700 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
    {!loading && !error && empty && <p className="py-6 text-center text-gray-600">{emptyText}</p>}
    {!loading && !error && !empty && children}
    {!loading && !error && pagination && pagination.totalPages > 1 && (
      <nav className="mt-4 flex items-center justify-between" aria-label="Pages">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded border border-green-800 px-3 py-1.5 text-sm font-semibold text-green-900 disabled:opacity-40">Previous</button>
        <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
        <button type="button" disabled={page >= pagination.totalPages} onClick={() => onPage(page + 1)} className="rounded border border-green-800 px-3 py-1.5 text-sm font-semibold text-green-900 disabled:opacity-40">Next</button>
      </nav>
    )}
  </>
);

const tableClass = 'w-full border-collapse text-left text-sm';
const thClass = 'border-b border-green-200 py-2 pr-3 font-semibold text-green-950';
const tdClass = 'border-b border-green-100 py-2 pr-3 align-top';
const actionButton = 'rounded border border-green-800 px-2.5 py-1 text-xs font-semibold text-green-900 hover:bg-green-50';
const dangerButton = 'rounded border border-red-800 px-2.5 py-1 text-xs font-semibold text-red-900 hover:bg-red-50';

const VerificationSection: React.FC<SectionProps> = ({ token, refreshKey, requestAction }) => {
  const [nurseryStatus, setNurseryStatus] = React.useState('PENDING');
  const [nurseryPage, setNurseryPage] = React.useState(1);
  const nurseries = useAdminList<AdminNursery>(
    () => fetchAdminNurseries(token, { verificationStatus: nurseryStatus || undefined, page: String(nurseryPage), pageSize: '20' })
      .then((data) => ({ items: data.nurseries, pagination: data.pagination })),
    [token, nurseryStatus, nurseryPage, refreshKey]
  );
  const [userStatus, setUserStatus] = React.useState('PENDING');
  const [userPage, setUserPage] = React.useState(1);
  const users = useAdminList<AdminUser>(
    () => fetchAdminUsers(token, { verificationStatus: userStatus || undefined, page: String(userPage), pageSize: '20' })
      .then((data) => ({ items: data.users, pagination: data.pagination })),
    [token, userStatus, userPage, refreshKey]
  );

  const decideNursery = (nursery: AdminNursery, status: VerificationStatus) => requestAction({
    title: `${status === 'APPROVED' ? 'Approve' : status === 'REJECTED' ? 'Reject' : 'Reset'} nursery verification`,
    description: `Record an explicit verification decision for ${nursery.name}. Only this admin decision changes verification state; it is written to the audit trail.`,
    needsReason: status === 'REJECTED',
    reasonLabel: status === 'REJECTED' ? 'Reason for rejection (required)' : 'Decision notes',
    needsConfirm: status === 'REJECTED',
    confirmLabel: 'I confirm this rejection decision',
    actionLabel: 'Record decision',
    run: async (text) => { await decideNurseryVerification(token, nursery.user_id, status, text); }
  });

  const decideUser = (user: AdminUser, status: VerificationStatus) => requestAction({
    title: `${status === 'APPROVED' ? 'Approve' : status === 'REJECTED' ? 'Reject' : 'Reset'} user verification`,
    description: `Record an explicit verification decision for ${user.name} (${user.email}). It is written to the audit trail.`,
    needsReason: status === 'REJECTED',
    reasonLabel: status === 'REJECTED' ? 'Reason for rejection (required)' : 'Decision notes',
    needsConfirm: status === 'REJECTED',
    confirmLabel: 'I confirm this rejection decision',
    actionLabel: 'Record decision',
    run: async (text) => { await decideUserVerification(token, user.id, status, text); }
  });

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-green-950">Nursery verification queue</h2>
          <label className="text-sm font-medium text-gray-700">Status
            <select value={nurseryStatus} onChange={(event) => { setNurseryStatus(event.target.value); setNurseryPage(1); }} className="ml-2 rounded border border-green-300 px-2 py-1.5">
              <option value="">All</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
            </select>
          </label>
        </div>
        <ListShell loading={nurseries.loading} error={nurseries.error} empty={nurseries.items.length === 0} emptyText="No nurseries match this verification status." pagination={nurseries.pagination} page={nurseryPage} onPage={setNurseryPage}>
          <table className={tableClass}>
            <thead><tr><th className={thClass}>Nursery</th><th className={thClass}>City</th><th className={thClass}>Status</th><th className={thClass}>Decided</th><th className={thClass}>Actions</th></tr></thead>
            <tbody>
              {nurseries.items.map((nursery) => (
                <tr key={nursery.user_id}>
                  <td className={tdClass}><span className="font-semibold text-green-950">{nursery.name}</span></td>
                  <td className={tdClass}>{nursery.city || 'Not specified'}</td>
                  <td className={tdClass}>{verificationBadge(nursery.verification_status)}</td>
                  <td className={tdClass}>{nursery.verified_at ? new Date(nursery.verified_at).toLocaleDateString() : '—'}</td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap gap-2">
                      {nursery.verification_status !== 'APPROVED' && <button type="button" className={actionButton} onClick={() => decideNursery(nursery, 'APPROVED')}>Approve</button>}
                      {nursery.verification_status !== 'REJECTED' && <button type="button" className={dangerButton} onClick={() => decideNursery(nursery, 'REJECTED')}>Reject</button>}
                      {nursery.verification_status !== 'PENDING' && <button type="button" className={actionButton} onClick={() => decideNursery(nursery, 'PENDING')}>Reset to pending</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ListShell>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-green-950">User verification</h2>
          <label className="text-sm font-medium text-gray-700">Status
            <select value={userStatus} onChange={(event) => { setUserStatus(event.target.value); setUserPage(1); }} className="ml-2 rounded border border-green-300 px-2 py-1.5">
              <option value="">All</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
            </select>
          </label>
        </div>
        <ListShell loading={users.loading} error={users.error} empty={users.items.length === 0} emptyText="No users match this verification status." pagination={users.pagination} page={userPage} onPage={setUserPage}>
          <table className={tableClass}>
            <thead><tr><th className={thClass}>User</th><th className={thClass}>Roles</th><th className={thClass}>Status</th><th className={thClass}>Actions</th></tr></thead>
            <tbody>
              {users.items.map((user) => (
                <tr key={user.id}>
                  <td className={tdClass}><span className="font-semibold text-green-950">{user.name}</span><br /><span className="text-gray-600">{user.email}</span></td>
                  <td className={tdClass}>{user.roles.join(', ')}</td>
                  <td className={tdClass}>{verificationBadge(user.verification_status)}{user.is_suspended && <> {badge('SUSPENDED', 'red')}</>}</td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap gap-2">
                      {user.verification_status !== 'APPROVED' && <button type="button" className={actionButton} onClick={() => decideUser(user, 'APPROVED')}>Approve</button>}
                      {user.verification_status !== 'REJECTED' && <button type="button" className={dangerButton} onClick={() => decideUser(user, 'REJECTED')}>Reject</button>}
                      {user.verification_status !== 'PENDING' && <button type="button" className={actionButton} onClick={() => decideUser(user, 'PENDING')}>Reset to pending</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ListShell>
      </section>
    </div>
  );
};

const UsersSection: React.FC<SectionProps> = ({ token, refreshKey, requestAction }) => {
  const [queryText, setQueryText] = React.useState('');
  const [suspended, setSuspended] = React.useState('');
  const [page, setPage] = React.useState(1);
  const users = useAdminList<AdminUser>(
    () => fetchAdminUsers(token, { query: queryText || undefined, suspended: suspended || undefined, page: String(page), pageSize: '20' })
      .then((data) => ({ items: data.users, pagination: data.pagination })),
    [token, queryText, suspended, page, refreshKey]
  );

  const suspend = (user: AdminUser) => requestAction({
    title: `Suspend ${user.name}`,
    description: 'Suspension blocks the account at login and is recorded in the audit trail. It can be reversed with Reactivate.',
    needsReason: true,
    reasonLabel: 'Reason for suspension (required)',
    needsConfirm: true,
    confirmLabel: 'I confirm this suspension',
    actionLabel: 'Suspend account',
    run: async (text) => { await suspendAdminUser(token, user.id, text); }
  });

  const reactivate = (user: AdminUser) => requestAction({
    title: `Reactivate ${user.name}`,
    description: 'Reactivation lifts the suspension and is recorded in the audit trail.',
    needsReason: false,
    reasonLabel: 'Notes',
    needsConfirm: true,
    confirmLabel: 'I confirm this reactivation',
    actionLabel: 'Reactivate account',
    run: async (text) => { await reactivateAdminUser(token, user.id, text); }
  });

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Search
          <input value={queryText} onChange={(event) => { setQueryText(event.target.value); setPage(1); }} placeholder="Name or email" className="ml-2 rounded border border-green-300 px-2 py-1.5" />
        </label>
        <label className="text-sm font-medium text-gray-700">Suspension
          <select value={suspended} onChange={(event) => { setSuspended(event.target.value); setPage(1); }} className="ml-2 rounded border border-green-300 px-2 py-1.5">
            <option value="">All</option><option value="true">Suspended</option><option value="false">Not suspended</option>
          </select>
        </label>
      </div>
      <ListShell loading={users.loading} error={users.error} empty={users.items.length === 0} emptyText="No users match these filters." pagination={users.pagination} page={page} onPage={setPage}>
        <table className={tableClass}>
          <thead><tr><th className={thClass}>User</th><th className={thClass}>Roles</th><th className={thClass}>Verification</th><th className={thClass}>Account</th><th className={thClass}>Actions</th></tr></thead>
          <tbody>
            {users.items.map((user) => (
              <tr key={user.id}>
                <td className={tdClass}><span className="font-semibold text-green-950">{user.name}</span><br /><span className="text-gray-600">{user.email}</span></td>
                <td className={tdClass}>{user.roles.join(', ')}</td>
                <td className={tdClass}>{verificationBadge(user.verification_status)}</td>
                <td className={tdClass}>{user.is_suspended ? <>{badge('SUSPENDED', 'red')}{user.suspension_reason && <p className="mt-1 text-xs text-gray-600">{user.suspension_reason}</p>}</> : badge('ACTIVE', 'green')}</td>
                <td className={tdClass}>
                  {user.is_suspended
                    ? <button type="button" className={actionButton} onClick={() => reactivate(user)}>Reactivate</button>
                    : <button type="button" className={dangerButton} onClick={() => suspend(user)}>Suspend</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListShell>
    </section>
  );
};

const ModerationSection: React.FC<SectionProps> = ({ token, refreshKey, requestAction }) => {
  const [listingFilter, setListingFilter] = React.useState('HIDDEN');
  const [listingPage, setListingPage] = React.useState(1);
  const listings = useAdminList<AdminListing>(
    () => fetchAdminListings(token, { moderationStatus: listingFilter || undefined, page: String(listingPage), pageSize: '20' })
      .then((data) => ({ items: data.listings, pagination: data.pagination })),
    [token, listingFilter, listingPage, refreshKey]
  );
  const [projectFilter, setProjectFilter] = React.useState('HIDDEN');
  const [projectPage, setProjectPage] = React.useState(1);
  const projects = useAdminList<AdminProject>(
    () => fetchAdminProjects(token, { moderationStatus: projectFilter || undefined, page: String(projectPage), pageSize: '20' })
      .then((data) => ({ items: data.projects, pagination: data.pagination })),
    [token, projectFilter, projectPage, refreshKey]
  );

  const hide = (kind: 'listing' | 'project', id: string, label: string) => requestAction({
    title: `Hide ${kind}: ${label}`,
    description: 'Hiding removes this content from all public views immediately. The owner keeps their own status, and restoring visibility reverses the takedown. The action is written to the audit trail.',
    needsReason: true,
    reasonLabel: 'Reason for hiding (required)',
    needsConfirm: true,
    confirmLabel: 'I confirm this takedown',
    actionLabel: 'Hide content',
    run: async (text) => { if (kind === 'listing') await hideAdminListing(token, id, text); else await hideAdminProject(token, id, text); }
  });

  const restore = (kind: 'listing' | 'project', id: string, label: string) => requestAction({
    title: `Restore ${kind}: ${label}`,
    description: 'Restoring makes this content publicly visible again under its existing owner status.',
    needsReason: false,
    reasonLabel: 'Notes',
    needsConfirm: false,
    confirmLabel: '',
    actionLabel: 'Restore visibility',
    run: async (text) => { if (kind === 'listing') await restoreAdminListing(token, id, text); else await restoreAdminProject(token, id, text); }
  });

  const moderationFilterSelect = (value: string, onChange: (value: string) => void) => (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="ml-2 rounded border border-green-300 px-2 py-1.5">
      <option value="">All</option><option value="HIDDEN">Hidden</option><option value="VISIBLE">Visible</option>
    </select>
  );

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-green-950">Listing moderation</h2>
          <label className="text-sm font-medium text-gray-700">Moderation{moderationFilterSelect(listingFilter, (value) => { setListingFilter(value); setListingPage(1); })}</label>
        </div>
        <ListShell loading={listings.loading} error={listings.error} empty={listings.items.length === 0} emptyText="No listings match this moderation filter." pagination={listings.pagination} page={listingPage} onPage={setListingPage}>
          <table className={tableClass}>
            <thead><tr><th className={thClass}>Listing</th><th className={thClass}>Owner status</th><th className={thClass}>Moderation</th><th className={thClass}>Actions</th></tr></thead>
            <tbody>
              {listings.items.map((listing) => (
                <tr key={listing.id}>
                  <td className={tdClass}><span className="font-semibold text-green-950">{listing.name}</span><br /><span className="text-gray-600">{listing.category}</span></td>
                  <td className={tdClass}>{listing.status}</td>
                  <td className={tdClass}>{listing.moderation_status === 'HIDDEN' ? <>{badge('HIDDEN', 'red')}{listing.moderation_reason && <p className="mt-1 text-xs text-gray-600">{listing.moderation_reason}</p>}</> : badge('VISIBLE', 'green')}</td>
                  <td className={tdClass}>
                    {listing.moderation_status === 'HIDDEN'
                      ? <button type="button" className={actionButton} onClick={() => restore('listing', listing.id, listing.name)}>Restore</button>
                      : <button type="button" className={dangerButton} onClick={() => hide('listing', listing.id, listing.name)}>Hide</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ListShell>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-green-950">Project moderation</h2>
          <label className="text-sm font-medium text-gray-700">Moderation{moderationFilterSelect(projectFilter, (value) => { setProjectFilter(value); setProjectPage(1); })}</label>
        </div>
        <ListShell loading={projects.loading} error={projects.error} empty={projects.items.length === 0} emptyText="No projects match this moderation filter." pagination={projects.pagination} page={projectPage} onPage={setProjectPage}>
          <table className={tableClass}>
            <thead><tr><th className={thClass}>Project</th><th className={thClass}>Owner status</th><th className={thClass}>Moderation</th><th className={thClass}>Actions</th></tr></thead>
            <tbody>
              {projects.items.map((project) => (
                <tr key={project.id}>
                  <td className={tdClass}><span className="font-semibold text-green-950">{project.title}</span><br /><span className="text-gray-600">{project.location}</span></td>
                  <td className={tdClass}>{project.status}</td>
                  <td className={tdClass}>{project.moderation_status === 'HIDDEN' ? <>{badge('HIDDEN', 'red')}{project.moderation_reason && <p className="mt-1 text-xs text-gray-600">{project.moderation_reason}</p>}</> : badge('VISIBLE', 'green')}</td>
                  <td className={tdClass}>
                    {project.moderation_status === 'HIDDEN'
                      ? <button type="button" className={actionButton} onClick={() => restore('project', project.id, project.title)}>Restore</button>
                      : <button type="button" className={dangerButton} onClick={() => hide('project', project.id, project.title)}>Hide</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ListShell>
      </section>
    </div>
  );
};

const ReportsSection: React.FC<SectionProps> = ({ token, refreshKey, requestAction }) => {
  const [status, setStatus] = React.useState('OPEN');
  const [targetType, setTargetType] = React.useState('');
  const [page, setPage] = React.useState(1);
  const reports = useAdminList<AdminReport>(
    () => fetchAdminReports(token, { status: status || undefined, targetType: targetType || undefined, page: String(page), pageSize: '20' })
      .then((data) => ({ items: data.reports, pagination: data.pagination })),
    [token, status, targetType, page, refreshKey]
  );

  const changeStatus = (report: AdminReport, next: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED') => requestAction({
    title: `${next === 'UNDER_REVIEW' ? 'Start reviewing' : next === 'RESOLVED' ? 'Resolve' : 'Dismiss'} report`,
    description: `Report against ${report.target_type} (${report.reason}). Handling decisions are recorded in the audit trail.`,
    needsReason: next !== 'UNDER_REVIEW',
    reasonLabel: next !== 'UNDER_REVIEW' ? 'Resolution notes (required)' : 'Notes',
    needsConfirm: false,
    confirmLabel: '',
    actionLabel: 'Update report',
    run: async (text) => { await updateAdminReportStatus(token, report.id, next, text); }
  });

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Status
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="ml-2 rounded border border-green-300 px-2 py-1.5">
            <option value="">All</option><option value="OPEN">Open</option><option value="UNDER_REVIEW">Under review</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option>
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">Target
          <select value={targetType} onChange={(event) => { setTargetType(event.target.value); setPage(1); }} className="ml-2 rounded border border-green-300 px-2 py-1.5">
            <option value="">All</option><option value="LISTING">Listing</option><option value="PROJECT">Project</option><option value="NURSERY">Nursery</option><option value="USER">User</option>
          </select>
        </label>
      </div>
      <ListShell loading={reports.loading} error={reports.error} empty={reports.items.length === 0} emptyText="No reports match these filters." pagination={reports.pagination} page={page} onPage={setPage}>
        <table className={tableClass}>
          <thead><tr><th className={thClass}>Reported</th><th className={thClass}>Reason</th><th className={thClass}>Details</th><th className={thClass}>Status</th><th className={thClass}>Actions</th></tr></thead>
          <tbody>
            {reports.items.map((report) => (
              <tr key={report.id}>
                <td className={tdClass}>{report.target_type}<br /><span className="text-xs text-gray-500">{report.target_id}</span></td>
                <td className={tdClass}>{report.reason}</td>
                <td className={tdClass}>{report.details || '—'}{report.resolution_notes && <p className="mt-1 text-xs text-gray-600">Resolution: {report.resolution_notes}</p>}</td>
                <td className={tdClass}>{report.status === 'OPEN' ? badge('OPEN', 'amber') : report.status === 'UNDER_REVIEW' ? badge('UNDER REVIEW', 'amber') : badge(report.status, 'gray')}</td>
                <td className={tdClass}>
                  <div className="flex flex-wrap gap-2">
                    {report.status === 'OPEN' && <button type="button" className={actionButton} onClick={() => changeStatus(report, 'UNDER_REVIEW')}>Review</button>}
                    {(report.status === 'OPEN' || report.status === 'UNDER_REVIEW') && <>
                      <button type="button" className={actionButton} onClick={() => changeStatus(report, 'RESOLVED')}>Resolve</button>
                      <button type="button" className={dangerButton} onClick={() => changeStatus(report, 'DISMISSED')}>Dismiss</button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListShell>
    </section>
  );
};

const AuditSection: React.FC<SectionProps> = ({ token, refreshKey }) => {
  const [action, setAction] = React.useState('');
  const [page, setPage] = React.useState(1);
  const entries = useAdminList<AuditEntry>(
    () => fetchAdminAuditLog(token, { action: action || undefined, page: String(page), pageSize: '20' })
      .then((data) => ({ items: data.entries, pagination: data.pagination })),
    [token, action, page, refreshKey]
  );

  const stateText = (state: Record<string, unknown> | null) =>
    state ? Object.entries(state).map(([key, value]) => `${key}: ${String(value)}`).join(', ') : '—';

  return (
    <section>
      <div className="mb-3">
        <label className="text-sm font-medium text-gray-700">Action
          <select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className="ml-2 rounded border border-green-300 px-2 py-1.5">
            <option value="">All actions</option>
            <option value="USER_VERIFICATION_CHANGED">User verification</option>
            <option value="NURSERY_VERIFICATION_CHANGED">Nursery verification</option>
            <option value="USER_SUSPENDED">User suspended</option>
            <option value="USER_REACTIVATED">User reactivated</option>
            <option value="LISTING_MODERATION_CHANGED">Listing moderation</option>
            <option value="PROJECT_MODERATION_CHANGED">Project moderation</option>
            <option value="REPORT_STATUS_CHANGED">Report status</option>
          </select>
        </label>
      </div>
      <ListShell loading={entries.loading} error={entries.error} empty={entries.items.length === 0} emptyText="No audit entries match this filter." pagination={entries.pagination} page={page} onPage={setPage}>
        <table className={tableClass}>
          <thead><tr><th className={thClass}>When</th><th className={thClass}>Admin</th><th className={thClass}>Action</th><th className={thClass}>Target</th><th className={thClass}>Change</th><th className={thClass}>Reason</th></tr></thead>
          <tbody>
            {entries.items.map((entry) => (
              <tr key={entry.id}>
                <td className={tdClass}>{new Date(entry.created_at).toLocaleString()}</td>
                <td className={tdClass}>{entry.actor_email || entry.actor_user_id}</td>
                <td className={tdClass}>{entry.action}</td>
                <td className={tdClass}>{entry.target_type}<br /><span className="text-xs text-gray-500">{entry.target_id}</span></td>
                <td className={tdClass}>{stateText(entry.previous_state)} → {stateText(entry.new_state)}</td>
                <td className={tdClass}>{entry.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListShell>
    </section>
  );
};

const tabs = [
  { key: 'verification', label: 'Verification' },
  { key: 'users', label: 'Users & suspension' },
  { key: 'moderation', label: 'Moderation' },
  { key: 'reports', label: 'Reports' },
  { key: 'audit', label: 'Audit history' }
] as const;

type TabKey = (typeof tabs)[number]['key'];

const AdminPage: React.FC<{ session: AuthSession }> = ({ session }) => {
  const [tab, setTab] = React.useState<TabKey>('verification');
  const [pending, setPending] = React.useState<PendingAction | null>(null);
  const [pendingText, setPendingText] = React.useState('');
  const [pendingConfirm, setPendingConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const [actionError, setActionError] = React.useState('');
  const [refreshKey, setRefreshKey] = React.useState(0);

  const requestAction = (action: PendingAction) => {
    setPending(action);
    setPendingText('');
    setPendingConfirm(false);
    setActionError('');
    setNotice('');
  };

  const runPending = async () => {
    if (!pending) return;
    setBusy(true);
    setActionError('');
    try {
      await pending.run(pendingText.trim());
      setNotice(`${pending.title} — done. The action was recorded in the audit trail.`);
      setPending(null);
      setRefreshKey((current) => current + 1);
    } catch (requestError: unknown) {
      setActionError(requestError instanceof Error ? requestError.message : 'The action could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const pendingValid = pending
    && (!pending.needsReason || pendingText.trim().length >= 3)
    && (!pending.needsConfirm || pendingConfirm);

  const sectionProps: SectionProps = { token: session.token, refreshKey, requestAction };

  return (
    <section className="py-8 md:py-12">
      <header className="mb-8 border-b border-green-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Administration</p>
        <h1 className="mt-2 text-3xl font-bold text-green-950">Admin operations</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Verification decisions, account suspension, content moderation, reported content, and the audit
          trail. Verification is only ever granted by an explicit admin decision here — never automatically —
          and every action on this page is recorded with the acting admin.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Admin sections">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`rounded px-4 py-2 text-sm font-semibold ${tab === item.key ? 'bg-green-800 text-white' : 'border border-green-800 text-green-900 hover:bg-green-50'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && <div className="mb-6 border-l-4 border-green-700 bg-green-50 p-4 text-green-900" role="status">{notice}</div>}

      {pending && (
        <div className="mb-8 border border-green-300 bg-white p-5" role="dialog" aria-label={pending.title}>
          <h2 className="text-lg font-semibold text-green-950">{pending.title}</h2>
          <p className="mt-1 text-sm text-gray-600">{pending.description}</p>
          <label className="mt-4 block text-sm font-medium text-gray-700">
            {pending.reasonLabel}
            <textarea
              value={pendingText}
              onChange={(event) => setPendingText(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-green-300 px-3 py-2"
              placeholder={pending.needsReason ? 'Required, at least 3 characters' : 'Optional'}
            />
          </label>
          {pending.needsConfirm && (
            <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={pendingConfirm} onChange={(event) => setPendingConfirm(event.target.checked)} className="mt-0.5" />
              <span>{pending.confirmLabel}</span>
            </label>
          )}
          {actionError && <div className="mt-3 border-l-4 border-red-700 bg-red-50 p-3 text-sm text-red-900" role="alert">{actionError}</div>}
          <div className="mt-4 flex gap-3">
            <button type="button" disabled={!pendingValid || busy} onClick={runPending} className="rounded bg-green-800 px-4 py-2 font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? 'Working...' : pending.actionLabel}
            </button>
            <button type="button" disabled={busy} onClick={() => setPending(null)} className="rounded border border-green-800 px-4 py-2 font-semibold text-green-900 hover:bg-green-50">Cancel</button>
          </div>
        </div>
      )}

      {tab === 'verification' && <VerificationSection {...sectionProps} />}
      {tab === 'users' && <UsersSection {...sectionProps} />}
      {tab === 'moderation' && <ModerationSection {...sectionProps} />}
      {tab === 'reports' && <ReportsSection {...sectionProps} />}
      {tab === 'audit' && <AuditSection {...sectionProps} />}
    </section>
  );
};

export default AdminPage;
