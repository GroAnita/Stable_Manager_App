-- ============================================================================
-- Stable Manager — schema refinements to support full field parity with the
-- existing frontend data model, discovered while wiring up the Supabase data
-- layer in dataService.js.
--
-- All changes are additive (new nullable columns / new enum value) so they
-- are safe to apply to an existing database with no data loss.
-- ============================================================================

-- horses: the original spec only tracked a boolean `active` flag, but the
-- frontend has a richer lifecycle status, a birthday (distinct from
-- arrival_date) and a free-form notes field.
alter table public.horses add column if not exists status text not null default 'active';
alter table public.horses add column if not exists birthday date;
alter table public.horses add column if not exists notes text;

alter table public.horses drop constraint if exists horses_status_check;
alter table public.horses add constraint horses_status_check
  check (status in ('active', 'monitoring', 'rehab', 'training', 'new'));

-- owners: the frontend also tracks a free-text billing/payment method.
alter table public.owners add column if not exists payment_method text;

-- contracts: the frontend supports a 'cancelled' status in addition to the
-- original active/ending_soon/expired set.
alter type public.contract_status add value if not exists 'cancelled';
