-- Galmee Coffee schema: farmers, grades, lots, purchases, advances and payments.
-- Grades are edited directly by managers; everything that moves money or coffee goes through RPCs (see cf_rpcs).

create table public.cf_grades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{1,6}$'),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  default_price numeric(12,2) not null check (default_price > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, code),
  unique (tenant_id, id)
);

create table public.cf_farmers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  farmer_no int not null check (farmer_no > 0),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  kebele text not null check (char_length(btrim(kebele)) between 2 and 80),
  phone text check (char_length(phone) <= 20),
  active boolean not null default true,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  unique (tenant_id, farmer_no),
  unique (tenant_id, id)
);
create index cf_farmers_name_idx on public.cf_farmers (tenant_id, name);
create index cf_farmers_kebele_idx on public.cf_farmers (tenant_id, kebele);
create index cf_farmers_created_by_idx on public.cf_farmers (created_by);

create table public.cf_lots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  grade_id uuid not null,
  lot_no int not null check (lot_no > 0),
  code text not null check (char_length(code) <= 12),
  status text not null default 'open' check (status in ('open','closed','dispatched')),
  opened_on date not null default ((now() at time zone 'Africa/Addis_Ababa')::date),
  closed_at timestamptz,
  dispatched_at timestamptz,
  dispatched_to text check (char_length(dispatched_to) <= 120),
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  unique (tenant_id, grade_id, lot_no),
  unique (tenant_id, code),
  unique (tenant_id, id),
  foreign key (tenant_id, grade_id) references public.cf_grades(tenant_id, id),
  check ((status = 'dispatched') = (dispatched_at is not null))
);
-- Purchases of a grade go into its one open lot.
create unique index cf_lots_one_open_uq on public.cf_lots (tenant_id, grade_id) where status = 'open';
create index cf_lots_status_idx on public.cf_lots (tenant_id, status);
create index cf_lots_created_by_idx on public.cf_lots (created_by);

create table public.cf_purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  farmer_id uuid not null,
  grade_id uuid not null,
  lot_id uuid not null,
  kg numeric(10,2) not null check (kg > 0 and kg <= 100000),
  price_per_kg numeric(12,2) not null check (price_per_kg > 0 and price_per_kg <= 100000),
  amount numeric(14,2) generated always as (round(kg * price_per_kg, 2)) stored,
  moisture_note text check (char_length(moisture_note) <= 120),
  purchased_on date not null default ((now() at time zone 'Africa/Addis_Ababa')::date),
  client_ref uuid,
  created_by uuid not null default auth.uid() references public.profiles(user_id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(user_id),
  void_reason text check (char_length(void_reason) <= 300),
  unique (tenant_id, client_ref),
  unique (tenant_id, id),
  foreign key (tenant_id, farmer_id) references public.cf_farmers(tenant_id, id),
  foreign key (tenant_id, grade_id) references public.cf_grades(tenant_id, id),
  foreign key (tenant_id, lot_id) references public.cf_lots(tenant_id, id),
  check ((voided_at is null) = (void_reason is null))
);
create index cf_purchases_day_idx on public.cf_purchases (tenant_id, purchased_on);
create index cf_purchases_farmer_idx on public.cf_purchases (tenant_id, farmer_id, purchased_on);
create index cf_purchases_grade_idx on public.cf_purchases (tenant_id, grade_id);
create index cf_purchases_lot_idx on public.cf_purchases (tenant_id, lot_id);
create index cf_purchases_created_by_idx on public.cf_purchases (created_by);
create index cf_purchases_voided_by_idx on public.cf_purchases (voided_by);

-- Money handed to a farmer: an advance before the coffee comes in, or a payment against what is due.
create table public.cf_advances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  farmer_id uuid not null,
  kind text not null default 'advance' check (kind in ('advance','payment')),
  amount numeric(14,2) not null check (amount > 0),
  method public.pay_method not null default 'cash',
  note text check (char_length(note) <= 300),
  paid_on date not null default ((now() at time zone 'Africa/Addis_Ababa')::date),
  client_ref uuid,
  created_by uuid not null default auth.uid() references public.profiles(user_id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(user_id),
  void_reason text check (char_length(void_reason) <= 300),
  unique (tenant_id, client_ref),
  unique (tenant_id, id),
  foreign key (tenant_id, farmer_id) references public.cf_farmers(tenant_id, id),
  check ((voided_at is null) = (void_reason is null))
);
create index cf_advances_farmer_idx on public.cf_advances (tenant_id, farmer_id, paid_on);
create index cf_advances_day_idx on public.cf_advances (tenant_id, paid_on);
create index cf_advances_created_by_idx on public.cf_advances (created_by);
create index cf_advances_voided_by_idx on public.cf_advances (voided_by);

