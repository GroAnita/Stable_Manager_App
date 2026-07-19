-- ============================================================================
-- Stable Manager — Supabase Storage buckets and access policies
--
-- Convention: object paths are namespaced by stable to make RLS simple:
--   horse-photos/{stable_id}/{horse_id}/{filename}
--   documents/{stable_id}/{horse_id-or-owner_id}/{filename}
--   avatars/{user_id}/{filename}
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('horse-photos', 'horse-photos', false),
  ('documents', 'documents', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- horse-photos (private, stable-scoped)
-- ----------------------------------------------------------------------------
create policy "horse_photos_select_stable"
  on storage.objects for select
  using (
    bucket_id = 'horse-photos'
    and (storage.foldername(name))[1] = public.auth_stable_id()::text
  );

create policy "horse_photos_write_staff"
  on storage.objects for insert
  with check (
    bucket_id = 'horse-photos'
    and (storage.foldername(name))[1] = public.auth_stable_id()::text
    and public.auth_role() in ('stable_owner', 'stable_employee')
  );

create policy "horse_photos_update_staff"
  on storage.objects for update
  using (
    bucket_id = 'horse-photos'
    and (storage.foldername(name))[1] = public.auth_stable_id()::text
    and public.auth_role() in ('stable_owner', 'stable_employee')
  );

create policy "horse_photos_delete_staff"
  on storage.objects for delete
  using (
    bucket_id = 'horse-photos'
    and (storage.foldername(name))[1] = public.auth_stable_id()::text
    and public.auth_role() in ('stable_owner', 'stable_employee')
  );

-- ----------------------------------------------------------------------------
-- documents (private, stable-scoped)
-- ----------------------------------------------------------------------------
create policy "documents_bucket_select_stable"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.auth_stable_id()::text
  );

create policy "documents_bucket_write_staff"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.auth_stable_id()::text
    and public.auth_role() in ('stable_owner', 'stable_employee')
  );

create policy "documents_bucket_update_staff"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.auth_stable_id()::text
    and public.auth_role() in ('stable_owner', 'stable_employee')
  );

create policy "documents_bucket_delete_staff"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.auth_stable_id()::text
    and public.auth_role() in ('stable_owner', 'stable_employee')
  );

-- ----------------------------------------------------------------------------
-- avatars (public read, each user manages their own folder)
-- ----------------------------------------------------------------------------
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
