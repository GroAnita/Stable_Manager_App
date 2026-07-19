-- ============================================================================
-- Stable Manager — Extensions, multi-tenancy root, profiles, helper functions
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type public.user_role as enum ('stable_owner', 'stable_employee', 'horse_owner');
create type public.stall_status as enum ('available', 'occupied', 'reserved', 'maintenance');
create type public.contract_status as enum ('active', 'ending_soon', 'expired');
create type public.payment_status as enum ('paid', 'due', 'overdue');
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.calendar_event_type as enum ('vet', 'farrier', 'vaccination', 'worming', 'training', 'stable_event', 'arena_booking');
create type public.document_type as enum ('passport', 'insurance', 'contract', 'veterinary_report', 'receipt', 'photo');
create type public.notification_type as enum ('payment_due', 'vaccination_due', 'contract_ending', 'farrier_reminder', 'medication_reminder');

-- ----------------------------------------------------------------------------
-- Generic updated_at trigger (reused by every table below)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- stables — multi-tenancy root. Every domain table hangs off stable_id so the
-- schema can support multiple stables/administrators without a redesign.
-- ----------------------------------------------------------------------------
create table public.stables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  postal_code text,
  phone text,
  email text,
  -- References auth.users directly (not profiles) to avoid a circular FK,
  -- since profiles.stable_id references stables(id).
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_stables_updated_at
  before update on public.stables
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- profiles — one row per authenticated user, 1:1 with auth.users.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  stable_id uuid references public.stables(id) on delete set null,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  role public.user_role not null default 'stable_owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_stable_id on public.profiles(stable_id);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'stable_owner'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent users from self-assigning stable_id/role (privilege escalation).
-- Legitimate stable_id/role assignment happens only through the
-- create_stable()/assign_staff_role() RPCs below, which set a bypass flag.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.bypass_profile_guard', true), 'false') <> 'true' then
    new.stable_id := old.stable_id;
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ----------------------------------------------------------------------------
-- Helper functions used throughout RLS policies. security definer so they can
-- read profiles regardless of the caller's own RLS visibility (avoids
-- recursive policy evaluation on the profiles table).
-- ----------------------------------------------------------------------------
create or replace function public.auth_stable_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select stable_id from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.auth_stable_id() to authenticated;
grant execute on function public.auth_role() to authenticated;

-- ----------------------------------------------------------------------------
-- create_stable — the only way to create a stable and bind it to the caller.
-- Direct INSERTs into public.stables are blocked by RLS (no insert policy).
-- ----------------------------------------------------------------------------
create or replace function public.create_stable(
  p_name text,
  p_address text default null,
  p_city text default null,
  p_postal_code text default null,
  p_phone text default null,
  p_email text default null
)
returns public.stables
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stable public.stables;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Stable name is required';
  end if;

  insert into public.stables (name, address, city, postal_code, phone, email, owner_user_id)
  values (p_name, p_address, p_city, p_postal_code, p_phone, p_email, auth.uid())
  returning * into v_stable;

  perform set_config('app.bypass_profile_guard', 'true', true);
  update public.profiles
  set stable_id = v_stable.id, role = 'stable_owner'
  where id = auth.uid();

  return v_stable;
end;
$$;

grant execute on function public.create_stable(text, text, text, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- assign_staff_role — lets a stable_owner attach an existing user (employee or
-- horse owner) to their stable with a given role. Enables future multi-user
-- and horse-owner-portal scenarios without schema changes.
-- ----------------------------------------------------------------------------
create or replace function public.assign_staff_role(
  p_user_id uuid,
  p_role public.user_role
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_stable uuid := public.auth_stable_id();
  v_caller_role public.user_role := public.auth_role();
  v_profile public.profiles;
begin
  if v_caller_role <> 'stable_owner' or v_caller_stable is null then
    raise exception 'Only a stable owner can assign roles';
  end if;

  perform set_config('app.bypass_profile_guard', 'true', true);
  update public.profiles
  set stable_id = v_caller_stable, role = p_role
  where id = p_user_id
  returning * into v_profile;

  if v_profile is null then
    raise exception 'User not found';
  end if;

  return v_profile;
end;
$$;

grant execute on function public.assign_staff_role(uuid, public.user_role) to authenticated;