alter table public.cf_grades enable row level security;
alter table public.cf_farmers enable row level security;
alter table public.cf_lots enable row level security;
alter table public.cf_purchases enable row level security;
alter table public.cf_advances enable row level security;

revoke all on public.cf_grades, public.cf_farmers, public.cf_lots, public.cf_purchases, public.cf_advances from anon;
revoke truncate on public.cf_grades from authenticated;
revoke insert, update, delete, truncate on public.cf_farmers, public.cf_lots, public.cf_purchases, public.cf_advances from authenticated;

create policy cf_grades_sel on public.cf_grades for select to authenticated using (tenant_id = (select private.current_tenant()));
create policy cf_grades_ins on public.cf_grades for insert to authenticated
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'));
create policy cf_grades_upd on public.cf_grades for update to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'))
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'));

create policy cf_farmers_sel on public.cf_farmers for select to authenticated using (tenant_id = (select private.current_tenant()));
create policy cf_lots_sel on public.cf_lots for select to authenticated using (tenant_id = (select private.current_tenant()));
create policy cf_purchases_sel on public.cf_purchases for select to authenticated using (tenant_id = (select private.current_tenant()));
create policy cf_advances_sel on public.cf_advances for select to authenticated using (tenant_id = (select private.current_tenant()));

-- Payment due per farmer = kg x price - advances - payments. Negative means the farmer still owes an advance.
create view public.cf_farmer_balances with (security_invoker = true) as
select f.id as farmer_id, f.tenant_id,
  coalesce(p.kg, 0) as kg,
  coalesce(p.amount, 0) as bought,
  coalesce(a.advanced, 0) as advanced,
  coalesce(a.paid, 0) as paid,
  coalesce(p.amount, 0) - coalesce(a.advanced, 0) - coalesce(a.paid, 0) as due
from public.cf_farmers f
left join lateral (
  select sum(kg) as kg, sum(amount) as amount from public.cf_purchases
  where tenant_id = f.tenant_id and farmer_id = f.id and voided_at is null
) p on true
left join lateral (
  select sum(amount) filter (where kind = 'advance') as advanced, sum(amount) filter (where kind = 'payment') as paid
  from public.cf_advances where tenant_id = f.tenant_id and farmer_id = f.id and voided_at is null
) a on true;

-- Totals per lot.
create view public.cf_lot_totals with (security_invoker = true) as
select l.id as lot_id, l.tenant_id, l.grade_id, l.code, l.status, l.opened_on, l.closed_at, l.dispatched_at, l.dispatched_to,
  g.code as grade_code, g.name as grade_name,
  coalesce(p.kg, 0) as kg, coalesce(p.amount, 0) as amount, coalesce(p.purchases, 0) as purchases
from public.cf_lots l
join public.cf_grades g on g.tenant_id = l.tenant_id and g.id = l.grade_id
left join lateral (
  select sum(kg) as kg, sum(amount) as amount, count(*) as purchases from public.cf_purchases
  where tenant_id = l.tenant_id and lot_id = l.id and voided_at is null
) p on true;

-- Coffee in the warehouse: everything in lots that have not left.
create view public.cf_stock_by_grade with (security_invoker = true) as
select g.id as grade_id, g.tenant_id, g.code, g.name, g.active,
  coalesce(sum(t.kg) filter (where t.status <> 'dispatched'), 0) as kg_on_hand,
  coalesce(sum(t.amount) filter (where t.status <> 'dispatched'), 0) as cost_on_hand,
  coalesce(sum(t.kg) filter (where t.status = 'dispatched'), 0) as kg_dispatched
from public.cf_grades g
left join public.cf_lot_totals t on t.tenant_id = g.tenant_id and t.grade_id = g.id
group by g.id, g.tenant_id, g.code, g.name, g.active;

revoke all on public.cf_farmer_balances, public.cf_lot_totals, public.cf_stock_by_grade from anon;
grant select on public.cf_farmer_balances, public.cf_lot_totals, public.cf_stock_by_grade to authenticated;
