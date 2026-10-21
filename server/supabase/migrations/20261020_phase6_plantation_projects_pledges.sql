-- Phase 6: plantation projects and donor/investor support interest.
-- Organizers publish plantation projects with plant requirements, a timeline,
-- an optional funding target, photos, and progress updates. Authenticated
-- users register support interest or pledges against a published project.
--
-- A pledge is an intention or commitment recorded for coordination only.
-- It is NOT a payment, and nothing in this schema represents money received:
-- there is deliberately no funds_received / paid / payment column anywhere.
-- Pledged amounts are intended support until a separate verified receipt
-- process exists (out of scope for the MVP, see AGENTS.md).

create table if not exists public.plantation_projects (
  id uuid primary key default gen_random_uuid(),
  organizer_user_id uuid not null,
  title text not null,
  description text not null,
  location text not null,
  start_date date not null,
  end_date date not null,
  tree_target integer not null check (tree_target > 0),
  -- Optional intended budget/funding target in PKR. It is a goal the
  -- organizer is seeking support toward, never a record of funds received.
  funding_target numeric(14, 2) check (funding_target is null or funding_target > 0),
  photo_urls text[] not null default '{}',
  contact_preference text not null default 'PLATFORM_ONLY'
    check (contact_preference in ('PLATFORM_ONLY', 'EMAIL', 'PHONE', 'EMAIL_AND_PHONE')),
  contact_details text,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'PUBLISHED', 'COMPLETED', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plantation_projects_timeline_check check (end_date >= start_date),
  constraint plantation_projects_contact_check check (
    contact_preference = 'PLATFORM_ONLY' or (contact_details is not null and length(trim(contact_details)) > 0)
  )
);

create index if not exists plantation_projects_organizer_idx
  on public.plantation_projects (organizer_user_id, created_at desc);
create index if not exists plantation_projects_discovery_idx
  on public.plantation_projects (status, start_date);

-- Plant-species/quantity requirements for a project. The service requires
-- at least one requirement and requires the quantities to sum to no more
-- than the project's tree target.
create table if not exists public.project_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.plantation_projects(id) on delete cascade,
  plant_name text not null,
  species text,
  quantity integer not null check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists project_requirements_project_idx
  on public.project_requirements (project_id, created_at);
create unique index if not exists project_requirements_unique_species
  on public.project_requirements (project_id, plant_name, coalesce(species, ''));

-- Organizer progress updates. trees_planted is a cumulative snapshot the
-- organizer reports at that point in time, not a verified impact claim.
create table if not exists public.project_progress_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.plantation_projects(id) on delete cascade,
  author_user_id uuid not null,
  title text not null,
  body text not null,
  trees_planted integer check (trees_planted is null or trees_planted >= 0),
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists project_progress_updates_project_idx
  on public.project_progress_updates (project_id, created_at desc);

-- Support-interest records / pledges. pledge_type says WHAT kind of support
-- is intended (money, trees/plants, materials, volunteer time, other) and
-- status says where that intention stands. Neither is a payment state, and
-- an amount here is an intended amount, never a received amount.
create table if not exists public.project_pledges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.plantation_projects(id) on delete cascade,
  supporter_user_id uuid not null,
  pledge_type text not null check (pledge_type in ('FUNDS', 'TREES', 'MATERIALS', 'VOLUNTEER_TIME', 'OTHER')),
  -- Intended amount in PKR for FUNDS pledges only. NOT money received.
  amount numeric(14, 2) check (amount is null or amount > 0),
  -- Intended quantity for TREES / MATERIALS pledges.
  quantity integer check (quantity is null or quantity > 0),
  description text,
  status text not null default 'PLEDGED' check (status in ('PLEDGED', 'CONFIRMED', 'WITHDRAWN', 'DECLINED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_pledges_shape_check check (
    (pledge_type = 'FUNDS' and amount is not null)
    or (pledge_type in ('TREES', 'MATERIALS') and quantity is not null)
    or (pledge_type in ('VOLUNTEER_TIME', 'OTHER') and description is not null and length(trim(description)) > 0)
  )
);

create index if not exists project_pledges_project_idx
  on public.project_pledges (project_id, created_at);
create index if not exists project_pledges_supporter_idx
  on public.project_pledges (supporter_user_id, created_at desc);

-- A supporter may hold only one live (PLEDGED or CONFIRMED) pledge of a
-- given type per project, so a double-submitted form cannot create
-- duplicate live pledges. After withdrawing (or being declined) the
-- supporter may pledge that type again.
create unique index if not exists project_pledges_one_live_per_type
  on public.project_pledges (project_id, supporter_user_id, pledge_type)
  where status in ('PLEDGED', 'CONFIRMED');

-- Audit-friendly history of every pledge status change. Rows are written
-- by the service alongside each transition (creation records
-- null -> PLEDGED).
create table if not exists public.project_pledge_events (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid not null references public.project_pledges(id) on delete cascade,
  project_id uuid not null references public.plantation_projects(id) on delete cascade,
  actor_user_id uuid not null,
  from_status text check (from_status in ('PLEDGED', 'CONFIRMED', 'WITHDRAWN', 'DECLINED')),
  to_status text not null check (to_status in ('PLEDGED', 'CONFIRMED', 'WITHDRAWN', 'DECLINED')),
  created_at timestamptz not null default now()
);

create index if not exists project_pledge_events_pledge_idx
  on public.project_pledge_events (pledge_id, created_at);

alter table public.plantation_projects enable row level security;
alter table public.project_requirements enable row level security;
alter table public.project_progress_updates enable row level security;
alter table public.project_pledges enable row level security;
alter table public.project_pledge_events enable row level security;

create policy "Public can view published plantation projects"
  on public.plantation_projects for select
  using (status in ('PUBLISHED', 'COMPLETED') or auth.uid() = organizer_user_id);

create policy "Organizers can create their plantation projects"
  on public.plantation_projects for insert
  with check (auth.uid() = organizer_user_id);

create policy "Organizers can update their plantation projects"
  on public.plantation_projects for update
  using (auth.uid() = organizer_user_id)
  with check (auth.uid() = organizer_user_id);

create policy "Project requirements follow project visibility"
  on public.project_requirements for select
  using (
    exists (
      select 1 from public.plantation_projects project
      where project.id = project_id
        and (project.status in ('PUBLISHED', 'COMPLETED') or project.organizer_user_id = auth.uid())
    )
  );

create policy "Progress updates follow project visibility"
  on public.project_progress_updates for select
  using (
    exists (
      select 1 from public.plantation_projects project
      where project.id = project_id
        and (project.status in ('PUBLISHED', 'COMPLETED') or project.organizer_user_id = auth.uid())
    )
  );

-- Pledges are private records: only the supporter who made the pledge and
-- the organizer of the project it belongs to may read them.
create policy "Pledge participants can view pledges"
  on public.project_pledges for select
  using (
    auth.uid() = supporter_user_id
    or exists (
      select 1 from public.plantation_projects project
      where project.id = project_id and project.organizer_user_id = auth.uid()
    )
  );

create policy "Supporters can create their pledges"
  on public.project_pledges for insert
  with check (auth.uid() = supporter_user_id);

create policy "Pledge participants can view pledge events"
  on public.project_pledge_events for select
  using (
    auth.uid() = actor_user_id
    or exists (
      select 1 from public.plantation_projects project
      where project.id = project_id and project.organizer_user_id = auth.uid()
    )
    or exists (
      select 1 from public.project_pledges pledge
      where pledge.id = pledge_id and pledge.supporter_user_id = auth.uid()
    )
  );
