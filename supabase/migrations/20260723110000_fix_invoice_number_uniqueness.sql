-- ============================================================================
-- Stable Manager — fix invoice numbers colliding across contracts.
--
-- generate_monthly_invoices() previously numbered every invoice for a cycle
-- 'INV-YYYYMM' with no per-contract distinguisher, so every horse billed in
-- the same month got an identical invoice number. Append a per-stable,
-- per-month running sequence instead.
-- ============================================================================

create or replace function public.generate_monthly_invoices()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract record;
  v_due_date date;
  v_sequence int;
begin
  v_due_date := (date_trunc('month', current_date) + interval '1 month' + interval '24 days')::date;

  for v_contract in
    select id, stable_id, owner_id, monthly_rent
    from public.contracts
    where status = 'active'
    order by stable_id, id
  loop
    if not exists (
      select 1 from public.payments
      where contract_id = v_contract.id and due_date = v_due_date
    ) then
      select count(*) + 1 into v_sequence
      from public.payments
      where stable_id = v_contract.stable_id and due_date = v_due_date;

      insert into public.payments (
        stable_id, contract_id, owner_id, amount, due_date, status, invoice_number, notes
      ) values (
        v_contract.stable_id,
        v_contract.id,
        v_contract.owner_id,
        v_contract.monthly_rent,
        v_due_date,
        'due',
        'INV-' || to_char(v_due_date, 'YYYYMM') || '-' || lpad(v_sequence::text, 3, '0'),
        'Monthly board fee'
      );
    end if;
  end loop;
end;
$$;
