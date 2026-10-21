-- Phase 4: quotation requests, supplier quotations, and basic orders.
-- A quote request is NOT an accepted order. An order is created only when a
-- buyer accepts a quotation, and its commercial terms are immutable snapshots.
-- No payment processing or payment state is represented anywhere in this schema.

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null,
  listing_id uuid not null references public.plant_listings(id) on delete restrict,
  nursery_user_id uuid not null references public.nurseries(user_id) on delete cascade,
  quantity integer not null check (quantity > 0),
  delivery_area text not null,
  delivery_date date not null,
  notes text,
  status text not null default 'PENDING' check (status in ('PENDING', 'QUOTED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED')),
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One idempotency key can be used only once per buyer, so retried or
-- double-submitted quote requests cannot create duplicates.
create unique index if not exists quote_requests_buyer_idempotency_key
  on public.quote_requests (buyer_user_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists quote_requests_buyer_idx
  on public.quote_requests (buyer_user_id, created_at desc);
create index if not exists quote_requests_nursery_idx
  on public.quote_requests (nursery_user_id, created_at desc);
create index if not exists quote_requests_listing_idx
  on public.quote_requests (listing_id);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null unique references public.quote_requests(id) on delete cascade,
  nursery_user_id uuid not null references public.nurseries(user_id) on delete cascade,
  unit_price numeric(12, 2) not null check (unit_price > 0),
  quantity integer not null check (quantity > 0),
  delivery_charge numeric(12, 2) not null default 0 check (delivery_charge >= 0),
  terms text,
  valid_until timestamptz not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotations_valid_until_check check (valid_until > created_at)
);

create index if not exists quotations_request_idx
  on public.quotations (quote_request_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null unique references public.quote_requests(id) on delete restrict,
  quotation_id uuid not null unique references public.quotations(id) on delete restrict,
  buyer_user_id uuid not null,
  nursery_user_id uuid not null references public.nurseries(user_id) on delete restrict,
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'FULFILLED', 'CANCELLED')),
  -- Immutable snapshots of the agreed commercial terms, copied from the
  -- accepted quotation at acceptance time. Later listing or quotation edits
  -- must not change these values (enforced by the trigger below).
  plant_name text not null,
  unit_price numeric(12, 2) not null check (unit_price > 0),
  quantity integer not null check (quantity > 0),
  delivery_charge numeric(12, 2) not null check (delivery_charge >= 0),
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  total numeric(14, 2) not null check (total >= 0),
  delivery_area text not null,
  delivery_date date not null,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_buyer_idx
  on public.orders (buyer_user_id, created_at desc);
create index if not exists orders_nursery_idx
  on public.orders (nursery_user_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  listing_id uuid references public.plant_listings(id) on delete restrict,
  plant_name text not null,
  species text,
  unit_price numeric(12, 2) not null check (unit_price > 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(14, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx
  on public.order_items (order_id);

-- Orders may change status (and updated_at) but never their agreed snapshots.
create or replace function public.prevent_order_snapshot_changes()
returns trigger
language plpgsql
as $$
begin
  if new.quote_request_id is distinct from old.quote_request_id
    or new.quotation_id is distinct from old.quotation_id
    or new.buyer_user_id is distinct from old.buyer_user_id
    or new.nursery_user_id is distinct from old.nursery_user_id
    or new.plant_name is distinct from old.plant_name
    or new.unit_price is distinct from old.unit_price
    or new.quantity is distinct from old.quantity
    or new.delivery_charge is distinct from old.delivery_charge
    or new.subtotal is distinct from old.subtotal
    or new.total is distinct from old.total
    or new.delivery_area is distinct from old.delivery_area
    or new.delivery_date is distinct from old.delivery_date
    or new.terms is distinct from old.terms then
    raise exception 'Order commercial snapshots are immutable.';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_prevent_snapshot_changes on public.orders;
create trigger orders_prevent_snapshot_changes
  before update on public.orders
  for each row execute function public.prevent_order_snapshot_changes();

alter table public.quote_requests enable row level security;
alter table public.quotations enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Quote participants can view quote requests"
  on public.quote_requests for select
  using (auth.uid() = buyer_user_id or auth.uid() = nursery_user_id);

create policy "Buyers can create their quote requests"
  on public.quote_requests for insert
  with check (auth.uid() = buyer_user_id);

create policy "Quote participants can view quotations"
  on public.quotations for select
  using (
    auth.uid() = nursery_user_id
    or exists (
      select 1 from public.quote_requests request
      where request.id = quote_request_id and request.buyer_user_id = auth.uid()
    )
  );

create policy "Nurseries can create quotations for their requests"
  on public.quotations for insert
  with check (auth.uid() = nursery_user_id);

create policy "Order participants can view orders"
  on public.orders for select
  using (auth.uid() = buyer_user_id or auth.uid() = nursery_user_id);

create policy "Order participants can view order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders ord
      where ord.id = order_id
        and (ord.buyer_user_id = auth.uid() or ord.nursery_user_id = auth.uid())
    )
  );
