-- Purchases by grade and money paid out over a date range, for the reports screen.
create function public.cf_period_by_grade(p_from date, p_to date)
returns table (grade_id uuid, code text, name text, purchases bigint, farmers bigint, kg numeric, amount numeric, avg_price numeric)
language sql stable security invoker set search_path = public, private as $$
  select g.id, g.code, g.name, count(*), count(distinct p.farmer_id), sum(p.kg), sum(p.amount),
    round(sum(p.amount) / nullif(sum(p.kg), 0), 2)
  from cf_purchases p
  join cf_grades g on g.tenant_id = p.tenant_id and g.id = p.grade_id
  where p.purchased_on between p_from and p_to and p.voided_at is null
  group by g.id, g.code, g.name
  order by g.code
$$;

create function public.cf_period_money(p_from date, p_to date)
returns table (advanced numeric, paid numeric)
language sql stable security invoker set search_path = public, private as $$
  select coalesce(sum(amount) filter (where kind = 'advance'), 0), coalesce(sum(amount) filter (where kind = 'payment'), 0)
  from cf_advances
  where paid_on between p_from and p_to and voided_at is null
$$;

revoke all on function public.cf_period_by_grade(date, date) from public, anon;
grant execute on function public.cf_period_by_grade(date, date) to authenticated;
revoke all on function public.cf_period_money(date, date) from public, anon;
grant execute on function public.cf_period_money(date, date) to authenticated;
