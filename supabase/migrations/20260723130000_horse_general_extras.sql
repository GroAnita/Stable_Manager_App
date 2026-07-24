-- ============================================================================
-- Stable Manager — general "extra" charges on a horse (veterinary, farrier,
-- bedding, mucking) beyond what the boarding contract covers, mirroring the
-- feeding_plans.extras pattern but for non-feed price list categories.
-- ============================================================================

-- JSON array of { id, priceListItemId, item, category, unit, price, quantity,
-- amount, date, paymentId, invoiceLine }, same shape/pattern as
-- feeding_plans.extras.
alter table public.horses add column extras text;
