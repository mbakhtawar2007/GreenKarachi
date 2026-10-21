-- Phase 5: nursery-to-nursery supply-gap collaboration (core differentiator).
-- A supply-gap request records how many plants a nursery needs in total, how
-- many it already has, and the derived gap. Other nurseries submit offers
-- against the gap. Only ACCEPTED offers count as committed supply, and an
-- accepted offer is a supply commitment, NOT proof of delivery. No payment
-- processing or payment state is represented anywhere in this schema.

create table if not exists public.supply_gap_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null,
  requester_nursery_user_id uuid not null references public.nurseries(user_id) on delete cascade,
  plant_name text not null,
  species text,
  total_required integer not null check (total_required > 0),
  stock_available integer not null check (stock_available >= 0),
  -- Derived on the server as max(0, total_required - stock_available) and
  -- kept consistent by the check constraint below.
  quantity_needed integer not null check (quantity_needed >= 0),
  -- Running total of ACCEPTED offer quantities. It changes only through the
  -- service's compare-and-swap conditional update (see
  -- server/src/services/collaboration.service.ts), and this constraint is
  -- the database backstop: committed supply can never exceed the gap.
  committed_quantity integer not null default 0 check (committed_quantity >= 0),
  requirements text,
  needed_by date not null,
  area text not null,
  notes text,
  status text not null default 'OPEN' check (status in ('OPEN', 'FULFILLED', 'CLOSED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supply_gap_requests_needed_check check (
    quantity_needed = case
      when total_required > stock_available then total_required - stock_available
      else 0
    end
  ),
  constraint supply_gap_requests_committed_check check (committed_quantity <= quantity_needed)
);

create index if not exists supply_gap_requests_requester_idx
  on public.supply_gap_requests (requester_user_id, created_at desc);
create index if not exists supply_gap_requests_open_idx
  on public.supply_gap_requests (status, needed_by);

create table if not exists public.supply_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.supply_gap_requests(id) on delete cascade,
  supplier_user_id uuid not null,
  supplier_nursery_user_id uuid not null references public.nurseries(user_id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price > 0),
  availability_condition text not null,
  delivery_arrangement text not null,
  notes text,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supply_offers_request_idx
  on public.supply_offers (request_id, created_at);
create index if not exists supply_offers_supplier_idx
  on public.supply_offers (supplier_user_id, created_at desc);

-- A supplier may hold only one PENDING offer per request at a time, so a
-- double-submitted form cannot create duplicate live offers. After a
-- rejection or withdrawal the supplier may offer again.
create unique index if not exists supply_offers_one_pending_per_supplier
  on public.supply_offers (request_id, supplier_user_id)
  where status = 'PENDING';

-- Audit-friendly history of every offer status change. Rows are written by
-- the service alongside each transition (creation records null -> PENDING).
create table if not exists public.supply_offer_events (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.supply_offers(id) on delete cascade,
  request_id uuid not null references public.supply_gap_requests(id) on delete cascade,
  actor_user_id uuid not null,
  from_status text check (from_status in ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')),
  to_status text not null check (to_status in ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')),
  created_at timestamptz not null default now()
);

create index if not exists supply_offer_events_offer_idx
  on public.supply_offer_events (offer_id, created_at);

alter table public.supply_gap_requests enable row level security;
alter table public.supply_offers enable row level security;
alter table public.supply_offer_events enable row level security;

create policy "Requesters and suppliers can view supply gap requests"
  on public.supply_gap_requests for select
  using (
    auth.uid() = requester_user_id
    or status = 'OPEN'
    or exists (
      select 1 from public.supply_offers offer
      where offer.request_id = id and offer.supplier_user_id = auth.uid()
    )
  );

create policy "Nurseries can create their supply gap requests"
  on public.supply_gap_requests for insert
  with check (auth.uid() = requester_user_id);

create policy "Supply participants can view offers"
  on public.supply_offers for select
  using (
    auth.uid() = supplier_user_id
    or exists (
      select 1 from public.supply_gap_requests request
      where request.id = request_id and request.requester_user_id = auth.uid()
    )
  );

create policy "Suppliers can create their offers"
  on public.supply_offers for insert
  with check (auth.uid() = supplier_user_id);

create policy "Supply participants can view offer events"
  on public.supply_offer_events for select
  using (
    auth.uid() = actor_user_id
    or exists (
      select 1 from public.supply_gap_requests request
      where request.id = request_id and request.requester_user_id = auth.uid()
    )
    or exists (
      select 1 from public.supply_offers offer
      where offer.id = offer_id and offer.supplier_user_id = auth.uid()
    )
  );
