-- ============================================================================
-- Stable Manager — close a horse-owner data leak.
--
-- Every "*_select_stable" policy added when this app was staff-only only
-- checked stable_id, with no role check. Once horse_owner accounts existed,
-- RLS OR-combines all SELECT policies on a table, so these permissive
-- policies silently granted horse_owner accounts full stable-wide access —
-- every horse, contract, payment, and owner's contact info, not just their
-- own — even though dedicated "*_select_self_service" policies were already
-- built to scope them correctly. Restricting these to staff roles makes the
-- self-service policies the only way a horse_owner can read these tables.
--
-- stalls_select_stable is deliberately left alone: the horse-owner dashboard
-- shows a stable-wide "occupied stalls" count, which was an intentional
-- design choice (see calendar_events_select_public for the same pattern
-- applied to events with no horse attached).
-- ============================================================================

alter policy "horses_select_stable" on public.horses
  using (stable_id = public.auth_stable_id() and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role]));

alter policy "contracts_select_stable" on public.contracts
  using (stable_id = public.auth_stable_id() and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role]));

alter policy "documents_select_stable" on public.documents
  using (stable_id = public.auth_stable_id() and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role]));

alter policy "feeding_plans_select_stable" on public.feeding_plans
  using (stable_id = public.auth_stable_id() and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role]));

alter policy "medical_records_select_stable" on public.medical_records
  using (stable_id = public.auth_stable_id() and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role]));

alter policy "notifications_select_stable" on public.notifications
  using (stable_id = public.auth_stable_id() and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role]));

alter policy "owners_select_stable" on public.owners
  using (stable_id = public.auth_stable_id() and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role]));

alter policy "payments_select_stable" on public.payments
  using (stable_id = public.auth_stable_id() and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role]));

alter policy "price_list_items_select_stable" on public.price_list_items
  using (stable_id = public.auth_stable_id() and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role]));

alter policy "tasks_select_stable" on public.tasks
  using (stable_id = public.auth_stable_id() and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role]));

alter policy "calendar_events_select_stable" on public.calendar_events
  using (stable_id = public.auth_stable_id() and public.auth_role() = any (array['stable_owner'::public.user_role, 'stable_employee'::public.user_role]));
