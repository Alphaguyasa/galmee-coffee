-- Cross-tenant RLS test for the Galmee core. Run with Supabase `execute_sql`.
-- It creates test users/tenants, checks isolation, then RAISES an exception so
-- EVERYTHING ROLLS BACK. The exception message is the result line.
-- Copy this file, add checks for your own prefixed tables, and run it after every migration.
-- Last result on core (2026-11-06): all checks passed.

do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  ta uuid; tb uuid; cb uuid; n int; r text := ''; ok boolean;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','rls-a@test.invalid'),
    (ub,'authenticated','authenticated','rls-b@test.invalid'),
    (uc,'authenticated','authenticated','rls-c@test.invalid');
  insert into public.tenants(name, vertical) values ('RLS Test A','pharmacy') returning id into ta;
  insert into public.tenants(name, vertical) values ('RLS Test B','wholesale') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values
    (ua, ta, 'A owner','owner'), (ub, tb, 'B owner','owner'), (uc, ta, 'A staff','staff');
  insert into public.customers(tenant_id, name) values (ta,'Cust A');
  insert into public.customers(tenant_id, name) values (tb,'Cust B') returning id into cb;
  -- >>> insert one row per tenant into YOUR prefixed tables here (as postgres, explicit tenant_id)

  -- act as tenant A owner
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  select count(*) into n from public.customers;            r := r || 'A sees customers=' || n || ' (expect 1); ';
  select count(*) into n from public.tenants;              r := r || 'A sees tenants=' || n || ' (expect 1); ';
  update public.customers set name='x' where id = cb;      get diagnostics n = row_count; r := r || 'A updates B rows=' || n || ' (expect 0); ';
  begin insert into public.customers(tenant_id, name) values (tb,'injected'); ok := true; exception when others then ok := false; end;
  r := r || 'A insert into B allowed=' || ok || ' (expect false); ';
  -- >>> repeat the read / update / insert-into-B checks for YOUR tables here

  -- act as tenant A staff
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role','authenticated')::text, true);
  update public.customers set name='staff-edit';           get diagnostics n = row_count; r := r || 'staff update rows=' || n || ' (expect 0); ';
  select count(*) into n from public.audit_log;            r := r || 'staff sees audit=' || n || ' (expect 0); ';

  -- anon
  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin select count(*) into n from public.customers; exception when others then n := -1; end;
  r := r || 'anon sees customers=' || n || ' (expect 0 or -1); ';

  raise exception 'RLS_TEST_RESULTS (rolled back): %', r;
end $$;
