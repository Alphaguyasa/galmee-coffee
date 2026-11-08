-- Galmee Coffee server logic. Writes run as private SECURITY DEFINER functions with explicit
-- tenant and role checks; each is exposed through a SECURITY INVOKER wrapper in public.

create function private.cf_require_tenant() returns uuid
language plpgsql stable set search_path = public, private as $$
declare v uuid := private.current_tenant();
begin
  if v is null then raise exception 'not_a_member' using errcode = '42501'; end if;
  return v;
end $$;
revoke all on function private.cf_require_tenant() from public, anon;
grant execute on function private.cf_require_tenant() to authenticated;

create function private.cf_require_manager() returns void
language plpgsql stable set search_path = public, private as $$
begin
  if private.current_app_role()::text not in ('owner','manager') then raise exception 'not_allowed' using errcode = '42501'; end if;
end $$;
revoke all on function private.cf_require_manager() from public, anon;
grant execute on function private.cf_require_manager() to authenticated;

-- Ethiopian calendar date as D/M/YYYY, for SMS text built in the database.
create function private.cf_eth_date(p_day date) returns text
language plpgsql immutable set search_path = '' as $$
declare
  jdn int := to_char(p_day, 'J')::int;
  c int := jdn - 1723856;
  r int := c % 1461;
  n int := r % 365 + 365 * (r / 1460);
  y int := 4 * (c / 1461) + r / 365 - r / 1460;
begin
  return format('%s/%s/%s', n % 30 + 1, n / 30 + 1, y);
end $$;
revoke all on function private.cf_eth_date(date) from public, anon, authenticated;

create function private.cf_phone_ok(p text) returns boolean
language sql immutable set search_path = '' as $$ select p ~ '^(\+251|0)[1-9][0-9]{8}$' $$;
revoke all on function private.cf_phone_ok(text) from public, anon, authenticated;

-- A purchase or payment date: today or up to 60 days back (late entry after a day offline), never the future.
create function private.cf_check_day(p_day date) returns void
language plpgsql stable set search_path = '' as $$
begin
  if p_day is null or p_day > (now() at time zone 'Africa/Addis_Ababa')::date
     or p_day < (now() at time zone 'Africa/Addis_Ababa')::date - 60 then
    raise exception 'bad_day';
  end if;
end $$;
revoke all on function private.cf_check_day(date) from public, anon;
grant execute on function private.cf_check_day(date) to authenticated;

-- Registers a farmer with the next number in this business's book.
create function private.cf_add_farmer(p_name text, p_kebele text, p_phone text)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cf_require_tenant();
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_no int;
  v_id uuid;
