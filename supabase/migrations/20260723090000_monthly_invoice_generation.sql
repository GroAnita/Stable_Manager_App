-- ============================================================================
-- Stable Manager — automatic monthly stable-fee invoices.
--
-- Stable fees are due the 25th of every month, covering the cycle from the
-- 26th of the previous month through the 25th. This creates that cycle's
-- invoice (one payment per active contract, seeded with the contract's
-- monthly rent) server-side on the 26th, regardless of whether anyone opens
-- the app that day.
--
-- It's intentionally idempotent (skips a contract if a payment already
-- exists for that due date) and deliberately dumb about amendments: the app
-- itself finds any open (non-paid) payment for a contract/due-date pair and
-- adds to it when an "extra" is logged — see HorseForm.js's openLogExtraModal
-- and getInvoiceDueDate(). This job and that client-side logic just need to
-- agree on which payment row represents a given cycle, which they do because
-- both key off (contract_id, due_date).
-- ============================================================================

create extension if not exists pg_cron with schema extensions;

create or replace function public.generate_monthly_invoices()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract record;
  v_due_date date;
begin
  -- Run on the 26th: the cycle that just started closes on the 25th of next
  -- month, which is where the invoice belongs.
  v_due_date := (date_trunc('month', current_date) + interval '1 month' + interval '24 days')::date;

  for v_contract in
    select id, stable_id, owner_id, monthly_rent
    from public.contracts
    where status = 'active'
  loop
    if not exists (
      select 1 from public.payments
      where contract_id = v_contract.id and due_date = v_due_date
    ) then
      insert into public.payments (
        stable_id, contract_id, owner_id, amount, due_date, status, invoice_number, notes
      ) values (
        v_contract.stable_id,
        v_contract.id,
        v_contract.owner_id,
        v_contract.monthly_rent,
        v_due_date,
        'due',
        'INV-' || to_char(v_due_date, 'YYYYMM'),
        'Monthly board fee'
      );
    end if;
  end loop;
end;
$$;

-- Not granted to `authenticated` — this iterates every stable's contracts
-- and must only run as the scheduled job, never be callable by a client.

select cron.schedule(
  'monthly-stable-invoices',
  '0 6 26 * *', -- 06:00 UTC on the 26th of every month
  $$select public.generate_monthly_invoices();$$
);
