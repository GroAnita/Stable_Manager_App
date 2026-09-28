-- ============================================================================
-- Stable Manager — split lunch into a hay/feed/supplements breakdown,
-- matching the structure already used for the morning and evening feeding
-- periods.
--
-- The original `lunch` text column is left in place and untouched — it's
-- still read/written by the legacy vanilla-JS app's Feeding tab. These are
-- purely additive, nullable columns for the new React app.
-- ============================================================================

alter table public.feeding_plans
  add column lunch_hay text,
  add column lunch_feed text,
  add column lunch_supplements text;
