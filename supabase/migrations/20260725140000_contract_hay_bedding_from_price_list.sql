-- ============================================================================
-- Stable Manager — tie contract hay/bedding to actual price list items
-- instead of a manually re-typed price, so a single edit to the price list
-- keeps every contract's calculated value correct.
--
-- included_hay_kg keeps its meaning (kg/month), but now pairs with
-- hay_price_list_item_id so its value can be priced from the current price
-- list rate. Hay stays informational — it's already covered by monthly_rent,
-- so it does not add to the auto-generated invoice.
--
-- bedding_monthly_rent (a hand-typed base price) is replaced by
-- bedding_quantity + bedding_price_list_item_id, priced the same way. Unlike
-- hay, bedding is billed: generate_monthly_invoices() adds
-- bedding_quantity * item.price * 1.25 to every auto-generated invoice.
-- ============================================================================

alter table public.contracts
  add column hay_price_list_item_id uuid references public.price_list_items(id) on delete set null,
  add column bedding_price_list_item_id uuid references public.price_list_items(id) on delete set null;

alter table public.contracts rename column bedding_monthly_rent to bedding_quantity;

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
    select
      c.id, c.stable_id, c.owner_id, c.monthly_rent,
      c.bedding_quantity, pli.price as bedding_item_price
    from public.contracts c
    left join public.price_list_items pli on pli.id = c.bedding_price_list_item_id
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
