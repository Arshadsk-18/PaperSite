-- ==============================================================================
-- PaperSite: Storage Configuration
-- File: 0003_storage.sql
-- Description: Creates private 'sketches' bucket with per-user folder isolation.
-- ==============================================================================

-- 1. Create the private 'sketches' storage bucket if it does not already exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sketches',
  'sketches',
  false,
  5242880, -- 5 MB limit per sketch
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- 2. Storage Policies on storage.objects

-- Allow users to read sketches only in their own folder (/sketches/<user_id>/*)
drop policy if exists "Users can read own sketches" on storage.objects;
create policy "Users can read own sketches"
on storage.objects for select
to authenticated
using (
  bucket_id = 'sketches' 
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to upload sketches only into their own folder (/sketches/<user_id>/*)
drop policy if exists "Users can upload own sketches" on storage.objects;
create policy "Users can upload own sketches"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'sketches' 
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own sketch files
drop policy if exists "Users can update own sketches" on storage.objects;
create policy "Users can update own sketches"
on storage.objects for update
to authenticated
using (
  bucket_id = 'sketches' 
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own sketch files
drop policy if exists "Users can delete own sketches" on storage.objects;
create policy "Users can delete own sketches"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'sketches' 
  and (storage.foldername(name))[1] = auth.uid()::text
);
