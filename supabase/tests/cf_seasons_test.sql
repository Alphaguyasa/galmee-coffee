-- Seasons and season letters: tenant isolation, role checks and the letter arithmetic.
-- Purchase days are relative to today because the purchase RPC only accepts the last 60 days.
-- Run with Supabase `execute_sql`. Everything rolls back: the final RAISE carries the result line.
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  ta uuid; tb uuid; ga uuid; fa uuid; fa2 uuid; sa uuid; sb uuid; n int; r text := ''; ok boolean; err text;
  rec record; d date := (now() at time zone 'Africa/Addis_Ababa')::date;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','cfs-a@test.invalid'),(ub,'authenticated','authenticated','cfs-b@test.invalid'),(uc,'authenticated','authenticated','cfs-c@test.invalid');
  insert into public.tenants(name, vertical) values ('CFS A','coffee') returning id into ta;
  insert into public.tenants(name, vertical) values ('CFS B','coffee') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values (ua, ta, 'A owner','owner'), (ub, tb, 'B owner','owner'), (uc, ta, 'A clerk','staff');

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  insert into public.cf_seasons(name, starts_on, ends_on, bonus_per_kg, ceiling_per_kg, opens_on)
    values ('B season', '2025-10-01', '2026-01-31', 5, 20, '2026-09-25') returning id into sb;

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  insert into public.cf_grades(code,name,default_price) values ('G1','Washed',100) returning id into ga;
  fa := public.cf_add_farmer('Farmer A','Kebele A');
  fa2 := public.cf_add_farmer('Farmer A2','Kebele A');
  perform public.cf_record_purchase(fa, ga, 100, 100, null, d - 30);
  perform public.cf_record_purchase(fa, ga, 50, 100, null, d - 5); -- outside the season
  perform public.cf_record_purchase(fa2, ga, 10, 100, null, d - 30);
  perform public.cf_record_advance(fa2, 'advance', 1300);                 -- owes 300
  insert into public.cf_seasons(name, starts_on, ends_on, bonus_per_kg, ceiling_per_kg, opens_on)
    values ('2018', d - 50, d - 20, 2.5, 40, d + 30) returning id into sa;

  select * into rec from public.cf_season_letters(sa, fa);
  r := r || 'A kg=' || rec.kg || ' bonus=' || rec.bonus || ' ceiling=' || rec.ceiling || ' available=' || rec.available || ' (expect 100.00, 250.00, 4000.00, 4000.00); ';
  select * into rec from public.cf_season_letters(sa, fa2);
  r := r || 'A2 owes=' || rec.owes || ' available=' || rec.available || ' (expect 300.00, 100.00); ';
  select count(*) into n from public.cf_season_letters(sa);
  r := r || 'all letters=' || n || ' (expect 2); ';
  select count(*) into n from public.cf_season_letters(sb);
  r := r || 'other tenant season letters=' || n || ' (expect 0); ';
  select count(*) into n from public.cf_seasons;
  r := r || 'seasons visible=' || n || ' (expect 1); ';
  begin
    insert into public.cf_seasons(name, starts_on, ends_on, opens_on) values ('bad', '2026-01-01', '2025-12-01', '2026-02-01');
    ok := true; err := '';
  exception when others then ok := false; err := sqlstate; end;
  r := r || 'end before start=' || ok || ' ' || err || ' (expect false 23514); ';
  begin
    insert into public.cf_seasons(tenant_id, name, starts_on, ends_on, opens_on) values (tb, 'sneak', '2025-01-01', '2025-02-01', '2025-03-01');
    ok := true; err := '';
  exception when others then ok := false; err := sqlstate; end;
  r := r || 'insert into other tenant=' || ok || ' ' || err || ' (expect false 42501); ';
  update public.cf_seasons set bonus_per_kg = 99 where id = sb;
  get diagnostics n = row_count;
  r := r || 'update other tenant rows=' || n || ' (expect 0); ';

  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role','authenticated')::text, true);
  begin
    insert into public.cf_seasons(name, starts_on, ends_on, opens_on) values ('clerk', '2025-01-01', '2025-02-01', '2025-03-01');
    ok := true; err := '';
  exception when others then ok := false; err := sqlstate; end;
  r := r || 'clerk insert=' || ok || ' ' || err || ' (expect false 42501); ';
  update public.cf_seasons set bonus_per_kg = 99 where id = sa;
  get diagnostics n = row_count;
  r := r || 'clerk update rows=' || n || ' (expect 0); ';

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  begin perform public.cf_season_letters(sa); ok := true; err := ''; exception when others then ok := false; err := sqlstate; end;
  r := r || 'anon letters=' || ok || ' ' || err || ' (expect false 42501); ';
  begin perform count(*) from public.cf_seasons; ok := true; err := ''; exception when others then ok := false; err := sqlstate; end;
  r := r || 'anon seasons=' || ok || ' ' || err || ' (expect false 42501)';

  raise exception 'RESULT: %', r;
end $$;
