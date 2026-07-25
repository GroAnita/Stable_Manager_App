-- ============================================================================
-- Stable Manager — bill included hay on the auto-generated monthly invoice,
-- same as bedding. included_hay_kg is a per-day rate, so the amount for a
-- given cycle is included_hay_kg * (days in that 26th-25th cycle) * the
-- linked price list item's price, incl. 25% VAT.
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
  v_cycle_start date;
  v_cycle_days int;
  v_sequence int;
  v_bedding_amount numeric(10, 2);
  v_hay_amount numeric(10, 2);
  v_notes text;
begin
  v_due_date := (date_trunc('month', current_date) + interval '1 month' + interval '24 days')::date;
  v_cycle_start := (date_trunc('month', v_due_date) - interval '1 month' + interval '25 days')::date;
  v_cycle_days := v_due_date - v_cycle_start + 1;

  for v_contract in
    select
      c.id, c.stable_id, c.owner_id, c.monthly_rent,
      c.bedding_quantity, bpli.price as bedding_item_price,
      c.included_hay_kg, hpli.price as hay_item_price
    from public.contracts c
    left join public.price_list_items bpli on bpli.id = c.bedding_price_list_item_id
    left join public.price_list_items hpli on hpli.id = c.hay_price_list_item_id
    where c.status = 'active'
    order by c.stable_id, c.id
  loop
    if not exists (
      select 1 from public.payments
      where contract_id = v_contract.id and due_date = v_due_date
    ) then
      select count(*) + 1 into v_sequence
      from public.payments
      where stable_id = v_contract.stable_id and due_date = v_due_date;

      v_bedding_amount := round(
        coalesce(v_contract.bedding_quantity, 0) * coalesce(v_contract.bedding_item_price, 0) * 1.25,
        2
      );
      v_hay_amount := round(
        coalesce(v_contract.included_hay_kg, 0) * v_cycle_days
          * coalesce(v_contract.hay_item_price, 0) * 1.25,
        2
      );
      v_notes := 'Monthly board fee';
      if v_hay_amount > 0 then
        v_notes := v_notes || chr(10) || 'Hay (incl. 25% VAT) — '
          || to_char(v_hay_amount, 'FM999999990.00');
      end if;
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
        v_contract.monthly_rent + v_hay_amount + v_bedding_amount,
        v_due_date,
        'due',
        'INV-' || to_char(v_due_date, 'YYYYMM') || '-' || lpad(v_sequence::text, 3, '0'),
        v_notes
      );
    end if;
  end loop;
end;
$$;
