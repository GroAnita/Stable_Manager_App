-- ============================================================================
-- Stable Manager — Row Level Security policies
--
-- Pattern used for every stable-scoped table:
--   SELECT: stable_id = auth_stable_id()
--   INSERT/UPDATE: stable_id = auth_stable_id() AND role in (stable_owner, stable_employee)
--   DELETE: stable_id = auth_stable_id() AND role = stable_owner
--
-- Additional read-only policies are added for the future 'horse_owner' role,
-- scoped to rows linked to their own owner record via owners.user_id.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- stables
-- ----------------------------------------------------------------------------
alter table public.stables enable row level security;

create policy "stables_select_own"
  on public.stables for select
  using (id = public.auth_stable_id());

create policy "stables_update_owner"
  on public.stables for update
  using (id = public.auth_stable_id() and public.auth_role() = 'stable_owner')
  with check (id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- No INSERT/DELETE policy: stables are created via create_stable() (security
-- definer) and are not deletable through the client API.

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_self_or_stablemates"
  on public.profiles for select
  using (id = auth.uid() or stable_id = public.auth_stable_id());

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_self_or_owner_manages_stable"
  on public.profiles for update
  using (id = auth.uid() or (public.auth_role() = 'stable_owner' and stable_id = public.auth_stable_id()))
  with check (id = auth.uid() or (public.auth_role() = 'stable_owner' and stable_id = public.auth_stable_id()));

-- ----------------------------------------------------------------------------
-- Generic helper macro (written out per table since Postgres has no policy
-- templating): stable_id-scoped CRUD + owner-only delete.
-- ----------------------------------------------------------------------------

-- owners
alter table public.owners enable row level security;

create policy "owners_select_stable"
  on public.owners for select
  using (stable_id = public.auth_stable_id());

create policy "owners_select_self_service"
  on public.owners for select
  using (user_id = auth.uid());

create policy "owners_insert_staff"
  on public.owners for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "owners_update_staff"
  on public.owners for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "owners_delete_owner_role"
  on public.owners for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- stalls
alter table public.stalls enable row level security;

create policy "stalls_select_stable"
  on public.stalls for select
  using (stable_id = public.auth_stable_id());

create policy "stalls_insert_staff"
  on public.stalls for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "stalls_update_staff"
  on public.stalls for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "stalls_delete_owner_role"
  on public.stalls for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- horses
alter table public.horses enable row level security;

create policy "horses_select_stable"
  on public.horses for select
  using (stable_id = public.auth_stable_id());

create policy "horses_select_self_service"
  on public.horses for select
  using (exists (
    select 1 from public.owners o
    where o.id = horses.owner_id and o.user_id = auth.uid()
  ));

create policy "horses_insert_staff"
  on public.horses for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "horses_update_staff"
  on public.horses for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "horses_delete_owner_role"
  on public.horses for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- contracts
alter table public.contracts enable row level security;

create policy "contracts_select_stable"
  on public.contracts for select
  using (stable_id = public.auth_stable_id());

create policy "contracts_select_self_service"
  on public.contracts for select
  using (exists (
    select 1 from public.owners o
    where o.id = contracts.owner_id and o.user_id = auth.uid()
  ));

create policy "contracts_insert_staff"
  on public.contracts for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "contracts_update_staff"
  on public.contracts for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "contracts_delete_owner_role"
  on public.contracts for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- payments
alter table public.payments enable row level security;

create policy "payments_select_stable"
  on public.payments for select
  using (stable_id = public.auth_stable_id());

create policy "payments_select_self_service"
  on public.payments for select
  using (exists (
    select 1 from public.owners o
    where o.id = payments.owner_id and o.user_id = auth.uid()
  ));

create policy "payments_insert_staff"
  on public.payments for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "payments_update_staff"
  on public.payments for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "payments_delete_owner_role"
  on public.payments for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- tasks
alter table public.tasks enable row level security;

create policy "tasks_select_stable"
  on public.tasks for select
  using (stable_id = public.auth_stable_id());

create policy "tasks_insert_staff"
  on public.tasks for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "tasks_update_staff"
  on public.tasks for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "tasks_delete_owner_role"
  on public.tasks for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- calendar_events
alter table public.calendar_events enable row level security;

create policy "calendar_events_select_stable"
  on public.calendar_events for select
  using (stable_id = public.auth_stable_id());

create policy "calendar_events_select_self_service"
  on public.calendar_events for select
  using (exists (
    select 1 from public.owners o
    where o.id = calendar_events.owner_id and o.user_id = auth.uid()
  ));

create policy "calendar_events_insert_staff"
  on public.calendar_events for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "calendar_events_update_staff"
  on public.calendar_events for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "calendar_events_delete_owner_role"
  on public.calendar_events for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- medical_records
alter table public.medical_records enable row level security;

create policy "medical_records_select_stable"
  on public.medical_records for select
  using (stable_id = public.auth_stable_id());

create policy "medical_records_select_self_service"
  on public.medical_records for select
  using (exists (
    select 1 from public.horses h
    join public.owners o on o.id = h.owner_id
    where h.id = medical_records.horse_id and o.user_id = auth.uid()
  ));

create policy "medical_records_insert_staff"
  on public.medical_records for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "medical_records_update_staff"
  on public.medical_records for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "medical_records_delete_owner_role"
  on public.medical_records for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- feeding_plans
alter table public.feeding_plans enable row level security;

create policy "feeding_plans_select_stable"
  on public.feeding_plans for select
  using (stable_id = public.auth_stable_id());

create policy "feeding_plans_insert_staff"
  on public.feeding_plans for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "feeding_plans_update_staff"
  on public.feeding_plans for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "feeding_plans_delete_owner_role"
  on public.feeding_plans for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- documents
alter table public.documents enable row level security;

create policy "documents_select_stable"
  on public.documents for select
  using (stable_id = public.auth_stable_id());

create policy "documents_select_self_service"
  on public.documents for select
  using (exists (
    select 1 from public.owners o
    where o.id = documents.owner_id and o.user_id = auth.uid()
  ));

create policy "documents_insert_staff"
  on public.documents for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "documents_update_staff"
  on public.documents for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "documents_delete_owner_role"
  on public.documents for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');

-- notifications
alter table public.notifications enable row level security;

create policy "notifications_select_stable"
  on public.notifications for select
  using (stable_id = public.auth_stable_id());

create policy "notifications_insert_staff"
  on public.notifications for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "notifications_update_staff"
  on public.notifications for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "notifications_delete_owner_role"
  on public.notifications for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');
