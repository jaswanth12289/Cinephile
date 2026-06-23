-- ============================================================
-- Cinephile RC16 — Storage Buckets
-- 004_storage.sql
-- Run AFTER 003_triggers_indexes.sql
-- ============================================================

-- ─── CREATE BUCKETS ──────────────────────────────────────────

insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('post-images', 'post-images', true),
  ('list-covers', 'list-covers', true)
on conflict (id) do update set public = true;

-- ─── RLS POLICIES FOR avatars ────────────────────────────────

create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar."
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.role() = 'authenticated' and
    -- E.g., user is uploading 'avatars/uuid/...'
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar."
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar."
  on storage.objects for delete
  using (
    bucket_id = 'avatars' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── RLS POLICIES FOR post-images ────────────────────────────

create policy "Post images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'post-images' );

create policy "Users can upload their own post images."
  on storage.objects for insert
  with check (
    bucket_id = 'post-images' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own post images."
  on storage.objects for update
  using (
    bucket_id = 'post-images' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own post images."
  on storage.objects for delete
  using (
    bucket_id = 'post-images' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── RLS POLICIES FOR list-covers ────────────────────────────

create policy "List covers are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'list-covers' );

create policy "Users can upload their own list covers."
  on storage.objects for insert
  with check (
    bucket_id = 'list-covers' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own list covers."
  on storage.objects for update
  using (
    bucket_id = 'list-covers' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own list covers."
  on storage.objects for delete
  using (
    bucket_id = 'list-covers' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
