create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  lot_id text,
  game text not null check (game in ('Pokemon', 'One Piece', 'Other')),
  product_type text not null check (product_type in ('Raw Single', 'Slab', 'Sealed', 'Bulk', 'Accessory')),
  name text not null,
  subject text,
  year text,
  set_name text,
  variation text,
  card_number text,
  condition text not null,
  grading_company text,
  grade text,
  cert_number text,
  population integer,
  qty_acquired numeric(12, 2) not null default 1 check (qty_acquired >= 0),
  base_unit_cost numeric(12, 2) not null default 0 check (base_unit_cost >= 0),
  manual_market_value numeric(12, 2) not null default 0 check (manual_market_value >= 0),
  market_value_date date not null default current_date,
  status text not null default 'Active' check (status in ('Active', 'Sold Out', 'Grading', 'Staged')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, item_id)
);

create unique index if not exists inventory_items_owner_cert_unique
on public.inventory_items (owner_id, cert_number)
where cert_number is not null and cert_number <> '';

create table if not exists public.purchase_lots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lot_id text not null,
  purchase_date date not null,
  seller text not null,
  source text not null,
  total_paid numeric(12, 2) not null default 0 check (total_paid >= 0),
  tax numeric(12, 2) not null default 0 check (tax >= 0),
  shipping numeric(12, 2) not null default 0 check (shipping >= 0),
  allocated_cost numeric(12, 2) not null default 0 check (allocated_cost >= 0),
  payment_method text not null default 'Cash',
  notes text,
  created_at timestamptz not null default now(),
  unique (owner_id, lot_id)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sale_date date not null,
  channel text not null,
  item_id text not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  gross_sale numeric(12, 2) not null default 0 check (gross_sale >= 0),
  shipping_charged numeric(12, 2) not null default 0 check (shipping_charged >= 0),
  fee_rate numeric(8, 6) not null default 0 check (fee_rate >= 0),
  fee_flat numeric(12, 2) not null default 0 check (fee_flat >= 0),
  fees_override numeric(12, 2) check (fees_override is null or fees_override >= 0),
  shipping_cost numeric(12, 2) not null default 0 check (shipping_cost >= 0),
  supplies_cost numeric(12, 2) not null default 0 check (supplies_cost >= 0),
  status text not null default 'Paid' check (status in ('Draft', 'Paid', 'Shipped', 'Delivered', 'Returned', 'Cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.grading_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  submission_id text not null,
  item_id text not null,
  company text not null,
  submission_date date not null,
  returned_date date,
  grading_fee numeric(12, 2) not null default 0 check (grading_fee >= 0),
  shipping_fee numeric(12, 2) not null default 0 check (shipping_fee >= 0),
  grade_result text,
  cert_number text,
  status text not null default 'Preparing' check (status in ('Preparing', 'Submitted', 'Grading', 'Returned', 'Complete')),
  notes text,
  created_at timestamptz not null default now(),
  unique (owner_id, submission_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  expense_date date not null,
  category text not null check (category in ('Supplies', 'Booth Fees', 'Mileage', 'Software', 'Storage', 'Insurance', 'Memberships', 'Other')),
  vendor text not null,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  payment_method text not null default 'Credit Card',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.fee_presets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  fee_rate numeric(8, 6) not null default 0 check (fee_rate >= 0),
  fee_flat numeric(12, 2) not null default 0 check (fee_flat >= 0),
  notes text,
  unique (owner_id, channel)
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  file_name text not null,
  row_count integer not null default 0 check (row_count >= 0),
  imported_at timestamptz not null default now(),
  notes text
);

create index if not exists inventory_items_owner_status_idx on public.inventory_items (owner_id, status);
create index if not exists inventory_items_owner_game_idx on public.inventory_items (owner_id, game);
create index if not exists sales_owner_item_idx on public.sales (owner_id, item_id);
create index if not exists sales_owner_date_idx on public.sales (owner_id, sale_date);
create index if not exists purchases_owner_date_idx on public.purchase_lots (owner_id, purchase_date);
create index if not exists grading_owner_item_idx on public.grading_submissions (owner_id, item_id);
create index if not exists expenses_owner_date_idx on public.expenses (owner_id, expense_date);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at before update on public.inventory_items
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  insert into public.fee_presets (owner_id, channel, fee_rate, fee_flat, notes)
  values
    (new.id, 'eBay', 0.1325, 0.40, 'Default trading card estimate.'),
    (new.id, 'Whatnot', 0.1100, 0.30, 'Marketplace and payment estimate.'),
    (new.id, 'Card Show', 0.0000, 0.00, 'Cash sale preset.')
  on conflict (owner_id, channel) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;
alter table public.purchase_lots enable row level security;
alter table public.sales enable row level security;
alter table public.grading_submissions enable row level security;
alter table public.expenses enable row level security;
alter table public.fee_presets enable row level security;
alter table public.import_batches enable row level security;

create policy "profiles owner select" on public.profiles for select using (auth.uid() = id);
create policy "profiles owner insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles owner update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "inventory owner select" on public.inventory_items for select using (auth.uid() = owner_id);
create policy "inventory owner insert" on public.inventory_items for insert with check (auth.uid() = owner_id);
create policy "inventory owner update" on public.inventory_items for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "inventory owner delete" on public.inventory_items for delete using (auth.uid() = owner_id);

create policy "purchase owner select" on public.purchase_lots for select using (auth.uid() = owner_id);
create policy "purchase owner insert" on public.purchase_lots for insert with check (auth.uid() = owner_id);
create policy "purchase owner update" on public.purchase_lots for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "purchase owner delete" on public.purchase_lots for delete using (auth.uid() = owner_id);

create policy "sales owner select" on public.sales for select using (auth.uid() = owner_id);
create policy "sales owner insert" on public.sales for insert with check (auth.uid() = owner_id);
create policy "sales owner update" on public.sales for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "sales owner delete" on public.sales for delete using (auth.uid() = owner_id);

create policy "grading owner select" on public.grading_submissions for select using (auth.uid() = owner_id);
create policy "grading owner insert" on public.grading_submissions for insert with check (auth.uid() = owner_id);
create policy "grading owner update" on public.grading_submissions for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "grading owner delete" on public.grading_submissions for delete using (auth.uid() = owner_id);

create policy "expenses owner select" on public.expenses for select using (auth.uid() = owner_id);
create policy "expenses owner insert" on public.expenses for insert with check (auth.uid() = owner_id);
create policy "expenses owner update" on public.expenses for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "expenses owner delete" on public.expenses for delete using (auth.uid() = owner_id);

create policy "fee presets owner select" on public.fee_presets for select using (auth.uid() = owner_id);
create policy "fee presets owner insert" on public.fee_presets for insert with check (auth.uid() = owner_id);
create policy "fee presets owner update" on public.fee_presets for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "fee presets owner delete" on public.fee_presets for delete using (auth.uid() = owner_id);

create policy "imports owner select" on public.import_batches for select using (auth.uid() = owner_id);
create policy "imports owner insert" on public.import_batches for insert with check (auth.uid() = owner_id);
create policy "imports owner update" on public.import_batches for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "imports owner delete" on public.import_batches for delete using (auth.uid() = owner_id);

create or replace view public.inventory_rollup
with (security_invoker = true)
as
select
  i.*,
  coalesce(s.qty_sold, 0) as qty_sold,
  i.qty_acquired - coalesce(s.qty_sold, 0) as qty_on_hand,
  coalesce(g.grading_total_cost, 0) as grading_total_cost,
  i.base_unit_cost + coalesce(g.grading_total_cost, 0) / greatest(i.qty_acquired, 1) as landed_unit_cost,
  (i.qty_acquired - coalesce(s.qty_sold, 0)) * i.manual_market_value as market_value_on_hand,
  (i.qty_acquired - coalesce(s.qty_sold, 0)) * (i.base_unit_cost + coalesce(g.grading_total_cost, 0) / greatest(i.qty_acquired, 1)) as inventory_cost_on_hand,
  ((i.qty_acquired - coalesce(s.qty_sold, 0)) * i.manual_market_value)
    - ((i.qty_acquired - coalesce(s.qty_sold, 0)) * (i.base_unit_cost + coalesce(g.grading_total_cost, 0) / greatest(i.qty_acquired, 1))) as unrealized_pl
from public.inventory_items i
left join (
  select owner_id, item_id, sum(quantity) as qty_sold
  from public.sales
  where status not in ('Cancelled', 'Returned')
  group by owner_id, item_id
) s on s.owner_id = i.owner_id and s.item_id = i.item_id
left join (
  select owner_id, item_id, sum(grading_fee + shipping_fee) as grading_total_cost
  from public.grading_submissions
  group by owner_id, item_id
) g on g.owner_id = i.owner_id and g.item_id = i.item_id;

create or replace view public.dashboard_summary
with (security_invoker = true)
as
select
  owner_id,
  coalesce(sum(inventory_cost_on_hand), 0) as inventory_cost,
  coalesce(sum(market_value_on_hand), 0) as market_value,
  coalesce(sum(unrealized_pl), 0) as unrealized_pl,
  coalesce(sum(qty_on_hand), 0) as units_on_hand,
  count(*) filter (where market_value_date < current_date - interval '30 days') as stale_pricing_rows
from public.inventory_rollup
group by owner_id;
