
-- =====================================================================
-- NOVA PRO :: PRODUCTION SCHEMA
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- Enums ----------
do $$ begin
  create type public.app_role as enum ('admin','farmer','supplier','buyer','exporter','importer','investor');
exception when duplicate_object then null; end $$;

do $$ begin create type public.company_type as enum ('exporter','importer','buyer','supplier','farm','logistics','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_status  as enum ('draft','pending','confirmed','shipped','delivered','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.shipment_mode as enum ('sea','air','land','multimodal'); exception when duplicate_object then null; end $$;
do $$ begin create type public.shipment_status as enum ('preparing','in_transit','customs','delivered','delayed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.invoice_status as enum ('draft','sent','paid','overdue','void'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('pending','processing','succeeded','failed','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_method as enum ('wire','card','ach','crypto','letter_of_credit','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.contract_status as enum ('draft','active','completed','terminated'); exception when duplicate_object then null; end $$;
do $$ begin create type public.notification_kind as enum ('system','order','shipment','invoice','message','ai','weather','market'); exception when duplicate_object then null; end $$;
do $$ begin create type public.ai_role as enum ('user','assistant','system','tool'); exception when duplicate_object then null; end $$;

-- ---------- Shared helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- Roles / Permissions ----------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
create index if not exists idx_user_roles_user on public.user_roles(user_id);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin')
$$;

create policy "user_roles read own" on public.user_roles for select
  to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "user_roles admin write" on public.user_roles for all
  to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Permission catalog (informational; enforcement is via app_role + policies)
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text
);
create table if not exists public.role_permissions (
  role public.app_role not null,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key(role, permission_id)
);
grant select on public.permissions, public.role_permissions to authenticated;
grant all on public.permissions, public.role_permissions to service_role;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
create policy "perms read" on public.permissions for select to authenticated using (true);
create policy "perms admin write" on public.permissions for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "role_perms read" on public.role_permissions for select to authenticated using (true);
create policy "role_perms admin write" on public.role_permissions for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------- Organizations ----------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_org_owner on public.organizations(owner_id);
create trigger trg_org_updated before update on public.organizations for each row execute function public.set_updated_at();

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index if not exists idx_org_members_user on public.organization_members(user_id);

grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant all on public.organizations, public.organization_members to service_role;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create or replace function public.is_org_member(_org uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.organization_members where organization_id = _org and user_id = _user)
      or exists(select 1 from public.organizations where id = _org and owner_id = _user)
$$;

create policy "org read members" on public.organizations for select to authenticated
  using (owner_id = auth.uid() or public.is_org_member(id, auth.uid()) or public.is_admin(auth.uid()));
create policy "org insert own" on public.organizations for insert to authenticated with check (owner_id = auth.uid());
create policy "org update owner" on public.organizations for update to authenticated
  using (owner_id = auth.uid() or public.is_admin(auth.uid())) with check (owner_id = auth.uid() or public.is_admin(auth.uid()));
create policy "org delete owner" on public.organizations for delete to authenticated using (owner_id = auth.uid() or public.is_admin(auth.uid()));

create policy "org_members read" on public.organization_members for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "org_members owner write" on public.organization_members for all to authenticated
  using (exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()) or public.is_admin(auth.uid()))
  with check (exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()) or public.is_admin(auth.uid()));

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  locale text not null default 'en',
  default_organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles read own or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid())) with check (id = auth.uid() or public.is_admin(auth.uid()));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Companies ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique,
  type public.company_type not null default 'other',
  country text,
  city text,
  website text,
  email text,
  phone text,
  logo_url text,
  description text,
  verified boolean not null default false,
  rating numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  employees int check (employees is null or employees >= 0),
  founded int check (founded is null or founded between 1800 and extract(year from now())::int + 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_companies_owner on public.companies(owner_id);
create index if not exists idx_companies_org on public.companies(organization_id);
create index if not exists idx_companies_type on public.companies(type);
create index if not exists idx_companies_country on public.companies(country);
create index if not exists idx_companies_name_trgm on public.companies using gin (name gin_trgm_ops);
create trigger trg_companies_updated before update on public.companies for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;

create or replace function public.owns_company(_company uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.companies where id = _company and owner_id = _user)
$$;

create policy "companies read all auth" on public.companies for select to authenticated using (true);
create policy "companies insert own" on public.companies for insert to authenticated with check (owner_id = auth.uid());
create policy "companies update owner" on public.companies for update to authenticated
  using (owner_id = auth.uid() or public.is_admin(auth.uid())) with check (owner_id = auth.uid() or public.is_admin(auth.uid()));
create policy "companies delete owner" on public.companies for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin(auth.uid()));

