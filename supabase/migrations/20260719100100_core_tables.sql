-- ============================================================================
-- Stable Manager — Core domain tables: owners, stalls, horses, contracts, payments
-- ============================================================================

-- ----------------------------------------------------------------------------
-- owners — customers boarding horses at a stable.
-- ----------------------------------------------------------------------------
create table public.owners (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  -- Optional link to an auth user, enabling a future horse-owner login portal.
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  address text,
  city text,
  postal_code text,
  phone text,
  email text,
  emergency_contact text,
  emergency_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_owners_stable_id on public.owners(stable_id);
create index idx_owners_user_id on public.owners(user_id);

create trigger trg_owners_updated_at
  before update on public.owners
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- stalls
-- ----------------------------------------------------------------------------
create table public.stalls (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  stall_number text not null,
  size text,
  status public.stall_status not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stable_id, stall_number)
);

create index idx_stalls_stable_id on public.stalls(stable_id);
create index idx_stalls_status on public.stalls(status);

create trigger trg_stalls_updated_at
  before update on public.stalls
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- horses — soft-deleted via `active` rather than hard row deletion.
-- ----------------------------------------------------------------------------
create table public.horses (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  owner_id uuid references public.owners(id) on delete set null,
  stall_id uuid references public.stalls(id) on delete set null,
  name text not null,
  breed text,
  age integer,
  gender text,
  color text,
  passport_number text,
  microchip_number text,
  insurance_company text,
  insurance_number text,
  vaccination_status text,
  allergies text,
  feeding_notes text,
  medical_notes text,
  arrival_date date,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_horses_stable_id on public.horses(stable_id);
create index idx_horses_owner_id on public.horses(owner_id);
create index idx_horses_stall_id on public.horses(stall_id);
create index idx_horses_active on public.horses(active);

-- A stall can only have one active horse at a time.
create unique index uq_one_active_horse_per_stall
  on public.horses(stall_id)
  where active = true and stall_id is not null;

create trigger trg_horses_updated_at
  before update on public.horses
  for each row execute function public.set_updated_at();

-- Keep stalls.status roughly in sync with horse occupancy. Staff can still
-- manually set a stall to 'reserved'/'maintenance'; this trigger only ever
-- toggles between 'available' and 'occupied' as horses move in/out.
create or replace function public.sync_stall_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.active and new.stall_id is not null then
      update public.stalls set status = 'occupied' where id = new.stall_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if (old.stall_id is distinct from new.stall_id) or (old.active is distinct from new.active) then
      if old.stall_id is not null and (old.active) then
        update public.stalls set status = 'available'
        where id = old.stall_id and status = 'occupied';
      end if;
      if new.active and new.stall_id is not null then
        update public.stalls set status = 'occupied' where id = new.stall_id;
      end if;
    end if;
  elsif tg_op = 'DELETE' then
    if old.stall_id is not null and old.active then
      update public.stalls set status = 'available'
      where id = old.stall_id and status = 'occupied';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_sync_stall_status
  after insert or update or delete on public.horses
  for each row execute function public.sync_stall_status();

-- ----------------------------------------------------------------------------
-- contracts
-- ----------------------------------------------------------------------------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  horse_id uuid not null references public.horses(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete cascade,
  stall_id uuid references public.stalls(id) on delete set null,
  monthly_rent numeric(10, 2) not null default 0,
  deposit numeric(10, 2) default 0,
  start_date date not null,
  end_date date,
  included_services text,
  additional_services text,
  status public.contract_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contracts_stable_id on public.contracts(stable_id);
create index idx_contracts_horse_id on public.contracts(horse_id);
create index idx_contracts_owner_id on public.contracts(owner_id);
create index idx_contracts_status on public.contracts(status);
create index idx_contracts_end_date on public.contracts(end_date);

create trigger trg_contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- payments
-- ----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete cascade,
  amount numeric(10, 2) not null,
  due_date date not null,
  paid_date date,
  payment_method text,
  invoice_number text,
  status public.payment_status not null default 'due',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payments_stable_id on public.payments(stable_id);
create index idx_payments_contract_id on public.payments(contract_id);
create index idx_payments_owner_id on public.payments(owner_id);
create index idx_payments_status on public.payments(status);
create index idx_payments_due_date on public.payments(due_date);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Flip 'due' payments to 'overdue' once their due_date has passed. Intended
-- to be invoked on a schedule (pg_cron or a daily Edge Function/cron job).
create or replace function public.refresh_overdue_payments()
returns void
language sql
security definer
set search_path = public
as $$
  update public.payments
  set status = 'overdue'
  where status = 'due' and due_date < current_date;
$$;

grant execute on function public.refresh_overdue_payments() to authenticated;
