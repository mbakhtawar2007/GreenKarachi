create unique index if not exists nurseries_user_id_key
  on public.nurseries (user_id);

create table if not exists public.plant_listings (
  id uuid primary key default gen_random_uuid(),
  nursery_user_id uuid not null references public.nurseries(user_id) on delete cascade,
  name text not null,
  species text,
  category text not null,
  description text,
  image_urls text[] not null default '{}',
  height text,
  unit_price numeric(12, 2) not null check (unit_price > 0),
  available_quantity integer not null check (available_quantity >= 0),
  minimum_order_quantity integer not null check (minimum_order_quantity > 0),
  service_area text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plant_listings_quantity_status_check check (
    status = 'ARCHIVED' or
    (status = 'OUT_OF_STOCK' and available_quantity = 0) or
    (status = 'ACTIVE' and available_quantity > 0)
  )
);

create index if not exists plant_listings_public_search_idx
  on public.plant_listings (status, category, unit_price, available_quantity);
create index if not exists plant_listings_owner_updated_idx
  on public.plant_listings (nursery_user_id, updated_at desc);

alter table public.plant_listings enable row level security;

create policy "Public can view active plant listings"
  on public.plant_listings for select
  using (status = 'ACTIVE' or auth.uid() = nursery_user_id);

create policy "Nursery owners can create their listings"
  on public.plant_listings for insert
  with check (auth.uid() = nursery_user_id);

create policy "Nursery owners can update their listings"
  on public.plant_listings for update
  using (auth.uid() = nursery_user_id)
  with check (auth.uid() = nursery_user_id);