-- ---------- Suppliers / Buyers (1-1 extension of companies) ----------
create table if not exists public.suppliers (
  company_id uuid primary key references public.companies(id) on delete cascade,
  category text,
  lead_time_days int check (lead_time_days is null or lead_time_days >= 0),
  monthly_capacity_mt numeric(14,2) check (monthly_capacity_mt is null or monthly_capacity_mt >= 0),
  certifications text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_suppliers_updated before update on public.suppliers for each row execute function public.set_updated_at();
create index if not exists idx_suppliers_category on public.suppliers(category);

create table if not exists public.buyers (
  company_id uuid primary key references public.companies(id) on delete cascade,
  category text,
  monthly_demand_usd numeric(14,2) check (monthly_demand_usd is null or monthly_demand_usd >= 0),
  preferred_incoterms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_buyers_updated before update on public.buyers for each row execute function public.set_updated_at();
create index if not exists idx_buyers_category on public.buyers(category);

grant select, insert, update, delete on public.suppliers, public.buyers to authenticated;
grant all on public.suppliers, public.buyers to service_role;
alter table public.suppliers enable row level security;
alter table public.buyers enable row level security;
create policy "suppliers read all auth" on public.suppliers for select to authenticated using (true);
create policy "suppliers write owner" on public.suppliers for all to authenticated
  using (public.owns_company(company_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.owns_company(company_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "buyers read all auth" on public.buyers for select to authenticated using (true);
create policy "buyers write owner" on public.buyers for all to authenticated
  using (public.owns_company(company_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.owns_company(company_id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------- Farms ----------
create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  country text,
  region text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  area_hectares numeric(12,2) check (area_hectares is null or area_hectares >= 0),
  crops text[] not null default '{}',
  certifications text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_farms_owner on public.farms(owner_id);
create index if not exists idx_farms_org on public.farms(organization_id);
create trigger trg_farms_updated before update on public.farms for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.farms to authenticated;
grant all on public.farms to service_role;
alter table public.farms enable row level security;
create policy "farms read own or admin" on public.farms for select to authenticated
  using (owner_id = auth.uid() or public.is_admin(auth.uid()));
create policy "farms write own" on public.farms for all to authenticated
  using (owner_id = auth.uid() or public.is_admin(auth.uid()))
  with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

-- ---------- Product categories ----------
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  slug text unique not null,
  icon text,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_categories_parent on public.product_categories(parent_id);
grant select on public.product_categories to authenticated, anon;
grant all on public.product_categories to service_role;
alter table public.product_categories enable row level security;
create policy "categories read all" on public.product_categories for select using (true);
create policy "categories admin write" on public.product_categories for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------- Products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  sku text,
  description text,
  origin_country text,
  unit text not null default 'MT',
  price_usd numeric(14,2) not null check (price_usd >= 0),
  moq numeric(14,2) not null default 1 check (moq >= 0),
  stock numeric(14,2) not null default 0 check (stock >= 0),
  images text[] not null default '{}',
  active boolean not null default true,
  search tsvector generated always as (
    to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(origin_country,''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_company_id, sku)
);
create index if not exists idx_products_supplier on public.products(supplier_company_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(active);
create index if not exists idx_products_price on public.products(price_usd);
create index if not exists idx_products_search on public.products using gin(search);
create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create trigger trg_products_updated before update on public.products for each row execute function public.set_updated_at();
grant select on public.products to authenticated, anon;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products read active" on public.products for select using (active or public.owns_company(supplier_company_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "products write owner" on public.products for all to authenticated
  using (public.owns_company(supplier_company_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.owns_company(supplier_company_id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------- Warehouses ----------
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text,
  country text,
  city text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  capacity_mt numeric(14,2) check (capacity_mt is null or capacity_mt >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_warehouses_company on public.warehouses(company_id);
create trigger trg_warehouses_updated before update on public.warehouses for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.warehouses to authenticated;
grant all on public.warehouses to service_role;
alter table public.warehouses enable row level security;
create policy "warehouses read owner" on public.warehouses for select to authenticated
  using (public.owns_company(company_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "warehouses write owner" on public.warehouses for all to authenticated
  using (public.owns_company(company_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.owns_company(company_id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------- Inventory ----------
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(14,2) not null default 0 check (quantity >= 0),
  reserved numeric(14,2) not null default 0 check (reserved >= 0),
  unit text not null default 'MT',
  updated_at timestamptz not null default now(),
  unique(warehouse_id, product_id)
);
create index if not exists idx_inventory_product on public.inventory(product_id);
create trigger trg_inventory_updated before update on public.inventory for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.inventory to authenticated;
grant all on public.inventory to service_role;
alter table public.inventory enable row level security;
create policy "inventory read owner" on public.inventory for select to authenticated
  using (exists(select 1 from public.warehouses w where w.id = warehouse_id and (public.owns_company(w.company_id, auth.uid()) or public.is_admin(auth.uid()))));
create policy "inventory write owner" on public.inventory for all to authenticated
  using (exists(select 1 from public.warehouses w where w.id = warehouse_id and (public.owns_company(w.company_id, auth.uid()) or public.is_admin(auth.uid()))))
  with check (exists(select 1 from public.warehouses w where w.id = warehouse_id and (public.owns_company(w.company_id, auth.uid()) or public.is_admin(auth.uid()))));

-- ---------- Orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('ORD-' || to_char(now(),'YYMM') || '-' || substr(gen_random_uuid()::text,1,6)),
  buyer_company_id uuid not null references public.companies(id) on delete restrict,
  supplier_company_id uuid not null references public.companies(id) on delete restrict,
  status public.order_status not null default 'draft',
  currency text not null default 'USD',
  total_usd numeric(14,2) not null default 0 check (total_usd >= 0),
  incoterms text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  eta date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_buyer on public.orders(buyer_company_id);
create index if not exists idx_orders_supplier on public.orders(supplier_company_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created on public.orders(created_at desc);
create trigger trg_orders_updated before update on public.orders for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  quantity numeric(14,2) not null check (quantity > 0),
  unit text not null default 'MT',
  unit_price_usd numeric(14,2) not null check (unit_price_usd >= 0),
  total_usd numeric(14,2) generated always as (quantity * unit_price_usd) stored
);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);

grant select, insert, update, delete on public.orders, public.order_items to authenticated;
grant all on public.orders, public.order_items to service_role;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.can_access_order(_order uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.orders o
    where o.id = _order
      and (public.owns_company(o.buyer_company_id, _user) or public.owns_company(o.supplier_company_id, _user))
  ) or public.is_admin(_user)
$$;

create policy "orders read parties" on public.orders for select to authenticated
  using (public.owns_company(buyer_company_id, auth.uid()) or public.owns_company(supplier_company_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "orders insert buyer" on public.orders for insert to authenticated
  with check (public.owns_company(buyer_company_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "orders update parties" on public.orders for update to authenticated
  using (public.owns_company(buyer_company_id, auth.uid()) or public.owns_company(supplier_company_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.owns_company(buyer_company_id, auth.uid()) or public.owns_company(supplier_company_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "orders delete buyer" on public.orders for delete to authenticated
  using (public.owns_company(buyer_company_id, auth.uid()) or public.is_admin(auth.uid()));

create policy "order_items read" on public.order_items for select to authenticated using (public.can_access_order(order_id, auth.uid()));
create policy "order_items write" on public.order_items for all to authenticated
  using (public.can_access_order(order_id, auth.uid())) with check (public.can_access_order(order_id, auth.uid()));

-- ---------- Shipments ----------
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  tracking_number text unique,
  mode public.shipment_mode not null default 'sea',
  carrier text,
  origin text,
  destination text,
  status public.shipment_status not null default 'preparing',
  eta date,
  actual_arrival date,
  progress int not null default 0 check (progress between 0 and 100),
  value_usd numeric(14,2) not null default 0 check (value_usd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_shipments_order on public.shipments(order_id);
create index if not exists idx_shipments_status on public.shipments(status);
create trigger trg_shipments_updated before update on public.shipments for each row execute function public.set_updated_at();

create table if not exists public.shipment_tracking (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status public.shipment_status not null,
  location text,
  note text,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_track_shipment on public.shipment_tracking(shipment_id, occurred_at desc);

grant select, insert, update, delete on public.shipments, public.shipment_tracking to authenticated;
grant all on public.shipments, public.shipment_tracking to service_role;
alter table public.shipments enable row level security;
alter table public.shipment_tracking enable row level security;

create policy "shipments access parties" on public.shipments for all to authenticated
  using (public.can_access_order(order_id, auth.uid()))
  with check (public.can_access_order(order_id, auth.uid()));
create policy "tracking access parties" on public.shipment_tracking for all to authenticated
  using (exists(select 1 from public.shipments s where s.id = shipment_id and public.can_access_order(s.order_id, auth.uid())))
  with check (exists(select 1 from public.shipments s where s.id = shipment_id and public.can_access_order(s.order_id, auth.uid())));

-- ---------- Invoices / Payments ----------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null default ('INV-' || to_char(now(),'YYYY') || '-' || substr(gen_random_uuid()::text,1,6)),
  order_id uuid references public.orders(id) on delete set null,
  buyer_company_id uuid not null references public.companies(id) on delete restrict,
  supplier_company_id uuid not null references public.companies(id) on delete restrict,
  amount_usd numeric(14,2) not null check (amount_usd >= 0),
  currency text not null default 'USD',
  status public.invoice_status not null default 'draft',
  issued_at date not null default current_date,
  due_at date,
  paid_at timestamptz,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_invoices_order on public.invoices(order_id);
create index if not exists idx_invoices_buyer on public.invoices(buyer_company_id);
create index if not exists idx_invoices_supplier on public.invoices(supplier_company_id);
create index if not exists idx_invoices_status on public.invoices(status);
create trigger trg_invoices_updated before update on public.invoices for each row execute function public.set_updated_at();

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount_usd numeric(14,2) not null check (amount_usd >= 0),
  currency text not null default 'USD',
  method public.payment_method not null default 'wire',
  status public.payment_status not null default 'pending',
  reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_payments_invoice on public.payments(invoice_id);
create index if not exists idx_payments_status on public.payments(status);

grant select, insert, update, delete on public.invoices, public.payments to authenticated;
grant all on public.invoices, public.payments to service_role;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

create policy "invoices access parties" on public.invoices for all to authenticated
  using (public.owns_company(buyer_company_id, auth.uid()) or public.owns_company(supplier_company_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.owns_company(buyer_company_id, auth.uid()) or public.owns_company(supplier_company_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "payments access parties" on public.payments for all to authenticated
  using (exists(select 1 from public.invoices i where i.id = invoice_id and (public.owns_company(i.buyer_company_id, auth.uid()) or public.owns_company(i.supplier_company_id, auth.uid()) or public.is_admin(auth.uid()))))
  with check (exists(select 1 from public.invoices i where i.id = invoice_id and (public.owns_company(i.buyer_company_id, auth.uid()) or public.owns_company(i.supplier_company_id, auth.uid()) or public.is_admin(auth.uid()))));

-- ---------- Contracts ----------
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  buyer_company_id uuid not null references public.companies(id) on delete restrict,
  supplier_company_id uuid not null references public.companies(id) on delete restrict,
  title text not null,
  status public.contract_status not null default 'draft',
  value_usd numeric(14,2) not null default 0 check (value_usd >= 0),
  start_date date,
  end_date date,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists idx_contracts_buyer on public.contracts(buyer_company_id);
create index if not exists idx_contracts_supplier on public.contracts(supplier_company_id);
create trigger trg_contracts_updated before update on public.contracts for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.contracts to authenticated;
grant all on public.contracts to service_role;
alter table public.contracts enable row level security;
create policy "contracts access parties" on public.contracts for all to authenticated
  using (public.owns_company(buyer_company_id, auth.uid()) or public.owns_company(supplier_company_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.owns_company(buyer_company_id, auth.uid()) or public.owns_company(supplier_company_id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------- Messages ----------
create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  subject text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.thread_participants (
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (thread_id, user_id)
);
create index if not exists idx_thread_participants_user on public.thread_participants(user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_thread on public.messages(thread_id, created_at desc);

grant select, insert, update, delete on public.message_threads, public.thread_participants, public.messages to authenticated;
grant all on public.message_threads, public.thread_participants, public.messages to service_role;
alter table public.message_threads enable row level security;
alter table public.thread_participants enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_thread_member(_thread uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.thread_participants where thread_id = _thread and user_id = _user)
$$;

create policy "threads read member" on public.message_threads for select to authenticated
  using (public.is_thread_member(id, auth.uid()) or created_by = auth.uid() or public.is_admin(auth.uid()));
create policy "threads insert own" on public.message_threads for insert to authenticated with check (created_by = auth.uid());
create policy "threads update creator" on public.message_threads for update to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()));
create policy "threads delete creator" on public.message_threads for delete to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()));

create policy "tp read self" on public.thread_participants for select to authenticated
  using (user_id = auth.uid() or public.is_thread_member(thread_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "tp manage by creator" on public.thread_participants for all to authenticated
  using (exists(select 1 from public.message_threads t where t.id = thread_id and (t.created_by = auth.uid() or public.is_admin(auth.uid()))))
  with check (exists(select 1 from public.message_threads t where t.id = thread_id and (t.created_by = auth.uid() or public.is_admin(auth.uid()))));

create policy "messages read member" on public.messages for select to authenticated
  using (public.is_thread_member(thread_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "messages insert member" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_thread_member(thread_id, auth.uid()));
create policy "messages update sender" on public.messages for update to authenticated
  using (sender_id = auth.uid() or public.is_admin(auth.uid()));
create policy "messages delete sender" on public.messages for delete to authenticated
  using (sender_id = auth.uid() or public.is_admin(auth.uid()));

-- ---------- Notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.notification_kind not null default 'system',
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id) where read_at is null;
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif read own" on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "notif update own" on public.notifications for update to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "notif delete own" on public.notifications for delete to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "notif insert admin" on public.notifications for insert to authenticated
  with check (public.is_admin(auth.uid()));

-- ---------- Weather records ----------
create table if not exists public.weather_records (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  recorded_at timestamptz not null default now(),
  temp_c numeric(5,2),
  humidity numeric(5,2),
  rain_mm numeric(6,2),
  wind_kph numeric(6,2),
  conditions text,
  source text
);
create index if not exists idx_weather_location_time on public.weather_records(location, recorded_at desc);
grant select on public.weather_records to authenticated, anon;
grant insert, update, delete on public.weather_records to authenticated;
grant all on public.weather_records to service_role;
alter table public.weather_records enable row level security;
create policy "weather read all" on public.weather_records for select using (true);
create policy "weather admin write" on public.weather_records for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------- Commodity prices ----------
create table if not exists public.commodity_prices (
  id uuid primary key default gen_random_uuid(),
  commodity text not null,
  market text,
  unit text not null default 'MT',
  price_usd numeric(14,4) not null check (price_usd >= 0),
  currency text not null default 'USD',
  recorded_at timestamptz not null default now(),
  source text
);
create index if not exists idx_prices_commodity_time on public.commodity_prices(commodity, recorded_at desc);
create index if not exists idx_prices_market on public.commodity_prices(market);
grant select on public.commodity_prices to authenticated, anon;
grant insert, update, delete on public.commodity_prices to authenticated;
grant all on public.commodity_prices to service_role;
alter table public.commodity_prices enable row level security;
create policy "prices read all" on public.commodity_prices for select using (true);
create policy "prices admin write" on public.commodity_prices for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------- AI conversations ----------
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ai_conv_user on public.ai_conversations(user_id, updated_at desc);
create trigger trg_ai_conv_updated before update on public.ai_conversations for each row execute function public.set_updated_at();

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role public.ai_role not null,
  content text not null,
  tokens int,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_msg_conv on public.ai_messages(conversation_id, created_at);

grant select, insert, update, delete on public.ai_conversations, public.ai_messages to authenticated;
grant all on public.ai_conversations, public.ai_messages to service_role;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
create policy "ai_conv own" on public.ai_conversations for all to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "ai_msg own" on public.ai_messages for all to authenticated
  using (exists(select 1 from public.ai_conversations c where c.id = conversation_id and (c.user_id = auth.uid() or public.is_admin(auth.uid()))))
  with check (exists(select 1 from public.ai_conversations c where c.id = conversation_id and (c.user_id = auth.uid() or public.is_admin(auth.uid()))));

-- ---------- Reports ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  name text not null,
  params jsonb not null default '{}'::jsonb,
  file_url text,
  generated_at timestamptz not null default now()
);
create index if not exists idx_reports_user on public.reports(user_id, generated_at desc);
grant select, insert, update, delete on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reports own" on public.reports for all to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ---------- Settings ----------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger trg_user_settings_updated before update on public.user_settings for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;
alter table public.user_settings enable row level security;
create policy "user_settings own" on public.user_settings for all to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger trg_org_settings_updated before update on public.organization_settings for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.organization_settings to authenticated;
grant all on public.organization_settings to service_role;
alter table public.organization_settings enable row level security;
create policy "org_settings members" on public.organization_settings for all to authenticated
  using (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_org_member(organization_id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------- Audit + Activity ----------
create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_entity on public.audit_logs(entity, entity_id);
create index if not exists idx_audit_actor_time on public.audit_logs(actor_id, created_at desc);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "audit admin read" on public.audit_logs for select to authenticated
  using (public.is_admin(auth.uid()));

create table if not exists public.user_activity (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_user_time on public.user_activity(user_id, created_at desc);
grant select, insert on public.user_activity to authenticated;
grant all on public.user_activity to service_role;
alter table public.user_activity enable row level security;
create policy "activity read own" on public.user_activity for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "activity insert own" on public.user_activity for insert to authenticated
  with check (user_id = auth.uid());

-- Generic audit trigger for key tables
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _action text := tg_op;
  _entity text := tg_table_name;
  _id text;
  _diff jsonb;
begin
  if tg_op = 'DELETE' then
    _id := (old.id)::text;
    _diff := to_jsonb(old);
  elsif tg_op = 'UPDATE' then
    _id := (new.id)::text;
    _diff := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));
  else
    _id := (new.id)::text;
    _diff := to_jsonb(new);
  end if;
  insert into public.audit_logs(actor_id, action, entity, entity_id, diff)
  values (auth.uid(), _action, _entity, _id, _diff);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['companies','products','orders','order_items','shipments','invoices','payments','contracts']
  loop
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$s;', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_trigger();', t);
  end loop;
end $$;

-- ---------- Seed permissions catalog ----------
insert into public.permissions(code, description) values
  ('view:analytics','View analytics dashboards'),
  ('view:reports','View and export reports'),
  ('manage:suppliers','Create/edit suppliers'),
  ('manage:buyers','Create/edit buyers'),
  ('manage:orders','Create/edit orders'),
  ('manage:invoices','Create/edit invoices'),
  ('manage:shipments','Create/edit shipments'),
  ('manage:settings','Change settings'),
  ('view:marketplace','Browse the marketplace'),
  ('manage:products','Create/edit products'),
  ('manage:farms','Create/edit farms'),
  ('manage:contracts','Create/edit contracts'),
  ('admin:users','Manage users and roles')
on conflict (code) do nothing;
