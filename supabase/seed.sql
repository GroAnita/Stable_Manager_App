-- ============================================================================
-- Stable Manager — local development seed data
--
-- NOTE: `auth.users` rows normally come from Supabase Auth sign-up, not raw
-- SQL. This seed assumes you have already created a test user via
-- `supabase auth` / Studio and replaces the placeholder UUID below with that
-- user's id before running `supabase db reset`.
-- ============================================================================

-- Replace with a real auth.users.id from your local Supabase instance.
-- select 'set your test user id here' as reminder;

do $$
declare
  v_owner_user uuid;
  v_stable_id uuid;
  v_owner_anna uuid := gen_random_uuid();
  v_owner_johan uuid := gen_random_uuid();
  v_stall_1 uuid := gen_random_uuid();
  v_stall_2 uuid := gen_random_uuid();
  v_horse_bella uuid := gen_random_uuid();
  v_horse_thunder uuid := gen_random_uuid();
  v_contract_bella uuid := gen_random_uuid();
begin
  -- Pick the first existing auth user (created via Studio/sign-up) as stable owner.
  select id into v_owner_user from auth.users order by created_at asc limit 1;

  if v_owner_user is null then
    raise notice 'No auth.users found — sign up a user first, then re-run this seed.';
    return;
  end if;

  insert into public.stables (id, name, address, city, postal_code, phone, email, owner_user_id)
  values (gen_random_uuid(), 'Meadowbrook Stable', 'Birch Lane 14', 'Stockholm', '11122', '+46 70 000 0000', 'hello@meadowbrook.example', v_owner_user)
  returning id into v_stable_id;

  update public.profiles
  set stable_id = v_stable_id, role = 'stable_owner'
  where id = v_owner_user;

  insert into public.owners (id, stable_id, full_name, address, city, postal_code, phone, email, emergency_contact, emergency_phone)
  values
    (v_owner_anna, v_stable_id, 'Anna Lindberg', 'Birch Lane 14', 'Stockholm', '11122', '+46 70 112 3344', 'anna.lindberg@example.com', 'Erik Lindberg', '+46 70 998 2211'),
    (v_owner_johan, v_stable_id, 'Johan Dahl', 'Meadow Road 8', 'Uppsala', '75323', '+46 73 334 5566', 'johan.dahl@example.com', 'Maria Dahl', '+46 73 771 8811');

  insert into public.stalls (id, stable_id, stall_number, size, status)
  values
    (v_stall_1, v_stable_id, '1', 'large', 'occupied'),
    (v_stall_2, v_stable_id, '2', 'large', 'occupied');

  insert into public.horses (id, stable_id, owner_id, stall_id, name, breed, age, gender, color, passport_number, vaccination_status, arrival_date, active)
  values
    (v_horse_bella, v_stable_id, v_owner_anna, v_stall_1, 'Bella', 'Swedish Warmblood', 9, 'Mare', 'Bay', 'SE-SWB-10294', 'Up to date', current_date - interval '14 months', true),
    (v_horse_thunder, v_stable_id, v_owner_johan, v_stall_2, 'Thunder', 'Holsteiner', 11, 'Gelding', 'Dark Bay', 'DE-HOL-88310', 'Due soon', current_date - interval '20 months', true);

  insert into public.contracts (id, stable_id, horse_id, owner_id, stall_id, monthly_rent, deposit, start_date, end_date, included_services, status)
  values
    (v_contract_bella, v_stable_id, v_horse_bella, v_owner_anna, v_stall_1, 720, 700, current_date - interval '12 months', current_date + interval '12 months', 'Stall, daily turnout, hay, mucking', 'active');

  insert into public.payments (stable_id, contract_id, owner_id, amount, due_date, status)
  values
    (v_stable_id, v_contract_bella, v_owner_anna, 720, current_date + interval '5 days', 'due'),
    (v_stable_id, v_contract_bella, v_owner_anna, 720, current_date - interval '25 days', 'paid');

  insert into public.feeding_plans (stable_id, horse_id, morning_hay, morning_feed, evening_hay, evening_feed)
  values (v_stable_id, v_horse_bella, '2 flakes', 'Low starch mix', '2 flakes', 'Low starch mix');

  insert into public.tasks (stable_id, horse_id, title, priority, due_date)
  values (v_stable_id, v_horse_bella, 'Morning turnout check', 'medium', current_date);

  insert into public.calendar_events (stable_id, horse_id, title, event_type, start_time)
  values (v_stable_id, v_horse_thunder, 'Farrier visit', 'farrier', now() + interval '3 days');

  raise notice 'Seed complete for stable %', v_stable_id;
end $$;
