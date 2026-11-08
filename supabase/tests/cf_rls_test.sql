-- Cross-tenant RLS and workflow test for Galmee Coffee. Run with Supabase `execute_sql`.
-- Everything rolls back: the final RAISE carries the result line. Compare each value with its "expect".
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  ta uuid; tb uuid; ga uuid; gb uuid; fa uuid; fb uuid; p1 uuid; p2 uuid; adv uuid; lot uuid; n int; v numeric; r text := ''; ok boolean; err text; rf uuid := gen_random_uuid();
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','cf-a@test.invalid'),(ub,'authenticated','authenticated','cf-b@test.invalid'),(uc,'authenticated','authenticated','cf-c@test.invalid');
  insert into public.tenants(name, vertical) values ('CF A','coffee') returning id into ta;
  insert into public.tenants(name, vertical) values ('CF B','coffee') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values (ua, ta, 'A owner','owner'), (ub, tb, 'B owner','owner'), (uc, ta, 'A clerk','staff');

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  insert into public.cf_grades(code,name,default_price) values ('G1','Washed',100) returning id into gb;
  fb := public.cf_add_farmer('Farmer B','Kebele B');
  perform public.cf_record_purchase(fb, gb, 10, 100);

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  insert into public.cf_grades(code,name,default_price) values ('G1','Washed',100) returning id into ga;
  fa := public.cf_add_farmer('Farmer A','Kebele A','0911000000');
  select farmer_no into n from public.cf_farmers where id = fa;
  r := r || 'first farmer no=' || n || ' (expect 1); ';
  p1 := public.cf_record_purchase(fa, ga, 50.5, 120, '11%', null, rf);
  p2 := public.cf_record_purchase(fa, ga, 50.5, 120, '11%', null, rf);
  r := r || 'retry same ref same id=' || (p1 = p2) || ' (expect true); ';
  select count(*) into n from public.cf_purchases where farmer_id = fa;
  r := r || 'purchases after retry=' || n || ' (expect 1); ';
  select amount into v from public.cf_purchases where id = p1;
  r := r || 'amount=' || v || ' (expect 6060.00); ';
  select count(*) into n from public.notifications where tenant_id = ta and to_addr = '0911000000';
  r := r || 'sms queued=' || n || ' (expect 1); ';
  adv := public.cf_record_advance(fa, 'advance', 1000);
  select due into v from public.cf_farmer_balances where farmer_id = fa;
  r := r || 'due=' || v || ' (expect 5060.00); ';
  begin perform public.cf_record_advance(fa, 'payment', 5060.01); ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'overpay=' || ok || ' err=' || err || ' (expect false, overpayment); ';
  perform public.cf_record_advance(fa, 'payment', 60);
  select due into v from public.cf_farmer_balances where farmer_id = fa;
  r := r || 'due after payment=' || v || ' (expect 5000.00); ';
  select balance into v from public.cf_farmer_statement(fa) offset 2 limit 1; -- rows come back oldest first
  r := r || 'statement last balance=' || v || ' (expect 5000.00); ';
  select lot_id into lot from public.cf_purchases where id = p1;
  select kg into v from public.cf_lot_totals where lot_id = lot;
  r := r || 'lot kg=' || v || ' (expect 50.50); ';
  select kg_on_hand into v from public.cf_stock_by_grade where grade_id = ga;
  r := r || 'stock=' || v || ' (expect 50.50); ';
  select kg into v from public.cf_daily_by_grade((now() at time zone 'Africa/Addis_Ababa')::date) where grade_id = ga;
  r := r || 'daily kg=' || v || ' (expect 50.50); ';

  -- Tenant A cannot reach tenant B.
  select count(*) into n from public.cf_farmers where tenant_id = tb;
  r := r || 'A reads B farmers=' || n || ' (expect 0); ';
  select count(*) into n from public.cf_purchases where tenant_id = tb;
  r := r || 'A reads B purchases=' || n || ' (expect 0); ';
  select count(*) into n from public.cf_farmer_balances where farmer_id = fb;
  r := r || 'A reads B balance=' || n || ' (expect 0); ';
  select count(*) into n from public.cf_farmer_statement(fb);
  r := r || 'A reads B statement=' || n || ' (expect 0); ';
  begin perform public.cf_record_purchase(fb, ga, 1, 1); ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'A buys from B farmer=' || ok || ' err=' || err || ' (expect false, farmer_not_found); ';
  begin perform public.cf_record_purchase(fa, gb, 1, 1); ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'A uses B grade=' || ok || ' err=' || err || ' (expect false, grade_not_found); ';
  update public.cf_grades set name = 'hacked' where id = gb;
  get diagnostics n = row_count;
  r := r || 'A updates B grade rows=' || n || ' (expect 0); ';
  begin insert into public.cf_grades(tenant_id,code,name,default_price) values (tb,'X','hacked',1); ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'A inserts B grade=' || ok || ' (expect false); ';

  -- Direct writes are closed: money moves only through RPCs.
  begin insert into public.cf_purchases(farmer_id,grade_id,lot_id,kg,price_per_kg) values (fa,ga,lot,1,1); ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'direct insert purchase=' || ok || ' err=' || err || ' (expect false, permission denied); ';
  begin update public.cf_purchases set kg = 1 where id = p1; ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'direct update purchase=' || ok || ' err=' || err || ' (expect false, permission denied); ';

  -- Clerk limits.
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role','authenticated')::text, true);
  perform public.cf_record_purchase(fa, ga, 1, 120);
  r := r || 'clerk records purchase ok; ';
  begin perform public.cf_void_purchase(p1, 'mistake'); ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'clerk voids=' || ok || ' err=' || err || ' (expect false, not_allowed); ';
  begin perform public.cf_close_lot(lot); ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'clerk closes lot=' || ok || ' err=' || err || ' (expect false, not_allowed); ';
  begin insert into public.cf_grades(code,name,default_price) values ('Z','Zzz',1); ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'clerk adds grade=' || ok || ' (expect false); ';

  -- Manager corrections and lot flow.
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  perform public.cf_void_advance(adv, 'wrong farmer');
  select due into v from public.cf_farmer_balances where farmer_id = fa;
  r := r || 'due after void advance=' || v || ' (expect 6120.00); ';
  perform public.cf_close_lot(lot);
  p2 := public.cf_record_purchase(fa, ga, 2, 100);
  select count(*) into n from public.cf_lots where grade_id = ga;
  r := r || 'lots after close=' || n || ' (expect 2); ';
  perform public.cf_dispatch_lot(lot, 'Exporter');
  select kg_on_hand into v from public.cf_stock_by_grade where grade_id = ga;
  r := r || 'stock after dispatch=' || v || ' (expect 2.00); ';
  begin perform public.cf_void_purchase(p1, 'late'); ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'void dispatched=' || ok || ' err=' || err || ' (expect false, lot_dispatched); ';
  begin perform public.cf_record_purchase(fa, ga, 1, 1, null, (now()::date + 5)); ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'future day=' || ok || ' err=' || err || ' (expect false, bad_day); ';

  -- Anonymous sees nothing.
  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  begin select count(*) into n from public.cf_farmers; ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'anon reads=' || ok || ' err=' || err || ' (expect false, permission denied); ';
  begin perform public.cf_add_farmer('X Y','K L'); ok := true; err := ''; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'anon rpc=' || ok || ' (expect false); ';

  raise exception 'RESULT %', r;
end $$;
