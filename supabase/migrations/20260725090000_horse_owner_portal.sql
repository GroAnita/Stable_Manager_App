-- ============================================================================
-- Stable Manager — horse owner portal support.
--
-- The 'horse_owner' role and several *_select_self_service policies already
-- existed in the schema, unused. This fills the remaining gaps: owners can't
-- yet see stalls, tasks, or stable-wide (unassigned-horse) calendar events,
-- and there's no way to actually link an invited account to an owner record.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- stalls — a horse owner can see the stall(s) their own horse occupies.
-- ----------------------------------------------------------------------------
create policy "stalls_select_self_service"
  on public.stalls for select
  using (
    exists (
      select 1 from public.horses h
      join public.owners o on o.id = h.owner_id
      where h.stall_id = stalls.id and o.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- tasks — a horse owner can see tasks tied to their own horse, regardless of
-- which staff member it's assigned to.
-- ----------------------------------------------------------------------------
create policy "tasks_select_self_service"
  on public.tasks for select
  using (
    exists (
      select 1 from public.horses h
      join public.owners o on o.id = h.owner_id
      where h.id = tasks.horse_id and o.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- calendar_events — events with no horse attached (yard maintenance, open
-- evening, etc.) are stable-wide/public: visible to every member of the
-- stable, including horse owners, not just staff.
-- ----------------------------------------------------------------------------
create policy "calendar_events_select_public"
  on public.calendar_events for select
  using (
    horse_id is null
    and stable_id = public.auth_stable_id()
  );

-- ----------------------------------------------------------------------------
-- link_horse_owner_account — called by the invite-owner Edge Function (via
-- the service role, so auth.uid() isn't available) after it creates the
-- invited auth user. Takes the inviting staff member's id explicitly and
-- verifies their permission itself, rather than trusting the caller.
-- ----------------------------------------------------------------------------
create or replace function public.link_horse_owner_account(
  p_inviter_id uuid,
  p_owner_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter_stable uuid;
  v_inviter_role public.user_role;
  v_owner_stable uuid;
begin
  select stable_id, role into v_inviter_stable, v_inviter_role
  from public.profiles where id = p_inviter_id;

  if v_inviter_role not in ('stable_owner', 'stable_employee') or v_inviter_stable is null then
    raise exception 'Only stable staff can invite horse owners';
  end if;

  select stable_id into v_owner_stable from public.owners where id = p_owner_id;
  if v_owner_stable is null or v_owner_stable <> v_inviter_stable then
    raise exception 'Owner does not belong to the inviter''s stable';
  end if;

  perform set_config('app.bypass_profile_guard', 'true', true);
  update public.profiles
  set stable_id = v_inviter_stable, role = 'horse_owner'
  where id = p_user_id;

  update public.owners
  set user_id = p_user_id
  where id = p_owner_id;
end;
$$;

-- Not granted to authenticated — it accepts an inviter id as a plain
-- parameter rather than reading auth.uid(), so only the Edge Function
-- (via the service role, which bypasses grants) may call it.
