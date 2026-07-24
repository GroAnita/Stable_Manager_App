-- ============================================================================
-- Stable Manager — price_list_items: a shared rate card of billable services,
-- board tiers and extras (e.g. "Full board", "Farrier visit", "Extra hay").
-- ============================================================================

create table public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  item text not null,
  unit text,
  price numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_price_list_items_stable_id on public.price_list_items(stable_id);

create trigger trg_price_list_items_updated_at
  before update on public.price_list_items
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS — same stable-scoped pattern as every other operational table.
-- ----------------------------------------------------------------------------
alter table public.price_list_items enable row level security;

create policy "price_list_items_select_stable"
  on public.price_list_items for select
  using (stable_id = public.auth_stable_id());

create policy "price_list_items_insert_staff"
  on public.price_list_items for insert
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "price_list_items_update_staff"
  on public.price_list_items for update
  using (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'))
  with check (stable_id = public.auth_stable_id() and public.auth_role() in ('stable_owner', 'stable_employee'));

create policy "price_list_items_delete_owner_role"
  on public.price_list_items for delete
  using (stable_id = public.auth_stable_id() and public.auth_role() = 'stable_owner');
