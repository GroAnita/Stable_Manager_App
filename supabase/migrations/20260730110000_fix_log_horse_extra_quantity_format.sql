-- ============================================================================
-- Stable Manager — fix log_horse_extra() formatting whole-number quantities
-- as e.g. "1." (a trailing decimal point with no digits after it), since
-- FM999999990.99 drops the optional '.99' digits entirely when they're both
-- zero but leaves the literal dot behind. Strip a trailing lone dot instead.
-- ============================================================================

create or replace function public.log_horse_extra(
  p_horse_id uuid,
  p_price_list_item_id uuid,
  p_quantity numeric,
  p_date date
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_horse public.horses;
  v_item public.price_list_items;
  v_contract public.contracts;
  v_amount numeric(10, 2);
  v_due_date date;
  v_cycle_start date;
  v_cycle_days int;
  v_payment public.payments;
  v_sequence int;
  v_line text;
  v_qty_text text;
  v_entry jsonb;
  v_already_paid boolean;
  v_bedding_item public.price_list_items;
  v_hay_item public.price_list_items;
  v_bedding_amount numeric(10, 2);
  v_hay_amount numeric(10, 2);
  v_notes text;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select h.* into v_horse
  from public.horses h
  join public.owners o on o.id = h.owner_id
  where h.id = p_horse_id and o.user_id = auth.uid();

  if v_horse.id is null then
    raise exception 'Horse not found or not linked to your account';
  end if;

  select * into v_item
  from public.price_list_items
  where id = p_price_list_item_id and stable_id = v_horse.stable_id;

  if v_item.id is null then
    raise exception 'Price list item not found';
  end if;

  v_amount := round(v_item.price * p_quantity * 1.25, 2);

  select * into v_contract
  from public.contracts
  where horse_id = p_horse_id and status = 'active'
  order by created_at desc
  limit 1;

  if v_contract.id is null then
    raise exception 'This horse has no active contract';
  end if;

  v_due_date := case
    when extract(day from p_date) >= 26
      then (date_trunc('month', p_date) + interval '1 month' + interval '24 days')::date
    else (date_trunc('month', p_date) + interval '24 days')::date
  end;

  v_qty_text := trim(trailing '.' from trim(to_char(p_quantity, 'FM999999990.99')));
  v_line := 'Extra: ' || v_item.item || ' x ' || v_qty_text
    || coalesce(' ' || v_item.unit, '') || ' - ' || to_char(v_amount, 'FM999999990.00')
    || ' (' || to_char(p_date, 'DD Mon YYYY') || ')';

  select * into v_payment
  from public.payments
  where contract_id = v_contract.id and due_date = v_due_date and status <> 'paid'
  limit 1;

  if v_payment.id is not null then
    update public.payments
    set amount = round(v_payment.amount + v_amount, 2),
        notes = case
          when coalesce(v_payment.notes, '') = '' then v_line
          else v_payment.notes || chr(10) || v_line
        end,
        updated_at = now()
    where id = v_payment.id
    returning * into v_payment;
  else
    select exists(
      select 1 from public.payments
      where contract_id = v_contract.id and due_date = v_due_date and status = 'paid'
    ) into v_already_paid;

    select count(*) + 1 into v_sequence
    from public.payments
    where stable_id = v_contract.stable_id and due_date = v_due_date;

    if v_already_paid then
      insert into public.payments (
        stable_id, contract_id, owner_id, amount, due_date, status, invoice_number, notes
      ) values (
        v_contract.stable_id, v_contract.id, v_contract.owner_id, v_amount, v_due_date, 'due',
        'INV-' || to_char(v_due_date, 'YYYYMM') || '-' || lpad(v_sequence::text, 3, '0') || '-EXTRA',
        v_line
      )
      returning * into v_payment;
    else
      v_cycle_start := (date_trunc('month', v_due_date) - interval '1 month' + interval '25 days')::date;
      v_cycle_days := v_due_date - v_cycle_start + 1;

      if v_contract.bedding_price_list_item_id is not null then
        select * into v_bedding_item
        from public.price_list_items
        where id = v_contract.bedding_price_list_item_id;
      end if;
      if v_contract.hay_price_list_item_id is not null then
        select * into v_hay_item from public.price_list_items where id = v_contract.hay_price_list_item_id;
      end if;

      v_bedding_amount := round(
        coalesce(v_contract.bedding_quantity, 0) * coalesce(v_bedding_item.price, 0) * 1.25, 2
      );
      v_hay_amount := round(
        coalesce(v_contract.included_hay_kg, 0) * v_cycle_days * coalesce(v_hay_item.price, 0) * 1.25, 2
      );

      v_notes := 'Monthly board fee';
      if v_hay_amount > 0 then
        v_notes := v_notes || chr(10) || 'Hay (incl. 25% VAT) - ' || to_char(v_hay_amount, 'FM999999990.00');
      end if;
      if v_bedding_amount > 0 then
        v_notes := v_notes || chr(10) || 'Bedding (incl. 25% VAT) - '
          || to_char(v_bedding_amount, 'FM999999990.00');
      end if;
      v_notes := v_notes || chr(10) || v_line;

      insert into public.payments (
        stable_id, contract_id, owner_id, amount, due_date, status, invoice_number, notes
      ) values (
        v_contract.stable_id, v_contract.id, v_contract.owner_id,
        round(v_contract.monthly_rent + v_hay_amount + v_bedding_amount + v_amount, 2),
        v_due_date, 'due',
        'INV-' || to_char(v_due_date, 'YYYYMM') || '-' || lpad(v_sequence::text, 3, '0'),
        v_notes
      )
      returning * into v_payment;
    end if;
  end if;

  v_entry := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'priceListItemId', v_item.id,
    'item', v_item.item,
    'category', coalesce(v_item.category, ''),
    'unit', coalesce(v_item.unit, ''),
    'price', v_item.price,
    'quantity', p_quantity,
    'amount', v_amount,
    'date', p_date::text,
    'paymentId', v_payment.id,
    'invoiceLine', v_line
  );

  if v_item.category in ('Hay', 'Grain', 'Supplements') then
    if exists (select 1 from public.feeding_plans where horse_id = p_horse_id) then
      update public.feeding_plans
      set extras = (coalesce(extras::jsonb, '[]'::jsonb) || jsonb_build_array(v_entry))::text,
          updated_at = now()
      where horse_id = p_horse_id;
    else
      insert into public.feeding_plans (stable_id, horse_id, extras)
      values (v_horse.stable_id, p_horse_id, jsonb_build_array(v_entry)::text);
    end if;
  else
    update public.horses
    set extras = (coalesce(extras::jsonb, '[]'::jsonb) || jsonb_build_array(v_entry))::text,
        updated_at = now()
    where id = p_horse_id;
  end if;

  return v_payment;
end;
$$;
