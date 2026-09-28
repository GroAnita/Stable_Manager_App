-- ============================================================================
-- Stable Manager — flexible, arbitrary-count feeding times per horse.
--
-- feeding_plans' morning_*/lunch_*/evening_* columns hard-code exactly three
-- feedings a day, which doesn't fit stables that feed 4-5+ times. This adds
-- a proper child table — one row per feeding time per horse — so the React
-- app can let staff add/remove/reorder as many feedings as a horse actually
-- gets, each with its own optional clock time.
--
-- feeding_plans and its morning/lunch/evening columns are left untouched —
-- still read/written by the legacy vanilla-JS app. Existing morning/lunch/
-- evening data is copied into feeding_times below so the new app doesn't
-- start from a blank feeding plan for horses that already had one.
--
-- Select policy follows the staff-only pattern from
-- 20260730080000_restrict_stable_wide_select_to_staff.sql from the start,
-- rather than the original permissive-then-patched pattern.
-- ============================================================================

create table public.feeding_times (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  horse_id uuid not null references public.horses(id) on delete cascade,
  label text not null,
  time_of_day time,
  hay text,
  feed text,
  supplements text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_feeding_times_horse_id on public.feeding_times(horse_id);
create index idx_feeding_times_stable_id on public.feeding_times(stable_id);

create trigger trg_feeding_times_updated_at
  before update on public.feeding_times
  for each row execute function public.set_updated_at();

alter table public.feeding_times enable row level security;

create policy "feeding_times_select_staff"
  on public.feeding_times for select
  using (
    stable_id = public.auth_stable_id()
    and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role])
  );

create policy "feeding_times_insert_staff"
  on public.feeding_times for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "feeding_times_update_staff"
  on public.feeding_times for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "feeding_times_delete_owner_role"
  on public.feeding_times for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- Backfill: carry existing morning/lunch/evening data into the new table so
-- horses with a feeding plan already filled in don't appear empty.
insert into public.feeding_times (stable_id, horse_id, label, hay, feed, supplements)
select stable_id, horse_id, 'Morning', morning_hay, morning_feed, morning_supplements
from public.feeding_plans
where morning_hay is not null or morning_feed is not null or morning_supplements is not null;

insert into public.feeding_times (stable_id, horse_id, label, hay, feed, supplements)
select stable_id, horse_id, 'Lunch', lunch_hay, lunch_feed, lunch_supplements
from public.feeding_plans
where lunch_hay is not null or lunch_feed is not null or lunch_supplements is not null;

insert into public.feeding_times (stable_id, horse_id, label, hay, feed, supplements)
select stable_id, horse_id, 'Evening', evening_hay, evening_feed, evening_supplements
from public.feeding_plans
where evening_hay is not null or evening_feed is not null or evening_supplements is not null;
