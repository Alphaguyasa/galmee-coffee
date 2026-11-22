-- Buying seasons and the season opening letter.
-- A season records last season's buying dates, the bonus per kg the owner pays on it,
-- the advance ceiling per kg it earns, and the day buying opens again.

create table public.cf_seasons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  starts_on date not null,
  ends_on date not null,
  bonus_per_kg numeric(12,2) not null default 0 check (bonus_per_kg >= 0 and bonus_per_kg <= 100000),
  ceiling_per_kg numeric(12,2) not null default 0 check (ceiling_per_kg >= 0 and ceiling_per_kg <= 100000),
  opens_on date not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (tenant_id, id),
  check (ends_on >= starts_on),
  check (opens_on > ends_on)
);
create index cf_seasons_tenant_idx on public.cf_seasons (tenant_id, starts_on desc);

alter table public.cf_seasons enable row level security;

create policy cf_seasons_sel on public.cf_seasons for select to authenticated
  using (tenant_id = (select private.current_tenant()));
create policy cf_seasons_ins on public.cf_seasons for insert to authenticated
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'));
create policy cf_seasons_upd on public.cf_seasons for update to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'))
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'));

revoke all on public.cf_seasons from anon;
grant select, insert, update on public.cf_seasons to authenticated;

-- One row per farmer: what they delivered in the season, the bonus it earns,
-- the advance ceiling, and what they still owe (an advance not yet covered by coffee).
-- p_farmer null: every active farmer, for printing the whole stack.
create function public.cf_season_letters(p_season uuid, p_farmer uuid default null)
returns table (farmer_id uuid, farmer_no int, name text, kebele text, kg numeric, bought numeric,
  bonus numeric, ceiling numeric, owes numeric, available numeric)
language sql stable security invoker set search_path = public, private as $$
  select f.id, f.farmer_no, f.name, f.kebele,
    coalesce(p.kg, 0), coalesce(p.amount, 0),
    round(coalesce(p.kg, 0) * s.bonus_per_kg, 2),
    round(coalesce(p.kg, 0) * s.ceiling_per_kg, 2),
    greatest(-coalesce(b.due, 0), 0),
    greatest(round(coalesce(p.kg, 0) * s.ceiling_per_kg, 2) - greatest(-coalesce(b.due, 0), 0), 0)
  from public.cf_seasons s
  join public.cf_farmers f on f.tenant_id = s.tenant_id
  left join lateral (
    select sum(x.kg) as kg, sum(x.amount) as amount from public.cf_purchases x
    where x.tenant_id = f.tenant_id and x.farmer_id = f.id and x.voided_at is null
      and x.purchased_on between s.starts_on and s.ends_on
  ) p on true
  left join public.cf_farmer_balances b on b.tenant_id = f.tenant_id and b.farmer_id = f.id
  where s.id = p_season
    and (case when p_farmer is null then f.active else f.id = p_farmer end)
  order by f.farmer_no
$$;

revoke all on function public.cf_season_letters(uuid, uuid) from public, anon;
grant execute on function public.cf_season_letters(uuid, uuid) to authenticated;