begin
  if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'name_required'; end if;
  if char_length(btrim(coalesce(p_kebele, ''))) < 2 then raise exception 'kebele_required'; end if;
  if v_phone is not null and not private.cf_phone_ok(v_phone) then raise exception 'bad_phone'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cf_farmer_no:' || v_tenant::text, 0));
  select coalesce(max(farmer_no), 0) + 1 into v_no from cf_farmers where tenant_id = v_tenant;
  insert into cf_farmers(tenant_id, farmer_no, name, kebele, phone, created_by)
  values (v_tenant, v_no, btrim(p_name), btrim(p_kebele), v_phone, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create function private.cf_update_farmer(p_farmer uuid, p_name text, p_kebele text, p_phone text, p_active boolean)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cf_require_tenant();
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
  perform private.cf_require_manager();
  if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'name_required'; end if;
  if char_length(btrim(coalesce(p_kebele, ''))) < 2 then raise exception 'kebele_required'; end if;
  if v_phone is not null and not private.cf_phone_ok(v_phone) then raise exception 'bad_phone'; end if;
  update cf_farmers set name = btrim(p_name), kebele = btrim(p_kebele), phone = v_phone, active = coalesce(p_active, active)
  where id = p_farmer and tenant_id = v_tenant;
  if not found then raise exception 'farmer_not_found'; end if;
end $$;

-- Records one weighing into the grade's open lot, opening a new lot when there is none.
-- Safe to retry with the same client_ref (offline queue). Queues an SMS receipt when the farmer has a phone.
create function private.cf_record_purchase(p_farmer uuid, p_grade uuid, p_kg numeric, p_price numeric, p_moisture text, p_day date, p_client_ref uuid)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cf_require_tenant();
  v_farmer cf_farmers%rowtype;
  v_grade cf_grades%rowtype;
  v_day date := coalesce(p_day, (now() at time zone 'Africa/Addis_Ababa')::date);
  v_lot uuid;
  v_no int;
  v_id uuid;
  v_amount numeric;
  v_due numeric;
  v_tenant_name text;
begin
  if p_client_ref is not null then
    select id into v_id from cf_purchases where tenant_id = v_tenant and client_ref = p_client_ref;
    if found then return v_id; end if;
  end if;
  perform private.cf_check_day(v_day);
  if p_kg is null or p_kg <= 0 or p_kg > 100000 then raise exception 'bad_kg'; end if;
  if p_price is null or p_price <= 0 or p_price > 100000 then raise exception 'bad_amount'; end if;
  select * into v_farmer from cf_farmers where id = p_farmer and tenant_id = v_tenant and active;
  if not found then raise exception 'farmer_not_found'; end if;
  select * into v_grade from cf_grades where id = p_grade and tenant_id = v_tenant and active;
  if not found then raise exception 'grade_not_found'; end if;

  perform pg_advisory_xact_lock(hashtextextended('cf_lot:' || v_tenant::text || ':' || p_grade::text, 0));
  select id into v_lot from cf_lots where tenant_id = v_tenant and grade_id = p_grade and status = 'open';
  if v_lot is null then
    select coalesce(max(lot_no), 0) + 1 into v_no from cf_lots where tenant_id = v_tenant and grade_id = p_grade;
    insert into cf_lots(tenant_id, grade_id, lot_no, code, opened_on, created_by)
    values (v_tenant, p_grade, v_no, v_grade.code || '-' || lpad(v_no::text, 3, '0'), v_day, auth.uid())
    returning id into v_lot;
  end if;

  begin
    insert into cf_purchases(tenant_id, farmer_id, grade_id, lot_id, kg, price_per_kg, moisture_note, purchased_on, client_ref, created_by)
    values (v_tenant, p_farmer, p_grade, v_lot, round(p_kg, 2), round(p_price, 2), nullif(btrim(coalesce(p_moisture, '')), ''), v_day, p_client_ref, auth.uid())
    returning id, amount into v_id, v_amount;
  exception when unique_violation then
    select id into v_id from cf_purchases where tenant_id = v_tenant and client_ref = p_client_ref;
    return v_id;
  end;

  if v_farmer.phone is not null then
    select name into v_tenant_name from tenants where id = v_tenant;
    select due into v_due from cf_farmer_balances where farmer_id = p_farmer and tenant_id = v_tenant;
    insert into notifications(tenant_id, channel, to_addr, body)
    values (v_tenant, 'sms', v_farmer.phone,
      format('%s፦ %s፣ %s ኪሎ %s፣ በኪሎ ብር %s፣ ድምር ብር %s። የሚከፈልዎ ብር %s።', v_tenant_name, private.cf_eth_date(v_day),
        to_char(round(p_kg, 2), 'FM999,990.00'), v_grade.name, to_char(round(p_price, 2), 'FM999,990.00'),
        to_char(v_amount, 'FM999,999,990.00'), to_char(v_due, 'FM999,999,990.00')));
  end if;
  return v_id;
end $$;

-- Records money given to a farmer. A payment cannot exceed what is due; an advance can go ahead of any coffee.
create function private.cf_record_advance(p_farmer uuid, p_kind text, p_amount numeric, p_method pay_method, p_note text, p_day date, p_client_ref uuid)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cf_require_tenant();
  v_day date := coalesce(p_day, (now() at time zone 'Africa/Addis_Ababa')::date);
  v_kind text := coalesce(p_kind, 'advance');
  v_due numeric;
  v_id uuid;
begin
  if p_client_ref is not null then
    select id into v_id from cf_advances where tenant_id = v_tenant and client_ref = p_client_ref;
    if found then return v_id; end if;
  end if;
  perform private.cf_check_day(v_day);
  if v_kind not in ('advance','payment') then raise exception 'bad_kind'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then raise exception 'bad_amount'; end if;
  perform 1 from cf_farmers where id = p_farmer and tenant_id = v_tenant and active for update;
  if not found then raise exception 'farmer_not_found'; end if;
  if v_kind = 'payment' then
    select due into v_due from cf_farmer_balances where farmer_id = p_farmer and tenant_id = v_tenant;
    if round(p_amount, 2) > coalesce(v_due, 0) then raise exception 'overpayment'; end if;
  end if;
  begin
    insert into cf_advances(tenant_id, farmer_id, kind, amount, method, note, paid_on, client_ref, created_by)
    values (v_tenant, p_farmer, v_kind, round(p_amount, 2), coalesce(p_method, 'cash'), nullif(btrim(coalesce(p_note, '')), ''), v_day, p_client_ref, auth.uid())
    returning id into v_id;
  exception when unique_violation then
    select id into v_id from cf_advances where tenant_id = v_tenant and client_ref = p_client_ref;
  end;
  return v_id;
end $$;

-- Corrections never edit a record: managers void it with a reason and it stays on the statement.
create function private.cf_void_purchase(p_purchase uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cf_require_tenant();
  v_row cf_purchases%rowtype;
  v_status text;
begin
  perform private.cf_require_manager();
  if char_length(btrim(coalesce(p_reason, ''))) < 2 then raise exception 'reason_required'; end if;
  select * into v_row from cf_purchases where id = p_purchase and tenant_id = v_tenant for update;
  if not found then raise exception 'purchase_not_found'; end if;
  if v_row.voided_at is not null then raise exception 'already_voided'; end if;
  select status into v_status from cf_lots where id = v_row.lot_id and tenant_id = v_tenant;
  if v_status = 'dispatched' then raise exception 'lot_dispatched'; end if;
  update cf_purchases set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason) where id = p_purchase;
end $$;

create function private.cf_void_advance(p_advance uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cf_require_tenant();
  v_row cf_advances%rowtype;
begin
  perform private.cf_require_manager();
  if char_length(btrim(coalesce(p_reason, ''))) < 2 then raise exception 'reason_required'; end if;
  select * into v_row from cf_advances where id = p_advance and tenant_id = v_tenant for update;
  if not found then raise exception 'advance_not_found'; end if;
  if v_row.voided_at is not null then raise exception 'already_voided'; end if;
  update cf_advances set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason) where id = p_advance;
end $$;

-- Closes the open lot so the next weighing of that grade starts a new one.
create function private.cf_close_lot(p_lot uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cf_require_tenant();
  v_status text;
begin
  perform private.cf_require_manager();
  select status into v_status from cf_lots where id = p_lot and tenant_id = v_tenant for update;
  if not found then raise exception 'lot_not_found'; end if;
  if v_status <> 'open' then raise exception 'bad_status'; end if;
  update cf_lots set status = 'closed', closed_at = now() where id = p_lot;
end $$;

-- A lot leaves the warehouse whole, closing first if it was still open.
create function private.cf_dispatch_lot(p_lot uuid, p_to text)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cf_require_tenant();
  v_status text;
begin
  perform private.cf_require_manager();
  if char_length(btrim(coalesce(p_to, ''))) < 2 then raise exception 'buyer_required'; end if;
  select status into v_status from cf_lots where id = p_lot and tenant_id = v_tenant for update;
  if not found then raise exception 'lot_not_found'; end if;
  if v_status = 'dispatched' then raise exception 'bad_status'; end if;
  if not exists (select 1 from cf_purchases where lot_id = p_lot and tenant_id = v_tenant and voided_at is null) then
    raise exception 'lot_empty';
  end if;
  update cf_lots set status = 'dispatched', closed_at = coalesce(closed_at, now()), dispatched_at = now(), dispatched_to = btrim(p_to) where id = p_lot;
end $$;

-- Purchases of one day by grade.
create function public.cf_daily_by_grade(p_day date)
returns table (grade_id uuid, code text, name text, purchases bigint, farmers bigint, kg numeric, amount numeric, avg_price numeric)
language sql stable security invoker set search_path = public, private as $$
  select g.id, g.code, g.name, count(*), count(distinct p.farmer_id), sum(p.kg), sum(p.amount),
    round(sum(p.amount) / nullif(sum(p.kg), 0), 2)
  from cf_purchases p
  join cf_grades g on g.tenant_id = p.tenant_id and g.id = p.grade_id
  where p.purchased_on = p_day and p.voided_at is null
  group by g.id, g.code, g.name
  order by g.code
$$;

-- A farmer's statement, oldest first, with a running amount due. Voided lines are listed but carry no money.
create function public.cf_farmer_statement(p_farmer uuid)
returns table (id uuid, day date, entry text, label text, kg numeric, price numeric, moisture text, method pay_method, credit numeric, debit numeric, balance numeric, voided boolean, void_reason text)
language sql stable security invoker set search_path = public, private as $$
  with lines as (
    select p.id, p.purchased_on as day, p.created_at, 'purchase'::text as entry, g.name as label, p.kg, p.price_per_kg as price,
      p.moisture_note as moisture, null::pay_method as method,
      case when p.voided_at is null then p.amount else 0 end as credit, 0::numeric as debit,
      p.voided_at is not null as voided, p.void_reason, p.amount as raw
    from cf_purchases p join cf_grades g on g.tenant_id = p.tenant_id and g.id = p.grade_id
    where p.farmer_id = p_farmer
    union all
    select a.id, a.paid_on, a.created_at, a.kind, a.note, null, null, null, a.method,
      0, case when a.voided_at is null then a.amount else 0 end,
      a.voided_at is not null, a.void_reason, a.amount
    from cf_advances a where a.farmer_id = p_farmer
  )
  select id, day, entry, label, kg, price, moisture, method,
    case when voided and entry = 'purchase' then raw else credit end,
    case when voided and entry <> 'purchase' then raw else debit end,
    sum(credit - debit) over (order by day, created_at, id),
    voided, void_reason
  from lines
  order by day, created_at, id
$$;

create function public.cf_add_farmer(p_name text, p_kebele text, p_phone text default null)
returns uuid language sql security invoker set search_path = public, private as $$ select private.cf_add_farmer(p_name, p_kebele, p_phone) $$;
create function public.cf_update_farmer(p_farmer uuid, p_name text, p_kebele text, p_phone text default null, p_active boolean default null)
returns void language sql security invoker set search_path = public, private as $$ select private.cf_update_farmer(p_farmer, p_name, p_kebele, p_phone, p_active) $$;
create function public.cf_record_purchase(p_farmer uuid, p_grade uuid, p_kg numeric, p_price numeric, p_moisture text default null, p_day date default null, p_client_ref uuid default null)
returns uuid language sql security invoker set search_path = public, private as $$ select private.cf_record_purchase(p_farmer, p_grade, p_kg, p_price, p_moisture, p_day, p_client_ref) $$;
create function public.cf_record_advance(p_farmer uuid, p_kind text, p_amount numeric, p_method pay_method default 'cash', p_note text default null, p_day date default null, p_client_ref uuid default null)
returns uuid language sql security invoker set search_path = public, private as $$ select private.cf_record_advance(p_farmer, p_kind, p_amount, p_method, p_note, p_day, p_client_ref) $$;
create function public.cf_void_purchase(p_purchase uuid, p_reason text)
returns void language sql security invoker set search_path = public, private as $$ select private.cf_void_purchase(p_purchase, p_reason) $$;
create function public.cf_void_advance(p_advance uuid, p_reason text)
returns void language sql security invoker set search_path = public, private as $$ select private.cf_void_advance(p_advance, p_reason) $$;
create function public.cf_close_lot(p_lot uuid)
returns void language sql security invoker set search_path = public, private as $$ select private.cf_close_lot(p_lot) $$;
create function public.cf_dispatch_lot(p_lot uuid, p_to text)
returns void language sql security invoker set search_path = public, private as $$ select private.cf_dispatch_lot(p_lot, p_to) $$;

do $$
declare f text;
begin
  foreach f in array array[
    'cf_add_farmer(text,text,text)',
    'cf_update_farmer(uuid,text,text,text,boolean)',
    'cf_record_purchase(uuid,uuid,numeric,numeric,text,date,uuid)',
    'cf_record_advance(uuid,text,numeric,pay_method,text,date,uuid)',
    'cf_void_purchase(uuid,text)',
    'cf_void_advance(uuid,text)',
    'cf_close_lot(uuid)',
    'cf_dispatch_lot(uuid,text)'
  ] loop
    execute format('revoke all on function private.%s from public, anon', f);
    execute format('grant execute on function private.%s to authenticated', f);
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['cf_daily_by_grade(date)', 'cf_farmer_statement(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
