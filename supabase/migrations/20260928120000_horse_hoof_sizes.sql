-- ============================================================================
-- Stable Manager — front/back hoof (shoe) sizes on horses.
--
-- The farrier tab needs a persistent, always-visible "current sizing" panel
-- above the farrier visit history. Sizes run the standard horseshoe scale
-- (8x0 smallest through 5 largest) and are stored as plain text on the
-- horse record itself, mirroring how vaccination_status/allergies etc.
-- already live directly on public.horses rather than in a child table.
-- ============================================================================

alter table public.horses
  add column front_hoof_size text,
  add column back_hoof_size text;
