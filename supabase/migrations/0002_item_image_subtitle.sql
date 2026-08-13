-- ============================================================
-- Knowledge Vault — item image + subtitle support
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ------------------------------------------------------------------
-- 1) Add new columns to public.items (idempotent, no data loss)
-- ------------------------------------------------------------------
alter table public.items
  add column if not exists subtitle  text default '';

alter table public.items
  add column if not exists image_url text;

-- NOTE: the existing `content` column is preserved untouched and now
-- serves as the long-form "description" field in the UI. No rename is
-- performed so existing rows keep their data exactly as-is.

-- ------------------------------------------------------------------
-- 2) Storage bucket + policies
--    The `item-images` bucket is public so approved members can view
--    and copy images. Because Supabase Storage RLS policies are
--    defined on storage.objects, we create them here.
--
--    Bucket creation itself is done in the dashboard (Storage → New
--    bucket → name "item-images" → Public). See README notes at the
--    bottom of the OUTPUT summary for exact manual steps.
-- ------------------------------------------------------------------

-- Read (SELECT): any authenticated user can view images.
drop policy if exists "item-images public read" on storage.objects;
create policy "item-images public read"
  on storage.objects for select
  using (bucket_id = 'item-images' and auth.role() = 'authenticated');

-- Write (INSERT): only the owner (admin/edit role) may upload.
-- Consistent with items RLS: a user may only act on their own data.
drop policy if exists "item-images authenticated insert" on storage.objects;
create policy "item-images authenticated insert"
  on storage.objects for insert
  with check (bucket_id = 'item-images' and auth.role() = 'authenticated');

-- Update (UPDATE): owner may replace files.
drop policy if exists "item-images authenticated update" on storage.objects;
create policy "item-images authenticated update"
  on storage.objects for update
  using (bucket_id = 'item-images' and auth.role() = 'authenticated');

-- Delete (DELETE): owner may remove files.
drop policy if exists "item-images authenticated delete" on storage.objects;
create policy "item-images authenticated delete"
  on storage.objects for delete
  using (bucket_id = 'item-images' and auth.role() = 'authenticated');
