-- ============================================================================
-- Stable Manager — contract-level included hay and recurring bedding charge.
--
-- included_hay_kg: informational kg/month of hay included in the boarding
-- price, editable per horse. No billing effect — display only.
--
-- bedding_monthly_rent: a second fixed monthly fee per horse alongside
-- boarding, entered as a base (ex-VAT) price. Unlike boarding, bedding
-- carries 25% VAT, so generate_monthly_invoices() below bills it at
-- bedding_monthly_rent * 1.25 on every auto-generated invoice.
-- ============================================================================

alter table public.contracts
  add column included_hay_kg numeric(10, 2),
  add column bedding_monthly_rent numeric(10, 2) not null default 0;

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
  v_bedding_amount numeric(10, 2);
  v_notes text;
begin
  v_due_date := (date_trunc('month', current_date) + interval '1 month' + interval '24 days')::date;

  for v_contract in
    select id, stable_id, owner_id, monthly_rent, bedding_monthly_rent
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

      v_bedding_amount := round(coalesce(v_contract.bedding_monthly_rent, 0) * 1.25, 2);
      v_notes := 'Monthly board fee';
      if v_bedding_amount > 0 then
        v_notes := v_notes || chr(10) || 'Bedding (incl. 25% VAT) — '
          || to_char(v_bedding_amount, 'FM999999990.00');
      end if;

      insert into public.payments (
        stable_id, contract_id, owner_id, amount, due_date, status, invoice_number, notes
      ) values (
        v_contract.stable_id,
        v_contract.id,
        v_contract.owner_id,
        v_contract.monthly_rent + v_bedding_amount,
        v_due_date,
        'due',
        'INV-' || to_char(v_due_date, 'YYYYMM') || '-' || lpad(v_sequence::text, 3, '0'),
        v_notes
      );
    end if;
  end loop;
end;
$$;
