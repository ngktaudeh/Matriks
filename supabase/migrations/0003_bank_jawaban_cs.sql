-- ============================================================
-- Bank Jawaban CS — migration (idempotent)
-- Mengubah Knowledge Vault → shared read-only repo jawaban CS,
-- write access hanya untuk admin (whitelist by email).
--
-- Catatan: migration ini SUDAH diterapkan langsung ke database
-- proyek via koneksi Postgres. File ini disimpan sebagai arsip
-- agar bisa dijalankan ulang / direview.
-- ============================================================

-- ---------- 1) Kolom baru ----------
alter table public.items
  add column if not exists usage_count integer default 0;

alter table public.items
  add column if not exists is_verified boolean default false;

-- ---------- 2) Rapikan kategori duplikat (opsional, tidak hapus data items) ----------
-- Hapus kategori duplikat (case-insensitive) menyisakan satu per nama.
delete from public.categories
 where id::text not in (
   select min(id::text) from public.categories group by lower(name)
 );

-- Index unik kategori global (sebelumnya per-user)
drop index if exists categories_user_lower_name_idx;
create unique index if not exists categories_lower_name_idx
  on public.categories (lower(name));

-- kategori sekarang shared (bukan per-user): user_id boleh null
alter table public.categories alter column user_id drop not null;

-- ---------- 3) RLS: SELECT public, WRITE admin-only ----------
-- Hapus policy lama (per-user)
drop policy if exists items_select_own on public.items;
drop policy if exists items_insert_own on public.items;
drop policy if exists items_update_own on public.items;
drop policy if exists items_delete_own on public.items;
drop policy if exists categories_select_own on public.categories;
drop policy if exists categories_insert_own on public.categories;
drop policy if exists categories_update_own on public.categories;
drop policy if exists categories_delete_own on public.categories;

-- items
create policy items_select_public on public.items
  for select using (true);

create policy items_insert_admin on public.items
  for insert with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

create policy items_update_admin on public.items
  for update
  using (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com')
  with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

create policy items_delete_admin on public.items
  for delete using (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

-- categories
create policy categories_select_public on public.categories
  for select using (true);

create policy categories_insert_admin on public.categories
  for insert with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

create policy categories_update_admin on public.categories
  for update
  using (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com')
  with check (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

create policy categories_delete_admin on public.categories
  for delete using (auth.jwt() ->> 'email' = 'danielsmb385@gmail.com');

-- ---------- 4) RPC: increment usage_count (aman untuk anon) ----------
-- SECURITY DEFINER => boleh naikkan counter saja, tanpa menyentuh field lain,
-- dan tetap bisa dipanggil client anon (tim CS tanpa login).
create or replace function public.increment_usage_count(target_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.items
     set usage_count = coalesce(usage_count, 0) + 1
   where id = target_id;
end;
$$;

-- ---------- 5) Storage bucket item-images: SELECT public, WRITE admin ----------
drop policy if exists "item-images public read" on storage.objects;
drop policy if exists "item-images authenticated insert" on storage.objects;
drop policy if exists "item-images authenticated update" on storage.objects;
drop policy if exists "item-images authenticated delete" on storage.objects;

create policy "item-images public read" on storage.objects
  for select using (bucket_id = 'item-images');

create policy "item-images admin insert" on storage.objects
  for insert with check (
    bucket_id = 'item-images'
    and auth.jwt() ->> 'email' = 'danielsmb385@gmail.com'
  );

create policy "item-images admin update" on storage.objects
  for update using (
    bucket_id = 'item-images'
    and auth.jwt() ->> 'email' = 'danielsmb385@gmail.com'
  );

create policy "item-images admin delete" on storage.objects
  for delete using (
    bucket_id = 'item-images'
    and auth.jwt() ->> 'email' = 'danielsmb385@gmail.com'
  );

-- ---------- 6) Realtime publication ----------
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.categories;
