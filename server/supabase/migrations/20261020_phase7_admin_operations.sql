-- Phase 7: admin operations, verification, moderation, and audit trail.
-- Admins verify users and nurseries by explicit decision, moderate
-- listings and projects, handle reported content, and suspend accounts.
-- Every admin action is written to public.admin_audit_log by the service.
--
-- Verification is NEVER automatic: nothing in this migration (or in any
-- profile/listing form) sets a verification state. Only the admin service,
-- calling the admin-only endpoints after an explicit admin decision,
-- writes verification_status / is_verified / verified_by / verified_at.
-- If document references are ever stored for verification, they belong in
-- private columns/records like the ones below and must never be selected
-- into public API responses.

-- ---------------------------------------------------------------------------
-- Nursery verification bookkeeping (the nurseries table already carries
-- verification_status and is_verified from Phase 2). Record WHO decided and
-- WHEN, plus the admin's notes, alongside the existing state columns.
-- ---------------------------------------------------------------------------

alter table public.nurseries
  add column if not exists verified_by uuid,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_notes text;

-- ---------------------------------------------------------------------------
-- Per-account state for platform users (Supabase Auth users). A missing row
-- means the defaults: verification PENDING and not suspended. Rows are
-- created by admin actions (verification decision, suspension) and by
-- nothing else. Suspension is additionally enforced at login time by the
-- auth service.
-- ---------------------------------------------------------------------------

create table if not exists public.user_account_states (
  user_id uuid primary key,
  verification_status text not null default 'PENDING'
    check (verification_status in ('PENDING', 'APPROVED', 'REJECTED')),
  verification_notes text,
  verified_by uuid,
  verified_at timestamptz,
  -- Optional private reference to verification material an admin reviewed
  -- (for example a storage path). Never a public URL, never selected into
  -- public responses.
  verification_document_ref text,
  is_suspended boolean not null default false,
  suspended_by uuid,
  suspended_at timestamptz,
  suspension_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_account_states_suspension_check check (
    (is_suspended and suspended_at is not null)
    or (not is_suspended and suspended_at is null and suspension_reason is null)
  )
);

create index if not exists user_account_states_verification_idx
  on public.user_account_states (verification_status);
create index if not exists user_account_states_suspended_idx
  on public.user_account_states (is_suspended)
  where is_suspended;

-- ---------------------------------------------------------------------------
-- Content moderation for listings and projects. moderation_status is kept
-- separate from the owner-controlled status so an admin takedown is
-- reversible without guessing the owner's previous status: restoring sets
-- moderation_status back to VISIBLE and the original status is untouched.
-- Public API queries must require moderation_status = 'VISIBLE' in
-- addition to the existing public status checks.
-- ---------------------------------------------------------------------------

alter table public.plant_listings
  add column if not exists moderation_status text not null default 'VISIBLE'
    check (moderation_status in ('VISIBLE', 'HIDDEN')),
  add column if not exists moderated_by uuid,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderation_reason text;

alter table public.plantation_projects
  add column if not exists moderation_status text not null default 'VISIBLE'
    check (moderation_status in ('VISIBLE', 'HIDDEN')),
  add column if not exists moderated_by uuid,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderation_reason text;

create index if not exists plant_listings_moderation_idx
  on public.plant_listings (moderation_status, status);
create index if not exists plantation_projects_moderation_idx
  on public.plantation_projects (moderation_status, status);

-- Tighten the public RLS policies so a moderated (hidden) row is not
-- publicly readable even outside the API query filters.
drop policy if exists "Public can view active plant listings" on public.plant_listings;
create policy "Public can view active plant listings"
  on public.plant_listings for select
  using (
    (status = 'ACTIVE' and moderation_status = 'VISIBLE')
    or auth.uid() = nursery_user_id
  );

drop policy if exists "Public can view published plantation projects" on public.plantation_projects;
create policy "Public can view published plantation projects"
  on public.plantation_projects for select
  using (
    (status in ('PUBLISHED', 'COMPLETED') and moderation_status = 'VISIBLE')
    or auth.uid() = organizer_user_id
  );

-- ---------------------------------------------------------------------------
-- Reported content. Any authenticated user can file a report; only admins
-- can move it through the handling workflow. The reporter can always read
-- back their own reports (status only matters to them).
-- ---------------------------------------------------------------------------

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null,
  target_type text not null check (target_type in ('LISTING', 'PROJECT', 'NURSERY', 'USER')),
  -- The id of the reported row (listing/project id, or the nursery's /
  -- user's auth user id for NURSERY and USER reports).
  target_id uuid not null,
  reason text not null check (reason in ('SPAM', 'FRAUD', 'INAPPROPRIATE', 'INCORRECT_INFORMATION', 'SAFETY', 'OTHER')),
  details text,
  status text not null default 'OPEN'
    check (status in ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
  resolved_by uuid,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_reports_queue_idx
  on public.content_reports (status, created_at);
create index if not exists content_reports_target_idx
  on public.content_reports (target_type, target_id);
create index if not exists content_reports_reporter_idx
  on public.content_reports (reporter_user_id, created_at desc);

-- One live report per reporter per target, so a double-submitted form (or
-- a script) cannot flood the admin queue with duplicates. Once a report is
-- resolved or dismissed the same reporter may report the target again.
create unique index if not exists content_reports_one_live_per_reporter_target
  on public.content_reports (reporter_user_id, target_type, target_id)
  where status in ('OPEN', 'UNDER_REVIEW');

-- ---------------------------------------------------------------------------
-- Audit trail for sensitive administrative and business status changes.
-- One row per admin action, written by the service alongside the action:
-- actor, action, target, and the previous/new state needed to reconstruct
-- what changed. Reasons are required at the service layer for destructive
-- or high-impact actions (suspension, rejection, takedown).
-- ---------------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_email text,
  action text not null check (action in (
    'USER_VERIFICATION_CHANGED',
    'NURSERY_VERIFICATION_CHANGED',
    'USER_SUSPENDED',
    'USER_REACTIVATED',
    'LISTING_MODERATION_CHANGED',
    'PROJECT_MODERATION_CHANGED',
    'REPORT_STATUS_CHANGED'
  )),
  target_type text not null check (target_type in ('USER', 'NURSERY', 'LISTING', 'PROJECT', 'REPORT')),
  target_id text not null,
  target_user_id uuid,
  previous_state jsonb,
  new_state jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_user_id, created_at desc);
create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security. The admin/report tables are only ever accessed by
-- the API server with the service-role key (which bypasses RLS), after the
-- server has enforced ADMIN role / reporter ownership. Enabling RLS with
-- no permissive policies denies direct anon/authenticated access, so
-- private records (verification notes, suspension reasons, report
-- details, audit history) are not publicly accessible.
-- ---------------------------------------------------------------------------

alter table public.user_account_states enable row level security;
alter table public.content_reports enable row level security;
alter table public.admin_audit_log enable row level security;
