-- ============================================================================
-- Stable Manager — categorize price list items (Hay/Grain/Supplements/Other)
-- and let feeding plans log dated "extra" purchases sourced from the price
-- list (e.g. extra hay bought beyond what a boarding contract covers).
-- ============================================================================

alter table public.price_list_items add column category text;

-- JSON array of { id, priceListItemId, item, category, unit, price, quantity,
-- amount, date, paymentId }, following the same text-column-holding-JSON
-- pattern already used by feeding_plans.lunch.
alter table public.feeding_plans add column extras text;
